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
- `embed.js` — auto-height Dharane price touchpoint for CMS home and article pages; it injects an isolated Shadow DOM widget, fetches only the compact latest-price feed, and links to dashboard commodity routes. `embed-cloudflare.html` is the standalone production variant with the widget code inline; it uses only the Cloudflare Pages JSON endpoints and has no local fallback. `embed-bookmarklet.txt` is the generated one-line clipboard bookmarklet source: `npm run build:bookmarklet` runs `scripts/build_bookmarklet.js` (Node standard library only), which gzips and Base64-encodes `embed-cloudflare-tight.html` into a self-contained bookmarklet that decodes with `atob` + `Uint8Array`, decompresses via `Blob` + `DecompressionStream('gzip')` + `Response.text()`, and copies the exact HTML to the clipboard (Clipboard API with a textarea/`execCommand` fallback). It works without deployment and must be regenerated after any change to `embed-cloudflare-tight.html`. `embed.html` is a local preview shell for the standard script.
- `translations.json` — English/Kannada UI and taxonomy translations.
- `data/` — browser-ready observations, taxonomy, search indexes, aliases, transliterations, and metadata.
- `assets/` and `fonts/` — local working assets; production image references primarily use the Prajavani Assettype CDN.

The browser decodes `data/observations.json` in memory and derives the active result context from URL parameters such as commodity, market, variety, origin, and card. SQLite is never queried by the browser.

`data/scraper-runs.json` is not loaded by the dashboard. It is a sanitized operational feed with 31 days of source-level records; the historical observation payload remains indefinite and is never deleted as part of run-log retention.

## Data pipelines

### Scraper pipeline

`Launch Commodity Scraper.cmd` is the canonical Windows entry point. It checks for Node.js, installs Node.js LTS through WinGet when missing, puts the discovered Node directory on `PATH` for npm lifecycle scripts, installs the local npm dependencies, ensures a Chrome/Edge or Playwright Chromium browser is available, and then starts `scrape_krama.js --ui`. `Launch Commodity Scraper.vbs` remains a compatibility shortcut that delegates to the command launcher. The scraper supports Krama, NECC eggs, Central Silk Board, Spices Board, Oil Prices, Coffee Board, and Rubber Board. Oil Prices reads the current Department of Consumer Affairs All India Average Wholesale Price - Oils table and publishes six `Oils` commodities with `All India Average` as the market and `modalPrice` as the single displayed price.

```text
source websites
      → source adapters / normalization
      → optional Cloudflare snapshot reconciliation
      → taxonomy validation and row merge
      → temporary snapshot files
      → atomic publication of data/*.json (observations remain historical)
      → source-level summary in data/scraper-runs.json
      → optional Cloudflare JSON deployment
```

The scraper preserves the existing observation snapshot when a source fails, produces no valid rows, or all rows are rejected. All Sources continues across source failures; successful sources can update the observation snapshot while failed sources are recorded as a partial run. Every source attempt receives a shared `run_id` and a sanitized 31-day summary in `data/scraper-runs.json`. Detailed JSONL logs remain under `logs/` and may contain diagnostics; they are never published. The scraper does not update `data/agro_dashboard.db`.

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

1. Loads `.env` (or the process environment when `.env` is absent) for Cloudflare credentials, `CLOUDFLARE_PAGES_PROJECT`, and `CLOUDFLARE_DATA_BASE_URL` (defaulting to `https://agro-dashboard-data.pages.dev`). Secrets are never printed.
2. Before a publish-enabled scrape, fetches and validates the live observations, run log, and metadata JSON. Local observations are unioned with the live snapshot, with the live row winning an old local conflict; the current scrape is applied afterward and wins matching `rowKey`s. Local and live run records are combined by `run_id + source`, then the existing 31-day retention is applied.
3. Runs the scraper non-interactively (`node scrape_krama.js --no-ui --sync-remote --source all`, never `--publish`, to avoid recursion) and accepts a source/date override. A nonzero source scrape can still publish its sanitized run record, but only after successful reconciliation. If reconciliation fails, publication is skipped so an old local bundle cannot replace the live snapshot.
4. Stages `translations.json`, every `data/*.json` file (including `data/scraper-runs.json`, never the SQLite DB), and a generated `_headers` into a temporary bundle under the OS temp directory. `metadata.json` includes a deterministic observation `snapshotId`.
5. Re-fetches the live JSON immediately before deployment and compares its fingerprint with the pre-scrape baseline. If Cloudflare changed, deployment is cancelled with `REMOTE_VERSION_CHANGED`; the operator must run the scrape again. Otherwise it deploys with `npx wrangler pages deploy <bundle> --project-name=<project>` and removes the temp bundle in a `finally` block.

The staging and deployment logic lives in the shared `scripts/publish_bundle.js` module (`stageAndDeploy({ rootDir })`), which returns `{ ok, ... }` without terminating the host process. Both `scripts/publish_pages.js` and the scraper reuse it.

The Windows-only command launcher selects publication based on local configuration. With valid Cloudflare credentials in `.env`, it launches `node scrape_krama.js --ui --publish`; each selected run first reconciles with the live snapshot and then deploys only if the final version check passes. Without complete credentials, it launches `node scrape_krama.js --ui` and updates local JSON only. Remote access, schema, and version-conflict errors are reported without deployment. Publication responses expose the staged snapshot/run-log freshness timestamps; they do not claim the deployment currently being uploaded is already live. `npm run scrape:publish` remains the cross-platform non-UI all-source entry point.

The repository is the source of truth for the standalone scraper distribution. `npm run package:scraper` rebuilds the sibling `Commodity Scraper Package` folder and ZIP from the scraper runtime, launcher files, translations, and JSON data, verifies JSON parity, and excludes `.env`, `node_modules`, SQLite files, and logs.

Operators authenticate Wrangler only on trusted publishing devices with Cloudflare OAuth or an account-scoped API token; credentials are never stored in the repository. Remote reconciliation prevents detected stale snapshots from being published. Cloudflare Pages has no transactional compare-and-swap deployment lock, so a central lock/publisher would still be required to eliminate the small race between the final read and deployment.

### Google Sheets run-log pipeline

`google-apps-script/Code.gs` imports the public `data/scraper-runs.json` endpoint into the existing spreadsheet. `importScraperRuns()` validates the top-level freshness timestamp and each source record, filters to the 31-day retention window, and deduplicates on `run_id + source`. A script lock prevents overlapping manual and scheduled imports. `createDailyTrigger()` replaces prior importer triggers and schedules the 9:00 AM IST execution window. Spreadsheet ID, destination tab, Cloudflare JSON URL, timezone, and optional freshness age are stored in Apps Script Properties; credentials and local JSONL logs are not involved.

Source and export paths share canonical market aliases. The dashboard uses `Cochin` and `Karnataka` as the canonical market values, including their Kannada translations; legacy `COCHIN` and `KARNATAKA` values are normalized before validation and publication.

### SQLite export pipeline

`npm run build:data` runs `scripts/build_static_site.js`, which reads the SQLite snapshot and rewrites the observations, search index, categories, and metadata JSON files. This is a separate, older data path and can overwrite scraper-produced JSON; do not run it casually after scraping.

`embed.js` and `embed-cloudflare.html` consume the existing `data/observations.json` and `data/scraper-runs.json` payloads, include rows whose successful source run was announced today or yesterday, derive the latest max-price row and previous comparable delta in the browser, inject an auto-height Shadow DOM widget, shuffle four changed-price entries on wide desktop, three on medium widths, and two on mobile on load and every nine seconds, render the dashboard-style up/down delta arrows with a 3D top-roll refresh, and send card clicks to `?view=table&type=commodity&commodity=...&origin=embed`. The standard script can fall back to repository-local JSON files; the standalone HTML variant fails closed when any Cloudflare JSON endpoint is unavailable.

Supporting scripts include the observation codec, shared market alias normalization, sister-database merge, search transliteration generation, and CMS hosted-bundle generation.

## Deployment and integrations

- `.github/workflows/deploy-pages.yml` publishes the repository as a GitHub Pages static site.
- Runtime translations and `data/*.json` files are served from the Cloudflare Pages data project at `https://agro-dashboard-data.pages.dev`; the dashboard host and the data project are independent, and the data project must send CORS headers for cross-origin access.
- `data/scraper-runs.json` is operational data rather than dashboard observation data. It is published with the same Cloudflare bundle so Apps Script can query successful, failed, no-row, taxonomy-rejected, and partial source attempts without exposing raw local diagnostics.
- The browser pushes analytics events to `window.dataLayer` through `analytics.js`. GTM container loading and the registered `card_details` custom dimension are deployment/measurement configuration outside the dashboard source. Page-view attribution is retained in browser history state so back/forward navigation does not add analytics fields to URLs.
- `cms-migration/` contains a separate CMS entry scaffold and tooling for rewriting runtime URLs to Assettype-hosted assets.
- External source websites are accessed only by the scraper; they are not runtime dashboard dependencies.

## Change boundaries

- Changes to browser entry points, URL routing, runtime data files, scraper publication, SQLite export, deployment, or CMS hosting are architecture changes.
- Taxonomy changes should be reflected in the build-script category overrides and the checked-in search/translation artifacts as appropriate.
- Keep this document current when those boundaries or flows change. `architechture.md` is an older, asset-hosting-focused note; this correctly spelled file is the high-level architecture reference.
