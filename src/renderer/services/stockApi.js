(function () {
  function getApi() {
    if (!window.stockApi) {
      throw new Error('Stock API preload bridge is unavailable.');
    }

    return window.stockApi;
  }

  window.StockMonitor.stockApi = {
    fetchStocks(symbols) {
      return getApi().fetchStocks(symbols);
    },
    fetchChart(symbol, range) {
      return getApi().fetchChart(symbol, range);
    },
    getWindowState() {
      return getApi().getWindowState();
    },
    setAlwaysOnTop(enabled) {
      return getApi().setAlwaysOnTop(enabled);
    },
    setWindowPreset(preset) {
      return getApi().setWindowPreset(preset);
    },
    getLaunchAtLogin() {
      return getApi().getLaunchAtLogin();
    },
    setLaunchAtLogin(enabled) {
      return getApi().setLaunchAtLogin(enabled);
    },
    listWidgets() {
      return getApi().listWidgets();
    },
    createWidget(options) {
      return getApi().createWidget(options);
    },
    closeWidget(id) {
      return getApi().closeWidget(id);
    },
    closeCurrentWidget() {
      return getApi().closeCurrentWidget();
    },
    onWidgetsChanged(callback) {
      return getApi().onWidgetsChanged(callback);
    }
  };
})();
