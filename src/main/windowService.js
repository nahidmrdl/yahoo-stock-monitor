const path = require('path');
const { BrowserWindow } = require('electron');

const WINDOW_PRESETS = {
  fullscreen: {
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    alwaysOnTop: null
  },
  widget: {
    width: 560,
    height: 700,
    minWidth: 520,
    minHeight: 650,
    alwaysOnTop: true
  }
};

function createMainWindow({ store, preloadPath, rendererPath }) {
  const bounds = store.get('bounds') || WINDOW_PRESETS.fullscreen;
  const alwaysOnTop = store.get('alwaysOnTop');

  const window = new BrowserWindow({
    width: bounds.width || WINDOW_PRESETS.fullscreen.width,
    height: bounds.height || WINDOW_PRESETS.fullscreen.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 430,
    minHeight: 520,
    backgroundColor: '#101014',
    title: 'Yahoo Stock Monitor',
    alwaysOnTop,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(rendererPath);

  window.on('close', () => {
    if (window.isDestroyed()) return;
    store.set('bounds', window.getBounds());
    store.set('alwaysOnTop', window.isAlwaysOnTop());
  });

  return window;
}

function createWindow(store) {
  return createMainWindow({
    store,
    preloadPath: path.join(__dirname, '..', 'preload.js'),
    rendererPath: path.join(__dirname, '..', 'renderer', 'index.html')
  });
}

function applyWindowPreset(window, store, presetName) {
  if (!window) return { ok: false };

  const preset = WINDOW_PRESETS[presetName] || WINDOW_PRESETS.fullscreen;
  window.setMinimumSize(preset.minWidth, preset.minHeight);
  window.setSize(preset.width, preset.height, true);

  if (typeof preset.alwaysOnTop === 'boolean') {
    window.setAlwaysOnTop(preset.alwaysOnTop);
    store.set('alwaysOnTop', preset.alwaysOnTop);
  }

  return {
    ok: true,
    preset: presetName === 'widget' ? 'widget' : 'fullscreen',
    alwaysOnTop: window.isAlwaysOnTop()
  };
}

function getWindowState(window) {
  return {
    alwaysOnTop: window ? window.isAlwaysOnTop() : false
  };
}

function setAlwaysOnTop(window, store, enabled) {
  const value = Boolean(enabled);
  if (window) window.setAlwaysOnTop(value);
  store.set('alwaysOnTop', value);
  return { alwaysOnTop: value };
}

module.exports = {
  WINDOW_PRESETS,
  applyWindowPreset,
  createWindow,
  getWindowState,
  setAlwaysOnTop
};
