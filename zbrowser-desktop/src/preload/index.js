'use strict';

/* ============================================================================
   Aera 2.0 — preload мост (contextBridge).
   Безопасный API window.zdesktop для рендерера: окно, настройки,
   загрузки, расширения, подписки на события главного процесса.
   ============================================================================ */

const { contextBridge, ipcRenderer } = require('electron');

const HOST_CHANNELS = [
  'cmd',
  'open-url-in-new-tab',
  'download-toast',
  'download-update',
  'extensions-changed',
  'extension-install-progress',
  'pw-autofill',
  'adblock-stats',
  'win-state'
];

contextBridge.exposeInMainWorld('zdesktop', {
  isDesktop: true,

  /* информация и настройки */
  info: () => ipcRenderer.invoke('get-app-info'),
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsPatch: (patch) => ipcRenderer.invoke('settings:patch', patch),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  setSiteTheme: (v) => ipcRenderer.send('set-site-theme', v),
  setAdBlock: (on) => ipcRenderer.send('set-adblock', on),
  setDownloadsAsk: (ask) => ipcRenderer.send('set-downloads-ask', ask),
  setUiScale: (factor) => ipcRenderer.send('set-ui-scale', factor),

  /* окно */
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window-toggle-max'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openDownloadsFolder: () => ipcRenderer.invoke('window-open-downloads'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data'),

  /* загрузки */
  downloadsList: () => ipcRenderer.invoke('downloads:list'),
  downloadOpenFile: (id) => ipcRenderer.invoke('downloads:open-file', id),
  downloadShowInFolder: (id) => ipcRenderer.invoke('downloads:show', id),
  downloadCancel: (id) => ipcRenderer.invoke('downloads:cancel', id),
  downloadsClearFinished: () => ipcRenderer.invoke('downloads:clear-finished'),

  /* расширения */
  extensionsList: () => ipcRenderer.invoke('ext:list'),
  extensionLoad: () => ipcRenderer.invoke('ext:load'),
  extensionToggle: (id) => ipcRenderer.invoke('ext:toggle', { id }),
  extensionRemove: (id) => ipcRenderer.invoke('ext:remove', { id }),

  /* магазин расширений */
  extensionStoreCatalog: () => ipcRenderer.invoke('ext:store-catalog'),
  extensionStoreSearch: (query, limit) => ipcRenderer.invoke('ext:store-search', { query, limit }),
  extensionStoreDetail: (id) => ipcRenderer.invoke('ext:store-detail', { id }),
  extensionStoreInstall: (id) => ipcRenderer.invoke('ext:store-install', { id }),

  /* менеджер паролей */
  pwList: () => ipcRenderer.invoke('pw:list'),
  pwAdd: (site, username, password) => ipcRenderer.invoke('pw:add', { site, username, password }),
  pwRemove: (id) => ipcRenderer.invoke('pw:remove', id),
  pwReveal: (id) => ipcRenderer.invoke('pw:reveal', id),
  pwGenerate: (length) => ipcRenderer.invoke('pw:generate', { length }),

  /* блокировщик рекламы */
  adblockStats: () => ipcRenderer.invoke('adblock:stats'),

  /* подписки на события главного процесса */
  on: (channel, cb) => {
    if (!HOST_CHANNELS.includes(channel) || typeof cb !== 'function') return;
    ipcRenderer.on(channel, (event, data) => cb(data));
  }
});
