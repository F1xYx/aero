/* Aero Browser - preload bridge */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  version: () => ipcRenderer.invoke('app:version'),
  windowState: () => ipcRenderer.invoke('window:get-state'),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximizeToggle: () => ipcRenderer.send('window:maximize-toggle'),
  close: () => ipcRenderer.send('window:close'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  clearBrowsingData: () => ipcRenderer.invoke('session:clear-browsing-data'),
  setNativeTheme: (theme) => ipcRenderer.invoke('theme:set-native', theme),
  onWindowState: (cb) => ipcRenderer.on('window:state', (_e, state) => cb(state)),
  onOpenFromWebview: (cb) => ipcRenderer.on('tabs:open-from-webview', (_e, url) => cb(url))
});
