import './styles.css';
import { DATA_UPDATED_LABEL, markets, stocks } from './data.js';

const app = document.querySelector('#app');
const sectors = [...new Set(stocks.map((stock) => stock.sector))].sort();

const state = {
  market: 'ALL',
  sector: 'ALL',
  query: '',
  sort: 'trendScore',
  view: 'table',
  installPrompt: null,
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
  return marketFormatters.get(stock.market).format(stock.demoPrice);
}

function getFilteredStocks() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return stocks
    .filter((stock) => state.market === 'ALL' || stock.market === state.market)
    .filter((stock) => state.sector === 'ALL' || stock.sector === state.sector)
    .filter((stock) => {
      if (!normalizedQuery) return true;
      return [stock.ticker, stock.company, stock.sector, stock.note]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => {
      if (state.sort === 'price') return b.demoPrice - a.demoPrice;
      if (state.sort === 'change') return b.demoChangePercent - a.demoChangePercent;
      if (state.sort === 'ticker') return a.ticker.localeCompare(b.ticker);
      return b.trendScore - a.trendScore;
    });
}

function getMarketSummaries() {
  return markets.map((market) => {
    const marketStocks = stocks.filter((stock) => stock.market === market.id);
    const averageTrend = Math.round(
      marketStocks.reduce((sum, stock) => sum + stock.trendScore, 0) / marketStocks.length,
    );
    const leaders = marketStocks
      .slice()
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 3)
      .map((stock) => stock.ticker)
      .join(', ');

    return { ...market, averageTrend, leaders, count: marketStocks.length };
  });
}

function renderShell() {
  app.innerHTML = `
    <header class="app-header">
      <div class="header-main">
        <div>
          <p class="eyebrow">No API stock demo</p>
          <h1>Static Stock Trend Dashboard</h1>
          <p class="lede">A GitHub Pages-ready PWA demo using local data for USA, Singapore, and Malaysia stocks.</p>
        </div>
        <div class="status-panel" aria-label="Application status">
          <span class="status-pill" data-status="network">Checking status</span>
          <span class="status-pill">${DATA_UPDATED_LABEL}</span>
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
          <h2 id="controls-title">Filter and sort static trend stocks</h2>
        </div>
        <form class="controls" data-form="controls">
          <label>
            <span>Search</span>
            <input type="search" name="query" placeholder="Ticker, company, sector" autocomplete="off" />
          </label>
          <label>
            <span>Sector</span>
            <select name="sector">
              <option value="ALL">All sectors</option>
              ${sectors.map((sector) => `<option value="${sector}">${sector}</option>`).join('')}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select name="sort">
              <option value="trendScore">Trend score</option>
              <option value="change">Demo change</option>
              <option value="price">Demo price</option>
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
            <h2 id="results-title">60 demo stocks loaded locally</h2>
          </div>
          <p class="data-disclaimer">Static sample data only. No API calls, no live prices, and not investment advice.</p>
        </div>
        <div class="results" data-results></div>
      </section>
    </main>
  `;

  bindEvents();
  updateNetworkStatus();
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
    renderResults();
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

  renderSummaries();
  renderResults();
}

function renderSummaries() {
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
          <dd>${summary.averageTrend}</dd>
        </div>
      </dl>
      <p class="leaders">Trend leaders: ${summary.leaders}</p>
    </article>
  `).join('');
}

function renderResults() {
  const filtered = getFilteredStocks();
  const results = app.querySelector('[data-results]');
  const title = app.querySelector('#results-title');

  title.textContent = `${filtered.length} demo ${filtered.length === 1 ? 'stock' : 'stocks'} shown`;

  app.querySelectorAll('[data-view]').forEach((button) => {
    const isActive = button.dataset.view === state.view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (!filtered.length) {
    results.innerHTML = `
      <div class="empty-state">
        <h3>No matching demo stocks</h3>
        <p>Try a different country, sector, ticker, or company search.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = state.view === 'cards'
    ? renderCardGrid(filtered)
    : renderTable(filtered);
}

function renderTable(filtered) {
  return `
    <div class="table-wrap">
      <table>
        <caption>Static no-API stock trend demo dataset</caption>
        <thead>
          <tr>
            <th scope="col">Market</th>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col">Sector</th>
            <th scope="col">Trend</th>
            <th scope="col">Demo price</th>
            <th scope="col">Demo change</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((stock) => `
            <tr>
              <td><span class="market-badge">${getMarketLabel(stock.market)}</span></td>
              <td><strong>${stock.ticker}</strong></td>
              <td>
                <span class="company">${stock.company}</span>
                <span class="note">${stock.note}</span>
              </td>
              <td>${stock.sector}</td>
              <td><span class="score">${stock.trendScore}</span></td>
              <td>${formatPrice(stock)}</td>
              <td class="${stock.demoChangePercent >= 0 ? 'gain' : 'loss'}">${signedPercent.format(stock.demoChangePercent)}%</td>
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
            <span class="score">${stock.trendScore}</span>
          </div>
          <p class="company">${stock.company}</p>
          <dl class="stock-meta">
            <div>
              <dt>Sector</dt>
              <dd>${stock.sector}</dd>
            </div>
            <div>
              <dt>Demo price</dt>
              <dd>${formatPrice(stock)}</dd>
            </div>
            <div>
              <dt>Demo change</dt>
              <dd class="${stock.demoChangePercent >= 0 ? 'gain' : 'loss'}">${signedPercent.format(stock.demoChangePercent)}%</dd>
            </div>
          </dl>
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
  } catch (error) {
    console.warn('Service worker registration failed:', error);
  }
}

renderShell();
registerServiceWorker();
