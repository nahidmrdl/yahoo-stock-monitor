(function () {
  const { els, $$ } = window.StockMonitor.dom;

  function setStatus(message) {
    els.statusText.textContent = message;
  }

  function setPinnedState(isPinned) {
    els.alwaysOnTopBtn.classList.toggle('pinned', Boolean(isPinned));
    els.alwaysOnTopBtn.textContent = isPinned ? 'Pinned' : 'Pin window';
  }

  function initControls({
    state,
    storage,
    stockApi,
    onAddSymbol,
    onRefreshNow,
    onPauseToggle,
    onRangeChange,
    onViewModeToggle,
    onWidgetBack,
    onRefreshIntervalChange
  }) {
    els.refreshIntervalInput.value = String(state.refreshIntervalSeconds);
    els.refreshIntervalLabel.textContent = String(state.refreshIntervalSeconds);

    els.addForm.addEventListener('submit', (event) => {
      event.preventDefault();
      onAddSymbol(els.symbolInput.value);
      els.symbolInput.value = '';
      els.symbolInput.focus();
    });

    els.refreshConfigForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const nextSeconds = storage.clampRefreshInterval(els.refreshIntervalInput.value);
      els.refreshIntervalInput.value = String(nextSeconds);
      onRefreshIntervalChange(nextSeconds);
    });

    els.refreshIntervalInput.addEventListener('blur', () => {
      els.refreshIntervalInput.value = String(storage.clampRefreshInterval(els.refreshIntervalInput.value));
    });

    $$('.range-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.range === state.chartRange);

      btn.addEventListener('click', () => {
        $$('.range-btn').forEach((other) => other.classList.toggle('active', other === btn));
        onRangeChange(btn.dataset.range);
      });
    });

    els.refreshNowBtn.addEventListener('click', onRefreshNow);
    els.pauseBtn.addEventListener('click', onPauseToggle);
    els.viewModeBtn.addEventListener('click', onViewModeToggle);
    els.widgetBackBtn.addEventListener('click', onWidgetBack);

    els.alwaysOnTopBtn.addEventListener('click', async () => {
      const currentlyPinned = els.alwaysOnTopBtn.classList.contains('pinned');
      const result = await stockApi.setAlwaysOnTop(!currentlyPinned);
      setPinnedState(Boolean(result.alwaysOnTop));
    });

    $$('.link-btn[data-demo]').forEach((btn) => {
      btn.addEventListener('click', () => onAddSymbol(btn.dataset.demo));
    });
  }

  window.StockMonitor.controls = {
    initControls,
    setPinnedState,
    setStatus
  };
})();
