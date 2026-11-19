'use strict';

/* ============================================================================
   Aera 2.0 — окно браузера (frameless, webviewTag).
   ============================================================================ */

const path = require('path');
const { BrowserWindow, app } = require('electron');
const { RENDERER_DIR, APP_ROOT } = require('./config');
const state = require('./windowState');

function iconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(APP_ROOT, 'build', 'icon.png');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 940,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#161620',
    icon: iconPath(),
    title: 'Aero',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  state.setWin(win);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(RENDERER_DIR, 'index.html'));
  win.on('closed', () => state.setWin(null));

  // Сообщаем рендереру о смене состояния окна (глиф кнопки «развернуть»).
  const sendState = () => {
    const w = state.getWin();
    if (w && !w.isDestroyed()) {
      try { w.webContents.send('win-state', { maximized: w.isMaximized() }); } catch (e) { /* noop */ }
    }
  };
  win.on('maximize', sendState);
  win.on('unmaximize', sendState);

  return win;
}

module.exports = { createWindow, iconPath };
