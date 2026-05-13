import { getTradingViewSymbol, stocks as fallbackStocks } from './data.js';

export const TRADINGVIEW_SCAN_URL = 'https://scanner.tradingview.com/global/scan';

const SCANNER_COLUMNS = [
  'name',
  'description',
  'close',
  'change',
  'change_abs',
  'currency',
  'exchange',
  'sector',
];

function buildPayload() {
  return {
    symbols: {
      tickers: fallbackStocks.map(getTradingViewSymbol),
      query: { types: [] },
    },
    columns: SCANNER_COLUMNS,
  };
}

function toTrendScore(changePercent, fallbackScore) {
  if (!Number.isFinite(changePercent)) return fallbackScore;
  const normalized = 70 + Math.max(-10, Math.min(20, changePercent * 4));
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

export async function fetchTradingViewStocks() {
  const response = await fetch(TRADINGVIEW_SCAN_URL, {
    method: 'POST',
    // Do not set Content-Type. TradingView's CORS preflight currently rejects
    // the content-type request header, while a simple string body works.
    body: JSON.stringify(buildPayload()),
  });

  if (!response.ok) {
    throw new Error(`TradingView Scanner returned ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.data)) {
    throw new Error('TradingView Scanner response did not include a data array');
  }

  if (!payload.data.length) {
    throw new Error('TradingView Scanner returned no rows');
  }

  const scannerBySymbol = new Map(payload.data.map((item) => [item.s, item]));

  return fallbackStocks
    .map((item) => {
      const scannerSymbol = getTradingViewSymbol(item);
      const scannerItem = scannerBySymbol.get(scannerSymbol);
      if (!scannerItem || !Array.isArray(scannerItem.d)) {
        return {
          ...item,
          scannerSymbol,
          source: 'Static fallback',
        };
      }

      const [
        ticker,
        company,
        close,
        changePercent,
        changeAmount,
        currency,
        exchange,
        sector,
      ] = scannerItem.d;

      return {
        ...item,
        ticker: ticker || item.ticker,
        company: company || item.company,
        sector: sector || item.sector,
        currency: currency || item.currency,
        trendScore: toTrendScore(changePercent, item.trendScore),
        demoPrice: Number.isFinite(close) ? close : item.demoPrice,
        demoChangePercent: Number.isFinite(changePercent)
          ? changePercent
          : item.demoChangePercent,
        demoChangeAmount: Number.isFinite(changeAmount) ? changeAmount : null,
        exchange: exchange || scannerSymbol.split(':')[0],
        scannerSymbol,
        source: 'TradingView Scanner',
      };
    })
    .filter(Boolean);
}
