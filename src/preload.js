const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stockApi', {
  fetchStocks: (symbols) => ipcRenderer.invoke('stocks:fetch', symbols),
  fetchChart: (symbol, range) => ipcRenderer.invoke('stocks:chart', symbol, range),
  getWindowState: () => ipcRenderer.invoke('app:get-window-state'),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('app:set-always-on-top', enabled)
});