'use strict';

/* ============================================================================
   Aera 2.2 — центр защиты (сетевой уровень сессий).
   ----------------------------------------------------------------------------
   Надстройки над webRequest каждой сессии:
     • HTTPS-only   — http:// запросы верхнего уровня переезжают на https://;
     • DNT          — заголовок Do-Not-Track: 1 в каждом запросе;
     • Anti-referer — Referer ужимается до origin (не утекает путь страницы);
     • 3p-cookies   — сторонние Set-Cookie вырезаются из ответов
                      (сторонний = инициатор запроса с другого сайта).
   Всё выключаемо в рантайме через runtimeState (флаги из settings.json).
   ============================================================================ */

const runtime = require('./runtimeState');

const installed = new WeakSet();

function hostnameOf(u) {
  try { return new URL(u).hostname.toLowerCase().replace(/^www\./i, ''); } catch (e) { return ''; }
}

/** Корневой домен для сравнения «свой/чужой» (простая эвристика last-2-labels). */
function baseDomain(host) {
  const parts = String(host || '').split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const twoLevelTld = /^(co|com|net|org|gov|edu|ac|or|ne)\.[a-z]{2}$/i;
  const last2 = parts.slice(-2).join('.');
  if (twoLevelTld.test(last2) && parts.length >= 3) return parts.slice(-3).join('.');
  return last2;
}

function install(ses) {
  if (!ses || installed.has(ses)) return;
  installed.add(ses);

  /* ---------- HTTPS-only: главные фреймы http -> https ---------- */
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*'] }, (details, callback) => {
    if (runtime.isHttpsOnly()) {
      const h = hostnameOf(details.url);
      const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
      const isTopLevel = details.resourceType === 'mainFrame' || details.resourceType === 'subFrame';
      if (!local && isTopLevel && /^http:\/\//i.test(details.url)) {
        callback({ redirectURL: details.url.replace(/^http:\/\//i, 'https://') });
        return;
      }
    }
    callback({});
  });

  /* ---------- DNT + компактный Referer ---------- */
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders || {};
    if (runtime.isDnt()) headers['DNT'] = '1';
    if (runtime.isTightReferrer()) {
      const target = hostnameOf(details.url);
      const ref = headers['Referer'] || '';
      if (ref && target && baseDomain(hostnameOf(ref)) !== baseDomain(target)) {
        try {
          const o = new URL(ref);
          headers['Referer'] = o.origin + '/';
        } catch (e) { /* оставляем как есть */ }
      }
    }
    callback({ requestHeaders: headers });
  });

  /* ---------- сторонние cookie прочь ---------- */
  ses.webRequest.onHeadersReceived((details, callback) => {
    if (runtime.isBlock3p()) {
      const initiatorHost = hostnameOf(details.referrer || details.initiator || '');
      const targetHost = hostnameOf(details.url);
      if (initiatorHost && targetHost && baseDomain(initiatorHost) !== baseDomain(targetHost)) {
        const headers = details.responseHeaders || {};
        let touched = false;
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'set-cookie') {
            delete headers[key];
            touched = true;
          }
        }
        if (touched) {
          callback({ responseHeaders: headers });
          return;
        }
      }
    }
    callback({});
  });
}

module.exports = { install };
