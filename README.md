# Static Stock Trend Demo

A no-API, GitHub Pages-ready stock trend dashboard for USA, Singapore, and Malaysia demo stocks. The app is built with Vanilla HTML/CSS/JavaScript and Vite, uses local static data only, and includes a lightweight PWA shell.

Demo target: <https://yapweijun1996.github.io/API-Stock-USA-SG-MY-Demo/>

> [!IMPORTANT]
> This project does not fetch live market data. Prices, changes, and trend scores are static demo values for UI and deployment testing only. They are not investment advice and must not be used for trading, valuation, or production market decisions.

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

Validate the static dataset:

```bash
npm run validate:data
```

## What The App Does

- Shows 20 static demo stocks each for USA, Singapore, and Malaysia.
- Supports country tabs, sector filtering, search, sorting, and table/card views.
- Uses a PWA manifest and service worker for an installable, cacheable app shell.
- Deploys to GitHub Pages through GitHub Actions with no backend and no API key.

## Static Data Schema

| Field | Meaning |
| --- | --- |
| `market` | Market group: `USA`, `SG`, or `MY`. |
| `ticker` | Display ticker or exchange code. |
| `company` | Company name shown in the dashboard. |
| `sector` | Sector used for filtering. |
| `currency` | Demo currency code. |
| `trendScore` | Static 0-100 demo ranking score. |
| `demoPrice` | Static demo price, not live market data. |
| `demoChangePercent` | Static demo percent change. |
| `note` | Short context note for the stock card/table. |

## Modern Web Design Principles

1. Mobile-first responsive layout with content-driven breakpoints.
2. Semantic HTML before JavaScript behavior.
3. Accessibility by default: labels, focus states, contrast, keyboard support.
4. Performance budget: small JavaScript, optimized assets, low layout shift.
5. Progressive enhancement: core content works even if advanced features fail.
6. Clear information hierarchy for scanning dashboards.
7. Touch-friendly controls and non-hover-only interactions.
8. System-aware theming: light/dark mode and reduced motion.
9. Realistic empty, error, and offline states.
10. Privacy and trust: no hidden third-party API calls for a no-API demo.

References: [web.dev responsive design](https://web.dev/learn/design/), [W3C WAI accessibility principles](https://www.w3.org/WAI/fundamentals/accessibility-principles/).

## Markdown Documentation Framework

1. Use Diataxis structure: tutorial, how-to, reference, explanation.
2. Start README with purpose, demo link, and status.
3. Keep setup commands copyable and tested.
4. Separate user-facing usage from maintainer/deployment notes.
5. Use tables for stock data schema and support matrices.
6. Use callouts sparingly for warnings, notes, and limitations.
7. Add a clear "No API / Demo Data" disclaimer.
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
8. Offline mode should cache app shell and static stock data only.
9. Avoid background sync and push for this demo because no backend/API exists.
10. Test installed/standalone behavior separately from normal browser-tab behavior.

References: [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps), [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest), [WebKit Web Push for iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## GitHub Pages Deployment

The workflow in `.github/workflows/deploy-pages.yml` runs on pushes to `main`:

1. Check out the repository.
2. Install dependencies with `npm ci`.
3. Validate static stock data and build with Vite.
4. Upload `dist`.
5. Deploy to GitHub Pages.

Repository settings must use **Pages > Source > GitHub Actions**.

References: [Vite static deploy guide](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Troubleshooting

- If assets 404 on GitHub Pages, confirm `base: "/API-Stock-USA-SG-MY-Demo/"` in `vite.config.js`.
- If the app appears stale, unregister the service worker in DevTools or change the service worker cache version before redeploying.
- If install UI does not appear on iOS, use Safari's Share menu and add the site to the Home Screen.
- If offline mode fails in local dev, test the production preview after `npm run build`; service workers are more reliable in production-like bundles.
