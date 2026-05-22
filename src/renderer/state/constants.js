(function () {
  window.StockMonitor = window.StockMonitor || {};

  window.StockMonitor.constants = {
    DEFAULT_SYMBOLS: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD'],
    DEFAULT_REFRESH_SECONDS: 30,
    MIN_REFRESH_SECONDS: 5,
    MAX_REFRESH_SECONDS: 3600,
    WIDGET_PAGE_SIZE: 12,
    WIDGET_PAGE_CYCLE_SECONDS: 15,
    CHART_RANGES: ['1d', '5d', '1mo', '6mo', '1y', 'max'],
    STORAGE_KEYS: {
      SYMBOLS: 'stock-monitor-symbols-v1',
      RANGE: 'stock-monitor-chart-range-v1',
      REFRESH_INTERVAL: 'stock-monitor-refresh-interval-seconds-v1'
    }
  };
})();
