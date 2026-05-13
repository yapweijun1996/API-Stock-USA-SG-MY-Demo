import './styles.css';
import { DATA_UPDATED_LABEL, markets, stocks as fallbackStocks } from './data.js';
import {
  fetchTradingViewStocks,
  markMarketDataUnavailable,
  TRADINGVIEW_SCAN_URL,
} from './tradingview.js';

const app = document.querySelector('#app');
const APP_CACHE_VERSION = 'stock-demo-v3';
const THEME_STORAGE_KEY = 'stock-demo-theme';
const VIEW_STORAGE_KEY = 'stock-demo-view';
const mobileViewQuery = window.matchMedia('(max-width: 759px)');

function getStoredOption(key, allowedValues, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return allowedValues.includes(storedValue) ? storedValue : fallback;
  } catch {
    return fallback;
  }
}

function setStoredOption(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }
}

function getInitialView() {
  return getStoredOption(
    VIEW_STORAGE_KEY,
    ['table', 'cards'],
    mobileViewQuery.matches ? 'cards' : 'table',
  );
}

const state = {
  market: 'ALL',
  sector: 'ALL',
  query: '',
  sort: 'trendScore',
  view: getInitialView(),
  theme: getStoredOption(THEME_STORAGE_KEY, ['system', 'light', 'dark'], 'system'),
  installPrompt: null,
  stocks: fallbackStocks.map((stock) => markMarketDataUnavailable(stock)),
  isLoading: true,
  dataHealth: 'loading',
  availableCount: 0,
  unavailableCount: fallbackStocks.length,
  dataError: '',
};

const marketFormatters = new Map(
  markets.map((market) => [
    market.id,
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: market.currency,
      maximumFractionDigits: 2,
    }),
  ]),
);

const signedPercent = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'always',
});

function getMarketLabel(marketId) {
  return markets.find((market) => market.id === marketId)?.shortLabel || marketId;
}

function formatPrice(stock) {
  if (!Number.isFinite(stock.demoPrice)) return 'Unavailable';
  return marketFormatters.get(stock.market).format(stock.demoPrice);
}

function formatChange(stock) {
  if (!Number.isFinite(stock.demoChangePercent)) return 'Unavailable';
  return `${signedPercent.format(stock.demoChangePercent)}%`;
}

function hasMarketData(stock) {
  return stock.priceStatus === 'available'
    && Number.isFinite(stock.demoPrice)
    && Number.isFinite(stock.demoChangePercent);
}

function getSectors() {
  return [...new Set(state.stocks.map((stock) => stock.sector))].sort();
}

function getFilteredStocks() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return state.stocks
    .filter((stock) => state.market === 'ALL' || stock.market === state.market)
    .filter((stock) => state.sector === 'ALL' || stock.sector === state.sector)
    .filter((stock) => {
      if (!normalizedQuery) return true;
      return [stock.ticker, stock.company, stock.sector, stock.note]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => {
      if (state.sort === 'price') return sortNullableNumberDesc(a.demoPrice, b.demoPrice);
      if (state.sort === 'change') return sortNullableNumberDesc(a.demoChangePercent, b.demoChangePercent);
      if (state.sort === 'ticker') return a.ticker.localeCompare(b.ticker);
      return sortNullableNumberDesc(a.trendScore, b.trendScore);
    });
}

function sortNullableNumberDesc(first, second) {
  const firstIsNumber = Number.isFinite(first);
  const secondIsNumber = Number.isFinite(second);
  if (firstIsNumber && secondIsNumber) return second - first;
  if (firstIsNumber) return -1;
  if (secondIsNumber) return 1;
  return 0;
}

function getMarketSummaries() {
  return markets.map((market) => {
    const marketStocks = state.stocks.filter((stock) => stock.market === market.id);
    const availableStocks = marketStocks.filter((stock) => Number.isFinite(stock.trendScore));
    const averageTrend = availableStocks.length
      ? Math.round(
        availableStocks.reduce((sum, stock) => sum + stock.trendScore, 0) / availableStocks.length,
      )
      : null;
    const leaders = availableStocks
      .slice()
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 3)
      .map((stock) => stock.ticker)
      .join(', ');

    return { ...market, averageTrend, leaders, count: marketStocks.length, availableCount: availableStocks.length };
  });
}

function getDataCounts(stocks = state.stocks) {
  const availableCount = stocks.filter(hasMarketData).length;
  return {
    availableCount,
    unavailableCount: stocks.length - availableCount,
    totalCount: stocks.length,
  };
}

function getDataStatusCopy() {
  if (state.dataHealth === 'loading') {
    return {
      source: 'Loading scanner data',
      health: 'Checking 60 symbols',
      disclaimer: `Fetching TradingView Scanner data from ${TRADINGVIEW_SCAN_URL}.`,
    };
  }

  if (state.dataHealth === 'failed') {
    return {
      source: 'Scanner failed',
      health: `${state.unavailableCount} unavailable symbols`,
      disclaimer: 'Scanner request failed. Showing company metadata only; all prices and changes are unavailable.',
    };
  }

  if (state.dataHealth === 'partial') {
    return {
      source: `Scanner loaded ${state.availableCount}/${state.stocks.length}`,
      health: `${state.unavailableCount} unavailable ${state.unavailableCount === 1 ? 'symbol' : 'symbols'}`,
      disclaimer: 'Some scanner rows are unavailable. Missing prices are hidden instead of replaced with stale demo values.',
    };
  }

  return {
    source: `Scanner loaded ${state.availableCount}/${state.stocks.length}`,
    health: 'All symbols available',
    disclaimer: 'Live scanner data loaded from TradingView Scanner. Not investment advice.',
  };
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.colorScheme = state.theme === 'system' ? 'light dark' : state.theme;

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', state.theme === 'system' ? 'light dark' : state.theme);
  }
}

function renderShell() {
  app.innerHTML = `
    <header class="app-header">
      <div class="header-main">
        <div>
          <p class="eyebrow">No API key stock demo</p>
          <h1>TradingView Stock Trend Dashboard</h1>
          <p class="lede">A GitHub Pages-ready PWA demo using TradingView Scanner data for USA, Singapore, and Malaysia stocks.</p>
        </div>
        <div class="status-panel" aria-label="Application status">
          <span class="status-pill" data-status="network">Checking status</span>
          <span class="status-pill" data-status="source">Loading market data</span>
          <span class="status-pill" data-status="health">Checking symbols</span>
          <span class="status-pill">${DATA_UPDATED_LABEL}</span>
          <fieldset class="theme-toggle" aria-label="Theme">
            <legend>Theme</legend>
            <button type="button" class="theme-option" data-theme-option="system" aria-pressed="true">System</button>
            <button type="button" class="theme-option" data-theme-option="light" aria-pressed="false">Light</button>
            <button type="button" class="theme-option" data-theme-option="dark" aria-pressed="false">Dark</button>
          </fieldset>
          <button class="install-button" type="button" data-action="install" hidden>Install</button>
        </div>
      </div>
      <nav class="market-tabs" aria-label="Market filter">
        <button type="button" class="tab is-active" data-market="ALL">All markets</button>
        ${markets.map((market) => `
          <button type="button" class="tab" data-market="${market.id}">${market.label}</button>
        `).join('')}
      </nav>
    </header>

    <main id="stocks" class="dashboard">
      <section class="summary-grid" aria-label="Market summaries"></section>

      <section class="controls-section" aria-labelledby="controls-title">
        <div>
          <p class="eyebrow">Explore dataset</p>
          <h2 id="controls-title">Filter and sort scanner trend stocks</h2>
        </div>
        <form class="controls" data-form="controls">
          <label>
            <span>Search</span>
            <input type="search" name="query" placeholder="Ticker, company, sector" autocomplete="off" />
          </label>
          <label>
            <span>Sector</span>
            <select name="sector"></select>
          </label>
          <label>
            <span>Sort</span>
            <select name="sort">
              <option value="trendScore">Trend score</option>
              <option value="change">Scanner change</option>
              <option value="price">Scanner price</option>
              <option value="ticker">Ticker A-Z</option>
            </select>
          </label>
          <fieldset class="view-toggle" aria-label="View mode">
            <legend>View</legend>
            <button type="button" class="segmented is-active" data-view="table" aria-pressed="true">Table</button>
            <button type="button" class="segmented" data-view="cards" aria-pressed="false">Cards</button>
          </fieldset>
        </form>
      </section>

      <section class="results-section" aria-live="polite" aria-labelledby="results-title">
        <div class="results-heading">
          <div>
            <p class="eyebrow">Results</p>
            <h2 id="results-title">Loading TradingView Scanner data</h2>
          </div>
          <p class="data-disclaimer" data-disclaimer>Fetching scanner data from TradingView. No API key is used. This endpoint is not a formal market-data API for critical production systems.</p>
        </div>
        <div class="results" data-results></div>
      </section>
    </main>
  `;

  bindEvents();
  applyTheme();
  renderSectorOptions();
  updateNetworkStatus();
  updateDataStatus();
  render();
}

function bindEvents() {
  app.querySelector('.market-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-market]');
    if (!button) return;
    state.market = button.dataset.market;
    render();
  });

  app.querySelector('[data-form="controls"]').addEventListener('input', (event) => {
    const { name, value } = event.target;
    if (name === 'query') state.query = value;
    if (name === 'sector') state.sector = value;
    if (name === 'sort') state.sort = value;
    renderResults();
  });

  app.querySelector('.view-toggle').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    state.view = button.dataset.view;
    setStoredOption(VIEW_STORAGE_KEY, state.view);
    renderResults();
  });

  app.querySelector('.theme-toggle').addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-option]');
    if (!button) return;
    state.theme = button.dataset.themeOption;
    setStoredOption(THEME_STORAGE_KEY, state.theme);
    applyTheme();
    updateThemeToggle();
  });

  app.querySelector('[data-action="install"]').addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    app.querySelector('[data-action="install"]').hidden = true;
  });

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}

function render() {
  app.querySelectorAll('[data-market]').forEach((button) => {
    const isActive = button.dataset.market === state.market;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  renderSectorOptions();
  updateDataStatus();
  updateThemeToggle();
  renderSummaries();
  renderResults();
}

function updateThemeToggle() {
  app.querySelectorAll('[data-theme-option]').forEach((button) => {
    const isActive = button.dataset.themeOption === state.theme;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderSectorOptions() {
  const sectorSelect = app.querySelector('select[name="sector"]');
  if (!sectorSelect) return;

  const sectors = getSectors();
  if (state.sector !== 'ALL' && !sectors.includes(state.sector)) {
    state.sector = 'ALL';
  }

  sectorSelect.innerHTML = `
    <option value="ALL">All sectors</option>
    ${sectors.map((sector) => `<option value="${sector}">${sector}</option>`).join('')}
  `;
  sectorSelect.value = state.sector;
}

function renderSummaries() {
  if (state.isLoading) {
    app.querySelector('.summary-grid').innerHTML = renderSummarySkeletons();
    return;
  }

  app.querySelector('.summary-grid').innerHTML = getMarketSummaries().map((summary) => `
    <article class="summary-card">
      <div>
        <p class="eyebrow">${summary.exchangeHint}</p>
        <h2>${summary.label}</h2>
      </div>
      <dl class="summary-stats">
        <div>
          <dt>Stocks</dt>
          <dd>${summary.count}</dd>
        </div>
        <div>
          <dt>Avg score</dt>
          <dd>${Number.isFinite(summary.averageTrend) ? summary.averageTrend : 'Unavailable'}</dd>
        </div>
      </dl>
      <p class="leaders">${summary.availableCount ? `Trend leaders: ${summary.leaders}` : 'Market data unavailable'}</p>
    </article>
  `).join('');
}

function renderResults() {
  const filtered = getFilteredStocks();
  const results = app.querySelector('[data-results]');
  const title = app.querySelector('#results-title');

  if (state.isLoading) {
    title.textContent = 'Loading TradingView Scanner data';
    updateViewButtons();
    results.innerHTML = state.view === 'cards' ? renderCardSkeletons() : renderTableSkeletons();
    return;
  }

  title.textContent = `${filtered.length} ${filtered.length === 1 ? 'stock' : 'stocks'} shown`;

  updateViewButtons();

  if (!filtered.length) {
    results.innerHTML = `
      <div class="empty-state">
        <h3>No matching stocks</h3>
        <p>Try a different country, sector, ticker, or company search.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = state.view === 'cards'
    ? renderCardGrid(filtered)
    : renderTable(filtered);
}

function updateViewButtons() {
  app.querySelectorAll('[data-view]').forEach((button) => {
    const isActive = button.dataset.view === state.view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderSummarySkeletons() {
  return markets.map(() => `
    <article class="summary-card skeleton-card" aria-hidden="true">
      <span class="skeleton skeleton-line short"></span>
      <span class="skeleton skeleton-title"></span>
      <div class="summary-stats">
        <span class="skeleton skeleton-block"></span>
        <span class="skeleton skeleton-block"></span>
      </div>
      <span class="skeleton skeleton-line"></span>
    </article>
  `).join('');
}

function renderTableSkeletons() {
  return `
    <div class="table-wrap" aria-hidden="true">
      <table>
        <caption>Loading scanner rows</caption>
        <thead>
          <tr>
            <th scope="col">Market</th>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col">Sector</th>
            <th scope="col">Trend</th>
            <th scope="col">Scanner price</th>
            <th scope="col">Scanner change</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 8 }, () => `
            <tr>
              <td><span class="skeleton skeleton-pill"></span></td>
              <td><span class="skeleton skeleton-line short"></span></td>
              <td><span class="skeleton skeleton-line"></span></td>
              <td><span class="skeleton skeleton-line medium"></span></td>
              <td><span class="skeleton skeleton-pill"></span></td>
              <td><span class="skeleton skeleton-line medium"></span></td>
              <td><span class="skeleton skeleton-line short"></span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCardSkeletons() {
  return `
    <div class="stock-grid" aria-hidden="true">
      ${Array.from({ length: 6 }, () => `
        <article class="stock-card skeleton-card">
          <div class="stock-card-head">
            <div>
              <span class="skeleton skeleton-pill"></span>
              <span class="skeleton skeleton-title"></span>
            </div>
            <span class="skeleton skeleton-pill"></span>
          </div>
          <span class="skeleton skeleton-line"></span>
          <div class="stock-meta">
            <span class="skeleton skeleton-block"></span>
            <span class="skeleton skeleton-block"></span>
            <span class="skeleton skeleton-block"></span>
          </div>
          <span class="skeleton skeleton-line medium"></span>
        </article>
      `).join('')}
    </div>
  `;
}

function renderTable(filtered) {
  return `
    <div class="table-wrap">
      <table>
        <caption>TradingView Scanner stock trend dataset</caption>
        <thead>
          <tr>
            <th scope="col">Market</th>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col">Sector</th>
            <th scope="col">Trend</th>
            <th scope="col">Scanner price</th>
            <th scope="col">Scanner change</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((stock) => `
            <tr>
              <td><span class="market-badge">${getMarketLabel(stock.market)}</span></td>
              <td><strong>${stock.ticker}</strong></td>
              <td>
                <span class="company">${stock.company}</span>
                <span class="note">${stock.scannerSymbol || stock.note}</span>
              </td>
              <td>${stock.sector}</td>
              <td><span class="score ${hasMarketData(stock) ? '' : 'is-unavailable'}">${Number.isFinite(stock.trendScore) ? stock.trendScore : 'N/A'}</span></td>
              <td class="${hasMarketData(stock) ? '' : 'unavailable'}">${formatPrice(stock)}</td>
              <td class="${hasMarketData(stock) ? (stock.demoChangePercent >= 0 ? 'gain' : 'loss') : 'unavailable'}">${formatChange(stock)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCardGrid(filtered) {
  return `
    <div class="stock-grid">
      ${filtered.map((stock) => `
        <article class="stock-card">
          <div class="stock-card-head">
            <div>
              <span class="market-badge">${getMarketLabel(stock.market)}</span>
              <h3>${stock.ticker}</h3>
            </div>
            <span class="score ${hasMarketData(stock) ? '' : 'is-unavailable'}">${Number.isFinite(stock.trendScore) ? stock.trendScore : 'N/A'}</span>
          </div>
          <p class="company">${stock.company}</p>
          <dl class="stock-meta">
            <div>
              <dt>Sector</dt>
              <dd>${stock.sector}</dd>
            </div>
            <div>
              <dt>Scanner price</dt>
              <dd class="${hasMarketData(stock) ? '' : 'unavailable'}">${formatPrice(stock)}</dd>
            </div>
            <div>
              <dt>Scanner change</dt>
              <dd class="${hasMarketData(stock) ? (stock.demoChangePercent >= 0 ? 'gain' : 'loss') : 'unavailable'}">${formatChange(stock)}</dd>
            </div>
          </dl>
          <p class="note">${stock.scannerSymbol || stock.note}</p>
          ${stock.marketDataError ? `<p class="error-note">${stock.marketDataError}. No stale fallback price is shown.</p>` : ''}
          <p class="note">${stock.note}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function updateNetworkStatus() {
  const status = app.querySelector('[data-status="network"]');
  if (!status) return;
  status.textContent = navigator.onLine ? 'Online app shell' : 'Offline cached shell';
  status.dataset.online = String(navigator.onLine);
}

function updateDataStatus() {
  const status = app.querySelector('[data-status="source"]');
  const health = app.querySelector('[data-status="health"]');
  const disclaimer = app.querySelector('[data-disclaimer]');
  if (!status || !health || !disclaimer) return;

  const copy = getDataStatusCopy();
  status.textContent = copy.source;
  health.textContent = copy.health;
  status.dataset.health = state.dataHealth;
  health.dataset.health = state.dataHealth;
  disclaimer.dataset.health = state.dataHealth;
  disclaimer.textContent = copy.disclaimer;
}

async function loadScannerData() {
  try {
    const scannerStocks = await fetchTradingViewStocks();
    const { availableCount, unavailableCount } = getDataCounts(scannerStocks);

    state.stocks = scannerStocks;
    state.availableCount = availableCount;
    state.unavailableCount = unavailableCount;
    state.dataHealth = unavailableCount ? 'partial' : 'loaded';
    state.dataError = '';
  } catch (error) {
    const failedStocks = fallbackStocks.map((stock) => markMarketDataUnavailable(
      stock,
      `TradingView Scanner failed: ${error.message}`,
    ));
    const { availableCount, unavailableCount } = getDataCounts(failedStocks);

    state.stocks = failedStocks;
    state.availableCount = availableCount;
    state.unavailableCount = unavailableCount;
    state.dataHealth = 'failed';
    state.dataError = `TradingView Scanner failed: ${error.message}.`;
  }

  state.isLoading = false;
  render();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.installPrompt = event;
  const installButton = app.querySelector('[data-action="install"]');
  if (installButton) installButton.hidden = false;
});

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    await warmAppShellCache();
  } catch (error) {
    console.warn('Service worker registration failed:', error);
  }
}

async function warmAppShellCache() {
  if (!('caches' in window)) return;

  const sameOriginAssets = performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.startsWith(window.location.origin))
    .filter((url) => (
      url.includes(`${import.meta.env.BASE_URL}assets/`)
      || url.endsWith(`${import.meta.env.BASE_URL}manifest.webmanifest`)
      || url.includes(`${import.meta.env.BASE_URL}icons/`)
      || url.endsWith(`${import.meta.env.BASE_URL}sw.js`)
    ));

  const cache = await caches.open(APP_CACHE_VERSION);
  await cache.addAll([
    import.meta.env.BASE_URL,
    ...sameOriginAssets,
  ]);
}

renderShell();
registerServiceWorker();
loadScannerData();
