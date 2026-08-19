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

### SQLite export pipeline

`npm run build:data` runs `scripts/build_static_site.js`, which reads the SQLite snapshot and rewrites the observations, search index, categories, and metadata JSON files. This is a separate, older data path and can overwrite scraper-produced JSON; do not run it casually after scraping.

Supporting scripts include the observation codec, sister-database merge, search transliteration generation, and CMS hosted-bundle generation.

## Deployment and integrations

- `.github/workflows/deploy-pages.yml` publishes the repository as a GitHub Pages static site.
- Runtime translations and `data/*.json` files are served from the Cloudflare Pages data project at `https://agro-dashboard-data.pages.dev`; the dashboard host and the data project are independent, and the data project must send CORS headers for cross-origin access.
- `cms-migration/` contains a separate CMS entry scaffold and tooling for rewriting runtime URLs to Assettype-hosted assets.
- External source websites are accessed only by the scraper; they are not runtime dashboard dependencies.

## Change boundaries

- Changes to browser entry points, URL routing, runtime data files, scraper publication, SQLite export, deployment, or CMS hosting are architecture changes.
- Taxonomy changes should be reflected in the build-script category overrides and the checked-in search/translation artifacts as appropriate.
- Keep this document current when those boundaries or flows change. `architechture.md` is an older, asset-hosting-focused note; this correctly spelled file is the high-level architecture reference.
