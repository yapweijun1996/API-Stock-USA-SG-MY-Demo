# TradingView Scanner Stock Trend Demo

A no-API-key, GitHub Pages-ready stock trend dashboard for USA, Singapore, and Malaysia stocks. The app is built with Vanilla HTML/CSS/JavaScript and Vite, loads prices from TradingView Scanner, and includes a lightweight PWA shell with static fallback metadata.

Demo target: <https://yapweijun1996.github.io/API-Stock-USA-SG-MY-Demo/>

> [!IMPORTANT]
> This project fetches browser-side scanner data from `https://scanner.tradingview.com/global/scan` without an API key. That endpoint is not a formal TradingView developer market-data API, so this demo must not be used for trading, valuation, risk, or critical production decisions.

## Quick Start

```bash
npm ci
npm run dev
```

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

Validate the fallback dataset:

```bash
npm run validate:data
```

## What The App Does

- Shows up to 20 scanner stocks each for USA, Singapore, and Malaysia.
- Calls `https://scanner.tradingview.com/global/scan` directly from the browser with no API key.
- Uses no explicit `Content-Type` header on the scanner request because TradingView's browser CORS preflight rejects that header.
- Falls back to local company/ticker metadata if the scanner request fails or the app is offline; prices and changes are marked unavailable instead of showing stale fallback prices.
- Supports country tabs, sector filtering, search, sorting, and table/card views.
- Uses an OKLCH-based design token system with Light, Dark, and System theme modes.
- Defaults to card view on mobile and table view on desktop, with the user's view choice persisted locally.
- Shows skeleton loading states while TradingView Scanner data is loading.
- Separates loaded, partial, and failed scanner states so unavailable prices are never confused with real market movement.
- Uses a PWA manifest and service worker for an installable, cacheable app shell.
- Deploys to GitHub Pages through GitHub Actions with no backend and no API key.

## UI And Data States

| State | End-user behavior |
| --- | --- |
| `loading` | Summary cards and results show skeleton placeholders while the scanner request is pending. |
| `loaded` | Scanner rows are available and prices/changes are shown from TradingView Scanner. |
| `partial` | Some scanner rows are missing; available rows show prices, missing rows show `N/A` and `Unavailable`. |
| `failed` | Scanner request failed or the app is offline; the app shows company metadata only and hides all prices/changes. |

The dashboard uses neutral/amber unavailable styling instead of red so missing data is not mistaken for a price drop.

## Theme And Layout Preferences

The UI supports `System`, `Light`, and `Dark` theme modes. Theme and view preferences are stored in the browser only:

| Key | Values | Purpose |
| --- | --- | --- |
| `stock-demo-theme` | `system`, `light`, `dark` | Controls the color theme. `system` follows `prefers-color-scheme`. |
| `stock-demo-view` | `table`, `cards` | Controls table/card layout. If unset, mobile defaults to cards and desktop defaults to table. |

The CSS design system uses semantic tokens for page backgrounds, panels, text, borders, status colors, spacing, radius, and shadows. Color tokens use OKLCH with fallback values where practical.

## Static Data Schema

| Field | Meaning |
| --- | --- |
| `market` | Market group: `USA`, `SG`, or `MY`. |
| `ticker` | Display ticker or exchange code. |
| `company` | Company name shown in the dashboard. |
| `sector` | Sector used for filtering. |
| `currency` | Demo currency code. |
| `trendScore` | 0-100 UI ranking score derived from scanner movement or fallback score. |
| `demoPrice` | Scanner `close` price; rendered as unavailable when scanner data fails. |
| `demoChangePercent` | Scanner `change` percent; rendered as unavailable when scanner data fails. |
| `note` | Short context note for the stock card/table. |

## Modern Web Design Principles

1. Mobile-first responsive layout with content-driven breakpoints.
2. Semantic HTML before JavaScript behavior.
3. Accessibility by default: labels, focus states, contrast, keyboard support.
4. Performance budget: small JavaScript, optimized assets, low layout shift.
5. Progressive enhancement: core content works even if advanced features fail.
6. OKLCH design tokens for more predictable color contrast and theme scaling.
7. Clear information hierarchy for scanning dashboards.
8. Touch-friendly controls and non-hover-only interactions.
9. System-aware theming: light/dark/system mode and reduced motion.
10. Realistic loading, partial-data, error, and offline states.

References: [web.dev responsive design](https://web.dev/learn/design/), [MDN OKLCH](https://developer.mozilla.org/docs/Web/CSS/color_value/oklch), [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-color-scheme), [W3C WAI accessibility principles](https://www.w3.org/WAI/fundamentals/accessibility-principles/).

## Markdown Documentation Framework

1. Use Diataxis structure: tutorial, how-to, reference, explanation.
2. Start README with purpose, demo link, and status.
3. Keep setup commands copyable and tested.
4. Separate user-facing usage from maintainer/deployment notes.
5. Use tables for stock data schema and support matrices.
6. Use callouts sparingly for warnings, notes, and limitations.
7. Add a clear "No API Key / TradingView Scanner" disclaimer.
8. Document GitHub Pages deployment flow.
9. Include troubleshooting for PWA cache and Pages base path issues.
10. Keep docs versioned with the code and update them when behavior changes.

Reference: [Diataxis documentation framework](https://diataxis.fr/).

## PWA Support, Issues, And Principles

1. HTTPS is required for service workers outside localhost.
2. Installability depends on manifest, icons, start URL, display mode, and browser heuristics.
3. iOS Home Screen web apps support manifest-driven standalone behavior, but install UX differs from Chrome.
4. iOS Web Push requires Home Screen install and direct user interaction for permission.
5. `beforeinstallprompt` is Chromium-oriented and should not be treated as universal.
6. Service worker cache can make GitHub Pages updates appear stale unless versioned carefully.
7. GitHub Pages repo base paths can break assets unless Vite `base` is set correctly.
8. Offline mode should cache the app shell and mark prices unavailable when scanner fetches fail.
9. Offline or partial scanner failure should not reuse stale static prices.
10. Test installed/standalone behavior separately from normal browser-tab behavior.

References: [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps), [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest), [WebKit Web Push for iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## GitHub Pages Deployment

The workflow in `.github/workflows/deploy-pages.yml` runs on pushes to `main`:

1. Check out the repository.
2. Install dependencies with `npm ci`.
3. Validate fallback stock data and build with Vite.
4. Upload `dist`.
5. Deploy to GitHub Pages.

Repository settings must use **Pages > Source > GitHub Actions**.

References: [Vite static deploy guide](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Verification Checklist

Before release, run:

```bash
npm run validate:data
npm run build
```

Browser checks:

- Desktop `1280x800`: table view is the default when no saved view preference exists.
- Mobile `390x844`: card view is the default when no saved view preference exists.
- Theme toggle: `System`, `Light`, and `Dark` update the page and persist after reload.
- Partial scanner state: status shows loaded/unavailable counts, missing symbols show `Unavailable`, and no stale price is shown.
- Offline/failure state: all prices and changes are unavailable, while company/ticker metadata remains visible.
- Table view: header stays sticky while scrolling the table body on desktop.
- Accessibility basics: keyboard focus is visible on tabs, filters, view buttons, theme buttons, and install button.

## Troubleshooting

- If assets 404 on GitHub Pages, confirm `base: "/API-Stock-USA-SG-MY-Demo/"` in `vite.config.js`.
- If the app appears stale, unregister the service worker in DevTools or change the service worker cache version before redeploying.
- If install UI does not appear on iOS, use Safari's Share menu and add the site to the Home Screen.
- If scanner data does not load in a browser, confirm the request does not set an explicit `Content-Type: application/json` header.
- If offline mode fails in local dev, test the production preview after `npm run build`; service workers are more reliable in production-like bundles.
- If theme or view defaults look wrong during testing, clear `stock-demo-theme` and `stock-demo-view` from localStorage before reloading.
