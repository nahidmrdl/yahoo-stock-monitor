(function () {
  const { els } = window.StockMonitor.dom;
  const { WIDGET_PAGE_CYCLE_SECONDS } = window.StockMonitor.constants;

  let refreshTimer = null;
  let countdownTimer = null;
  let widgetCycleTimer = null;
  let nextRefreshAt = null;

  function clearRefreshTimers() {
    clearTimeout(refreshTimer);
    clearInterval(countdownTimer);
  }

  function setRefreshLabels(seconds, paused) {
    els.refreshIntervalLabel.textContent = String(seconds);

    if (paused) {
      els.refreshCountdownText.textContent = 'Next refresh: paused';
    } else {
      els.refreshCountdownText.textContent = `Next refresh in ${seconds}s`;
    }
  }

  function scheduleRefresh({ seconds, paused, onRefresh, onPaused }) {
    clearRefreshTimers();
    setRefreshLabels(seconds, paused);

    if (paused) {
      els.pauseBtn.textContent = 'Resume';
      if (onPaused) onPaused();
      return;
    }

    els.pauseBtn.textContent = 'Pause';
    nextRefreshAt = Date.now() + seconds * 1000;
    refreshTimer = setTimeout(onRefresh, seconds * 1000);

    countdownTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
      els.refreshCountdownText.textContent = `Next refresh in ${remaining}s`;
    }, 500);
  }

  function startWidgetCycle({ getState, onCycle }) {
    clearInterval(widgetCycleTimer);

    widgetCycleTimer = setInterval(() => {
      const state = getState();
      if (state.viewMode !== 'widget' || state.focusedSymbol || state.totalPages <= 1) return;
      onCycle();
    }, WIDGET_PAGE_CYCLE_SECONDS * 1000);
  }

  window.StockMonitor.timers = {
    scheduleRefresh,
    setRefreshLabels,
    startWidgetCycle
  };
})();
