(function () {
  const { constants } = window.StockMonitor;
  const { STORAGE_KEYS, DEFAULT_SYMBOLS, DEFAULT_REFRESH_SECONDS, MIN_REFRESH_SECONDS, MAX_REFRESH_SECONDS } =
    constants;

  function normalizeSymbol(symbol) {
    return String(symbol || '').trim().toUpperCase();
  }

  function normalizeSymbols(input) {
    return [...new Set((input || []).map(normalizeSymbol).filter(Boolean))];
  }

  function clampRefreshInterval(value) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return DEFAULT_REFRESH_SECONDS;
    return Math.min(MAX_REFRESH_SECONDS, Math.max(MIN_REFRESH_SECONDS, number));
  }

  function loadSymbols() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYMBOLS) || 'null');
      if (Array.isArray(parsed) && parsed.length) return normalizeSymbols(parsed);
    } catch (_) {}

    return [...DEFAULT_SYMBOLS];
  }

  function saveSymbols(symbols) {
    localStorage.setItem(STORAGE_KEYS.SYMBOLS, JSON.stringify(normalizeSymbols(symbols)));
  }

  function loadRefreshIntervalSeconds() {
    const saved = Number(localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL));
    if (Number.isFinite(saved)) return clampRefreshInterval(saved);
    return DEFAULT_REFRESH_SECONDS;
  }

  function saveRefreshIntervalSeconds(value) {
    const seconds = clampRefreshInterval(value);
    localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, String(seconds));
    return seconds;
  }

  function loadChartRange() {
    const saved = localStorage.getItem(STORAGE_KEYS.RANGE);
    return constants.CHART_RANGES.includes(saved) ? saved : '1mo';
  }

  function saveChartRange(range) {
    const value = constants.CHART_RANGES.includes(range) ? range : '1mo';
    localStorage.setItem(STORAGE_KEYS.RANGE, value);
    return value;
  }

  window.StockMonitor.storage = {
    clampRefreshInterval,
    loadChartRange,
    loadRefreshIntervalSeconds,
    loadSymbols,
    normalizeSymbol,
    normalizeSymbols,
    saveChartRange,
    saveRefreshIntervalSeconds,
    saveSymbols
  };
})();
