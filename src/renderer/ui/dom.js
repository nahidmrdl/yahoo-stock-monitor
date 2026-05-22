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
      refreshCountdownText: $('#refreshCountdownText'),
      lastUpdated: $('#lastUpdated'),
      refreshNowBtn: $('#refreshNowBtn'),
      pauseBtn: $('#pauseBtn'),
      launchAtLoginToggle: $('#launchAtLoginToggle'),
      widgetList: $('#widgetList'),
      widgetCount: $('#widgetCount'),
      refreshIntervalLabel: $('#refreshIntervalLabel'),
      template: $('#stockCardTemplate')
    },
    $,
    $$
  };
})();
