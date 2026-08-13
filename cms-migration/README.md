# CMS Migration — Namma Krishi Prices

This folder is the migration scaffold for hosting the existing static SPA from the Prajavani Assettype media host instead of (or alongside) GitHub Pages. The root app (`index.html`, `app.js`, `styles.css`, `data/`, `assets/`, `fonts/`) is untouched and remains the baseline until the real Assettype-generated URLs are supplied and verified.

## What lives here

- `index.html` — the **CMS entry point**. A single HTML shell that mounts `#app` and loads hosted absolute URLs for JS and CSS. It is pasted into the CMS as the page body/snippet; it is **not** itself hosted as an Assettype object, so it has no hosted URL of its own.
- `hosted-config.example.json` — manifest of every expected hosted URL (JS, CSS, translations, six runtime JSON files, font, OG image, image base) under the settled base `https://images.assettype.com/prajavani/`. Documentation/config only — the app adds no runtime complexity to read it.
- `asset-map.example.json` — template for the **production asset map** (`cms-migration/asset-map.json`). One `suffixes` entry per repo-relative path (`app.js`, `styles.css`, `translations.json`, the six `data/*.json`, the font, and every `./assets/` path the generator discovers in app.js/styles.css). Production replaces each `<generated-suffix>` placeholder with the real Assettype URL. It is a template, not an enumeration of the 168 local files.
- `generate_hosted_bundle.js` — the **executable migration layer**. Reads the root `app.js`/`styles.css` and the production map, validates it, and writes `dist/app.js` + `dist/styles.css` with every runtime URL rewritten to absolute Assettype URLs.
- `README.md` — this file.

## Executable generator

`node cms-migration/generate_hosted_bundle.js [map-path] [out-dir]` — Node standard library only, no dependencies. Defaults: map `cms-migration/asset-map.json`, output `cms-migration/dist`.

The generator:

1. Reads the root `app.js` and `styles.css`.
2. Requires a real map entry for `app.js`, `styles.css`, `translations.json`, the six `data/*.json` runtime files, `fonts/PrajavaniTextRegular.woff2`, and every `./assets/` path referenced by app.js/styles.css. **Fails (exit code 1) on missing or placeholder entries — it never fabricates URLs.**
3. Rewrites `./translations.json`, `./data/*`, and `./assets/*` in `app.js`, and the font `url()` in `styles.css`, to absolute `https://images.assettype.com/prajavani/` URLs, preserving query strings (`?v=` etc.).
4. Writes `dist/app.js` and `dist/styles.css` (creating the output dir if needed).

**`dist/` cannot be produced until real Assettype suffixes are supplied** in the production map. Running the generator against the example map (or any map with `<generated-suffix>` values) intentionally fails.

## Hosted base and URL shape (settled)

- Base: `https://images.assettype.com/prajavani/`
- Shape: `https://images.assettype.com/prajavani/<cms-entry-path>/<generated-suffix>`

Assettype assigns every uploaded file its own generated URL with date/hash segments. **Image URLs cannot be derived from local filenames** — `tomato-thumb-real.png` will not appear in the hosted URL. An explicit asset map is required (`assetUrlMapRequired: true`).

## Which placeholders must be replaced

Every URL in this folder uses the variable-path placeholder `<cms-entry-path>` (the Assettype entry folder) and/or `<generated-suffix>` (per-file). Before publishing:

1. Upload `app.js`, `styles.css`, `translations.json`, the six `data/*.json`, `fonts/PrajavaniTextRegular.woff2`, and every file under `assets/` to Assettype as separate objects.
2. Collect the generated URL each upload received.
3. Copy `asset-map.example.json` → `asset-map.json` and replace every `<generated-suffix>` with the real suffix (see `asset-map.example.json` for the schema; the generator requires entries for every referenced asset path).
4. Run `node cms-migration/generate_hosted_bundle.js` to produce `dist/app.js` and `dist/styles.css` with absolute Assettype URLs.
5. Replace the JS, CSS, and OG/Twitter image URLs in `index.html` with the real generated URLs.
6. Keep the `?v=` query (currently `20260812-1`) in sync with `APP_DATA_VERSION` inside the hosted `app.js`.

## Required hosted files and data

Upload these as Assettype objects (see `MIGRATION_PLAN.md` §5–§6 for the mapping):

- `app.js`, `styles.css`
- `translations.json`
- `data/observations.json`, `data/search-index.json`, `data/search-aliases.json`, `data/search-transliterations.json`, `data/categories.json`, `data/metadata.json` (six runtime JSON files; `metadata.json` is currently not fetched by the app)
- `fonts/PrajavaniTextRegular.woff2`
- `assets/` — full tree (~245 MB, 168 files: logos, icons, category badges, commodity thumbnails, `OG Image.png`), uploaded as one object per file

**The 245 MB of assets and the 26 MB observations payload are upload dependencies, not copied here.** Sync them separately and record the generated URLs.

## Important: hosted copies need absolute runtime URLs

The hosted copies still contain relative URLs unless they are migrated/re-written:

- `app.js` fetches `./translations.json` and `./data/*.json` (six files), and builds every image URL from hardcoded `./assets/...` paths (`BAKED_COMMODITY_THUMBS`, `IMG`, etc.).
- `styles.css` loads the font via `url("./fonts/PrajavaniTextRegular.woff2")`.

Because the HTML shell loads `app.js` from an absolute Assettype URL, `./data/`, `./assets/`, and `./fonts/` resolve **relative to the CMS page**, not to the repo root. The executable generator (`generate_hosted_bundle.js`, Option B in `MIGRATION_PLAN.md` §4 step 3) performs exactly this rewrite once the production map carries real suffixes — until then, the dashboard will fail to load data, images, and the font. See `MIGRATION_PLAN.md` §11 for the open decision. The production asset map (see `asset-map.example.json`) is the source of the real URLs for that rewrite.

## Same-origin / CORS requirements

- Same-origin/CORS depends on the **eventual CMS page origin**: if the CMS page and all Assettype-hosted files share one origin, no CORS headers are needed.
- If the page origin differs from `images.assettype.com`, the asset host must send `Access-Control-Allow-Origin: <cms-page-origin>` on JSON, JS, font, and image responses, and the page must be served over HTTPS. Confirm what headers the Assettype host provides before cutover.
- Cache headers: versioned `app.js`/`styles.css` → `immutable`; `data/*.json` → short-lived or versioned; `index.html` → `no-cache`. Details in `MIGRATION_PLAN.md` §8.

## Implemented performance safeguards

- Root `app.js` render templates now add `loading="lazy" decoding="async"` to below-fold/content images (category tab images, commodity gallery tile images, search suggestion images, result/card icons, and non-critical empty/filter icons). The hero background stays eager with `fetchpriority="high" decoding="async"`; brand/logo images are unchanged.
- `index.html` in this folder includes a commented `<link rel="preconnect" href="https://images.assettype.com" crossorigin>` — uncomment when the placeholder URLs are replaced.
- CDN requirements: enable compression (Brotli/gzip) and the cache headers in `MIGRATION_PLAN.md` §8.
- Observations are not preloaded, and behavior-heavy render/data rewrites were intentionally not made.
- No runtime config fetch was added: the app does not read `hosted-config.example.json` or `asset-map.example.json`; they are documentation/templates only, and the hosted `app.js`/`styles.css` are rewritten with the final URLs.

## Validation

Full checklist in `MIGRATION_PLAN.md` §9. Minimum smoke test: after swapping in real URLs, the CMS page must render the dashboard with no 404s in the Network tab, Kannada text must render with the Prajavani font, and the OG image URL must resolve publicly. Until every placeholder is replaced with a real generated URL — including the production map feeding `generate_hosted_bundle.js` — the dashboard is **not** production-ready, and `dist/` output cannot be generated.
