(function () {
  function formatPrice(value) {
    if (typeof value !== 'number') return '-';

    if (Math.abs(value) >= 1000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    if (Math.abs(value) >= 1) {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }

  function formatChange(change, percent) {
    if (typeof change !== 'number' || typeof percent !== 'number') return '-';

    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} / ${sign}${percent.toFixed(2)}%`;
  }

  function formatTime(iso) {
    if (!iso) return '';

    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (_) {
      return '';
    }
  }

  function chartLabel(point, range) {
    const date = new Date(point.time);

    if (range === '1d' || range === '5d') {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  }

  window.StockMonitor.formatting = {
    chartLabel,
    formatChange,
    formatPrice,
    formatTime
  };
})();
