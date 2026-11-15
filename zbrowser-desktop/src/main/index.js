'use strict';

/* ============================================================================
   Aera 2.0 — точка входа главного процесса.
   Модульная сборка: config (settings.json) -> flags (Chromium) ->
   ua/stealth (anti-bot) -> adblock -> darkmode -> extensions -> downloads ->
   window -> ipc -> menu.
   ============================================================================ */

const { app, session, nativeTheme, webContents, clipboard, Menu, BrowserWindow } = require('electron');
const store = require('./config');
const flags = require('./flags');
const ua = require('./ua');
const stealth = require('./stealth');
const adblock = require('./adblock');
const security = require('./security');
const darkmode = require('./darkmode');
const extensions = require('./extensions');
const passwords = require('./passwords');
const downloads = require('./downloads');
const menuMod = require('./menu');
const { createWindow } = require('./window');
const state = require('./windowState');
const ipc = require('./ipc');
const runtime = require('./runtimeState');

/* ---- настройки читаем до app.ready: от них зависят флаги движка ---- */
const bootSettings = store.loadSettings();
flags.applyBootFlags(bootSettings);
runtime.setAdBlock(bootSettings.adBlock !== false);
runtime.setDownloadsAsk(bootSettings.downloadsAsk === true);
runtime.setHttpsOnly(bootSettings.httpsOnly !== false);
runtime.setDnt(bootSettings.dnt !== false);
runtime.setTightReferrer(bootSettings.tightReferrer !== false);
runtime.setBlock3p(bootSettings.block3p === true);

/* User-Agent по умолчанию для ВСЕХ сессий — чистый Chrome без Electron. */
app.userAgentFallback = ua.CHROME_UA;

/* ---- одна копия браузера ---- */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = state.getWin();
    if (w) {
      if (w.isMinimized()) w.restore();
      w.show();
      w.focus();
    }
  });
}

/* ---- контекстное меню внутри webview ---- */
function showGuestContextMenu(wc, params) {
  const items = [];
  if (params.linkURL) {
    items.push({
      label: 'Открыть в новой вкладке',
      click: () => state.sendToHost('open-url-in-new-tab', { url: params.linkURL, background: false })
    });
    items.push({
      label: 'Открыть в фоновой вкладке',
      click: () => state.sendToHost('open-url-in-new-tab', { url: params.linkURL, background: true })
    });
    items.push({ label: 'Копировать адрес ссылки', click: () => clipboard.writeText(params.linkURL) });
    items.push({ type: 'separator' });
  }
  if (params.mediaType === 'image' && params.srcURL) {
    items.push({
      label: 'Открыть изображение в новой вкладке',
      click: () => state.sendToHost('open-url-in-new-tab', { url: params.srcURL, background: false })
    });
    items.push({
      label: 'Сохранить изображение как...',
      click: () => { try { wc.downloadURL(params.srcURL); } catch (e) { /* noop */ } }
    });
    items.push({
      label: 'Копировать изображение',
      click: () => { try { wc.copyImageAt(params.x, params.y); } catch (e) { /* noop */ } }
    });
    items.push({ type: 'separator' });
  }
  if (params.selectionText) {
    items.push({ label: 'Копировать', click: () => clipboard.writeText(params.selectionText) });
    items.push({ type: 'separator' });
  }

  /* ---- менеджер паролей: автозаполнение по клику правой в поле ---- */
  const isEditable = params.isEditable || params.inputFieldType === 'password';
  if (isEditable) {
    try {
      const saved = passwords.findForSite(wc.getURL());
      if (saved.length) {
        const pwItems = saved.slice(0, 5).map((entry) => ({
          label: 'Заполнить: ' + entry.username + ' (' + entry.site + ')',
          click: () => {
            const r = passwords.reveal(entry.id);
            if (r.ok) state.sendToHost('pw-autofill', { username: r.username, password: r.password });
          }
        }));
        items.push({ label: 'Пароли Aera', submenu: pwItems });
        items.push({ type: 'separator' });
      }
    } catch (e) { /* не критично */ }
  }

  items.push({ label: 'Назад', enabled: wc.canGoBack(), click: () => wc.goBack() });
  items.push({ label: 'Вперёд', enabled: wc.canGoForward(), click: () => wc.goForward() });
  items.push({ label: 'Обновить', click: () => wc.reload() });
  items.push({ type: 'separator' });
  items.push({ label: 'Настройки', click: () => menuMod.sendCmd('open-settings') });
  items.push({
    label: 'Проверить элемент',
    click: () => { try { wc.inspectElement(params.x, params.y); } catch (e) { /* noop */ } }
  });
  const w = state.getWin();
  Menu.buildFromTemplate(items).popup({ window: w });
}

/* ---- сессии гостей (обычная + инкогнито + любые partition) ---- */
const sessionsConfigured = new WeakSet();

function ensureSessionConfigured(ses) {
  if (!ses || sessionsConfigured.has(ses)) return;
  sessionsConfigured.add(ses);

  ua.install(ses);
  adblock.install(ses, () => runtime.isAdBlock());
  security.install(ses);
  downloads.install(ses);
  try { ses.setSpellCheckerEnabled(false); } catch (e) { /* noop */ }

  ses.setPermissionRequestHandler((wc, permission, callback) => {
    const allowed = ['media', 'audioCapture', 'videoCapture', 'geolocation', 'fullscreen',
      'pointerLock', 'clipboard-sanitized-write', 'notifications'];
    callback(allowed.includes(permission));
  });
}

app.whenReady().then(() => {
  const def = session.defaultSession;
  ensureSessionConfigured(def);

  /* ---- БЫСТРЫЙ СТАРТ ----
     Сначала IPC (нужен рендереру сразу после loadFile), затем меню и окно.
     Всё тяжёлое (CDP-тёмная тема, восстановление расширений, обновление
     списка фильтров) выполняется ПОСЛЕ показа окна, фоновыми таймерами. */
  ipc.registerAll();
  menuMod.buildMenu();
  createWindow();

  setTimeout(() => {
    try {
      darkmode.init();
      darkmode.setSiteTheme(bootSettings.siteTheme || 'system');
      darkmode.applyAll();
    } catch (e) { /* noop */ }
    setTimeout(() => { try { extensions.initFromSettings(); } catch (e) { /* noop */ } }, 250);
    try { adblock.updateInBackground(); } catch (e) { /* noop */ }
  }, 260);

  /* ---- webview-гости: политика, stealth, тёмная тема, фон ---- */
  const updateGuestBackgrounds = () => {
    const bg = darkmode.guestBackground();
    try {
      for (const wc of webContents.getAllWebContents()) {
        if (wc.getType() === 'webview') {
          try { wc.setBackgroundColor(bg); } catch (err) { /* noop */ }
        }
      }
    } catch (e) { /* noop */ }
    darkmode.applyAll();
  };
  try { nativeTheme.on('updated', updateGuestBackgrounds); } catch (e) { /* noop */ }

  app.on('web-contents-created', (event, wc) => {
    if (wc.getType() === 'webview') {
      ensureSessionConfigured(wc.session);
      wc.on('focus', () => state.setFocusedGuest(wc));
      try { wc.setBackgroundColor(darkmode.guestBackground()); } catch (e) { /* noop */ }
      /* CDP-подключение (перекраска сайтов) откладываем: attachment отладчика
         у каждой вкладки замедляет открытие новых вкладок. */
      setTimeout(() => { try { if (!wc.isDestroyed()) darkmode.apply(wc); } catch (e) { /* noop */ } }, 400);

      // Освобождаем протокол отладчика, пока открыт DevTools, и возвращаем после.
      wc.on('devtools-opened', () => {
        try { if (wc.debugger.isAttached()) wc.debugger.detach(); } catch (e) { /* noop */ }
      });
      wc.on('devtools-closed', () => { setTimeout(() => { try { if (!wc.isDestroyed()) darkmode.apply(wc); } catch (e) { /* noop */ } }, 200); });

      // Цели окон (_blank, window.open) -> новая вкладка; инкогнито наследуется.
      wc.setWindowOpenHandler(({ url, disposition }) => {
        if (url && url !== 'about:blank') {
          const incognito = wc.session && wc.session !== session.defaultSession;
          state.sendToHost('open-url-in-new-tab', {
            url,
            background: disposition === 'background-tab',
            incognito: !!incognito
          });
        }
        return { action: 'deny' };
      });

      wc.on('context-menu', (e, params) => showGuestContextMenu(wc, params));
    }

    // Stealth-preload в главный мир каждой webview-страницы.
    wc.on('will-attach-webview', (e, webPreferences, params) => {
      stealth.applyWebviewPreferences(webPreferences);
      void params;
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
