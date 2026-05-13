import { markets, stocks } from '../src/data.js';

const requiredFields = [
  'market',
  'ticker',
  'company',
  'sector',
  'currency',
  'trendScore',
  'demoPrice',
  'demoChangePercent',
  'note',
];

const marketIds = new Set(markets.map((market) => market.id));
const errors = [];

for (const stock of stocks) {
  for (const field of requiredFields) {
    if (!(field in stock)) {
      errors.push(`${stock.ticker || 'Unknown'} is missing ${field}`);
    }
  }

  if (!marketIds.has(stock.market)) {
    errors.push(`${stock.ticker} has unsupported market ${stock.market}`);
  }

  if (!Number.isFinite(stock.trendScore) || stock.trendScore < 0 || stock.trendScore > 100) {
    errors.push(`${stock.ticker} trendScore must be 0-100`);
  }

  if (!Number.isFinite(stock.demoPrice) || stock.demoPrice <= 0) {
    errors.push(`${stock.ticker} demoPrice must be positive`);
  }

  if (!Number.isFinite(stock.demoChangePercent)) {
    errors.push(`${stock.ticker} demoChangePercent must be numeric`);
  }
}

for (const market of markets) {
  const count = stocks.filter((stock) => stock.market === market.id).length;
  if (count !== 20) {
    errors.push(`${market.id} must contain exactly 20 demo stocks; found ${count}`);
  }
}

const duplicateTickers = stocks
  .map((stock) => `${stock.market}:${stock.ticker}`)
  .filter((ticker, index, all) => all.indexOf(ticker) !== index);

if (duplicateTickers.length) {
  errors.push(`Duplicate tickers found: ${duplicateTickers.join(', ')}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${stocks.length} static demo stocks across ${markets.length} markets.`);
