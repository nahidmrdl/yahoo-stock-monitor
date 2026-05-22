(function () {
  const { els, $$ } = window.StockMonitor.dom;

  function setStatus(message) {
    els.statusText.textContent = message;
  }

  function initControls({
    state,
    storage,
    onAddSymbol,
    onRefreshNow,
    onPauseToggle,
    onRangeChange,
    onRefreshIntervalChange,
    onLaunchAtLoginToggle
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

    els.launchAtLoginToggle.addEventListener('change', () => {
      onLaunchAtLoginToggle(els.launchAtLoginToggle.checked);
    });

    $$('.link-btn[data-demo]').forEach((btn) => {
      btn.addEventListener('click', () => onAddSymbol(btn.dataset.demo));
    });
  }

  window.StockMonitor.controls = {
    initControls,
    setStatus
  };
})();
