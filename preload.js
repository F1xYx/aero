const { contextBridge, ipcRenderer } = require('electron');

const HOST_CHANNELS = ['cmd', 'open-url-in-new-tab', 'download-toast', 'win-state'];

contextBridge.exposeInMainWorld('zdesktop', {
  isDesktop: true,
  info: () => ipcRenderer.invoke('get-app-info'),
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window-toggle-max'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openDownloadsFolder: () => ipcRenderer.invoke('window-open-downloads'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data'),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  setUiScale: (factor) => ipcRenderer.send('set-ui-scale', factor),
  setDownloadsAsk: (ask) => ipcRenderer.send('set-downloads-ask', ask),
  setForceDark: (on) => ipcRenderer.send('set-force-dark', on),
  setAdBlock: (on) => ipcRenderer.send('set-adblock', on),
  on: (channel, cb) => {
    if (!HOST_CHANNELS.includes(channel) || typeof cb !== 'function') return;
    ipcRenderer.on(channel, (event, data) => cb(data));
  }
});
