'use strict';

/* ============================================================================
   Aera 2.1 — менеджер расширений Chrome + МАГАЗИН РАСШИРЕНИЙ.
   ----------------------------------------------------------------------------
   Три источника расширений:
     1. Магазин: каталог популярных + живой поиск по Chrome Web Store +
        установка по ID. CRX скачивается с официального сервера обновлений
        Google (clients2.google.com/service/update2/crx), распаковывается
        в userData/extensions/<id> и загружается через session.loadExtension.
     2. Загрузка распакованной папки с manifest.json.
     3. Автовосстановление включённых расширений при запуске (settings.json).
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { session, net } = require('electron');
const store = require('./config');

const AdmZip = require('adm-zip');

const LOAD_OPTS = { allowFileAccess: true };

/* Каталог «Выбор Aera»: верифицированные ID Chrome Web Store. */
const CATALOG = [
  { id: 'ddkjiahejlhfcafbddmgiahcphecmpfh', name: 'uBlock Origin Lite', cat: 'Приватность', desc: 'Лёгкий блокировщик рекламы и трекеров на движке Manifest V3' },
  { id: 'bgnkhhnnamicmpeenaelnjfhikgbkllg', name: 'AdGuard AdBlocker', cat: 'Приватность', desc: 'Блокировка рекламы, попапов и баннеров с фильтрами AdGuard' },
  { id: 'cfhdojbkjhnklbpkdaibdccddilifddb', name: 'Adblock Plus', cat: 'Приватность', desc: 'Классический блокировщик рекламы с приёмлемыми объявлениями' },
  { id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh', name: 'Dark Reader', cat: 'Оформление', desc: 'Тёмная тема для всех сайтов с настройкой яркости и контраста' },
  { id: 'clngdbkpkpeebahjckkjfobafhncgmne', name: 'Stylus', cat: 'Оформление', desc: 'Пользовательские CSS-темы для любых сайтов' },
  { id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', name: 'Grammarly', cat: 'Работа', desc: 'Проверка грамматики и стиля английского текста при наборе' },
  { id: 'dhdgffkkebhmkfjojejmpbldmpobfkfo', name: 'Tampermonkey', cat: 'Инструменты', desc: 'Менеджер пользовательских скриптов (userscripts)' },
  { id: 'nffaoalbilbmmfgbnbgppjihopabppdk', name: 'Video Speed Controller', cat: 'Инструменты', desc: 'Ускорение/замедление HTML5-видео горячими клавишами' },
  { id: 'aapbdbdomjkkjkaonfhkkikfgjllcleb', name: 'Google Переводчик', cat: 'Работа', desc: 'Перевод выделенного текста и страниц в один клик' },
  { id: 'hdhinadidafjejdhmfkjgnolgimiaplp', name: 'Read Aloud', cat: 'Инструменты', desc: 'Чтение текста страниц вслух (TTS)' },
  { id: 'nngceckbapebfimnlniiiahkandclblb', name: 'Bitwarden', cat: 'Пароли', desc: 'Бесплатный менеджер паролей с открытым исходным кодом' },
  { id: 'hdokiejnpimakedhajhdlcegeplioahd', name: 'LastPass', cat: 'Пароли', desc: 'Менеджер паролей с автозаполнением форм' },
  { id: 'bmnlcjabgnpnenekpadlanbbkooimhnj', name: 'Honey', cat: 'Покупки', desc: 'Автоматический поиск и применение купонов при покупках' },
  { id: 'gmehookibnphigonphocphhcepbijeen', name: 'Picture-in-Picture', cat: 'Инструменты', desc: 'Плавающее окно для любого HTML5-видео' },
  { id: 'mmioliijnhnoblpgimnlajmefafdfilb', name: 'Shazam', cat: 'Медиа', desc: 'Определение играющей песни прямо в браузере' },
  { id: 'kgjfgplpablkjnlkjmjdecgdpfankdle', name: 'Zoom Scheduler', cat: 'Работа', desc: 'Планирование и запуск видеоконференций Zoom' }
];

/* Версия Chromium для сервера обновлений Google — чем новее, тем новее CRX. */
function prodVersion() {
  try { return process.versions.chrome || '132.0.0.0'; } catch (e) { return '132.0.0.0'; }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' +
  prodVersion() + ' Safari/537.36';

/* ---------- API расширений (Electron 25+: session.extensions) ---------- */
function extApi() {
  const ses = session.defaultSession;
  if (ses.extensions && typeof ses.extensions.loadExtension === 'function') return ses.extensions;
  return ses;
}

function extensionsDir() {
  const dir = store.userDataFile('extensions');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* noop */ }
  return dir;
}

/* ---------- persistence ---------- */
function persistList(mutator) {
  const list = (store.loadSettings().exts || []).slice();
  const next = mutator(list);
  if (next) store.saveSettings({ exts: next });
}

/* ==================================================================
   БАЗОВЫЕ ОПЕРАЦИИ
   ================================================================== */

function loadFromPath(dir) {
  const result = { ok: false, error: null, ext: null };
  try {
    if (!dir || typeof dir !== 'string') throw new Error('Папка не выбрана');
    if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
      throw new Error('В выбранной папке нет manifest.json');
    }
    const ext = extApi().loadExtension(dir, LOAD_OPTS);
    persistList((list) => {
      const out = list.filter((e) => e.path !== dir);
      out.push({ id: ext.id, path: dir, enabled: true });
      return out;
    });
    result.ok = true;
    result.ext = { id: ext.id, name: ext.name, version: ext.version };
  } catch (e) {
    result.error = (e && e.message) || 'Не удалось загрузить расширение';
  }
  return result;
}

/* При запуске восстанавливаем все включённые расширения прошлой сессии.
   Вызывается ОТЛОЖЕННО (после показа окна) — чтобы не тормозить старт. */
function initFromSettings() {
  const list = store.loadSettings().exts || [];
  let changed = false;
  for (const entry of list) {
    if (entry.enabled === false) continue;
    try {
      if (!fs.existsSync(path.join(entry.path, 'manifest.json'))) continue;
      const ext = extApi().loadExtension(entry.path, LOAD_OPTS);
      if (entry.id !== ext.id) { entry.id = ext.id; changed = true; }
    } catch (e) { /* несовместимое расширение пропускаем */ }
  }
  if (changed) store.saveSettings({ exts: list });
}

function list() {
  const persisted = store.loadSettings().exts || [];
  let exts = [];
  try { exts = extApi().getAllExtensions(); } catch (e) { exts = []; }
  return exts.map((e) => {
    const p = persisted.find((x) => x.path === e.path) || {};
    let icon = null;
    try {
      const icons = e.manifest && e.manifest.icons;
      if (icons) {
        const key = icons['16'] ? '16' : (icons['32'] ? '32' : Object.keys(icons)[0]);
        if (key) icon = 'file://' + path.join(e.path, icons[key]);
      }
    } catch (err) { icon = null; }
    return {
      id: e.id,
      name: e.name || 'Расширение',
      version: e.version || '',
      path: e.path,
      icon,
      enabled: p.enabled !== false
    };
  });
}

function toggle(id) {
  const ext = extApi().getExtension(id);
  if (!ext) return { ok: false, error: 'Расширение не найдено' };
  const list = store.loadSettings().exts || [];
  const entry = list.find((x) => x.path === ext.path);
  try { extApi().removeExtension(id); } catch (e) { /* noop */ }
  if (entry) entry.enabled = entry.enabled === false;
  if (entry && entry.enabled !== false) {
    try {
      const again = extApi().loadExtension(ext.path, LOAD_OPTS);
      entry.id = again.id;
    } catch (e) { /* не удалось вернуть — останется выключенным */ }
  }
  store.saveSettings({ exts: list });
  return { ok: true };
}

function remove(id) {
  const ext = extApi().getExtension(id);
  try { extApi().removeExtension(id); } catch (e) { /* noop */ }
  if (ext) {
    const list = (store.loadSettings().exts || []).filter((x) => x.path !== ext.path);
    store.saveSettings({ exts: list });
    // установленные из магазина: удаляем файлы с диска
    try {
      const owned = path.join(extensionsDir(), ext.id);
      if (ext.path.startsWith(extensionsDir()) && fs.existsSync(owned)) {
        fs.rmSync(owned, { recursive: true, force: true });
      }
    } catch (e) { /* noop */ }
  }
  return { ok: true };
}

/* ==================================================================
   МАГАЗИН: CRX-загрузка с официального сервера Google
   ================================================================== */

function crxUrl(extId) {
  const x = encodeURIComponent('id=' + extId + '&installsource=ondemand&uc');
  return 'https://clients2.google.com/service/update2/crx' +
    '?response=redirect&acceptformat=crx2,crx3&prod=chromiumcrx' +
    '&prodversion=' + prodVersion() + '&os=win&arch=x64&nacl_arch=x86-64&x=' + x;
}

/** Парсинг заголовка CRX (v2/v3) и возврат буфера ZIP-части. */
function crxToZip(buffer) {
  if (buffer.length < 16 || buffer.toString('ascii', 0, 4) !== 'Cr24') {
    throw new Error('Файл не является CRX-пакетом');
  }
  const version = buffer.readUInt32LE(4);
  if (version === 2) {
    const pubLen = buffer.readUInt32LE(8);
    const sigLen = buffer.readUInt32LE(12);
    return buffer.subarray(16 + pubLen + sigLen);
  }
  if (version === 3) {
    const headerLen = buffer.readUInt32LE(8);
    return buffer.subarray(12 + headerLen);
  }
  throw new Error('Неподдерживаемая версия CRX: ' + version);
}

/** Скачивает файл по https (с редиректами и таймаутом). */
async function download(url, maxBytes) {
  const resp = await net.fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': UA, 'Accept': '*/*' },
    redirect: 'follow'
  });
  if (!resp.ok) throw new Error('Сервер ответил ' + resp.status);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (maxBytes && buf.length > maxBytes) throw new Error('Файл слишком большой');
  if (!buf.length) throw new Error('Пустой ответ сервера');
  return buf;
}

const installProgress = { listeners: [] };
function progress(id, phase, pct, msg) {
  const payload = { id, phase, pct, msg: msg || '' };
  for (const fn of installProgress.listeners) {
    try { fn(payload); } catch (e) { /* noop */ }
  }
  try {
    const { sendToHost } = require('./windowState');
    sendToHost('extension-install-progress', payload);
  } catch (e) { /* noop */ }
}

function onInstallProgress(fn) { installProgress.listeners.push(fn); }

/** Установка из магазина по ID расширения. */
async function installFromStore(extId) {
  const id = String(extId || '').trim();
  if (!/^[a-p]{32}$/i.test(id)) {
    return { ok: false, error: 'Некорректный ID расширения Chrome Web Store (32 символа a-p)' };
  }
  const target = path.join(extensionsDir(), id);
  const tmpZip = path.join(os.tmpdir(), 'aera-ext-' + crypto.randomBytes(6).toString('hex') + '.zip');
  try {
    progress(id, 'download', 5, 'Скачивание с Chrome Web Store…');
    const crx = await download(crxUrl(id), 120 * 1024 * 1024);
    progress(id, 'download', 55, 'Получено ' + Math.round(crx.length / 1024) + ' КБ');

    progress(id, 'unpack', 65, 'Распаковка пакета…');
    const zipBuf = crxToZip(crx);
    fs.writeFileSync(tmpZip, zipBuf);
    fs.rmSync(target, { recursive: true, force: true });
    const zip = new AdmZip(tmpZip);
    zip.extractAllTo(target, true);

    if (!fs.existsSync(path.join(target, 'manifest.json'))) {
      throw new Error('В пакете нет manifest.json — расширение несовместимо');
    }

    progress(id, 'load', 88, 'Подключение расширения…');
    let ext;
    try {
      ext = extApi().loadExtension(target, LOAD_OPTS);
    } catch (e) {
      throw new Error('Расширение не удалось подключить: ' + ((e && e.message) || 'несовместимый manifest'));
    }

    persistList((list) => {
      const out = list.filter((e) => e.path !== target && e.id !== ext.id);
      out.push({ id: ext.id, path: target, enabled: true });
      return out;
    });
    progress(id, 'done', 100, 'Готово');
    return { ok: true, ext: { id: ext.id, name: ext.name, version: ext.version } };
  } catch (e) {
    try { fs.rmSync(target, { recursive: true, force: true }); } catch (e2) { /* noop */ }
    return { ok: false, error: (e && e.message) || 'Ошибка установки' };
  } finally {
    try { fs.rmSync(tmpZip, { force: true }); } catch (e) { /* noop */ }
  }
}

/* ==================================================================
   МАГАЗИН: поиск и каталог
   ================================================================== */

const searchCache = new Map();   // query -> { at, items }
const SEARCH_TTL = 10 * 60 * 1000;

/** Парсит страницу выдачи Chrome Web Store: пары slug/id. */
function parseSearchHtml(html, limit) {
  const seen = new Set();
  const items = [];
  const re = /detail\/([a-z0-9-]+)\/([a-p]{32})/g;
  let m;
  while ((m = re.exec(html)) && items.length < (limit || 12)) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const name = m[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ id, name, url: 'https://chromewebstore.google.com/detail/' + m[1] + '/' + id });
  }
  return items;
}

function metaTag(html, prop) {
  const re = new RegExp('<meta[^>]+(?:property|name)="' + prop + '"[^>]+content="([^"]*)"', 'i');
  const m = re.exec(html);
  if (m) return m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return '';
}

/** Живой поиск по Chrome Web Store (без API-ключей, парсинг выдачи). */
async function storeSearch(query, limit) {
  const q = String(query || '').trim();
  const cap = Math.min(16, Math.max(4, Number(limit) || 12));
  if (!q) return { ok: true, items: CATALOG.slice(0, cap), catalog: true };

  const cached = searchCache.get(q.toLowerCase());
  if (cached && Date.now() - cached.at < SEARCH_TTL) {
    return { ok: true, items: cached.items.slice(0, cap) };
  }
  try {
    const resp = await net.fetch(
      'https://chromewebstore.google.com/search/' + encodeURIComponent(q),
      { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8' } }
    );
    if (!resp.ok) throw new Error('CWS ответил ' + resp.status);
    const html = await resp.text();
    const base = parseSearchHtml(html, cap);
    if (!base.length) throw new Error('Ничего не найдено');
    /* Подтягиваем живые метаданные (имя/иконка/описание) для первых результатов. */
    const items = [];
    const chunk = base.slice(0, Math.min(cap, 8));
    const details = await Promise.all(chunk.map(async (it) => {
      try {
        const d = await storeDetail(it.id);
        if (d && d.ok) return d.ext;
      } catch (e) { /* noop */ }
      return { id: it.id, name: it.name, desc: '', icon: null };
    }));
    for (const d of details) items.push(d);
    searchCache.set(q.toLowerCase(), { at: Date.now(), items });
    return { ok: true, items };
  } catch (e) {
    /* Нет сети / блокировка CWS — фильтруем встроенный каталог. */
    const lower = q.toLowerCase();
    const items = CATALOG.filter((c) =>
      c.name.toLowerCase().includes(lower) ||
      (c.desc || '').toLowerCase().includes(lower) ||
      (c.cat || '').toLowerCase().includes(lower)
    ).slice(0, cap);
    return { ok: false, offline: true, items, error: (e && e.message) || 'Поиск недоступен' };
  }
}

/** Метаданные расширения из его страницы в Chrome Web Store. */
async function storeDetail(extId) {
  const id = String(extId || '').trim();
  if (!/^[a-p]{32}$/i.test(id)) return { ok: false, error: 'Некорректный ID' };
  /* Сначала каталог «Выбор Aera» — мгновенный ответ. */
  const cat = CATALOG.find((c) => c.id === id);
  if (cat) {
    return { ok: true, ext: { id: cat.id, name: cat.name, desc: cat.desc, cat: cat.cat, icon: null } };
  }
  try {
    const resp = await net.fetch('https://chromewebstore.google.com/detail/' + id, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8' }
    });
    if (!resp.ok) throw new Error('CWS ответил ' + resp.status);
    const html = await resp.text();
    const name = metaTag(html, 'og:title') || metaTag(html, 'title');
    const desc = metaTag(html, 'og:description') || metaTag(html, 'description');
    const icon = metaTag(html, 'og:image') || metaTag(html, 'image') || null;
    return { ok: true, ext: { id, name: name || 'Расширение', desc, icon } };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Не удалось получить данные' };
  }
}

function getCatalog() {
  return { ok: true, items: CATALOG.slice() };
}

module.exports = {
  loadFromPath, initFromSettings, list, toggle, remove,
  installFromStore, storeSearch, storeDetail, getCatalog,
  onInstallProgress, CATALOG
};
