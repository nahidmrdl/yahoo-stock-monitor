(function () {
  const {
    cards,
    charts,
    controls,
    dom,
    stockApi,
    storage,
    timers
  } = window.StockMonitor;

  const state = {
    symbols: storage.loadSymbols(),
    chartRange: storage.loadChartRange(),
    refreshIntervalSeconds: storage.loadRefreshIntervalSeconds(),
    paused: false,
    isRefreshing: false
  };

  function getVisibleSymbols() {
    return state.symbols;
  }

  function render() {
    cards.renderCards({
      symbols: state.symbols,
      visibleSymbols: getVisibleSymbols(),
      viewMode: 'fullscreen',
      focusedSymbol: '',
      onRemove: removeSymbol,
      onMove: moveSymbol,
      onMoveBefore: moveSymbolBefore,
      onCreateWidget: createTickerWidget,
      onFocus: () => {}
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

  async function refreshWidgetList() {
    try {
      const result = await stockApi.listWidgets();
      renderWidgetList(result?.widgets || []);
    } catch (error) {
      controls.setStatus(`Widget list failed: ${error?.message || error}`);
    }
  }

  function renderWidgetList(widgets) {
    dom.els.widgetCount.textContent = `${widgets.length}/15`;
    dom.els.widgetList.innerHTML = '';

    if (!widgets.length) {
      const empty = document.createElement('p');
      empty.className = 'widget-empty';
      empty.textContent = 'No desktop widgets yet.';
      dom.els.widgetList.appendChild(empty);
      return;
    }

    widgets.forEach((widget) => {
      const row = document.createElement('div');
      row.className = 'widget-row';

      const label = document.createElement('span');
      label.textContent = widget.symbol;

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'secondary';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', async () => {
        await stockApi.closeWidget(widget.id);
        await refreshWidgetList();
      });

      row.append(label, closeBtn);
      dom.els.widgetList.appendChild(row);
    });
  }

  async function createTickerWidget(symbol) {
    const result = await stockApi.createWidget({
      symbol,
      range: state.chartRange,
      refreshIntervalSeconds: state.refreshIntervalSeconds
    });

    if (!result?.ok) {
      controls.setStatus(result?.error || 'Could not create widget.');
      return;
    }

    if (result.launchAtLogin) {
      dom.els.launchAtLoginToggle.checked = true;
    }

    controls.setStatus(`Created desktop widget for ${symbol}.`);
    renderWidgetList(result.widgets || []);
  }

  function scheduleNextRefresh() {
    timers.scheduleRefresh({
      seconds: state.refreshIntervalSeconds,
      paused: state.paused,
      onRefresh: refreshAll,
      onPaused: () => controls.setStatus('Paused.')
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

  function init() {
    controls.initControls({
      state,
      storage,
      onAddSymbol: addSymbol,
      onRefreshNow: refreshAll,
      onPauseToggle,
      onRangeChange,
      onRefreshIntervalChange,
      onLaunchAtLoginToggle: async (enabled) => {
        const result = await stockApi.setLaunchAtLogin(enabled);
        dom.els.launchAtLoginToggle.checked = Boolean(result.enabled);
        controls.setStatus(result.enabled ? 'Widgets will reopen when Windows starts.' : 'Start with Windows disabled.');
      }
    });

    timers.setRefreshLabels(state.refreshIntervalSeconds, state.paused);
    render();
    refreshWidgetList();
    stockApi.onWidgetsChanged(renderWidgetList);
    stockApi.getLaunchAtLogin().then((result) => {
      dom.els.launchAtLoginToggle.checked = Boolean(result.enabled);
    });
    refreshAll();
  }

  init();
})();
