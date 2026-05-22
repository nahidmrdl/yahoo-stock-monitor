const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const Store = require('electron-store');
const yahooService = require('./main/yahooService');
const windowService = require('./main/windowService');

const store = new Store({
  defaults: {
    bounds: { width: 1180, height: 760 },
    alwaysOnTop: false
  }
});

let mainWindow;

function createWindow() {
  mainWindow = windowService.createWindow(store);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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

ipcMain.handle('stocks:fetch', async (_event, symbols) => {
  return yahooService.fetchStocks(symbols);
});

ipcMain.handle('stocks:chart', async (_event, symbol, range = '1d') => {
  return yahooService.fetchChart(symbol, range);
});
