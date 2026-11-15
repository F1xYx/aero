'use strict';

/* ============================================================================
   Aera 2.0 — конфигурация и хранилище настроек (userData/settings.json).
   Все пути и постоянные настройки собираются здесь.
   ============================================================================ */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const APP_ROOT = path.join(__dirname, '..', '..');
const RENDERER_DIR = path.join(APP_ROOT, 'renderer');
const GUEST_PRELOAD = path.join(__dirname, '..', 'preload', 'guest.js');

function userDataFile(name) {
  return path.join(app.getPath('userData'), name);
}

/* Настройки, о которых должен знать главный процесс ещё до запуска окна
   (флаги движка, аппаратное ускорение, расширения). Остальные ключи
   хранятся в том же файле — рендерер дописывает свои через settings:patch. */
const SETTINGS_DEFAULTS = {
  engine: 'google',
  theme: 'light',
  siteTheme: 'system',
  startup: 'restore',
  home: 'newtab.html',
  adBlock: true,
  hwAccel: true,
  hibernate: true,
  pageZoom: 1,
  downloadsAsk: false,
  /* центр защиты (2.2) */
  httpsOnly: true,
  dnt: true,
  tightReferrer: true,
  block3p: false,
  exts: []
};

let cache = null;

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function loadSettings() {
  if (cache) return cache;
  let stored = readJson(userDataFile('settings.json'), null);
  if (!stored || typeof stored !== 'object') stored = {};

  // Миграция zboot.json (версии до 2.0): forceDarkSites -> siteTheme.
  const boot = readJson(userDataFile('zboot.json'), null);
  if (boot && typeof boot === 'object' && typeof stored.siteTheme !== 'string') {
    if (boot.forceDarkSites === true) stored.siteTheme = 'system';
  }

  const s = Object.assign({}, SETTINGS_DEFAULTS, stored);
  if (s.siteTheme !== 'system' && s.siteTheme !== 'force-dark' && s.siteTheme !== 'light') {
    s.siteTheme = 'system';
  }
  if (s.startup !== 'restore' && s.startup !== 'newtab') s.startup = 'restore';
  if (s.theme !== 'dark' && s.theme !== 'light' && s.theme !== 'system') s.theme = 'light';
  if (!Array.isArray(s.exts)) s.exts = [];
  s.pageZoom = Math.min(2, Math.max(0.5, Number(s.pageZoom) || 1));
  cache = s;
  return cache;
}

function saveSettings(patch) {
  const next = Object.assign({}, cache || loadSettings(), patch || {});
  cache = next;
  try {
    fs.writeFileSync(userDataFile('settings.json'), JSON.stringify(next, null, 2));
  } catch (e) { /* диск недоступен — настройки проживут до перезапуска */ }
  return next;
}

module.exports = { APP_ROOT, RENDERER_DIR, GUEST_PRELOAD, userDataFile, loadSettings, saveSettings };
