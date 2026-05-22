const { contextBridge, ipcRenderer } = require('electron');

const allowedRanges = new Set(['1d', '5d', '1mo', '6mo', '1y', 'max']);
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
  },
  openDashboard: () => ipcRenderer.invoke('app:open-dashboard'),
  getLaunchAtLogin: () => ipcRenderer.invoke('app:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('app:set-launch-at-login', Boolean(enabled)),
  listWidgets: () => ipcRenderer.invoke('widgets:list'),
  createWidget: (options) =>
    ipcRenderer.invoke('widgets:create', {
      symbol: String(options?.symbol || '').trim().toUpperCase(),
      range: allowedRanges.has(options?.range) ? options.range : '1mo',
      refreshIntervalSeconds: Number(options?.refreshIntervalSeconds) || 30
    }),
  closeWidget: (id) => ipcRenderer.invoke('widgets:close', String(id || '')),
  setWidgetRefreshInterval: (seconds) =>
    ipcRenderer.invoke('widgets:set-refresh-interval', Number(seconds) || 30),
  closeCurrentWidget: () => ipcRenderer.invoke('widgets:close-current'),
  updateCurrentWidget: (updates) =>
    ipcRenderer.invoke('widgets:update-current', {
      range: allowedRanges.has(updates?.range) ? updates.range : undefined,
      alwaysOnTop: typeof updates?.alwaysOnTop === 'boolean' ? updates.alwaysOnTop : undefined
    }),
  onWidgetsChanged: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, widgets) => callback(widgets);
    ipcRenderer.on('widgets:changed', listener);
    return () => ipcRenderer.removeListener('widgets:changed', listener);
  },
  onWidgetRefreshIntervalChanged: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, seconds) => callback(seconds);
    ipcRenderer.on('widgets:refresh-interval-changed', listener);
    return () => ipcRenderer.removeListener('widgets:refresh-interval-changed', listener);
  }
});
