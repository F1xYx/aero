/* Aero Browser - main process (Electron) */
const { app, BrowserWindow, ipcMain, shell, nativeTheme, session } = require('electron');
const path = require('path');

const APP_VERSION = require('./package.json').version;

// Present sites with a standard Chrome UA (Electron 31 = Chromium 126).
// Without this, many sites detect "Electron" in the UA and serve
// degraded/blocked pages (Google login, YouTube, WhatsApp Web, etc.)
app.userAgentFallback =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/126.0.0.0 Safari/537.36';

let mainWindow = null;

// Keep a smooth, GPU-accelerated shell with sane defaults
app.commandLine.appendSwitch('enable-smooth-scrolling');
app.commandLine.appendSwitch('disable-background-timer-throttling');

function createWindow() {
  nativeTheme.themeSource = 'dark'; // dark by default, renderer can switch later

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#16161a',
    title: 'Aero',
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const sendState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      mainWindow.webContents.send('window:state', {
        maximized: mainWindow.isMaximized(),
        fullscreen: mainWindow.isFullScreen()
      });
    } catch (_) {}
  };
  mainWindow.on('maximize', sendState);
  mainWindow.on('unmaximize', sendState);
  mainWindow.on('enter-full-screen', sendState);
  mainWindow.on('leave-full-screen', sendState);
  mainWindow.on('closed', () => { mainWindow = null; });

  // Block top-level navigation of the app shell itself
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && /^https?:/i.test(url)) {
      try { mainWindow.webContents.send('tabs:open-from-webview', url); } catch (_) {}
    }
    return { action: 'deny' };
  });
}

/* ---- Single instance ---- */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/* ---- webview helpers: make target=_blank / window.open open a new Aero tab ---- */
app.on('web-contents-created', (_e, wc) => {
  if (wc.getType() === 'webview' || wc.getType() === 'browserView') {
    wc.setWindowOpenHandler(({ url }) => {
      if (url && /^(https?|aero|aera):/i.test(url) && mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.webContents.send('tabs:open-from-webview', url); } catch (_) {}
      }
      return { action: 'deny' };
    });
    // middle-click / ctrl-click link handling for webview guests
    wc.on('before-input-event', (event, input) => {
      // let renderer handle accelerators; nothing to do here
    });
  }
});

/* ---- IPC ---- */
ipcMain.on('window:minimize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.minimize();
});

ipcMain.on('window:maximize-toggle', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (w.isFullScreen()) w.setFullScreen(false);
  else if (w.isMaximized()) w.unmaximize();
  else w.maximize();
});

ipcMain.on('window:close', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.close();
});

ipcMain.handle('window:get-state', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return { maximized: false, fullscreen: false };
  return { maximized: w.isMaximized(), fullscreen: w.isFullScreen() };
});

ipcMain.handle('app:version', () => APP_VERSION);

ipcMain.handle('app:platform', () => process.platform);

ipcMain.handle('shell:open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:/i.test(url)) shell.openExternal(url);
});

ipcMain.handle('session:clear-browsing-data', async () => {
  const s = session.defaultSession;
  try {
    await s.clearCache();
    await s.clearStorageData({
      storages: ['cachestorage', 'serviceworkers', 'shadercache', 'websql', 'indexdb', 'localstorage'],
      originFilter: (o) => !o.origin.startsWith('file://')
    });
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('theme:set-native', (_e, theme) => {
  const v = theme === 'light' ? 'light' : theme === 'auto' ? 'system' : 'dark';
  nativeTheme.themeSource = v;
  return true;
});
