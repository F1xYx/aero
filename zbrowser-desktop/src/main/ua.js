'use strict';

/* ============================================================================
   Aera 2.0 — User-Agent и Client Hints.
   UA — как у настоящего десктопного Google Chrome на Windows: без упоминаний
   Electron/Headless/CEF/Aera. Sec-CH-UA и Accept-Language отправляются
   корректно, чтобы сайты и поисковики не считали браузер ботом.
   ============================================================================ */

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' +
  process.versions.chrome +
  ' Safari/537.36';

const LANGS = ['ru-RU', 'ru', 'en-US', 'en'];
const ACCEPT_LANG = 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7';

function install(session) {
  try { session.setUserAgent(CHROME_UA, LANGS); } catch (e) { /* noop */ }

  try {
    session.webRequest.onBeforeSendHeaders({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      const h = details.requestHeaders || {};
      const v = process.versions.chrome;
      h['User-Agent'] = CHROME_UA;
      h['Sec-CH-UA'] = '"Google Chrome";v="' + v + '", "Chromium";v="' + v + '", "Not_A Brand";v="24"';
      h['Sec-CH-UA-Mobile'] = '?0';
      h['Sec-CH-UA-Platform'] = '"Windows"';
      h['Accept-Language'] = ACCEPT_LANG;
      callback({ requestHeaders: h });
    });
  } catch (e) { /* noop */ }
}

module.exports = { CHROME_UA, LANGS, ACCEPT_LANG, install };
