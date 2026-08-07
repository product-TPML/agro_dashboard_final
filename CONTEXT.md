# Agro Dashboard Lite Context

## Purpose and architecture

This repository is the static Namma Krishi Prices dashboard. It is a browser-only single-page application built with plain HTML, JavaScript, CSS, generated JSON, and local image/font assets. It is not a React, Vite, or server-rendered application.

The runtime entry point is `index.html`, which mounts the application into `#app`. `app.js` owns route state, rendering, search, filtering, localization, card expansion, and chart interactions. The browser fetches generated data files; it never queries SQLite directly.

The active results presentation is cards-only. There are older table/layout helpers and route parameters in `app.js`, but the active `getActiveResultsLayout()` forces cards. Do not assume the table UI is enabled without deliberately reworking that code path. The README still mentions cards and tables, so it is not the authoritative description of the active result layout.

## Main files

- `index.html` — static shell and `#app` mount point
- `app.js` — application state, routing, rendering, interactions, search, filters, cards, and charts
- `styles.css` — visual system, responsive layout, cards, overlays, and chart styles
- `translations.json` — UI copy plus commodity, market, and variety translations for English/Kannada
- `data/observations.json` — browser-ready price observations
- `data/search-index.json` — commodity, market, and variety search index
- `data/categories.json` — category definitions and commodity lists
- `data/metadata.json` — generated counts and timestamp
- `data/agro_dashboard.db` — SQLite source snapshot used only by the build script
- `scripts/build_static_site.js` — exports the SQLite snapshot to the four JSON files above and applies the dashboard category overrides
- `assets/` — UI assets, category badges, icons, fallback images, and commodity-specific thumbnails, including `category-spices-badge.png`, `category-livestock-poultry-badge.png`, and `egg-thumb-real.png`
- `fonts/` — bundled fonts
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment workflow

## Current data snapshot

The checked-in JSON was refreshed from the SQLite snapshot on 4 August 2026. `data/metadata.json` currently reports:

- 64,390 observations
- 147 commodities
- 178 markets
- 367 varieties
- generated at `2026-08-04T09:57:50.631Z`

Latest report dates in this snapshot by source are:

| Source | Latest report date |
| --- | --- |
| Krama (`krama`) | 2026-08-03 |
| Central Silk Board (`csb_silk`) | 2026-08-03 |
| Coffee Board (`coffee_board`) | 2026-08-03 |
| NECC eggs (`necc_egg`) | 2026-08-04 |
| Spices Board (`spices_board`) | 2026-07-31 |
| Rubber Board (`rubber_board`) | 2026-07-27 |

`build_static_site.js` reads `data/agro_dashboard.db` and rewrites only:

```text
data/observations.json
data/search-index.json
data/categories.json
data/metadata.json
```

The export normalizes report dates to `YYYY-MM-DD`, preserves source/commodity/market/variety/grade/arrival fields, and adds display-unit information. Category generation applies explicit overrides for the dashboard taxonomy and includes `Egg` in the category gallery. The database WAL/SHM sidecar files are ignored by `.gitignore`.

The checked-in browser payload remains the 4 August 2026 snapshot above. On 6 August 2026, a full rebuild from the checked-in SQLite file produced 51,456 observations and 360 varieties instead of the checked-in 64,390 observations and 367 varieties, so do not run `npm run build:data` casually until the source/data snapshot discrepancy is resolved. The category override logic is still kept in the build script so future intentional rebuilds preserve the new taxonomy.

## Views and navigation

### Home

- Hero section with responsive background artwork and search.
- Seven category tabs, in order: Fruits, Vegetables, Nuts and Seeds, Grains and Pulses, Spices, Livestock and Poultry, and Miscellaneous.
- Category-specific commodity gallery with counts and real commodity thumbnails.
- Selecting a commodity opens its results view.
- The top-bar search appears after the hero search scrolls out of view.

The current category assignments are:

- `spices`: `Clove`, `Dry Chillies`, `Mace`, `Nutmeg`, `Pepper`, and `Turmeric`
- `livestock_and_poultry`: `Bull (For Each)`, `Calf (For Each)`, `Cow (For Each)`, `Egg`, `Goat (For Each)`, `He Baffalo (For Each)`, `Ox (For Each)`, `Ram (For Each)`, `She Baffalo (For Each)`, `She Goat (For Each)`, and `Sheep (For Each)`
- `grains_and_pulses` additionally contains `Bullar` and `Sajje`

The repository preserves these canonical source names, including the existing `He Baffalo (For Each)` and `She Baffalo (For Each)` spellings, for search, filters, translations, assets, and URL compatibility.

### Results

- Sticky red results header with home/back control and language toggle.
- Search and filter controls, active-filter chips, and cards for the latest comparable row in each result group.
- Cards show source, freshness status, source-specific price metrics, price delta from the previous comparable update, metadata, arrivals/units when available, latest update, and previous update.
- “See Price History” expands an inline chart without navigating away.
- Results are sorted by latest report date, newest first. Rows with the same report date retain the existing contextual commodity/market/variety ordering; rows without a valid report date are placed last.
- Freshness badges are calculated from the browser's current local date: 0-2 days is "Recently updated," 3-7 days is "Updated this week," and anything older (or invalid/missing) is "Older update." There are no commodity-specific freshness exceptions.
- A market navigator is available in card-based home-origin commodity results and variety search results when more than one market is visible; it scrolls to and briefly highlights the selected card. It is hidden for single-market results and non-card layouts.
- A floating back-to-top control appears for longer card lists.
- Empty and loading states use the bundled neutral empty-state artwork.

## Search and filters

Search is local and uses `data/search-index.json`.

- Searches commodity, market, and variety names.
- Suggestions require at least three characters and show the matched entity type and context.
- Matching text is highlighted.
- The overlay has idle, loading, ready, empty, unavailable, and retry states.
- Selecting a commodity, market, or variety creates a URL-backed results route.
- A commodity selected from a market suggestion keeps the market context and changes the card presentation accordingly.

Filters are cascading and multi-select where the current result context supports the field. The modal keeps draft selections separate from applied selections, constrains options to valid combinations, supports option search, clear/apply actions, and exposes applied values as removable chips. Search, filter, and market-jump overlays lock body scrolling and preserve relevant input/scroll state while rendering.

## Price and history behavior

Price display is source-aware rather than one universal three-price layout:

- Standard Krama rows use max, modal, and min prices.
- Coffee rows use max/min prices.
- Silk rows use max/average/min prices.
- NECC egg, Spices Board, and Rubber Board rows use one canonical price.
- Labels and units are derived from the row/source data, including quintal, kg, 50 kg, 100 kg, 100 pieces, and piece-style units.

Price deltas compare the displayed row against the previous comparable actual database update. History is rendered as custom responsive inline SVG; no chart library is used. The chart supports the relevant one-, two-, or three-metric price series, hover/click date selection, an active-point summary, horizontal scrolling, responsive summary layouts, and an explanatory trend note.

### Missing-date chart points

The chart now includes calendar dates with no database update through the browser’s local current date:

- Perishable commodities use a normal seven-day window.
- Other commodities use a normal 30-day window.
- An actual update is shown with a circular marker.
- A missing date after an actual update is forward-filled from the last actual price and shown with a diamond marker.
- The legend, point tooltip, and selected-date summary distinguish “Actual update” from “Carried-forward price” and identify the source report date.
- Forward-filled rows are derived in memory only; they are not written to JSON or SQLite.
- For stale data, the chart extends backwards from the latest actual point far enough to provide the normal window, then carries the price forward to today.

### Chart line and mobile presentation

- Historical segments are solid, including modal-price lines.
- From the latest actual report date through today, carried-forward segments use a dashed/dotted treatment while historical segments remain solid.
- When two or more metrics share the same segment values, the segment is rendered as sequential metric-colored subsegments so overlapping max/modal/min lines remain distinguishable. Carried-forward overlapping segments retain the gaps of the dotted treatment.
- Actual update points use circles; carried-forward points use squares. Active markers are emphasized, and circles are intentionally larger/heavier than carried-forward squares for mobile readability.
- On narrow screens, the selected date stays on one line at the right edge of the summary panel. The summary and chart use the full available card width, while the chart itself remains horizontally scrollable.
- The chart legend and selected-date summary identify actual versus carried-forward points, and carried-forward selections identify the source report date.

## Localization and visual system

- English and Kannada are supported.
- The selected locale is stored in `localStorage` under `commodity-dashboard-locale`.
- UI labels and entity names are translated through `translations.json`; the document `lang` and `data-locale` attributes are updated at runtime.
- Prajavani Text is the primary font family.
- The UI uses the red sticky header, green category/selection accents, field-specific filter tones, responsive cards, and bundled prototype artwork.
- Commodity thumbnails are mapped explicitly in `BAKED_COMMODITY_THUMBS`; `Egg` uses `assets/egg-thumb-real.png`. New commodity names need a corresponding asset/mapping or an intentional fallback.
- Category rail badges are mapped explicitly in `CATEGORY_TAB_THUMBS`; the new Spices and Livestock and Poultry categories use dedicated generated badges.

## Local development

Install the build dependency once:

```bash
npm install
```

Run syntax checks:

```bash
npm run check
```

Refresh the browser JSON from the checked-in SQLite snapshot:

```bash
npm run build:data
```

Serve the repository over HTTP; do not open `index.html` directly because the browser `fetch()` calls need an HTTP origin. With Node/npm available, use:

```bash
npx --yes http-server . -p 4173
```

Then open `http://127.0.0.1:4173`. A static-file server is sufficient; there is no application server or API to start.

Starting the static server does not modify the data files. `npm run build:data` is the data-export command and should only be run when a full SQLite-to-JSON refresh is intended.

## GitHub Pages deployment

The repository is intended to deploy from the `main` branch using GitHub Actions:

- In repository Settings → Pages, set the source to **GitHub Actions**.
- `.github/workflows/deploy-pages.yml` runs on pushes to `main` or manually, uploads the repository root as the Pages artifact, and deploys it.
- `index.html` must remain at the repository root.
- The suggested “Static HTML” workflow is an alternative, not something to run alongside the existing custom workflow; duplicate workflows can cause confusing deployments.
- A `configure-pages` 404 means Pages has not been enabled/configured for the repository yet. Enable Pages with GitHub Actions selected, then rerun the workflow.
- No Node build step is required for deployment because the checked-in site is already static.

## Known constraints and caution areas

- Most application logic is in one large `app.js` file.
- `app.js` contains duplicate/legacy render and helper paths from earlier iterations. Later function declarations are the active ones; changing an earlier duplicate may have no visible effect.
- There is no framework-level state manager, routing library, component system, automated browser test suite, or chart dependency.
- The app depends on relative paths, so GitHub Pages/base-path changes should be tested with the deployed repository URL.
- Updating data requires keeping the JSON files, search index, categories, and metadata generated from the same SQLite snapshot. The checked-in JSON currently intentionally preserves a newer snapshot than the checked-in SQLite export; resolve that discrepancy before performing a full data refresh.
- Category reassignments must be made through `CATEGORY_OVERRIDES` in `scripts/build_static_site.js` and reflected in `data/categories.json`; do not edit only the generated category JSON if the change should survive a future rebuild.
- When changing chart behavior, keep actual and forward-filled rows distinguishable and do not persist derived carry-forward dates.
- When changing chart rendering, preserve solid historical lines, the dotted carried-forward tail, overlap color sequencing, marker hierarchy, full-width mobile layout, and horizontal scroll anchoring.
- When changing filters or search, verify both the initial markup and the post-interaction rerender paths, plus body-scroll locking and input/scroll restoration.
- When changing commodity imagery, update both the asset file and the `BAKED_COMMODITY_THUMBS` mapping, then test every category rail.
- `npm run check` performs syntax checks only; it does not validate data shape, visual regressions, or deployment.
