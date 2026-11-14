'use strict';

/* ============================================================================
   Aera 2.0 — реестр IPC-обработчиков.
   Настройки (settings.json), тема сайтов, загрузки, расширения, окно.
   ============================================================================ */

const { ipcMain, dialog, shell, nativeTheme, app, session } = require('electron');
const store = require('./config');
const darkmode = require('./darkmode');
const downloads = require('./downloads');
const extensions = require('./extensions');
const passwords = require('./passwords');
const adblock = require('./adblock');
const runtime = require('./runtimeState');
const state = require('./windowState');

/* Разрешённые ключи настроек, которые рендерер может изменять.
   exts защищены: список расширений правят только IPC ext:*. */
const SETTING_KEYS = new Set([
  'engine', 'theme', 'siteTheme', 'startup', 'home', 'adBlock', 'hwAccel',
  'hibernate', 'pageZoom', 'downloadsAsk', 'wallpaper', 'accent', 'glass',
  'newtabAfterActive', 'dblCloseTab', 'wheelTabs', 'saveHistory', 'suggest',
  'uiScale', 'showBookmarks', 'animations',
  'httpsOnly', 'dnt', 'tightReferrer', 'block3p'
]);

function sanitizePatch(patch) {
  const out = {};
  if (!patch || typeof patch !== 'object') return out;
  for (const k of Object.keys(patch)) {
    if (!SETTING_KEYS.has(k)) continue;
    const v = patch[k];
    if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') {
      out[k] = v;
    }
  }
  return out;
}

function applyRuntimeSettings(s) {
  runtime.setAdBlock(s.adBlock !== false);
  runtime.setDownloadsAsk(s.downloadsAsk === true);
  downloads.setAsk(runtime.isDownloadsAsk());
  darkmode.setSiteTheme(s.siteTheme || 'system');
  try { nativeTheme.themeSource = s.theme || 'light'; } catch (e) { /* noop */ }
  /* центр защиты */
  runtime.setHttpsOnly(s.httpsOnly !== false);
  runtime.setDnt(s.dnt !== false);
  runtime.setTightReferrer(s.tightReferrer !== false);
  runtime.setBlock3p(s.block3p === true);
}

function registerAll() {
  const boot = store.loadSettings();
  applyRuntimeSettings(boot);

  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform
  }));

  /* ---- настройки (settings.json) ---- */
  ipcMain.handle('settings:get', () => store.loadSettings());

  ipcMain.handle('settings:patch', (e, patch) => {
    const clean = sanitizePatch(patch);
    const next = store.saveSettings(clean);
    applyRuntimeSettings(next);
    return next;
  });

  ipcMain.on('set-theme', (e, theme) => {
    if (theme === 'dark' || theme === 'light' || theme === 'system') {
      try { nativeTheme.themeSource = theme; } catch (err) { /* noop */ }
      darkmode.applyAll();
    }
  });

  ipcMain.on('set-site-theme', (e, v) => {
    darkmode.setSiteTheme(v);
    store.saveSettings({ siteTheme: darkmode.siteTheme });
  });

  ipcMain.on('set-adblock', (e, on) => {
    runtime.setAdBlock(!!on);
    store.saveSettings({ adBlock: runtime.isAdBlock() });
  });

  ipcMain.on('set-downloads-ask', (e, ask) => {
    runtime.setDownloadsAsk(!!ask);
    downloads.setAsk(runtime.isDownloadsAsk());
    store.saveSettings({ downloadsAsk: runtime.isDownloadsAsk() });
  });

  ipcMain.on('set-ui-scale', (e, factor) => {
    const f = Math.min(1.5, Math.max(0.8, Number(factor) || 1));
    const w = state.getWin();
    if (w && !w.isDestroyed()) {
      try { w.webContents.setZoomFactor(f); } catch (err) { /* noop */ }
    }
  });

  /* ---- окно ---- */
  ipcMain.on('window-close', () => { const w = state.getWin(); if (w) w.close(); });
  ipcMain.on('window-minimize', () => { const w = state.getWin(); if (w) w.minimize(); });
  ipcMain.on('window-toggle-max', () => {
    const w = state.getWin();
    if (!w) return;
    try { if (w.isMaximized()) w.unmaximize(); else w.maximize(); } catch (e) { /* noop */ }
  });
  ipcMain.handle('window-is-maximized', () => {
    const w = state.getWin();
    return w ? !!w.isMaximized() : false;
  });
  ipcMain.handle('window-open-downloads', async () => {
    try { await shell.openPath(app.getPath('downloads')); return true; } catch (e) { return false; }
  });
  ipcMain.on('open-external', (e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  /* ---- приватность ---- */
  ipcMain.handle('clear-browsing-data', async () => {
    try {
      const ses = session.defaultSession;
      await ses.clearCache();
      await ses.clearStorageData({ storages: ['cookies', 'indexdb', 'serviceworkers', 'cachestorage', 'websql'] });
      return true;
    } catch (e) {
      return false;
    }
  });

  /* ---- загрузки ---- */
  ipcMain.handle('downloads:list', () => downloads.list());
  ipcMain.handle('downloads:open-file', (e, id) => downloads.openFile(id));
  ipcMain.handle('downloads:show', (e, id) => downloads.showInFolder(id));
  ipcMain.handle('downloads:cancel', (e, id) => downloads.cancel(id));
  ipcMain.handle('downloads:clear-finished', () => { downloads.clearFinished(); return true; });

  /* ---- расширения ---- */
  ipcMain.handle('ext:list', () => ({ items: extensions.list() }));
  ipcMain.handle('ext:load', async () => {
    const w = state.getWin();
    let dir = null;
    try {
      const r = await dialog.showOpenDialog(w, {
        title: 'Выберите папку с распакованным расширением Chrome',
        properties: ['openDirectory'],
        buttonLabel: 'Загрузить'
      });
      if (r.canceled || !r.filePaths || !r.filePaths.length) {
        return { ok: false, canceled: true };
      }
      dir = r.filePaths[0];
    } catch (e) {
      return { ok: false, error: 'Не удалось открыть диалог выбора папки' };
    }
    const res = extensions.loadFromPath(dir);
    state.sendToHost('extensions-changed', {});
    return res;
  });
  ipcMain.handle('ext:toggle', (e, payload) => {
    const id = payload && payload.id;
    const res = extensions.toggle(id);
    state.sendToHost('extensions-changed', {});
    return res;
  });
  ipcMain.handle('ext:remove', (e, payload) => {
    const id = payload && payload.id;
    const res = extensions.remove(id);
    state.sendToHost('extensions-changed', {});
    return res;
  });

  /* ---- магазин расширений ---- */
  ipcMain.handle('ext:store-catalog', () => extensions.getCatalog());
  ipcMain.handle('ext:store-search', (e, payload) =>
    extensions.storeSearch(payload && payload.query, payload && payload.limit));
  ipcMain.handle('ext:store-detail', (e, payload) =>
    extensions.storeDetail(payload && payload.id));
  ipcMain.handle('ext:store-install', async (e, payload) => {
    const id = payload && payload.id;
    const res = await extensions.installFromStore(id);
    state.sendToHost('extensions-changed', {});
    return res;
  });

  /* ---- менеджер паролей ---- */
  ipcMain.handle('pw:list', () => ({ items: passwords.list() }));
  ipcMain.handle('pw:add', (e, payload) =>
    passwords.upsert({ site: payload && payload.site, username: payload && payload.username, password: payload && payload.password }));
  ipcMain.handle('pw:remove', (e, id) => passwords.remove(id));
  ipcMain.handle('pw:reveal', (e, id) => passwords.reveal(id));
  ipcMain.handle('pw:generate', (e, payload) => passwords.generate(payload && payload.length));
  ipcMain.handle('pw:for-site', (e, payload) => ({ items: passwords.findForSite(payload && payload.site) }));

  /* ---- блокировщик рекламы: статистика ---- */
  ipcMain.handle('adblock:stats', () => adblock.getStatsSnapshot());
}

module.exports = { registerAll };
