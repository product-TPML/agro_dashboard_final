# CMS Migration — Namma Krishi Prices

This folder is the migration scaffold for hosting the existing static SPA from a CMS/CDN instead of (or alongside) GitHub Pages. The root app (`index.html`, `app.js`, `styles.css`, `data/`, `assets/`, `fonts/`) is untouched and remains the baseline until the hosted URLs are supplied and verified.

## What lives here

- `index.html` — the **CMS entry point**. A single HTML shell that mounts `#app` and loads hosted absolute URLs for JS and CSS. It is a drop-in replacement for the root `index.html` on the CMS side.
- `hosted-config.example.json` — manifest of every expected hosted URL (JS, CSS, translations, six runtime JSON files, font, OG image, image base). Documentation/config only — the app adds no runtime complexity to read it.
- `README.md` — this file.

## Which placeholders must be replaced

Every URL in this folder uses the placeholder host `https://YOUR-CMS-CDN.example/agro-dashboard/`. Before publishing:

1. Replace the JS, CSS, and OG/Twitter image URLs in `index.html`.
2. Replace every URL in `hosted-config.example.json`.
3. Keep the `?v=` query (currently `20260812-1`) in sync with `APP_DATA_VERSION` inside the hosted `app.js`.

## Required hosted files and data

Mirror the repo layout under the hosted prefix (see `MIGRATION_PLAN.md` §5–§6 for the exact mapping):

- `app.js`, `styles.css`
- `translations.json`
- `data/observations.json`, `data/search-index.json`, `data/search-aliases.json`, `data/search-transliterations.json`, `data/categories.json`, `data/metadata.json` (six runtime JSON files; `metadata.json` is currently not fetched by the app)
- `fonts/PrajavaniTextRegular.woff2`
- `assets/` — full tree (~245 MB, 168 files: logos, icons, category badges, commodity thumbnails, `OG Image.png`)

**The 245 MB of assets and the 26 MB observations payload are upload dependencies, not copied here.** Sync them separately.

## Important: relative URLs in the app code

The hosted copies still contain relative URLs unless they are migrated/re-written:

- `app.js` fetches `./translations.json` and `./data/*.json` (six files), and builds every image URL from hardcoded `./assets/...` paths (`BAKED_COMMODITY_THUMBS`, `IMG`, etc.).
- `styles.css` loads the font via `url("./fonts/PrajavaniTextRegular.woff2")`.

Because the HTML shell loads `app.js` from an absolute URL, `./data/`, `./assets/`, and `./fonts/` resolve **relative to the CMS page**, not to the repo root. Until the hosted copies of `app.js` and `styles.css` are rewritten to absolute hosted URLs (or a base-URL override is added), the dashboard will fail to load data, images, and the font. See `MIGRATION_PLAN.md` §4 step 3 (Option B is recommended) and §11 for the open decision.

## Same-origin / CORS requirements

- If the CMS page and all hosted files share one origin, no CORS headers are needed.
- If the page origin differs from the asset/CDN host, the CDN must send `Access-Control-Allow-Origin: <cms-page-origin>` on JSON, JS, font, and image responses, and the page must be served over HTTPS.
- Cache headers: versioned `app.js`/`styles.css` → `immutable`; `data/*.json` → short-lived or versioned; `index.html` → `no-cache`. Details in `MIGRATION_PLAN.md` §8.

## Implemented performance safeguards

- Root `app.js` render templates now add `loading="lazy" decoding="async"` to below-fold/content images (category tab images, commodity gallery tile images, search suggestion images, result/card icons, and non-critical empty/filter icons). The hero background stays eager with `fetchpriority="high" decoding="async"`; brand/logo images are unchanged.
- `index.html` in this folder includes a commented `<link rel="preconnect" href="https://YOUR-CMS-CDN.example" crossorigin>` — uncomment with the real host when the placeholder URLs are replaced.
- CDN requirements: enable compression (Brotli/gzip) and the cache headers in `MIGRATION_PLAN.md` §8.
- Observations are not preloaded, and behavior-heavy render/data rewrites were intentionally not made.

## Validation

Full checklist in `MIGRATION_PLAN.md` §9. Minimum smoke test: after swapping in real URLs, the CMS page must render the dashboard with no 404s in the Network tab, Kannada text must render with the Prajavani font, and the OG image URL must resolve publicly.
