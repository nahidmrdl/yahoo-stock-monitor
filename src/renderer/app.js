(function () {
  const {
    cards,
    charts,
    constants,
    controls,
    dom,
    modes,
    stockApi,
    storage,
    timers
  } = window.StockMonitor;

  const state = {
    symbols: storage.loadSymbols(),
    chartRange: storage.loadChartRange(),
    refreshIntervalSeconds: storage.loadRefreshIntervalSeconds(),
    viewMode: storage.loadViewMode(),
    focusedSymbol: storage.loadFocusedSymbol(),
    visiblePage: 0,
    paused: false,
    isRefreshing: false
  };

  function ensureValidFocus() {
    if (state.focusedSymbol && !state.symbols.includes(state.focusedSymbol)) {
      state.focusedSymbol = storage.saveFocusedSymbol('');
    }
  }

  function getTotalPages() {
    return modes.getTotalWidgetPages(state.symbols);
  }

  function getVisibleSymbols() {
    if (state.visiblePage >= getTotalPages()) state.visiblePage = 0;

    return modes.getVisibleSymbols({
      symbols: state.symbols,
      viewMode: state.viewMode,
      focusedSymbol: state.focusedSymbol,
      visiblePage: state.visiblePage
    });
  }

  function updateModeUi() {
    modes.updateModeUi({
      symbols: state.symbols,
      viewMode: state.viewMode,
      focusedSymbol: state.focusedSymbol,
      visiblePage: state.visiblePage
    });
  }

  function render() {
    ensureValidFocus();
    updateModeUi();

    cards.renderCards({
      symbols: state.symbols,
      visibleSymbols: getVisibleSymbols(),
      viewMode: state.viewMode,
      focusedSymbol: state.focusedSymbol,
      onRemove: removeSymbol,
      onMove: moveSymbol,
      onMoveBefore: moveSymbolBefore,
      onFocus: focusWidgetSymbol
    });
  }

  function persistSymbols() {
    storage.saveSymbols(state.symbols);
  }

  function addSymbol(rawSymbol) {
    const symbol = storage.normalizeSymbol(rawSymbol);
    if (!symbol) return;

    if (state.symbols.includes(symbol)) {
      controls.setStatus(`${symbol} is already in your watchlist.`);
      return;
    }

    state.symbols = [...state.symbols, symbol];
    persistSymbols();
    render();
    refreshAll();
  }

  function removeSymbol(symbol) {
    state.symbols = state.symbols.filter((item) => item !== symbol);
    cards.removeCachedStock(symbol);

    if (state.focusedSymbol === symbol) {
      state.focusedSymbol = storage.saveFocusedSymbol('');
    }

    persistSymbols();
    render();
    refreshAll();
  }

  function moveSymbol(symbol, direction) {
    const currentIndex = state.symbols.indexOf(symbol);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= state.symbols.length) return;

    const nextSymbols = [...state.symbols];
    const [item] = nextSymbols.splice(currentIndex, 1);
    nextSymbols.splice(nextIndex, 0, item);

    state.symbols = nextSymbols;
    persistSymbols();
    render();
    refreshVisibleCharts();
  }

  function moveSymbolBefore(fromSymbol, toSymbol) {
    const fromIndex = state.symbols.indexOf(fromSymbol);
    const toIndex = state.symbols.indexOf(toSymbol);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const nextSymbols = [...state.symbols];
    const [item] = nextSymbols.splice(fromIndex, 1);
    const adjustedToIndex = nextSymbols.indexOf(toSymbol);
    nextSymbols.splice(adjustedToIndex, 0, item);

    state.symbols = nextSymbols;
    persistSymbols();
    render();
    refreshVisibleCharts();
  }

  function focusWidgetSymbol(symbol) {
    state.focusedSymbol = storage.saveFocusedSymbol(symbol);
    render();
    refreshVisibleCharts();
  }

  function scheduleNextRefresh() {
    timers.scheduleRefresh({
      seconds: state.refreshIntervalSeconds,
      paused: state.paused,
      onRefresh: refreshAll,
      onPaused: () => controls.setStatus('Paused.')
    });
  }

  function startWidgetCycle() {
    timers.startWidgetCycle({
      getState: () => ({
        viewMode: state.viewMode,
        focusedSymbol: state.focusedSymbol,
        totalPages: getTotalPages()
      }),
      onCycle: () => {
        state.visiblePage = (state.visiblePage + 1) % getTotalPages();
        render();
        refreshVisibleCharts();
      }
    });
  }

  async function refreshQuotes() {
    if (state.isRefreshing || state.paused) return;

    if (!state.symbols.length) {
      dom.els.lastUpdated.textContent = 'No tickers added.';
      controls.setStatus('Add a ticker to start.');
      scheduleNextRefresh();
      return;
    }

    state.isRefreshing = true;
    controls.setStatus('Refreshing quotes...');

    try {
      const result = await stockApi.fetchStocks(state.symbols);

      if (result?.stocks) {
        result.stocks.forEach(cards.updateCard);
      }

      const time = new Date(result?.fetchedAt || Date.now());
      dom.els.lastUpdated.textContent = `Last updated ${time.toLocaleTimeString()}`;

      if (result?.error && !result?.ok) {
        controls.setStatus(result.error);
      } else {
        controls.setStatus(`Updated ${state.symbols.length} ticker${state.symbols.length === 1 ? '' : 's'}.`);
      }
    } catch (error) {
      controls.setStatus(`Quote refresh failed: ${error?.message || error}`);
    } finally {
      state.isRefreshing = false;
      scheduleNextRefresh();
    }
  }

  function refreshVisibleCharts() {
    return charts.refreshCharts({
      symbols: getVisibleSymbols(),
      chartRange: state.chartRange,
      stockApi
    });
  }

  async function refreshAll() {
    await refreshQuotes();
    await refreshVisibleCharts();
  }

  async function onRangeChange(range) {
    state.chartRange = storage.saveChartRange(range);
    controls.setStatus(`Loading ${state.chartRange.toUpperCase()} charts...`);
    await refreshVisibleCharts();
    controls.setStatus(`Charts updated for ${state.chartRange.toUpperCase()}.`);
  }

  async function onViewModeToggle() {
    state.viewMode =
      state.viewMode === constants.VIEW_MODES.WIDGET
        ? constants.VIEW_MODES.DASHBOARD
        : constants.VIEW_MODES.WIDGET;

    if (state.viewMode === constants.VIEW_MODES.DASHBOARD) {
      state.focusedSymbol = storage.saveFocusedSymbol('');
      state.visiblePage = 0;
    }

    state.viewMode = storage.saveViewMode(state.viewMode);
    updateModeUi();

    await modes.applyWindowPreset({
      viewMode: state.viewMode,
      stockApi,
      onAlwaysOnTopChanged: controls.setPinnedState
    });

    render();
    refreshVisibleCharts();
  }

  function onWidgetBack() {
    state.focusedSymbol = storage.saveFocusedSymbol('');
    render();
    refreshVisibleCharts();
  }

  function onPauseToggle() {
    state.paused = !state.paused;
    scheduleNextRefresh();

    if (!state.paused) {
      refreshAll();
    }
  }

  function onRefreshIntervalChange(nextSeconds) {
    state.refreshIntervalSeconds = storage.saveRefreshIntervalSeconds(nextSeconds);
    dom.els.refreshIntervalInput.value = String(state.refreshIntervalSeconds);
    controls.setStatus(`Refresh interval saved: every ${state.refreshIntervalSeconds}s.`);
    scheduleNextRefresh();
  }

  async function initWindowState() {
    try {
      const windowState = await stockApi.getWindowState();
      controls.setPinnedState(Boolean(windowState.alwaysOnTop));
    } catch (_) {}
  }

  function init() {
    controls.initControls({
      state,
      storage,
      stockApi,
      onAddSymbol: addSymbol,
      onRefreshNow: refreshAll,
      onPauseToggle,
      onRangeChange,
      onViewModeToggle,
      onWidgetBack,
      onRefreshIntervalChange
    });

    timers.setRefreshLabels(state.refreshIntervalSeconds, state.paused);
    render();
    initWindowState();
    modes.applyWindowPreset({
      viewMode: state.viewMode,
      stockApi,
      onAlwaysOnTopChanged: controls.setPinnedState
    });
    startWidgetCycle();
    refreshAll();
  }

  init();
})();
