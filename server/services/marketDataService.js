/**
 * marketDataService.js  (v2 — robust multi-source)
 * ─────────────────────────────────────────────────────────────────────────────
 * Data sources (in priority order):
 *  1. Yahoo Finance v8 chart API  — stocks, ETFs, indices, commodities, forex
 *  2. Yahoo Finance v11 quoteSummary — quote details with crumb/cookie auth
 *  3. CoinGecko free API          — cryptocurrency prices + history (INR + USD)
 *  4. ExchangeRate-API (free)     — live forex rates
 *
 * Key fix over v1: Yahoo Finance now requires a crumb+cookie for quote lookups.
 * We obtain it once per process and reuse it. Chart API (/v8/finance/chart) still
 * works without auth for many symbols including commodities (GC=F, SI=F, CL=F).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── TTL Cache ────────────────────────────────────────────────────────────────
const cache = new Map();
const fromCache = (key, ttlMs = 60_000) => {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttlMs) { cache.delete(key); return null; }
  return e.value;
};
const toCache = (key, value) => cache.set(key, { value, ts: Date.now() });

// ─── Yahoo Finance crumb/cookie state ────────────────────────────────────────
let _yfCookie = null;
let _yfCrumb = null;
let _yfCrumbFetchedAt = 0;
const YF_CRUMB_TTL = 30 * 60_000; // refresh crumb every 30 minutes

// ─── Generic fetch helper ─────────────────────────────────────────────────────
const fetchRaw = async (url, options = {}) => {
  if (typeof fetch !== 'undefined') {
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, headers: res.headers };
  }
  // Node < 18 fallback
  const https = require('https');
  const http = require('http');
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {}),
      },
    };
    const req = client.request(reqOpts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, text: raw, headers: res.headers }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
};

const fetchJSON = async (url, options = {}) => {
  const r = await fetchRaw(url, options);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  try { return JSON.parse(r.text); }
  catch { throw new Error(`Bad JSON from ${url}: ${r.text.substring(0, 100)}`); }
};

// ─────────────────────────────────────────────────────────────────────────────
// Yahoo Finance: Crumb + Cookie acquisition
// YF now returns 401 for quote API unless a valid crumb+cookie is sent.
// We hit the consent/home page first to grab a cookie, then fetch a crumb.
// ─────────────────────────────────────────────────────────────────────────────
const acquireYFCrumb = async () => {
  if (_yfCrumb && Date.now() - _yfCrumbFetchedAt < YF_CRUMB_TTL) return true;

  try {
    // Step 1: visit Yahoo Finance home to get session cookies
    const homeRes = await fetchRaw('https://finance.yahoo.com/', {
      headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });

    // Extract Set-Cookie header
    const cookieHeader = homeRes.headers?.['set-cookie'];
    if (cookieHeader) {
      const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
      _yfCookie = cookies.map((c) => c.split(';')[0]).join('; ');
    }

    // Step 2: fetch crumb using cookie
    const crumbRes = await fetchRaw('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { Cookie: _yfCookie || '' },
    });

    if (crumbRes.ok && crumbRes.text && !crumbRes.text.startsWith('{')) {
      _yfCrumb = crumbRes.text.trim();
      _yfCrumbFetchedAt = Date.now();
      console.log('[MarketData] Yahoo Finance crumb acquired successfully');
      return true;
    }
  } catch (e) {
    // Crumb acquisition failure is non-fatal — chart API works without it
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[MarketData] YF crumb not available, using chart API fallback');
    }
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// Yahoo Finance v8 chart API — works WITHOUT crumb for most symbols
// This is the most reliable endpoint for real-time + historical data
// ─────────────────────────────────────────────────────────────────────────────
const getChartData = async (symbol, range = '1d', interval = '1d') => {
  const cacheKey = `chart:${symbol}:${range}:${interval}`;
  const cacheTTL = range === '1d' ? 60_000 : 5 * 60_000;
  const cached = fromCache(cacheKey, cacheTTL);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div,splits`;

  let data;
  try {
    data = await fetchJSON(url, { headers: { Cookie: _yfCookie || '' } });
  } catch (e) {
    // Try query2 as mirror fallback
    const url2 = url.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com');
    data = await fetchJSON(url2);
  }

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${symbol}`);

  toCache(cacheKey, result);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// getQuote: Real-time quote from chart meta (no crumb needed)
// More reliable than the deprecated v7 quote endpoint
// ─────────────────────────────────────────────────────────────────────────────
const getQuote = async (symbol) => {
  const cacheKey = `quote:${symbol}`;
  const cached = fromCache(cacheKey, 60_000);
  if (cached) return cached;

  const chart = await getChartData(symbol, '1d', '1d');
  const meta = chart.meta || {};
  const ohlcv = chart.indicators?.quote?.[0] || {};
  const timestamps = chart.timestamp || [];
  const lastIdx = timestamps.length - 1;

  const quote = {
    symbol: meta.symbol || symbol,
    shortName: meta.shortName || meta.longName || symbol,
    currency: meta.currency || 'USD',
    exchangeName: meta.exchangeName || '',
    regularMarketPrice: meta.regularMarketPrice || ohlcv.close?.[lastIdx],
    regularMarketOpen: meta.chartPreviousClose || ohlcv.open?.[0],
    regularMarketDayHigh: meta.regularMarketDayHigh || Math.max(...(ohlcv.high || [0]).filter(Boolean)),
    regularMarketDayLow: meta.regularMarketDayLow || Math.min(...(ohlcv.low || [Infinity]).filter(Boolean)),
    previousClose: meta.previousClose || meta.chartPreviousClose,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    regularMarketVolume: ohlcv.volume?.[lastIdx],
    marketState: meta.marketState,
  };

  // Compute change from previous close
  if (quote.previousClose && quote.regularMarketPrice) {
    quote.regularMarketChange = quote.regularMarketPrice - quote.previousClose;
    quote.regularMarketChangePercent = (quote.regularMarketChange / quote.previousClose) * 100;
  }

  toCache(cacheKey, quote);
  return quote;
};

// Small delay helper to avoid Yahoo Finance rate-limiting on bulk requests
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch multiple quotes sequentially with a small delay between each
// to avoid Yahoo Finance 429 rate-limit when requesting many symbols at once
const getQuotes = async (symbols) => {
  const list = Array.isArray(symbols) ? symbols : [symbols];
  const results = [];
  for (let i = 0; i < list.length; i++) {
    try {
      const q = await getQuote(list[i]);
      results.push(q);
    } catch (e) {
      console.warn(`[MarketData] getQuote failed for ${list[i]}:`, e.message);
    }
    // 300ms gap between requests — avoids 429 from Yahoo Finance
    if (i < list.length - 1) await sleep(300);
  }
  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// Historical OHLCV via chart API
// ─────────────────────────────────────────────────────────────────────────────
const getHistoricalData = async (symbol, period = '1mo', interval = '1d') => {
  const chart = await getChartData(symbol, period, interval);
  const timestamps = chart.timestamp || [];
  const ohlcv = chart.indicators?.quote?.[0] || {};
  const meta = chart.meta || {};

  const history = timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    open: ohlcv.open?.[i]?.toFixed(2),
    high: ohlcv.high?.[i]?.toFixed(2),
    low: ohlcv.low?.[i]?.toFixed(2),
    close: ohlcv.close?.[i]?.toFixed(2),
    volume: ohlcv.volume?.[i],
  })).filter((d) => d.close != null);

  return {
    symbol: meta.symbol || symbol,
    currency: meta.currency,
    exchangeName: meta.exchangeName,
    history,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Ticker alias map
// ─────────────────────────────────────────────────────────────────────────────
const TICKER_ALIASES = {
  // Indian indices
  nifty: '^NSEI', 'nifty 50': '^NSEI', nifty50: '^NSEI',
  sensex: '^BSESN', bse: '^BSESN',
  banknifty: '^NSEBANK', 'bank nifty': '^NSEBANK',
  // Indian stocks
  reliance: 'RELIANCE.NS', tcs: 'TCS.NS', infosys: 'INFY.NS', infy: 'INFY.NS',
  hdfc: 'HDFCBANK.NS', 'hdfc bank': 'HDFCBANK.NS', icici: 'ICICIBANK.NS',
  wipro: 'WIPRO.NS', lic: 'LICI.NS', sbi: 'SBIN.NS', bajaj: 'BAJFINANCE.NS',
  titan: 'TITAN.NS', hul: 'HINDUNILVR.NS', asian: 'ASIANPAINT.NS',
  // Global indices
  dow: '^DJI', 'dow jones': '^DJI', sp500: '^GSPC', 's&p 500': '^GSPC',
  nasdaq: '^IXIC', ftse: '^FTSE', nikkei: '^N225',
  // Global stocks
  apple: 'AAPL', google: 'GOOGL', microsoft: 'MSFT', amazon: 'AMZN',
  tesla: 'TSLA', meta: 'META', nvidia: 'NVDA',
  // Commodities — using futures tickers (most current)
  gold: 'GC=F', silver: 'SI=F', oil: 'CL=F', 'crude oil': 'CL=F', crude: 'CL=F',
  'natural gas': 'NG=F', copper: 'HG=F',
  // Crypto via Yahoo
  bitcoin: 'BTC-USD', btc: 'BTC-USD',
  ethereum: 'ETH-USD', eth: 'ETH-USD',
  bnb: 'BNB-USD', solana: 'SOL-USD', sol: 'SOL-USD',
  dogecoin: 'DOGE-USD', doge: 'DOGE-USD',
  xrp: 'XRP-USD', ripple: 'XRP-USD',
  cardano: 'ADA-USD', ada: 'ADA-USD',
  // Forex
  'usd inr': 'USDINR=X', 'usd/inr': 'USDINR=X', usdinr: 'USDINR=X',
};

const resolveTicker = (name) => {
  const lower = name.toLowerCase().trim();
  return TICKER_ALIASES[lower] || name.toUpperCase();
};

// ─────────────────────────────────────────────────────────────────────────────
// CoinGecko — crypto prices + history (free, no key needed)
// ─────────────────────────────────────────────────────────────────────────────
const COINGECKO_IDS = {
  bitcoin: 'bitcoin', btc: 'bitcoin',
  ethereum: 'ethereum', eth: 'ethereum',
  bnb: 'binancecoin', 'binance coin': 'binancecoin',
  solana: 'solana', sol: 'solana',
  cardano: 'cardano', ada: 'cardano',
  xrp: 'ripple', ripple: 'ripple',
  dogecoin: 'dogecoin', doge: 'dogecoin',
  polkadot: 'polkadot', dot: 'polkadot',
  polygon: 'matic-network', matic: 'matic-network',
  shib: 'shiba-inu', shiba: 'shiba-inu',
};

const getCryptoPrices = async (coins) => {
  const ids = [...new Set(coins.map((c) => COINGECKO_IDS[c.toLowerCase()] || c.toLowerCase()))].join(',');
  const cacheKey = `crypto:${ids}`;
  const cached = fromCache(cacheKey, 60_000);
  if (cached) return cached;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=inr,usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
  const data = await fetchJSON(url);
  toCache(cacheKey, data);
  return data;
};

const getCryptoHistory = async (coin, days = 30) => {
  const id = COINGECKO_IDS[coin.toLowerCase()] || coin.toLowerCase();
  const cacheKey = `crypto-hist:${id}:${days}`;
  const cached = fromCache(cacheKey, 5 * 60_000);
  if (cached) return cached;

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=inr&days=${days}&interval=daily`;
  const data = await fetchJSON(url);

  const prices = (data.prices || []).map(([ts, price]) => ({
    date: new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    priceINR: Math.round(price),
  }));

  const result = { id, days, prices };
  toCache(cacheKey, result);
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Forex rates
// ─────────────────────────────────────────────────────────────────────────────
const getForexRates = async () => {
  const cacheKey = 'forex:rates';
  const cached = fromCache(cacheKey, 5 * 60_000);
  if (cached) return cached;

  try {
    const url = 'https://open.er-api.com/v6/latest/USD';
    const data = await fetchJSON(url);
    if (data?.result === 'success') {
      const result = {
        base: 'USD',
        updatedAt: data.time_last_update_utc,
        rates: {
          INR: data.rates.INR, EUR: data.rates.EUR, GBP: data.rates.GBP,
          JPY: data.rates.JPY, AED: data.rates.AED, SGD: data.rates.SGD,
          CAD: data.rates.CAD, AUD: data.rates.AUD,
        },
      };
      toCache(cacheKey, result);
      return result;
    }
  } catch { /* fall through */ }

  // Fallback: USD/INR from Yahoo chart
  try {
    const q = await getQuote('USDINR=X');
    if (q?.regularMarketPrice) {
      const result = { base: 'USD', updatedAt: new Date().toUTCString(), rates: { INR: q.regularMarketPrice } };
      toCache(cacheKey, result);
      return result;
    }
  } catch { /* ignore */ }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Market Overview
// ─────────────────────────────────────────────────────────────────────────────
const OVERVIEW_SYMBOLS = [
  '^NSEI', '^BSESN',               // Indian indices (most important)
  '^GSPC', '^IXIC',                 // US indices
  'GC=F', 'CL=F',                   // Gold, Crude Oil (Silver on-demand)
  'BTC-USD',                        // Bitcoin
  'USDINR=X',                       // Forex
];

const getMarketOverview = async () => {
  const cacheKey = 'market:overview';
  const cached = fromCache(cacheKey, 2 * 60_000);
  if (cached) return cached;

  const quotes = await getQuotes(OVERVIEW_SYMBOLS);
  toCache(cacheKey, quotes);
  return quotes;
};

// ─────────────────────────────────────────────────────────────────────────────
// Format a quote into a concise readable line for AI context
// ─────────────────────────────────────────────────────────────────────────────
const formatQuote = (q) => {
  if (!q?.regularMarketPrice) return null;
  const name = q.shortName || q.symbol;
  const price = Number(q.regularMarketPrice);
  const currency = q.currency || '';
  const arrow = (q.regularMarketChange || 0) >= 0 ? '▲' : '▼';
  const sign  = (q.regularMarketChange || 0) >= 0 ? '+' : '';
  const change = q.regularMarketChange?.toFixed(2) ?? 'N/A';
  const pct    = q.regularMarketChangePercent?.toFixed(2) ?? 'N/A';

  let line = `  ${name} (${q.symbol}): ${currency} ${price.toLocaleString('en-IN')}  ${arrow} ${sign}${change} (${sign}${pct}%)`;

  if (q.regularMarketDayHigh && q.regularMarketDayLow) {
    line += `  |  Day: ${Number(q.regularMarketDayLow).toLocaleString('en-IN')} – ${Number(q.regularMarketDayHigh).toLocaleString('en-IN')}`;
  }
  if (q.fiftyTwoWeekHigh && q.fiftyTwoWeekLow) {
    line += `  |  52-wk: ${Number(q.fiftyTwoWeekLow).toLocaleString('en-IN')} – ${Number(q.fiftyTwoWeekHigh).toLocaleString('en-IN')}`;
  }
  if (q.marketState) line += `  [${q.marketState}]`;
  return line;
};

// ─────────────────────────────────────────────────────────────────────────────
// Market intent detection
// ─────────────────────────────────────────────────────────────────────────────
const MARKET_KEYWORDS = [
  'stock','stocks','share','shares','equity','market','markets',
  'nifty','sensex','banknifty','bank nifty','nse','bse',
  'nasdaq','dow','dow jones','s&p','sp500','ftse','nikkei',
  'price','prices','rate','rates','quote','quotes','today',
  'current price','live price','real time','real-time',
  'historical','history','chart','trend','performance',
  '1 month','3 month','6 month','1 year','ytd','yesterday',
  'crypto','cryptocurrency','bitcoin','btc','ethereum','eth',
  'solana','sol','dogecoin','doge','bnb','binance',
  'ripple','xrp','cardano','ada','polygon','matic',
  'usd','dollar','inr','rupee','forex','currency','exchange rate',
  'eur','euro','gbp','pound',
  'gold','silver','oil','crude','crude oil','commodity','commodities',
  'reliance','tcs','infosys','infy','wipro','hdfc','icici',
  'sbi','bajaj','titan','hul','lic',
  'apple','aapl','google','googl','microsoft','msft',
  'amazon','amzn','tesla','tsla','meta','nvidia','nvda',
  'invest','investment','portfolio','mutual fund','etf','index fund',
  'dividend','ipo','sip','nfo',
];

const detectMarketIntent = (message) => {
  const lower = message.toLowerCase();
  const detectedTerms = MARKET_KEYWORDS.filter((kw) => lower.includes(kw));
  return { isMarketQuery: detectedTerms.length > 0, detectedTerms };
};

// ─────────────────────────────────────────────────────────────────────────────
// buildMarketContext — main entry point called by chatController
// Fetches exactly the data the user asked about, formats it into a text
// block that gets injected into the AI prompt BEFORE the user question.
// ─────────────────────────────────────────────────────────────────────────────
const buildMarketContext = async (userMessage) => {
  const { isMarketQuery, detectedTerms } = detectMarketIntent(userMessage);
  if (!isMarketQuery) return null;

  // Ensure YF crumb is ready (non-blocking — failure falls back to chart API)
  acquireYFCrumb().catch(() => {});

  const lower = userMessage.toLowerCase();
  const now = new Date();
  const lines = [
    `=== LIVE MARKET DATA — fetched at ${now.toLocaleTimeString('en-IN')} on ${now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} ===`,
    '⚠ INSTRUCTION: Use ONLY the numbers below. Do NOT use training-data prices. These are the actual current values.',
    '',
  ];

  let hasData = false;
  const errors = [];

  const wantsCrypto = detectedTerms.some((t) =>
    ['crypto','cryptocurrency','bitcoin','btc','ethereum','eth','solana','sol',
     'dogecoin','doge','bnb','ripple','xrp','cardano','ada','polygon','matic'].includes(t)
  );
  const wantsForex = detectedTerms.some((t) =>
    ['usd','dollar','inr','rupee','forex','currency','exchange rate','eur','euro','gbp','pound'].includes(t)
  );
  const wantsCommodity = detectedTerms.some((t) =>
    ['gold','silver','oil','crude','crude oil','commodity','commodities'].includes(t)
  );
  const wantsHistory = detectedTerms.some((t) =>
    ['historical','history','chart','trend','1 month','3 month','6 month','1 year',
     'ytd','yesterday','performance'].includes(t)
  );
  const wantsOverview = detectedTerms.some((t) =>
    ['market','markets','nifty','sensex','overview','today'].includes(t)
  ) || lower.includes('market overview') || lower.includes('market today');

  // Detect specific named asset in the message
  const matchedAlias = Object.keys(TICKER_ALIASES).find((alias) => lower.includes(alias));
  const specificTicker = matchedAlias ? TICKER_ALIASES[matchedAlias] : null;
  const isCommodityTicker = specificTicker && ['GC=F','SI=F','CL=F','NG=F','HG=F'].includes(specificTicker);

  const fetches = [];

  // ── Commodities (gold, silver, oil) ──
  if (wantsCommodity || isCommodityTicker) {
    fetches.push((async () => {
      try {
        const wantsGold   = lower.includes('gold');
        const wantsSilver = lower.includes('silver');
        const wantsOil    = lower.includes('oil') || lower.includes('crude');

        const commodSymbols = [];
        if (wantsGold)   commodSymbols.push('GC=F');
        if (wantsSilver) commodSymbols.push('SI=F');
        if (wantsOil)    commodSymbols.push('CL=F');
        // nothing specified → show all three
        if (commodSymbols.length === 0) commodSymbols.push('GC=F', 'SI=F', 'CL=F');

        // Fetch commodity quotes + live USD/INR in parallel
        const [commodQuotes, forex] = await Promise.all([
          getQuotes(commodSymbols),
          getForexRates(),
        ]);

        const usdInr   = forex?.rates?.INR || 85;
        const TROY_OZ  = 31.1035; // grams per troy ounce
        const K22_RATIO = 22 / 24; // 22K purity vs 24K

        const goldQ   = commodQuotes.find((q) => q.symbol === 'GC=F');
        const silverQ = commodQuotes.find((q) => q.symbol === 'SI=F');
        const oilQ    = commodQuotes.find((q) => q.symbol === 'CL=F');

        if (commodQuotes.length > 0) {
          lines.push('--- Commodity Prices (Live) ---');
          lines.push(`  USD/INR used for conversion: ₹${Number(usdInr).toFixed(2)}`);
          lines.push('');

          // ── Gold: show 24K and 22K in INR per gram + per 10g ──
          if (goldQ?.regularMarketPrice) {
            const usdPerOz  = goldQ.regularMarketPrice;
            const inrPerGram24 = (usdPerOz / TROY_OZ) * usdInr;
            const inrPerGram22 = inrPerGram24 * K22_RATIO;
            const per10g24 = Math.round(inrPerGram24 * 10);
            const per10g22 = Math.round(inrPerGram22 * 10);
            const per1g24  = Math.round(inrPerGram24);
            const per1g22  = Math.round(inrPerGram22);
            const arrow    = (goldQ.regularMarketChange || 0) >= 0 ? '▲' : '▼';
            const sign     = (goldQ.regularMarketChange || 0) >= 0 ? '+' : '';
            lines.push('  🥇 GOLD (today\'s live price):');
            lines.push(`    Futures price: $${usdPerOz.toFixed(2)}/troy oz  ${arrow} ${sign}$${goldQ.regularMarketChange?.toFixed(2)} (${sign}${goldQ.regularMarketChangePercent?.toFixed(2)}%)`);
            lines.push(`    Day range: $${goldQ.regularMarketDayLow} – $${goldQ.regularMarketDayHigh}`);
            lines.push('');
            lines.push('    INDIA GOLD PRICES (INR):');
            lines.push(`    • 24 Karat (999 / pure gold): ₹${per1g24.toLocaleString('en-IN')} per gram  |  ₹${per10g24.toLocaleString('en-IN')} per 10g`);
            lines.push(`    • 22 Karat (916 / jewellery): ₹${per1g22.toLocaleString('en-IN')} per gram  |  ₹${per10g22.toLocaleString('en-IN')} per 10g`);
            lines.push('');
            hasData = true;
          }

          // ── Silver: show INR per gram + per kg ──
          if (silverQ?.regularMarketPrice) {
            const usdPerOz    = silverQ.regularMarketPrice;
            const inrPerGram  = (usdPerOz / TROY_OZ) * usdInr;
            const inrPerKg    = Math.round(inrPerGram * 1000);
            const per1g       = (Math.round(inrPerGram * 100) / 100).toFixed(2);
            const arrow       = (silverQ.regularMarketChange || 0) >= 0 ? '▲' : '▼';
            const sign        = (silverQ.regularMarketChange || 0) >= 0 ? '+' : '';
            lines.push('  🥈 SILVER (today\'s live price):');
            lines.push(`    Futures price: $${usdPerOz.toFixed(2)}/troy oz  ${arrow} ${sign}$${silverQ.regularMarketChange?.toFixed(2)} (${sign}${silverQ.regularMarketChangePercent?.toFixed(2)}%)`);
            lines.push(`    Day range: $${silverQ.regularMarketDayLow} – $${silverQ.regularMarketDayHigh}`);
            lines.push('');
            lines.push('    INDIA SILVER PRICES (INR):');
            lines.push(`    • ₹${per1g} per gram`);
            lines.push(`    • ₹${inrPerKg.toLocaleString('en-IN')} per kg`);
            lines.push('');
            hasData = true;
          }

          // ── Oil: USD/barrel + INR equivalent ──
          if (oilQ?.regularMarketPrice) {
            const usdPerBarrel = oilQ.regularMarketPrice;
            const inrPerBarrel = Math.round(usdPerBarrel * usdInr);
            const arrow        = (oilQ.regularMarketChange || 0) >= 0 ? '▲' : '▼';
            const sign         = (oilQ.regularMarketChange || 0) >= 0 ? '+' : '';
            lines.push('  🛢 CRUDE OIL (WTI):');
            lines.push(`    $${usdPerBarrel.toFixed(2)}/barrel  ${arrow} ${sign}$${oilQ.regularMarketChange?.toFixed(2)} (${sign}${oilQ.regularMarketChangePercent?.toFixed(2)}%)`);
            lines.push(`    ≈ ₹${inrPerBarrel.toLocaleString('en-IN')}/barrel`);
            lines.push(`    Day range: $${oilQ.regularMarketDayLow} – $${oilQ.regularMarketDayHigh}`);
            lines.push('');
            hasData = true;
          }

          // ── Historical if requested ──
          if (wantsHistory && commodSymbols.length > 0) {
            const period  = lower.includes('1 year') || lower.includes('yearly') ? '1y'
              : lower.includes('6 month') ? '6mo'
              : lower.includes('3 month') ? '3mo'
              : lower.includes('yesterday') ? '5d'
              : '1mo';
            const histSym = wantsGold ? 'GC=F' : wantsSilver ? 'SI=F' : 'CL=F';
            const hist    = await getHistoricalData(histSym, period, '1d');
            const slice   = lower.includes('yesterday') ? hist.history.slice(-2) : hist.history.slice(-7);
            if (slice.length > 0) {
              const label = histSym === 'GC=F' ? 'Gold' : histSym === 'SI=F' ? 'Silver' : 'Crude Oil';
              lines.push(`  --- ${label} Futures Historical (${period}, last ${slice.length} sessions, USD/troy oz) ---`);
              slice.forEach((d) => lines.push(`    ${d.date}: Open $${d.open} | High $${d.high} | Low $${d.low} | Close $${d.close}`));
              lines.push('');
            }
          }
        }
      } catch (e) {
        errors.push(`Commodities: ${e.message}`);
      }
    })());
  }

  // ── Specific stock / index (non-commodity, non-crypto) ──
  if (specificTicker && !wantsCrypto && !isCommodityTicker) {
    fetches.push((async () => {
      try {
        const q = await getQuote(specificTicker);
        lines.push(`--- ${q.shortName || specificTicker} ---`);
        lines.push(formatQuote(q));
        lines.push('');
        hasData = true;

        if (wantsHistory) {
          const period = lower.includes('1 year') ? '1y'
            : lower.includes('6 month') ? '6mo'
            : lower.includes('3 month') ? '3mo'
            : lower.includes('yesterday') ? '5d'
            : '1mo';
          const hist = await getHistoricalData(specificTicker, period, '1d');
          const slice = lower.includes('yesterday') ? hist.history.slice(-2) : hist.history.slice(-7);
          if (slice.length > 0) {
            lines.push(`--- Historical (${period}, last ${slice.length} sessions) ---`);
            slice.forEach((d) => lines.push(`  ${d.date}: Open ${d.open} | High ${d.high} | Low ${d.low} | Close ${d.close}`));
            lines.push('');
          }
        }
      } catch (e) {
        errors.push(`${specificTicker}: ${e.message}`);
      }
    })());
  }

  // ── Crypto ──
  if (wantsCrypto) {
    fetches.push((async () => {
      try {
        const cryptoList = [];
        if (lower.includes('bitcoin') || lower.includes('btc')) cryptoList.push('bitcoin');
        if (lower.includes('ethereum') || lower.includes('eth')) cryptoList.push('ethereum');
        if (lower.includes('bnb') || lower.includes('binance')) cryptoList.push('binancecoin');
        if (lower.includes('solana') || lower.includes('sol')) cryptoList.push('solana');
        if (lower.includes('dogecoin') || lower.includes('doge')) cryptoList.push('dogecoin');
        if (lower.includes('xrp') || lower.includes('ripple')) cryptoList.push('ripple');
        if (lower.includes('cardano') || lower.includes('ada')) cryptoList.push('cardano');
        if (lower.includes('polygon') || lower.includes('matic')) cryptoList.push('matic-network');
        if (cryptoList.length === 0) cryptoList.push('bitcoin','ethereum','binancecoin','solana');

        const prices = await getCryptoPrices(cryptoList);
        lines.push('--- Cryptocurrency Prices (Live, CoinGecko) ---');
        Object.entries(prices).forEach(([id, d]) => {
          const change = d.usd_24h_change?.toFixed(2);
          const arrow = (d.usd_24h_change || 0) >= 0 ? '▲' : '▼';
          const sign  = (d.usd_24h_change || 0) >= 0 ? '+' : '';
          lines.push(`  ${id}: ₹${d.inr?.toLocaleString('en-IN')} | $${d.usd?.toLocaleString('en-US')}  ${arrow} ${sign}${change}% (24h)`);
        });
        lines.push('');
        hasData = true;

        if (wantsHistory && cryptoList.length > 0) {
          const days = lower.includes('1 year') ? 365
            : lower.includes('6 month') ? 180
            : lower.includes('3 month') ? 90
            : lower.includes('yesterday') ? 2
            : 30;
          const hist = await getCryptoHistory(cryptoList[0], days);
          const slice = hist.prices.slice(-7);
          lines.push(`--- ${cryptoList[0]} INR Price History (last ${slice.length} days) ---`);
          slice.forEach((d) => lines.push(`  ${d.date}: ₹${d.priceINR.toLocaleString('en-IN')}`));
          lines.push('');
        }
      } catch (e) {
        errors.push(`Crypto: ${e.message}`);
      }
    })());
  }

  // ── Forex ──
  if (wantsForex) {
    fetches.push((async () => {
      try {
        const forex = await getForexRates();
        if (forex) {
          lines.push('--- Live Exchange Rates (Base: 1 USD) ---');
          Object.entries(forex.rates).forEach(([cur, rate]) => {
            if (rate) lines.push(`  1 USD = ${cur} ${Number(rate).toFixed(2)}`);
          });
          lines.push(`  (Source updated: ${forex.updatedAt})`);
          lines.push('');
          hasData = true;
        }
      } catch (e) {
        errors.push(`Forex: ${e.message}`);
      }
    })());
  }

  // ── Market overview (general "market today" / "nifty" / "sensex" queries) ──
  if (wantsOverview || (!specificTicker && !wantsCrypto && !wantsForex && !wantsCommodity)) {
    fetches.push((async () => {
      try {
        const overview = await getMarketOverview();
        if (overview.length > 0) {
          lines.push('--- Market Overview (Live) ---');
          overview.forEach((q) => { const f = formatQuote(q); if (f) lines.push(f); });
          lines.push('');
          hasData = true;
        }
      } catch (e) {
        errors.push(`Overview: ${e.message}`);
      }
    })());
  }

  await Promise.allSettled(fetches);

  if (errors.length > 0) {
    console.warn('[MarketData] Partial fetch errors:', errors.join(' | '));
  }

  if (!hasData) {
    console.warn('[MarketData] No data fetched for:', userMessage, '| Errors:', errors);
    return null;
  }

  lines.push('⚠ Disclaimer: Prices may be delayed ~15 min for exchange-listed instruments. This is not investment advice.');
  lines.push('=== END OF LIVE MARKET DATA ===');
  return lines.join('\n');
};

module.exports = {
  buildMarketContext,
  detectMarketIntent,
  getQuote,
  getQuotes,
  getHistoricalData,
  getCryptoPrices,
  getCryptoHistory,
  getForexRates,
  getMarketOverview,
  resolveTicker,
};
