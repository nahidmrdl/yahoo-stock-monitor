(function () {
  const params = new URLSearchParams(window.location.search);
  const symbol = String(params.get('symbol') || '').trim().toUpperCase();
  let range = params.get('range') || '1mo';
  const refreshSeconds = Math.min(3600, Math.max(5, Number(params.get('refresh')) || 30));
  const { formatChange, formatPrice, chartLabel } = window.StockMonitor.formatting;

  const els = {
    symbol: document.querySelector('#widgetSymbol'),
    status: document.querySelector('#widgetStatus'),
    price: document.querySelector('#widgetPrice'),
    currency: document.querySelector('#widgetCurrency'),
    change: document.querySelector('#widgetChange'),
    countdown: document.querySelector('#widgetCountdown'),
    dashboardBtn: document.querySelector('#widgetDashboardBtn'),
    closeBtn: document.querySelector('#widgetCloseBtn'),
    rangeButtons: Array.from(document.querySelectorAll('.ticker-widget-ranges button')),
    chart: document.querySelector('#widgetChart')
  };

  let nextRefreshAt = Date.now() + refreshSeconds * 1000;
  let refreshTimer = null;
  let countdownTimer = null;

  const chart = new Chart(els.chart, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHitRadius: 14,
          tension: 0.35,
          fill: true,
          backgroundColor: 'rgba(53, 208, 127, 0.12)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          callbacks: {
            title: (items) => items?.[0]?.label || '',
            label: (item) => formatPrice(item.parsed.y)
          }
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });

  function setStatus(message) {
    els.status.textContent = message;
  }

  function setActiveRange(nextRange) {
    range = nextRange;
    els.rangeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.range === range);
    });
  }

  function updateQuote(stock) {
    els.symbol.textContent = stock.symbol || symbol;
    els.price.textContent = formatPrice(stock.price);
    els.currency.textContent = stock.currency || '';
    els.change.textContent = formatChange(stock.change, stock.changePercent);
    els.change.classList.remove('positive', 'negative');

    if (typeof stock.change === 'number') {
      els.change.classList.add(stock.change >= 0 ? 'positive' : 'negative');
    }

    if (stock.error) {
      setStatus('Quote error');
    } else {
      setStatus(stock.marketState || 'Live');
    }
  }

  async function refreshQuote() {
    const result = await window.stockApi.fetchStocks([symbol]);
    const stock = result?.stocks?.[0];
    if (stock) updateQuote(stock);
  }

  async function refreshChart() {
    const result = await window.stockApi.fetchChart(symbol, range);
    if (!result?.ok) return;

    const points = result.points || [];
    chart.data.labels = points.map((point) => chartLabel(point, range));
    chart.data.datasets[0].data = points.map((point) => point.close);
    chart.options.scales.x.ticks = {
      maxTicksLimit: range === '1d' || range === '5d' ? 5 : 4
    };

    const first = points[0]?.close;
    const last = points[points.length - 1]?.close;
    const green = getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
    const red = getComputedStyle(document.documentElement).getPropertyValue('--red').trim();
    const color = typeof first === 'number' && typeof last === 'number' && last < first ? red : green;

    chart.data.datasets[0].borderColor = color;
    chart.data.datasets[0].backgroundColor =
      color === red ? 'rgba(255, 95, 109, 0.12)' : 'rgba(53, 208, 127, 0.12)';
    chart.update();
  }

  async function refreshAll() {
    try {
      setStatus('Refreshing');
      await Promise.allSettled([refreshQuote(), refreshChart()]);
    } catch (error) {
      setStatus('Refresh failed');
    } finally {
      scheduleNextRefresh();
    }
  }

  function scheduleNextRefresh() {
    clearTimeout(refreshTimer);
    nextRefreshAt = Date.now() + refreshSeconds * 1000;
    refreshTimer = setTimeout(refreshAll, refreshSeconds * 1000);
  }

  function startCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
      els.countdown.textContent = `Next ${remaining}s`;
    }, 500);
  }

  els.closeBtn.addEventListener('click', () => {
    window.stockApi.closeCurrentWidget();
  });

  els.dashboardBtn.addEventListener('click', () => {
    window.stockApi.openDashboard();
  });

  els.rangeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      setActiveRange(button.dataset.range);
      await window.stockApi.updateCurrentWidget({ range });
      await refreshChart();
    });
  });

  els.symbol.textContent = symbol || '----';
  els.countdown.textContent = `Next ${refreshSeconds}s`;
  setActiveRange(range);
  startCountdown();
  refreshAll();
})();
