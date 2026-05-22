const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const Store = require('electron-store');
const yahooService = require('./main/yahooService');
const windowService = require('./main/windowService');

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

const store = new Store({
  defaults: {
    bounds: { width: 1180, height: 760 },
    alwaysOnTop: false,
    tickerWidgets: [],
    launchAtLogin: false
  }
});

let mainWindow;
const tickerWidgetWindows = new Map();
const ALLOWED_WIDGET_RANGES = new Set(['1d', '5d', '1mo', '6mo', '1y', 'max']);

function normalizeTickerWidget(widget) {
  return {
    id: String(widget.id),
    symbol: yahooService.normalizeSymbol(widget.symbol),
    range: ALLOWED_WIDGET_RANGES.has(widget.range) ? widget.range : '1d',
    refreshIntervalSeconds: Number(widget.refreshIntervalSeconds) || 30,
    bounds: widget.bounds || null
  };
}

function getTickerWidgets() {
  return (store.get('tickerWidgets') || [])
    .map(normalizeTickerWidget)
    .filter((widget) => widget.id && widget.symbol);
}

function saveTickerWidgets(widgets) {
  store.set('tickerWidgets', widgets.map(normalizeTickerWidget));
}

function sendTickerWidgetsToDashboard() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('widgets:changed', getTickerWidgets());
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = windowService.createWindow(store);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTickerWidgetWindow(widget) {
  if (tickerWidgetWindows.has(widget.id)) {
    const existingWindow = tickerWidgetWindows.get(widget.id);
    if (!existingWindow.isDestroyed()) {
      existingWindow.show();
      return existingWindow;
    }
  }

  const widgetWindow = windowService.createTickerWidget(widget);
  tickerWidgetWindows.set(widget.id, widgetWindow);

  const persistBounds = () => {
    const widgets = getTickerWidgets();
    const nextWidgets = widgets.map((item) =>
      item.id === widget.id ? { ...item, bounds: widgetWindow.getBounds() } : item
    );
    saveTickerWidgets(nextWidgets);
  };

  widgetWindow.on('moved', persistBounds);
  widgetWindow.on('resized', persistBounds);
  widgetWindow.on('closed', () => {
    tickerWidgetWindows.delete(widget.id);
  });

  return widgetWindow;
}

function restoreTickerWidgets() {
  getTickerWidgets().forEach(createTickerWidgetWindow);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  app.setLoginItemSettings({ openAtLogin: Boolean(store.get('launchAtLogin')) });
  createWindow();
  restoreTickerWidgets();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app:get-window-state', () => {
  return windowService.getWindowState(mainWindow);
});

ipcMain.handle('app:set-always-on-top', (_event, enabled) => {
  return windowService.setAlwaysOnTop(mainWindow, store, enabled);
});

ipcMain.handle('app:set-window-preset', (_event, preset) => {
  return windowService.applyWindowPreset(mainWindow, store, preset);
});

ipcMain.handle('app:get-launch-at-login', () => {
  return { enabled: Boolean(store.get('launchAtLogin')) };
});

ipcMain.handle('app:set-launch-at-login', (_event, enabled) => {
  const value = Boolean(enabled);
  store.set('launchAtLogin', value);
  app.setLoginItemSettings({ openAtLogin: value });
  return { enabled: value };
});

ipcMain.handle('widgets:list', () => {
  return { widgets: getTickerWidgets() };
});

ipcMain.handle('widgets:create', (_event, options = {}) => {
  const symbol = yahooService.normalizeSymbol(options.symbol);
  if (!symbol) return { ok: false, error: 'Missing symbol' };

  const widgets = getTickerWidgets();
  if (widgets.length >= 15) {
    return { ok: false, error: 'Widget limit reached. Close one before adding another.' };
  }

  const id = `${symbol}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const offset = widgets.length * 18;
  const widget = {
    id,
    symbol,
    range: options.range || '1d',
    refreshIntervalSeconds: Number(options.refreshIntervalSeconds) || 30,
    bounds: {
      width: windowService.TICKER_WIDGET_PRESET.width,
      height: windowService.TICKER_WIDGET_PRESET.height,
      x: 80 + offset,
      y: 80 + offset
    }
  };

  saveTickerWidgets([...widgets, widget]);
  createTickerWidgetWindow(widget);
  store.set('launchAtLogin', true);
  app.setLoginItemSettings({ openAtLogin: true });
  sendTickerWidgetsToDashboard();

  return { ok: true, widget, widgets: getTickerWidgets(), launchAtLogin: true };
});

ipcMain.handle('widgets:close', (_event, id) => {
  const widgetId = String(id || '');
  const widgetWindow = tickerWidgetWindows.get(widgetId);

  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close();
  }

  saveTickerWidgets(getTickerWidgets().filter((widget) => widget.id !== widgetId));
  sendTickerWidgetsToDashboard();
  return { ok: true, widgets: getTickerWidgets() };
});

ipcMain.handle('widgets:close-current', (event) => {
  const widgetWindow = BrowserWindow.fromWebContents(event.sender);
  if (!widgetWindow) return { ok: false };

  const entry = Array.from(tickerWidgetWindows.entries()).find(([, window]) => window === widgetWindow);
  if (entry) {
    const [id] = entry;
    saveTickerWidgets(getTickerWidgets().filter((widget) => widget.id !== id));
    tickerWidgetWindows.delete(id);
  }

  widgetWindow.close();
  sendTickerWidgetsToDashboard();
  return { ok: true };
});

ipcMain.handle('widgets:update-current', (event, updates = {}) => {
  const widgetWindow = BrowserWindow.fromWebContents(event.sender);
  if (!widgetWindow) return { ok: false };

  const entry = Array.from(tickerWidgetWindows.entries()).find(([, window]) => window === widgetWindow);
  if (!entry) return { ok: false };

  const [id] = entry;
  const widgets = getTickerWidgets();
  const nextWidgets = widgets.map((widget) =>
    widget.id === id
      ? {
          ...widget,
          range: ALLOWED_WIDGET_RANGES.has(updates.range) ? updates.range : widget.range,
          bounds: widgetWindow.getBounds()
        }
      : widget
  );

  saveTickerWidgets(nextWidgets);
  sendTickerWidgetsToDashboard();

  return { ok: true, widget: nextWidgets.find((widget) => widget.id === id) };
});

ipcMain.handle('stocks:fetch', async (_event, symbols) => {
  return yahooService.fetchStocks(symbols);
});

ipcMain.handle('stocks:chart', async (_event, symbol, range = '1d') => {
  return yahooService.fetchChart(symbol, range);
});
