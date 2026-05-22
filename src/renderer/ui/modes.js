(function () {
  const { els } = window.StockMonitor.dom;
  const { WIDGET_PAGE_CYCLE_SECONDS, WIDGET_PAGE_SIZE } = window.StockMonitor.constants;

  function getTotalWidgetPages(symbols) {
    return Math.max(1, Math.ceil(symbols.length / WIDGET_PAGE_SIZE));
  }

  function getVisibleSymbols({ symbols, viewMode, focusedSymbol, visiblePage }) {
    if (viewMode === 'fullscreen') return symbols;

    if (focusedSymbol && symbols.includes(focusedSymbol)) {
      return [focusedSymbol];
    }

    const page = Math.min(visiblePage, getTotalWidgetPages(symbols) - 1);
    const start = page * WIDGET_PAGE_SIZE;
    return symbols.slice(start, start + WIDGET_PAGE_SIZE);
  }

  function updateModeUi({ symbols, viewMode, focusedSymbol, visiblePage }) {
    const isWidget = viewMode === 'widget';
    const isFocused = isWidget && Boolean(focusedSymbol);
    const totalPages = getTotalWidgetPages(symbols);

    els.body.classList.toggle('widget-mode', isWidget);
    els.body.classList.toggle('widget-focus-mode', isFocused);

    els.viewModeBtn.textContent = isWidget ? 'Dashboard mode' : 'Widget mode';
    els.widgetBackBtn.classList.toggle('hidden', !isWidget || !isFocused);

    if (isWidget && !isFocused && symbols.length > WIDGET_PAGE_SIZE) {
      els.widgetPageText.textContent = `Page ${visiblePage + 1}/${totalPages} / cycles every ${WIDGET_PAGE_CYCLE_SECONDS}s`;
      els.widgetPageText.classList.remove('hidden');
    } else if (isWidget && isFocused) {
      els.widgetPageText.textContent = `Focused: ${focusedSymbol}`;
      els.widgetPageText.classList.remove('hidden');
    } else {
      els.widgetPageText.textContent = '';
      els.widgetPageText.classList.add('hidden');
    }
  }

  async function applyWindowPreset({ viewMode, stockApi, onAlwaysOnTopChanged }) {
    try {
      const result = await stockApi.setWindowPreset(viewMode === 'widget' ? 'widget' : 'fullscreen');

      if (result && typeof result.alwaysOnTop === 'boolean') {
        onAlwaysOnTopChanged(result.alwaysOnTop);
      }
    } catch (_) {}
  }

  window.StockMonitor.modes = {
    applyWindowPreset,
    getTotalWidgetPages,
    getVisibleSymbols,
    updateModeUi
  };
})();
