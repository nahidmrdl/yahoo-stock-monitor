const { contextBridge, ipcRenderer } = require('electron');

const allowedRanges = new Set(['1d', '5d', '1mo', '6mo', '1y']);
const allowedPresets = new Set(['fullscreen', 'widget']);

function normalizeSymbols(symbols) {
  if (!Array.isArray(symbols)) return [];
  return symbols.map((symbol) => String(symbol || '').trim().toUpperCase()).filter(Boolean);
}

contextBridge.exposeInMainWorld('stockApi', {
  fetchStocks: (symbols) => ipcRenderer.invoke('stocks:fetch', normalizeSymbols(symbols)),
  fetchChart: (symbol, range) => {
    const cleanSymbol = String(symbol || '').trim().toUpperCase();
    const cleanRange = allowedRanges.has(range) ? range : '1d';
    return ipcRenderer.invoke('stocks:chart', cleanSymbol, cleanRange);
  },
  getWindowState: () => ipcRenderer.invoke('app:get-window-state'),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('app:set-always-on-top', Boolean(enabled)),
  setWindowPreset: (preset) => {
    const cleanPreset = allowedPresets.has(preset) ? preset : 'fullscreen';
    return ipcRenderer.invoke('app:set-window-preset', cleanPreset);
  }
});
