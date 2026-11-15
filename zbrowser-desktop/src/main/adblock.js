'use strict';

/* ============================================================================
   Aera 2.1 — блокировщик рекламы и трекеров на движке фильтров EasyList.
   ----------------------------------------------------------------------------
   Как работает:
     • Встроенный срез easylist.txt (build/filters/) + автообновление раз в 2
       суток из easylist.to (сохраняется в userData). Нет сети — берём срез.
     • Правила компилируются один раз в три быстрых структуры:
         hostSet   — домены вида ||example.com^ (проверка за O(1));
         literals  — подстроки вида &adtype= / -ad-300- (indexOf);
         regexes   — /пattern/ правила (ограниченный набор).
     • Перехват onBeforeRequest отменяет запрос целиком — реклама не грузится.
     • Статистика: сколько запросов заблокировано за сессию + топ хостов.
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { net } = require('electron');
const store = require('./config');

/* Аварийный минимальный набор — блокируется всегда, даже если список
   фильтров ещё не загружен (первый запуск / нет файла). */
const ALWAYS_BLOCKED = [
  'doubleclick.net', 'googlesyndication.com', 'googletagservices.com',
  'googleadservices.com', 'google-analytics.com', 'googletagmanager.com',
  'adservice.google.com', 'fundingchoicesmessages.google.com',
  'amazon-adsystem.com', 'adnxs.com', 'adsrvr.org', 'casalemedia.com',
  'pubmatic.com', 'rubiconproject.com', 'openx.net', 'indexww.com',
  'sharethrough.com', 'criteo.com', 'criteo.net', 'taboola.com',
  'outbrain.com', 'zedo.com', 'teads.tv', 'smartadserver.com', 'media.net',
  '33across.com', 'bidswitch.net', 'yieldmo.com', 'moatads.com',
  'doubleverify.com', 'adsafeprotected.com', 'scorecardresearch.com',
  'quantserve.com', 'hotjar.com', 'mixpanel.com', 'segment.io',
  'mouseflow.com', 'fullstory.com', 'mc.yandex.ru', 'an.yandex.ru',
  'adfox.ru', 'ads-twitter.com', 'ads.linkedin.com', 'analytics.tiktok.com'
];

const FILTER_URL = 'https://easylist.to/easylist/easylist.txt';
const UPDATE_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_REGEX_RULES = 4000;
const MAX_LITERAL_RULES = 20000;

/* ---------- скомпилированные фильтры ---------- */
let compiled = null;          // { hosts:Set, literals:string[], regexes:RegExp[] }
let compiling = false;
let lastSource = 'none';      // none | bundled | updated
let ruleCount = 0;

/* ---------- статистика ---------- */
const stats = { blocked: 0, byHost: new Map() };
let statsDirty = false;
let pushTimer = null;

function notePush() {
  statsDirty = true;
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (!statsDirty) return;
    statsDirty = false;
    try {
      const { sendToHost } = require('./windowState');
      const top = Array.from(stats.byHost.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([host, count]) => ({ host, count }));
      sendToHost('adblock-stats', { blocked: stats.blocked, top });
    } catch (e) { /* окно ещё не готово */ }
  }, 700);
}

/* ============================ компиляция ============================ */

function hostOfRule(line) {
  // ||example.com^... -> example.com ; ||example.com/path -> example.com
  const m = /^\|\|([a-z0-9.-]+)\^?/i.exec(line);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : null;
}

function compile(text) {
  const hosts = new Set();
  const literals = [];
  const regexes = [];
  let lines;
  try { lines = text.split('\n'); } catch (e) { lines = []; }

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (!raw) continue;
    const c = raw.charCodeAt(0);
    // быстрый отсев: '!' комментария, '[' заголовка, '@@' белого списка
    if (c === 33 /* ! */ || c === 91 /* [ */) continue;
    if (raw.charCodeAt(0) === 64 && raw.charCodeAt(1) === 64) continue; // @@
    raw = raw.trim();
    if (raw.length < 3) continue;
    // отбрасываем опции $script,$third-party,... (блокируем шире — безопаснее)
    const dollar = raw.indexOf('$');
    if (dollar > 0) raw = raw.slice(0, dollar);
    if (raw.length < 3 || raw.indexOf('##') >= 0 || raw.indexOf('#@#') >= 0) continue; // косметика — не для сети
    if (raw.indexOf('||') === 0) {
      const h = hostOfRule(raw);
      if (h && h.indexOf('*') < 0) { hosts.add(h); continue; }
    }
    if (raw.charCodeAt(0) === 47 && raw.charCodeAt(raw.length - 1) === 47) {
      // /regex/ — пробуем скомпилировать, ограничиваем количество
      if (regexes.length >= MAX_REGEX_RULES) continue;
      const body = raw.slice(1, -1);
      if (body.length < 4 || body.length > 200) continue;
      try { regexes.push(new RegExp(body, 'i')); } catch (e) { /* некорректный — пропускаем */ }
      continue;
    }
    if (raw.length >= 5 && literals.length < MAX_LITERAL_RULES && raw.indexOf('*') < 0) {
      literals.push(raw.toLowerCase());
    }
  }

  for (const h of ALWAYS_BLOCKED) hosts.add(h);

  compiled = { hosts, literals, regexes };
  ruleCount = hosts.size + literals.length + regexes.length;
  try {
    console.log('[aera:adblock] фильтры собраны: домены=' + hosts.size +
      ' подстрок=' + literals.length + ' регулярок=' + regexes.length);
  } catch (e) { /* noop */ }
}

function ensureCompiled() {
  if (compiled || compiling) return;
  compiling = true;
  try {
    // приоритет: обновлённый из сети -> встроенный срез
    let src = 'bundled';
    let text = null;
    try {
      text = fs.readFileSync(store.userDataFile('easylist.txt'), 'utf8');
      src = 'updated';
    } catch (e) { /* обновления ещё нет */ }
    if (!text) {
      const bundled = store.APP_ROOT + path.sep + 'build' + path.sep + 'filters' + path.sep + 'easylist.txt';
      try { text = fs.readFileSync(bundled, 'utf8'); } catch (e) { text = null; }
      if (!text && process.resourcesPath) {
        try { text = fs.readFileSync(path.join(process.resourcesPath, 'filters', 'easylist.txt'), 'utf8'); } catch (e2) { text = null; }
      }
    }
    if (text) compile(text);
    lastSource = src;
  } finally {
    compiling = false;
  }
}

/* ============================ сопоставление ============================ */

function matchHost(host) {
  // точное совпадение или поддомен любого заблокированного домена
  let h = host;
  if (!h) return false;
  h = h.toLowerCase();
  if (compiled.hosts.has(h)) return true;
  // отсекаем поддомены по одному уровню за раз — дёшево
  let idx = h.indexOf('.');
  while (idx > 0) {
    h = h.slice(idx + 1);
    if (compiled.hosts.has(h)) return true;
    idx = h.indexOf('.');
  }
  return false;
}

function isBlockedUrl(rawUrl) {
  ensureCompiled();
  if (!compiled) return false;
  let url;
  let host = '';
  try {
    url = new URL(rawUrl);
    host = url.hostname;
  } catch (e) { return false; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  if (matchHost(host)) return true;

  const lower = url.pathname.toLowerCase() + (url.search || '').toLowerCase();
  if (compiled.literals.length) {
    for (let i = 0; i < compiled.literals.length; i++) {
      if (lower.indexOf(compiled.literals[i]) >= 0) return true;
    }
  }
  for (let i = 0; i < compiled.regexes.length; i++) {
    try { if (compiled.regexes[i].test(rawUrl)) return true; } catch (e) { /* noop */ }
  }
  return false;
}

function countBlock(url) {
  stats.blocked++;
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { host = '—'; }
  stats.byHost.set(host, (stats.byHost.get(host) || 0) + 1);
  if (stats.byHost.size > 200) {
    // держим карту компактной: удаляем редкие записи при переполнении
    const rare = Array.from(stats.byHost.entries()).sort((a, b) => a[1] - b[1]).slice(0, 60);
    for (const [h] of rare) stats.byHost.delete(h);
  }
  notePush();
}

/* ============================ установка в сессию ============================ */

function install(session, isEnabled) {
  try {
    session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      try {
        if (isEnabled() && !details.url.startsWith('chrome-extension://')) {
          if (isBlockedUrl(details.url)) {
            countBlock(details.url);
            callback({ cancel: true });
            return;
          }
        }
      } catch (e) { /* некорректный URL — пропускаем */ }
      callback({});
    });
  } catch (e) { /* noop */ }
}

/* ============================ обновление из сети ============================ */

function lastUpdateOk() {
  try {
    const stamp = Number(store.loadSettings().easylistAt) || 0;
    return stamp && (Date.now() - stamp < UPDATE_TTL_MS);
  } catch (e) { return false; }
}

/** Фоновое обновление списка фильтров. Не блокирует запуск. */
function updateInBackground() {
  if (lastUpdateOk()) return;
  setTimeout(async () => {
    try {
      const resp = await net.fetch(FILTER_URL, { method: 'GET' });
      if (!resp.ok) return;
      const text = await resp.text();
      if (!text || text.length < 10000 || text.indexOf('[Adblock') < 0) return;
      fs.writeFileSync(store.userDataFile('easylist.txt'), text);
      store.saveSettings({ easylistAt: Date.now() });
      compiled = null;           // перекомпилируем на следующем запросе
      try { console.log('[aera:adblock] список обновлён из сети (' + Math.round(text.length / 1024) + ' КБ)'); } catch (e) { /* noop */ }
    } catch (e) { /* нет сети — работаем на встроенном срезе */ }
  }, 25000);
}

function getStatsSnapshot() {
  const top = Array.from(stats.byHost.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([host, count]) => ({ host, count }));
  return { blocked: stats.blocked, top, source: lastSource, rules: ruleCount };
}

module.exports = { install, isBlockedUrl, getStatsSnapshot, updateInBackground, ALWAYS_BLOCKED };
