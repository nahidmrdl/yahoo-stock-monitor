const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD'];
const DEFAULT_REFRESH_SECONDS = 30;
const MIN_REFRESH_SECONDS = 5;
const MAX_REFRESH_SECONDS = 3600;

const STORAGE_KEY = 'stock-monitor-symbols-v1';
const RANGE_KEY = 'stock-monitor-chart-range-v1';
const REFRESH_INTERVAL_KEY = 'stock-monitor-refresh-interval-seconds-v1';

const cardsEl = document.querySelector('#cards');
const emptyStateEl = document.querySelector('#emptyState');
const addForm = document.querySelector('#addForm');
const symbolInput = document.querySelector('#symbolInput');
const refreshConfigForm = document.querySelector('#refreshConfigForm');
const refreshIntervalInput = document.querySelector('#refreshIntervalInput');
const statusText = document.querySelector('#statusText');
const lastUpdated = document.querySelector('#lastUpdated');
const refreshNowBtn = document.querySelector('#refreshNowBtn');
const pauseBtn = document.querySelector('#pauseBtn');
const alwaysOnTopBtn = document.querySelector('#alwaysOnTopBtn');
const refreshSeconds = document.querySelector('#refreshSeconds');
const template = document.querySelector('#stockCardTemplate');

let symbols = loadSymbols();
let chartRange = localStorage.getItem(RANGE_KEY) || '1d';
let refreshIntervalSeconds = loadRefreshIntervalSeconds();
let paused = false;
let refreshTimer = null;
let countdownTimer = null;
let nextRefreshAt = null;
let charts = new Map();
let latestStocks = new Map();
let isRefreshing = false;
let draggedSymbol = null;

function loadSymbols() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(parsed) && parsed.length) return normalizeSymbols(parsed);
  } catch (_) {}

  return [...DEFAULT_SYMBOLS];
}

function saveSymbols() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
}

function loadRefreshIntervalSeconds() {
  const saved = Number(localStorage.getItem(REFRESH_INTERVAL_KEY));

  if (Number.isFinite(saved)) {
    return clampRefreshInterval(saved);
  }

  return DEFAULT_REFRESH_SECONDS;
}

function saveRefreshIntervalSeconds(value) {
  refreshIntervalSeconds = clampRefreshInterval(value);
  localStorage.setItem(REFRESH_INTERVAL_KEY, String(refreshIntervalSeconds));
  refreshIntervalInput.value = String(refreshIntervalSeconds);
  refreshSeconds.textContent = String(refreshIntervalSeconds);
}

function clampRefreshInterval(value) {
  const number = Math.round(Number(value));

  if (!Number.isFinite(number)) return DEFAULT_REFRESH_SECONDS;

  return Math.min(MAX_REFRESH_SECONDS, Math.max(MIN_REFRESH_SECONDS, number));
}

function getRefreshMs() {
  return refreshIntervalSeconds * 1000;
}

function normalizeSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function normalizeSymbols(input) {
  return [...new Set(input.map(normalizeSymbol).filter(Boolean))];
}

function formatPrice(value) {
  if (typeof value !== 'number') return '—';

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
  if (typeof change !== 'number' || typeof percent !== 'number') return '—';

  const sign = change > 0 ? '+' : '';

  return `${sign}${change.toFixed(2)} · ${sign}${percent.toFixed(2)}%`;
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

function setStatus(message) {
  statusText.textContent = message;
}

function updateEmptyState() {
  emptyStateEl.classList.toggle('hidden', symbols.length > 0);
}

function initRefreshConfig() {
  refreshIntervalInput.value = String(refreshIntervalSeconds);
  refreshSeconds.textContent = String(refreshIntervalSeconds);

  refreshConfigForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextSeconds = clampRefreshInterval(refreshIntervalInput.value);
    saveRefreshIntervalSeconds(nextSeconds);

    setStatus(`Refresh interval saved: every ${nextSeconds} second${nextSeconds === 1 ? '' : 's'}.`);
    scheduleNextRefresh();
  });

  refreshIntervalInput.addEventListener('blur', () => {
    refreshIntervalInput.value = String(clampRefreshInterval(refreshIntervalInput.value));
  });
}

function initRangeButtons() {
  document.querySelectorAll('.range-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.range === chartRange);

    btn.addEventListener('click', async () => {
      chartRange = btn.dataset.range;
      localStorage.setItem(RANGE_KEY, chartRange);

      document.querySelectorAll('.range-btn').forEach((other) => {
        other.classList.toggle('active', other === btn);
      });

      setStatus(`Loading ${chartRange.toUpperCase()} charts...`);
      await refreshCharts();
      setStatus(`Charts updated for ${chartRange.toUpperCase()}.`);
    });
  });
}

function renderCards() {
  cardsEl.innerHTML = '';

  charts.forEach((chart) => chart.destroy());
  charts.clear();

  symbols.forEach((symbol, index) => {
    const node = template.content.firstElementChild.cloneNode(true);

    node.dataset.symbol = symbol;
    node.querySelector('.symbol').textContent = symbol;

    const moveLeftBtn = node.querySelector('.move-left-btn');
    const moveRightBtn = node.querySelector('.move-right-btn');

    moveLeftBtn.disabled = index === 0;
    moveRightBtn.disabled = index === symbols.length - 1;

    node.querySelector('.remove-btn').addEventListener('click', () => removeSymbol(symbol));
    moveLeftBtn.addEventListener('click', () => moveSymbol(symbol, -1));
    moveRightBtn.addEventListener('click', () => moveSymbol(symbol, 1));

    node.addEventListener('dragstart', (event) => {
      draggedSymbol = symbol;
      node.classList.add('dragging');

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', symbol);
      }
    });

    node.addEventListener('dragend', () => {
      draggedSymbol = null;

      document.querySelectorAll('.stock-card').forEach((card) => {
        card.classList.remove('dragging', 'drag-over');
      });
    });

    node.addEventListener('dragover', (event) => {
      event.preventDefault();

      if (draggedSymbol && draggedSymbol !== symbol) {
        node.classList.add('drag-over');
      }
    });

    node.addEventListener('dragleave', () => {
      node.classList.remove('drag-over');
    });

    node.addEventListener('drop', (event) => {
      event.preventDefault();
      node.classList.remove('drag-over');

      const fromSymbol = draggedSymbol || event.dataTransfer?.getData('text/plain');

      if (!fromSymbol || fromSymbol === symbol) return;

      moveSymbolBefore(fromSymbol, symbol);
    });

    cardsEl.appendChild(node);

    const canvas = node.querySelector('canvas');

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderWidth: 2,
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

    const stock = latestStocks.get(symbol);
    if (stock) updateCard(stock);
  });

  updateEmptyState();
}

function updateCard(stock) {
  latestStocks.set(stock.symbol, stock);

  const card = cardsEl.querySelector(`[data-symbol="${CSS.escape(stock.symbol)}"]`);
  if (!card) return;

  const price = card.querySelector('.price');
  const currency = card.querySelector('.currency');
  const name = card.querySelector('.name');
  const changePill = card.querySelector('.change-pill');
  const meta = card.querySelector('.meta');
  const error = card.querySelector('.error');

  name.textContent = stock.name || stock.symbol;
  price.textContent = formatPrice(stock.price);
  currency.textContent = stock.currency || '';

  changePill.textContent = formatChange(stock.change, stock.changePercent);
  changePill.classList.remove('positive', 'negative');

  if (typeof stock.change === 'number') {
    changePill.classList.add(stock.change >= 0 ? 'positive' : 'negative');
  }

  meta.textContent = [stock.marketState, formatTime(stock.marketTime)].filter(Boolean).join(' · ');

  if (stock.error) {
    error.textContent = stock.error;
    error.classList.remove('hidden');
  } else {
    error.textContent = '';
    error.classList.add('hidden');
  }
}

async function refreshQuotes() {
  if (isRefreshing || paused) return;

  if (!symbols.length) {
    lastUpdated.textContent = 'No tickers added.';
    setStatus('Add a ticker to start.');
    scheduleNextRefresh();
    return;
  }

  isRefreshing = true;
  setStatus('Refreshing quotes...');

  try {
    const result = await window.stockApi.fetchStocks(symbols);

    if (result?.stocks) {
      result.stocks.forEach(updateCard);
    }

    const time = new Date(result?.fetchedAt || Date.now());
    lastUpdated.textContent = `Last updated ${time.toLocaleTimeString()}`;

    if (result?.error && !result?.ok) {
      setStatus(result.error);
    } else {
      setStatus(`Updated ${symbols.length} ticker${symbols.length === 1 ? '' : 's'}.`);
    }
  } catch (error) {
    setStatus(`Quote refresh failed: ${error?.message || error}`);
  } finally {
    isRefreshing = false;
    scheduleNextRefresh();
  }
}

async function refreshCharts() {
  if (!symbols.length) return;

  await Promise.allSettled(
    symbols.map(async (symbol) => {
      const chart = charts.get(symbol);
      if (!chart) return;

      const result = await window.stockApi.fetchChart(symbol, chartRange);

      if (!result?.ok) {
        const card = cardsEl.querySelector(`[data-symbol="${CSS.escape(symbol)}"]`);
        const error = card?.querySelector('.error');

        if (error) {
          error.textContent = result?.error || 'Chart failed to load.';
          error.classList.remove('hidden');
        }

        return;
      }

      const points = result.points || [];

      chart.data.labels = points.map((point) => {
        const d = new Date(point.time);

        if (chartRange === '1d' || chartRange === '5d') {
          return d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
        }

        return d.toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        });
      });

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

async function refreshAll() {
  await refreshQuotes();
  await refreshCharts();
}

function scheduleNextRefresh() {
  clearTimeout(refreshTimer);
  clearInterval(countdownTimer);

  if (paused) {
    pauseBtn.textContent = 'Resume';
    setStatus('Paused.');
    return;
  }

  const refreshMs = getRefreshMs();

  pauseBtn.textContent = 'Pause';
  refreshSeconds.textContent = String(refreshIntervalSeconds);

  nextRefreshAt = Date.now() + refreshMs;
  refreshTimer = setTimeout(refreshAll, refreshMs);

  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
    refreshSeconds.textContent = String(remaining || refreshIntervalSeconds);
  }, 500);
}

function addSymbol(rawSymbol) {
  const symbol = normalizeSymbol(rawSymbol);

  if (!symbol) return;

  if (symbols.includes(symbol)) {
    setStatus(`${symbol} is already in your watchlist.`);
    return;
  }

  symbols = [...symbols, symbol];
  saveSymbols();
  renderCards();
  refreshAll();
}

function removeSymbol(symbol) {
  symbols = symbols.filter((item) => item !== symbol);
  latestStocks.delete(symbol);
  saveSymbols();
  renderCards();
  refreshAll();
}

function moveSymbol(symbol, direction) {
  const currentIndex = symbols.indexOf(symbol);
  if (currentIndex === -1) return;

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= symbols.length) return;

  const nextSymbols = [...symbols];
  const [item] = nextSymbols.splice(currentIndex, 1);
  nextSymbols.splice(nextIndex, 0, item);

  symbols = nextSymbols;
  saveSymbols();
  renderCards();
  refreshCharts();
}

function moveSymbolBefore(fromSymbol, toSymbol) {
  const fromIndex = symbols.indexOf(fromSymbol);
  const toIndex = symbols.indexOf(toSymbol);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

  const nextSymbols = [...symbols];
  const [item] = nextSymbols.splice(fromIndex, 1);
  const adjustedToIndex = nextSymbols.indexOf(toSymbol);

  nextSymbols.splice(adjustedToIndex, 0, item);

  symbols = nextSymbols;
  saveSymbols();
  renderCards();
  refreshCharts();
}

addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addSymbol(symbolInput.value);
  symbolInput.value = '';
  symbolInput.focus();
});

refreshNowBtn.addEventListener('click', refreshAll);

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  scheduleNextRefresh();

  if (!paused) {
    refreshAll();
  }
});

alwaysOnTopBtn.addEventListener('click', async () => {
  const currentlyPinned = alwaysOnTopBtn.classList.contains('pinned');
  const result = await window.stockApi.setAlwaysOnTop(!currentlyPinned);

  alwaysOnTopBtn.classList.toggle('pinned', Boolean(result.alwaysOnTop));
  alwaysOnTopBtn.textContent = result.alwaysOnTop ? 'Pinned' : 'Pin window';
});

document.querySelectorAll('[data-demo]').forEach((btn) => {
  btn.addEventListener('click', () => addSymbol(btn.dataset.demo));
});

async function initWindowState() {
  try {
    const state = await window.stockApi.getWindowState();

    alwaysOnTopBtn.classList.toggle('pinned', Boolean(state.alwaysOnTop));
    alwaysOnTopBtn.textContent = state.alwaysOnTop ? 'Pinned' : 'Pin window';
  } catch (_) {}
}

initRefreshConfig();
initRangeButtons();
renderCards();
initWindowState();
refreshAll();