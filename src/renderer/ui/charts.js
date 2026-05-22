(function () {
  const { els } = window.StockMonitor.dom;
  const { chartLabel, formatPrice } = window.StockMonitor.formatting;

  const charts = new Map();

  function destroyAll() {
    charts.forEach((chart) => chart.destroy());
    charts.clear();
  }

  function createChart(symbol, canvas, options = {}) {
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderWidth: options.focused ? 3 : 2,
            pointRadius: 0,
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items) => items?.[0]?.label || '',
              label: (item) => formatPrice(item.parsed.y)
            }
          }
        },
        scales: {
          x: { display: false, grid: { display: false } },
          y: { display: false, grid: { display: false } }
        }
      }
    });

    charts.set(symbol, chart);
    return chart;
  }

  function showChartError(symbol, message) {
    const card = els.cards.querySelector(`[data-symbol="${CSS.escape(symbol)}"]`);
    const error = card?.querySelector('.error');

    if (error) {
      error.textContent = message || 'Chart failed to load.';
      error.classList.remove('hidden');
    }
  }

  async function refreshCharts({ symbols, chartRange, stockApi }) {
    if (!symbols.length) return;

    await Promise.allSettled(
      symbols.map(async (symbol) => {
        const chart = charts.get(symbol);
        if (!chart) return;

        const result = await stockApi.fetchChart(symbol, chartRange);

        if (!result?.ok) {
          showChartError(symbol, result?.error);
          return;
        }

        const points = result.points || [];
        chart.data.labels = points.map((point) => chartLabel(point, chartRange));
        chart.data.datasets[0].data = points.map((point) => point.close);

        const first = points[0]?.close;
        const last = points[points.length - 1]?.close;
        const computedStyle = getComputedStyle(document.documentElement);
        const green = computedStyle.getPropertyValue('--green').trim();
        const red = computedStyle.getPropertyValue('--red').trim();

        chart.data.datasets[0].borderColor =
          typeof first === 'number' && typeof last === 'number' && last < first ? red : green;

        chart.update();
      })
    );
  }

  window.StockMonitor.charts = {
    createChart,
    destroyAll,
    refreshCharts
  };
})();
