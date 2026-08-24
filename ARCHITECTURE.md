# Dashboard Architecture

## System shape

The dashboard is a browser-only static single-page application. It has no runtime application server or API: `index.html` loads the plain JavaScript and CSS bundles from the dashboard's static host, and the browser fetches runtime JSON (translations, search indexes, taxonomy, observations) from the Cloudflare Pages data project at `https://agro-dashboard-data.pages.dev`. The dashboard may be hosted anywhere; cross-origin JSON access relies on CORS headers on the data project.

```text
Dashboard static host (any host)
        │
        ├── index.html ── app.js ── styles.css
        │
        └── https://agro-dashboard-data.pages.dev  (Cloudflare Pages data project)
                  ├── translations.json
                  └── data/*.json
                              ▲
                              │ published snapshots
                 scraper / SQLite export tools
```

## Runtime components

- `index.html` — static shell and `#app` mount point.
- `app.js` — application state, URL-based routing, search, filters, localization, result cards, sharing, and inline price-history charts.
- `analytics.js` — browser-safe data-layer contract for GTM page-view and card-expansion events; it does not require a GTM container to be present.
- `result_ordering.js` — shared canonical market, freshness, and tie-breaker ordering used by result cards.
- `styles.css` — responsive visual system and component styling.
- `translations.json` — English/Kannada UI and taxonomy translations.
- `data/` — browser-ready observations, taxonomy, search indexes, aliases, transliterations, and metadata.
- `assets/` and `fonts/` — local working assets; production image references primarily use the Prajavani Assettype CDN.

The browser decodes `data/observations.json` in memory and derives the active result context from URL parameters such as commodity, market, variety, origin, and card. SQLite is never queried by the browser.

## Data pipelines

### Scraper pipeline

`Launch Commodity Scraper.vbs` starts `scrape_krama.js --ui`, which opens a local source/date picker. The scraper supports Krama, NECC eggs, Central Silk Board, Spices Board, Coffee Board, and Rubber Board.

```text
source websites
      → source adapters / normalization
      → taxonomy validation and row merge
      → temporary snapshot files
      → atomic publication of data/*.json
```

The scraper preserves the existing snapshot when a source fails, produces no valid rows, or all rows are rejected. It writes structured JSONL logs under `logs/` and does not update `data/agro_dashboard.db`.

When an individually selected source returns no rows or encounters a source request/parsing failure, the local picker returns and displays an underlined link plus source-specific manual verification instructions for that source's official report page. Runs with **All Sources** selected omit this link and instruction block; taxonomy-only skips continue to use the existing missing-items panel.

### Manual cross-platform publication

Manual publication is performed directly from the operator's system with Wrangler; GitHub Actions is not required for this workflow. The non-interactive scraper command is:

```text
node scrape_krama.js --no-ui --source all
```

After a successful scrape, a publish wrapper stages `translations.json` and the runtime `data/*.json` files into a small deployment bundle and runs:

```text
npx wrangler pages deploy <json-bundle> --project-name=agro-dashboard-data
```

The cross-platform entry point is `npm run scrape:publish`, which owns the scrape → stage → deploy sequence. It runs `scripts/publish_pages.js` (Node standard library only), which:

1. Loads `.env` (or the process environment when `.env` is absent) for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; `CLOUDFLARE_PAGES_PROJECT` defaults to `agro-dashboard-data`. Secrets are never printed.
2. Runs the scraper non-interactively (`node scrape_krama.js --no-ui --source all`, never `--publish`, to avoid recursion) and accepts a source/date override, so `npm run scrape:publish -- --source=krama --date=DD/MM/YYYY` works (npm forwards these as `npm_config_source`/`npm_config_date`; the `=` form is the reliable one). Direct invocation `node scripts/publish_pages.js --source=krama --date=DD/MM/YYYY` is also supported. Stray positional arguments are rejected rather than silently appended. It does not deploy if the scraper exits nonzero or is signaled.
3. On success, stages `translations.json`, every `data/*.json` file (never the SQLite DB), and a generated `_headers` (public CORS `Access-Control-Allow-Origin: *` for GET/HEAD/OPTIONS and `Cache-Control: no-cache`) into a temporary bundle under the OS temp directory.
4. Deploys with `npx wrangler pages deploy <bundle> --project-name=<project>` (using `npx.cmd` on Windows), passing the loaded environment, and removes the temp bundle in a `finally` block. It exits nonzero if deployment fails.

The staging and deployment logic lives in the shared `scripts/publish_bundle.js` module (`stageAndDeploy({ rootDir })`), which returns `{ ok, ... }` without terminating the host process. Both `scripts/publish_pages.js` and the scraper reuse it.

The Windows-only `Launch Commodity Scraper.vbs` picker now launches `node scrape_krama.js --ui --publish`, so each successful run selected in the UI is also deployed to Cloudflare Pages (the publish result is shown in the UI status and included in the `/run` JSON response). A failed scrape is not published; a failed deployment is reported but does not undo the local snapshot. `npm run scrape:publish` remains the cross-platform non-UI all-source entry point.

Operators authenticate Wrangler on each trusted device with Cloudflare OAuth or an account-scoped API token; credentials are never stored in the repository. Concurrent manual runs should be avoided because the last successful Cloudflare Pages deployment becomes the live snapshot.

Source and export paths share canonical market aliases. The dashboard uses `Cochin` and `Karnataka` as the canonical market values, including their Kannada translations; legacy `COCHIN` and `KARNATAKA` values are normalized before validation and publication.

### SQLite export pipeline

`npm run build:data` runs `scripts/build_static_site.js`, which reads the SQLite snapshot and rewrites the observations, search index, categories, and metadata JSON files. This is a separate, older data path and can overwrite scraper-produced JSON; do not run it casually after scraping.

Supporting scripts include the observation codec, shared market alias normalization, sister-database merge, search transliteration generation, and CMS hosted-bundle generation.

## Deployment and integrations

- `.github/workflows/deploy-pages.yml` publishes the repository as a GitHub Pages static site.
- Runtime translations and `data/*.json` files are served from the Cloudflare Pages data project at `https://agro-dashboard-data.pages.dev`; the dashboard host and the data project are independent, and the data project must send CORS headers for cross-origin access.
- The browser pushes analytics events to `window.dataLayer` through `analytics.js`. GTM container loading and the registered `card_details` custom dimension are deployment/measurement configuration outside the dashboard source. Page-view attribution is retained in browser history state so back/forward navigation does not add analytics fields to URLs.
- `cms-migration/` contains a separate CMS entry scaffold and tooling for rewriting runtime URLs to Assettype-hosted assets.
- External source websites are accessed only by the scraper; they are not runtime dashboard dependencies.

## Change boundaries

- Changes to browser entry points, URL routing, runtime data files, scraper publication, SQLite export, deployment, or CMS hosting are architecture changes.
- Taxonomy changes should be reflected in the build-script category overrides and the checked-in search/translation artifacts as appropriate.
- Keep this document current when those boundaries or flows change. `architechture.md` is an older, asset-hosting-focused note; this correctly spelled file is the high-level architecture reference.
