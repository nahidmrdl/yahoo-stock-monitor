(function () {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  window.StockMonitor.dom = {
    els: {
      body: document.body,
      cards: $('#cards'),
      emptyState: $('#emptyState'),
      addForm: $('#addForm'),
      symbolInput: $('#symbolInput'),
      refreshConfigForm: $('#refreshConfigForm'),
      refreshIntervalInput: $('#refreshIntervalInput'),
      statusText: $('#statusText'),
      widgetPageText: $('#widgetPageText'),
      refreshCountdownText: $('#refreshCountdownText'),
      lastUpdated: $('#lastUpdated'),
      refreshNowBtn: $('#refreshNowBtn'),
      pauseBtn: $('#pauseBtn'),
      alwaysOnTopBtn: $('#alwaysOnTopBtn'),
      viewModeBtn: $('#viewModeBtn'),
      widgetBackBtn: $('#widgetBackBtn'),
      refreshIntervalLabel: $('#refreshIntervalLabel'),
      template: $('#stockCardTemplate')
    },
    $,
    $$
  };
})();
