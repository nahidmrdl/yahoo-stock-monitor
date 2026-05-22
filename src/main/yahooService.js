const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function normalizeSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': USER_AGENT
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Yahoo request failed (${response.status}): ${body.slice(0, 220)}`);
  }

  return response.json();
}

function rangeToChartParams(range) {
  switch (range) {
    case 'max':
      return { range: 'max', interval: '1mo' };
    case '5d':
      return { range: '5d', interval: '15m' };
    case '1mo':
      return { range: '1mo', interval: '1d' };
    case '6mo':
      return { range: '6mo', interval: '1d' };
    case '1y':
      return { range: '1y', interval: '1wk' };
    case '1d':
    default:
      return { range: '1d', interval: '5m' };
  }
}

function buildChartUrl(symbol, range = '1d') {
  const params = rangeToChartParams(range);

  return (
    `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${encodeURIComponent(params.range)}` +
    `&interval=${encodeURIComponent(params.interval)}` +
    '&includePrePost=false' +
    '&events=div%7Csplit'
  );
}

function parseChartResult(symbol, range, data) {
  const chart = data?.chart;

  if (chart?.error) {
    throw new Error(chart.error.description || chart.error.code || 'Yahoo chart error');
  }

  const result = chart?.result?.[0];

  if (!result) {
    throw new Error('No chart result returned by Yahoo.');
  }

  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const points = timestamps
    .map((timestamp, index) => ({
      time: new Date(timestamp * 1000).toISOString(),
      close: toNumber(closes[index])
    }))
    .filter((point) => point.close !== null);

  const price =
    toNumber(meta.regularMarketPrice) ??
    (points.length ? points[points.length - 1].close : null);

  const previousClose = toNumber(meta.chartPreviousClose) ?? toNumber(meta.previousClose);

  let change = null;
  let changePercent = null;

  if (price !== null && previousClose !== null && previousClose !== 0) {
    change = price - previousClose;
    changePercent = (change / previousClose) * 100;
  }

  const marketTime =
    typeof meta.regularMarketTime === 'number'
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : null;

  return {
    stock: {
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      change,
      changePercent,
      previousClose,
      currency: meta.currency || '',
      marketState: meta.marketState || '',
      exchange: meta.exchangeName || meta.fullExchangeName || meta.exchangeTimezoneName || '',
      quoteType: meta.instrumentType || '',
      marketTime,
      error: null
    },
    points
  };
}

async function fetchStockFromChart(symbol, range = '1d') {
  const cleanSymbol = normalizeSymbol(symbol);
  const url = buildChartUrl(cleanSymbol, range);
  const data = await fetchJson(url);
  return parseChartResult(cleanSymbol, range, data);
}

async function fetchStocks(symbols) {
  const cleanSymbols = [...new Set((symbols || []).map(normalizeSymbol).filter(Boolean))];

  if (cleanSymbols.length === 0) {
    return { ok: true, stocks: [], fetchedAt: new Date().toISOString() };
  }

  const results = await Promise.allSettled(
    cleanSymbols.map(async (symbol) => {
      const parsed = await fetchStockFromChart(symbol, '1d');
      return parsed.stock;
    })
  );

  const stocks = results.map((result, index) => {
    const symbol = cleanSymbols[index];

    if (result.status === 'fulfilled') {
      return result.value;
    }

    return {
      symbol,
      name: symbol,
      price: null,
      change: null,
      changePercent: null,
      previousClose: null,
      currency: '',
      marketState: '',
      exchange: '',
      quoteType: '',
      marketTime: null,
      error: result.reason ? String(result.reason.message || result.reason) : 'Unknown Yahoo error'
    };
  });

  const hasAnySuccess = stocks.some((stock) => !stock.error);

  return {
    ok: hasAnySuccess,
    stocks,
    fetchedAt: new Date().toISOString(),
    error: hasAnySuccess ? null : 'All Yahoo requests failed.'
  };
}

async function fetchChart(symbol, range = '1d') {
  const cleanSymbol = normalizeSymbol(symbol);

  if (!cleanSymbol) {
    return { ok: false, symbol: cleanSymbol, range, points: [], error: 'Missing symbol' };
  }

  try {
    const parsed = await fetchStockFromChart(cleanSymbol, range);

    return {
      ok: true,
      symbol: cleanSymbol,
      range,
      points: parsed.points
    };
  } catch (error) {
    return {
      ok: false,
      symbol: cleanSymbol,
      range,
      points: [],
      error: error ? String(error.message || error) : 'Unknown chart error'
    };
  }
}

module.exports = {
  buildChartUrl,
  fetchChart,
  fetchJson,
  fetchStocks,
  normalizeSymbol,
  parseChartResult
};
