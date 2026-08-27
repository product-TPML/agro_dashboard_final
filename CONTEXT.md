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
- `data/observations.json` — browser-ready price observations in a compact dictionary-encoded payload (`version`/`columns`/`dictionaries`/`rows`); decoded in `app.js` (`loadObservations`) and produced by `scripts/observation_codec.js` via `build_static_site.js` / `merge_sister_price_data.js`
- `data/scraper-runs.json` — sanitized operational summaries for the last 31 days; it is not used by the browser and does not limit observation history
- `data/search-index.json` — commodity, market, and variety search index
- `data/categories.json` — category definitions and commodity lists
- `data/metadata.json` — generated counts, deterministic snapshot fingerprint, and timestamp
- `scripts/merge_sister_price_data.js` — merges sister-repo SQLite price rows into the checked-in observations while keeping the current taxonomy authoritative
- `data/agro_dashboard.db` — SQLite source snapshot used only by the build script
- `scripts/build_static_site.js` — exports the SQLite snapshot to the four JSON files above and applies the dashboard category overrides; writes `observations.json` in compact form via `scripts/observation_codec.js`
- `scripts/observation_codec.js` — CommonJS stdlib-only encoder/decoder for the compact `observations.json` payload (`encodeObservations`/`decodeObservations`; the decoder accepts a legacy array unchanged)
- `assets/` — UI assets, category badges, icons, fallback images, and commodity-specific thumbnails, including `category-spices-badge.png`, `category-livestock-poultry-badge.png`, and `egg-thumb-real.png`
- `fonts/` — bundled fonts
- `assets/OG Image.png` — static Open Graph/Twitter preview image
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment workflow

## Current data snapshot

The checked-in JSON is the current compact dashboard snapshot. The current repo's categories remain authoritative; rows for commodities outside the current taxonomy are excluded, and source category values are replaced with the current category assignments. `data/metadata.json` currently reports:

- 76,085 observations
- 147 commodities
- 177 markets
- 369 varieties
- generated at `2026-08-26T09:15:25.129Z`

Latest report dates in this snapshot by source are:

| Source | Latest report date |
| --- | --- |
| Krama (`krama`) | 2026-08-25 |
| NECC eggs (`necc_egg`) | 2026-08-25 |
| Central Silk Board (`csb_silk`) | 2026-08-24 |
| Rubber Board (`rubber_board`) | 2026-08-25 |
| Coffee Board (`coffee_board`) | 2026-08-23 |
| Spices Board (`spices_board`) | 2026-08-17 |

`build_static_site.js` reads `data/agro_dashboard.db` and rewrites only:

```text
data/observations.json
data/search-index.json
data/categories.json
data/metadata.json
```

The export normalizes report dates to `YYYY-MM-DD`, preserves source/commodity/market/variety/grade/arrival fields, and adds display-unit information. Category generation applies explicit overrides for the dashboard taxonomy and includes `Egg` in the category gallery. The database WAL/SHM sidecar files are ignored by `.gitignore`.

The checked-in browser payload is newer than the retained SQLite source snapshot. `npm run build:data` still reads SQLite and can overwrite JSON produced by the scraper; do not run it casually. The category override logic remains in the build script so intentional SQLite rebuilds preserve the dashboard taxonomy.

## JSON-only scraper

The repository also contains a six-source scraper that publishes the four runtime observation JSON files plus the operational run log, and never updates `data/agro_dashboard.db`:

```text
data/observations.json
data/search-index.json
data/categories.json
data/metadata.json
data/scraper-runs.json
```

It covers Krama, NECC eggs, Central Silk Board, Spices Board, Coffee Board, and Rubber Board. Use `node scrape_krama.js --help` for all options. Automation uses `--no-ui --source SOURCE --date DD/MM/YYYY`; publish-enabled automation also uses `--sync-remote`. `Launch Commodity Scraper.vbs` opens the hidden local source/date picker.

Krama uses direct HTTP/ViewState submission first, then Playwright headless and headful fallbacks. The browser fallback detects installed Chromium/Edge/Chrome, submits the ASP.NET form, and parses the final HTML server-side. Shared market normalization includes `DEVDURGA` to `DEVADURGA` and legacy `COCHIN` to the canonical `Cochin`; it also preserves the existing `IISort  without Husk` canonical value.

Successful rows merge by `rowKey`; an identical rerun replaces that row while retaining historical rows. Unknown commodity, market, variety, or grade taxonomy rows are skipped, grouped, and reported in the UI, CLI result, and structured log. If all rows are skipped, a source fails, returns no rows, or another validation error occurs, the existing observation JSON snapshot is retained. Publication uses temporary files and rollback handling so the observation JSON files remain consistent; the run log is appended independently so failures can be recorded without replacing observations.

Each scraper execution writes one record per selected source to `data/scraper-runs.json`, using a shared `run_id` for All Sources. Records contain `run_timestamp`, `requested_report_date`, `actual_report_date`, `status`, `overall_status`, scraped/accepted/skipped/merged row counts, `snapshot_status`, stable `error_code`, sanitized `error_message`, and a source `verification_url` for individual failures. Statuses are `success`, `failed`, or `partial` at the overall-run level; source records identify taxonomy rejection and no-row failures separately. The file is retained for a rolling 31 days, while observations in `data/observations.json` remain historical indefinitely.

Publish-enabled runs first fetch `https://agro-dashboard-data.pages.dev/data/observations.json`, `scraper-runs.json`, and `metadata.json` (or the configured `CLOUDFLARE_DATA_BASE_URL`). Remote observations are merged into the local snapshot before the current scrape; remote records win old local conflicts and current scrape rows win last. Run logs are merged and deduplicated by `run_id + source`. A final remote fingerprint check cancels deployment if another publisher changed the snapshot during the run. Remote network, HTTP, JSON, schema, environment, and version-conflict failures never publish the local bundle.

All Sources attempts continue after an individual source fails. If at least one source produces accepted rows, the observation snapshot is atomically updated and the failed source record says `snapshot_status: preserved`; otherwise the complete existing observation snapshot is preserved. A failed scrape still writes its run summary, and the Cloudflare publish wrapper stages that summary even when the scraper exits nonzero. Cloudflare responses report freshness timestamps for the staged snapshot and run log, not the final live state of the deployment in progress. Detailed JSONL diagnostics remain local under `logs/` and raw stack traces or secrets are not copied to Cloudflare.

### Google Sheets run-log import

`google-apps-script/Code.gs` is the importer for the existing Google Sheet. Set `SCRAPER_SPREADSHEET_ID`, `SCRAPER_SHEET_NAME`, `CLOUDFLARE_JSON_URL` (normally `https://agro-dashboard-data.pages.dev/data/scraper-runs.json`), and `SCRAPER_TIMEZONE=Asia/Kolkata` in Apps Script Properties. Run `importScraperRuns()` manually or run `createDailyTrigger()` once to create the 9:00 AM IST daily trigger window. The importer validates Cloudflare HTTP/JSON responses and freshness metadata, filters records to 31 days, prevents overlapping imports with a script lock, and deduplicates using `run_id + source`. Error fields remain in the sheet so failed, no-row, taxonomy-rejected, and partial attempts remain queryable.

`npm run build:data` still reads SQLite and can overwrite scraper-generated JSON. Do not run it casually after using the scraper.

## Views and navigation

### Home

- Hero section with responsive background artwork and search.
- The header brand uses `assets/commodity-logo.svg`; the home hero/banner brand uses `assets/pv-square-logo.svg` so the banner does not repeat the header wordmark. Both placements are clickable home links and are constrained per placement so they do not bleed into adjacent controls.
- Seven category tabs, in order: Fruits, Vegetables, Nuts and Seeds, Grains and Pulses, Spices, Livestock and Poultry, and Miscellaneous.
- Category-specific commodity gallery with counts and real commodity thumbnails.
- Desktop category rails use a small left gutter and start from the left so the first category remains fully visible when the rail overflows.
- The search overlay X closes the overlay and clears the active search term; clicking outside the overlay only closes it.
- Clicking the inline hero search or top-bar search opens the floating search panel and keeps it open; clicks inside any search root do not count as outside clicks.
- Selecting a commodity opens its results view.
- The top-bar search appears after the hero search scrolls out of view.

The current category assignments are:

- `spices`: `Clove`, `Dry Chillies`, `Mace`, `Nutmeg`, `Pepper`, and `Turmeric`
- `livestock_and_poultry`: `Bull (For Each)`, `Calf (For Each)`, `Cow (For Each)`, `Egg`, `Goat (For Each)`, `He Baffalo (For Each)`, `Ox (For Each)`, `Ram (For Each)`, `She Baffalo (For Each)`, `She Goat (For Each)`, and `Sheep (For Each)`
- `grains_and_pulses` additionally contains `Bullar` and `Sajje`

The repository preserves these canonical source names, including the existing `He Baffalo (For Each)` and `She Baffalo (For Each)` spellings, for search, filters, translations, assets, and URL compatibility.

### Results

- Sticky red results header with centered clickable logo home control, language toggle, and search. The old left-side back button is intentionally removed.
- Search and filter controls, active-filter chips, and cards for the latest comparable row in each result group.
- Cards show source, freshness status, source-specific price metrics, price delta from the previous comparable update, metadata, arrivals/units when available, latest update, and previous update.
- Results-toolbar commodity headings use a generous line box so Kannada glyphs with marks above or below the baseline are not clipped on mobile.
- “See Price History” expands an inline chart without navigating away.
- Results are sorted by latest report date, newest first. Rows with the same report date retain the existing contextual commodity/market/variety ordering; rows without a valid report date are placed last.
- Freshness badges are calculated from the browser's current local date: 0-2 days is "Recently updated," 3-7 days is "Updated this week," and anything older (or invalid/missing) is "Older update." There are no commodity-specific freshness exceptions.
- A market navigator is available in card-based home-origin commodity results and variety search results when more than one market is visible; it scrolls to and briefly highlights the selected card. It is hidden for single-market results and non-card layouts.
- A floating back-to-top control appears for longer card lists.
- Empty and loading states use the bundled neutral empty-state artwork.

### Card sharing and deep links

- Every active result card has an accessible Share button in the card header. Native `navigator.share()` is preferred; unsupported or failed native-share flows fall back to Clipboard API copying and then a textarea/legacy copy fallback.
- Share payloads include a localized results-context title, concise commodity/market/price text, and a canonical URL containing the exact card `rowKey` in the `card` query parameter.
- Shared URLs preserve the results context (`commodity`, `market`, or `variety`), relevant `origin`, and `layout=cards`, but intentionally omit active filters and locale. The recipient uses their saved locale.
- On arrival, a valid `card` key is centered in the viewport with space for the sticky header and briefly highlighted. Missing or invalid keys leave the normal results page intact, without expanding price history.
- Market titles wrap naturally, remain left-aligned beside the market icon, and are vertically centered with it. The share control remains an independent tappable region with a simple three-node share glyph.

## Search and filters

Search is local and uses `data/search-index.json`.

- Romanized Kannada is a matching-only alias for commodities and varieties. It is generated client-side from Kannada translations and cached with the search candidates; displayed labels and canonical English route values are unchanged.
- `data/search-aliases.json` contains optional curated commodity aliases and `commodity::variety` aliases for preferred spellings or exceptions. Missing or invalid alias data falls back to normal English/Kannada search, and markets remain unchanged in this first release.
- `data/search-transliterations.json` is generated from `translations.json` with `indic-transliteration` 2.3.82 using its `optitrans-lay-indian` scheme. Run `py scripts/generate_search_transliterations.py` when translation or search-index data changes; the browser consumes the checked-in JSON and retains the lightweight client transliterator as a fallback.

- Searches commodity, market, and variety names.
- Suggestions require at least three characters and show the matched entity type and context.
- Search input is debounced in the browser with a 600 ms delay once the query reaches the three-character threshold; it does not recompute on every keystroke.
- Matching text is highlighted.
- Search accepts commodity + variety combinations in either order, such as `Tomato Hybrid` or `Hybrid Tomato`, and routes a selected pair to the canonical variety page.
- Search also accepts common connector words in multi-term queries, such as `tomato in mysuru`, `tomato from mysuru`, `tomato at mysuru`, and similar phrases, by ignoring a bounded list of connective words during matching.
- Search uses canonical English names, localized English/Kannada aliases, automatic Romanized Kannada aliases, and optional curated overrides for commodities, varieties, and valid composite pairs.
- Bounded typo-tolerant ranking remains in place for all supported aliases: for example, `sebu` matches `sebbu`, `seboo`, and `seebu` through the existing fuzzy threshold. Fuzzy results remain suggestion-first; ambiguous variety names do not auto-select a commodity.
- If a composite commodity + market or commodity + variety phrase does not map to a valid pair, the search falls back to a standalone commodity suggestion rather than returning an empty list. This fallback is intentionally stricter than the normal fuzzy path so near-neighbor commodities like `Potato` do not displace the intended `Tomato` anchor.
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
- The chart guide shows only actual-update and carried-forward point markers; historical and carried-forward line styles remain rendered in the chart without separate legend labels.
- Forward-filled rows are derived in memory only; they are not written to JSON or SQLite.
- For stale data, the chart extends backwards from the latest actual point far enough to provide the normal window, then carries the price forward to today.

### Chart line and mobile presentation

- Historical segments are solid, including modal-price lines.
- From the latest actual report date through today, carried-forward segments use a dashed/dotted treatment while historical segments remain solid.
- When two or more metrics share the same segment values, the segment is rendered as sequential metric-colored subsegments so overlapping max/modal/min lines remain distinguishable. Carried-forward overlapping segments retain the gaps of the dotted treatment.
- Actual update points use circles; carried-forward points use squares. Active markers are emphasized, and circles are intentionally larger/heavier than carried-forward squares for mobile readability.
- On narrow screens, the selected date stays on one line at the right edge of the summary panel. The summary and chart use the full available card width, while the chart itself remains horizontally scrollable.
- The Max, Modal, and Min chart lines and selected-price summary markers use the same red, brown/gold, and blue palette as the result-card prices. The three selected-price metrics remain side by side on mobile.
- When a history chart opens, its horizontal viewport is anchored around the selected latest actual-update point so that point and its summary are visible immediately. Later rerenders preserve the user’s manual chart scroll position.
- The chart legend and selected-date summary identify actual versus carried-forward points, and carried-forward selections identify the source report date.
- Opening a history chart from either a card or table row keeps the selected latest actual-update point, its date, and its price legend visible in the initial horizontal viewport. Hovering or clicking another point updates the selected-date legend, while later rerenders preserve manual chart scrolling.

## Localization and visual system

- English and Kannada are supported.
- The selected locale is stored in `localStorage` under `commodity-dashboard-locale`.
- UI labels and entity names are translated through `translations.json`; the document `lang` and `data-locale` attributes are updated at runtime.
- Share, copy-link, link-copied, and share/copy failure labels are localized in English and Kannada.
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

The current browser/data cache version is `20260820-7`, referenced consistently by `app.js` and the CSS/JS tags in `index.html`. Use a hard refresh after frontend changes if an existing browser session retains an older bundle.

Starting the static server does not modify the data files. `npm run build:data` is the data-export command and should only be run when a full SQLite-to-JSON refresh is intended.

## GitHub Pages deployment

The repository is intended to deploy from the `main` branch using GitHub Actions:

- In repository Settings → Pages, set the source to **GitHub Actions**.
- `.github/workflows/deploy-pages.yml` runs on pushes to `main` or manually, uploads the repository root as the Pages artifact, and deploys it.
- `index.html` must remain at the repository root.
- `index.html` exposes one static Open Graph/Twitter preview using `assets/OG Image.png`. The image is deployed with the repository and does not require a separate image host; social crawlers must be able to reach the deployed site publicly. Card-specific previews still require pre-rendered pages.
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
- Search open/close behavior depends on `[data-search-root]`, `[data-open-search]`, and the floating overlay path in `handleDocumentClick()`. Re-check hero-search click, top-bar-search click, outside-click close, and delayed suggestion rendering together when editing this area.
- When changing commodity imagery, update both the asset file and the `BAKED_COMMODITY_THUMBS` mapping, then test every category rail.
- `npm run check` performs syntax checks only; it does not validate data shape, visual regressions, or deployment.
