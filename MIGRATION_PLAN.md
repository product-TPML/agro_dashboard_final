# Migration Plan: Hosting the Agro Dashboard from Prajavani Assettype

Status: **Draft — root app remains the baseline until real Assettype-generated URLs are supplied and verified.**
Owner of validation: the requesting user. This document and the `cms-migration/` folder are scaffold/docs only; no root file is modified.

---

## 1. Current architecture

- **Entry point:** root `index.html` — a static shell that mounts `#app` and loads `./styles.css?v=20260812-1` and `./app.js?v=20260812-1`.
- **Runtime:** browser-only SPA (plain HTML/CSS/JS, no framework). `app.js` owns routing, rendering, search, filters, localization, cards, and inline SVG charts.
- **Data:** the browser `fetch()`es JSON at runtime — it never queries SQLite.
- **Assets/fonts:** referenced by hardcoded **relative** URLs in `app.js` (`./assets/...`) and `styles.css` (`./fonts/...`).
- **Deployment today:** GitHub Pages via `.github/workflows/deploy-pages.yml`; the repo root is served as-is.

## 2. Target architecture

- **Asset host (settled):** Prajavani Assettype — base `https://images.assettype.com/prajavani/`. Every uploaded file receives its own generated URL under that base with date/hash segments (shape: `https://images.assettype.com/prajavani/<cms-entry-path>/<generated-suffix>`).
- The CMS hosts a single HTML entry point (`cms-migration/index.html`) pasted into the page body; it is **not** itself an Assettype object and therefore has no hosted URL of its own.
- JS, CSS, translations, data JSON, fonts, and images are uploaded to Assettype as separate objects; the hosted copies of `app.js`/`styles.css` are rewritten to reference the real generated URLs (see §4 step 3).
- The root repo stays untouched and keeps working as the baseline reference.
- **Open deployment input:** the per-file generated URL for each upload. Assettype generates these at upload time; they cannot be derived from local filenames and must be recorded in the asset map (`cms-migration/asset-map.example.json`) and config manifest (`cms-migration/hosted-config.example.json`).

## 3. Inventory

### Files the browser loads at runtime

| Path in repo | Role | Size |
| --- | --- | --- |
| `index.html` | Shell (to be pasted as `cms-migration/index.html` body into CMS) | ~1 KB |
| `app.js` | Entire application logic | large single file |
| `styles.css` | Visual system | ~1 file |
| `translations.json` | UI copy + EN/KN translations | small |
| `data/observations.json` | 68,369 price observations | **26.28 MB** |
| `data/search-index.json` | Search index | ~0.02 MB |
| `data/search-aliases.json` | Curated aliases | small |
| `data/search-transliterations.json` | Romanized Kannada aliases | ~0.02 MB |
| `data/categories.json` | Category taxonomy | small |
| `data/metadata.json` | Generated counts/timestamp (build artifact; **not fetched** by `app.js` today) | small |
| `fonts/PrajavaniTextRegular.woff2` | Primary font | ~0.05 MB |
| `assets/OG Image.png` | Social preview image | ~1 file |
| `assets/` (168 files) | Logos, icons, category badges, ~150 commodity thumbnails, empty-state art | **~245 MB total** |

### Upload dependencies (not copied in this scaffold — see §6)

- The full `assets/` tree (~245 MB, 168 files) and `data/` JSON payloads (~26 MB for `observations.json` alone, ~41.5 MB total including the 15 MB SQLite snapshot `data/agro_dashboard.db`). `agro_dashboard.db` is a build-time source artifact and does **not** need to be uploaded for runtime.
- `translations.json` and the six `data/*.json` runtime files.

## 4. Exact migration steps

1. **Upload to Assettype.** Upload `app.js`, `styles.css`, `translations.json`, the six `data/*.json`, `fonts/PrajavaniTextRegular.woff2`, and every file under `assets/` as separate Assettype objects. Record the generated URL of every upload (see §6 checklist).
2. **Build the asset map.** Copy `asset-map.example.json` → `cms-migration/asset-map.json` and replace every `<generated-suffix>` placeholder (also in `hosted-config.example.json`) with the real Assettype suffixes. The map is required — Assettype's date/hash segments make it impossible to derive image URLs from local filenames (`assetUrlMapRequired: true`).
3. **Rewrite or configure runtime URLs.** Two required options, pick one:
   - **Option A (no code change):** upload `app.js`, `styles.css`, `translations.json`, `data/*.json`, `fonts/*`, and `assets/*` under the exact same relative layout at the same origin — then `cms-migration/index.html` cannot use it as-is, because its absolute JS/CSS URLs make the page origin the CMS page origin, while `app.js` still resolves `./data/...` and `./assets/...` **relative to the CMS page**, which may point nowhere.
   - **Option B (recommended, executable):** run the migration generator `node cms-migration/generate_hosted_bundle.js` once `cms-migration/asset-map.json` carries real Assettype suffixes. It reads the root `app.js`/`styles.css`, validates every required map entry, rewrites every `./translations.json`, `./data/*`, `./assets/*` reference in `app.js` and the font `url()` in `styles.css` to absolute Assettype URLs, and writes `cms-migration/dist/app.js` + `dist/styles.css`. It fails (exit 1) on missing or placeholder entries and never fabricates URLs.
4. **Update the HTML shell** `cms-migration/index.html` with the real URLs (JS, CSS, OG image), keeping `#app` as the mount point and the version query (`?v=20260812-1` — keep in sync with `APP_DATA_VERSION` in `app.js`).
5. **Set headers** on the Assettype host / CMS page (see §8).
6. **Validate** against the checklist in §9.
7. **Cut over** (see §10).

### Implemented performance safeguards (root app)

- Below-fold/content images in the active `app.js` render templates now carry `loading="lazy" decoding="async"` (category tab images, commodity gallery tile images, search suggestion images, result/card icons, and non-critical empty/filter icons).
- The home hero background image stays eager and now carries `fetchpriority="high" decoding="async"`; brand/logo images are unchanged.
- CDN requirements for this pass: enable compression (Brotli/gzip) on JSON/JS/CSS and keep the §8 cache headers (versioned bundles `immutable`, `assets/*`/`fonts/*` immutable, `data/*.json` short-lived or versioned) so lazy images and versioned bundles cache predictably.
- Observations are intentionally **not** preloaded, and behavior-heavy render/data rewrites were intentionally **not** made during this pass.

## 5. URL mapping (before → after)

Base (settled): `https://images.assettype.com/prajavani/`
Generated URL shape: `https://images.assettype.com/prajavani/<cms-entry-path>/<generated-suffix>`

| Repo path (relative) | Hosted URL |
| --- | --- |
| `cms-migration/index.html` | Not hosted as an Assettype object — pasted into the CMS page body |
| `./app.js?v=20260812-1` | `https://images.assettype.com/prajavani/<cms-entry-path>/app.js?v=20260812-1` |
| `./styles.css?v=20260812-1` | `https://images.assettype.com/prajavani/<cms-entry-path>/styles.css?v=20260812-1` |
| `./translations.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/translations.json` |
| `./data/observations.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/observations.json` |
| `./data/search-index.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/search-index.json` |
| `./data/search-aliases.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/search-aliases.json` |
| `./data/search-transliterations.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/search-transliterations.json` |
| `./data/categories.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/categories.json` |
| `./data/metadata.json` | `https://images.assettype.com/prajavani/<cms-entry-path>/metadata.json` (build artifact, not fetched) |
| `./fonts/PrajavaniTextRegular.woff2` | `https://images.assettype.com/prajavani/<cms-entry-path>/prajavani-text-regular.woff2` |
| `./assets/OG Image.png` | `https://images.assettype.com/prajavani/<cms-entry-path>/og-image.png` |
| `./assets/<file>` (168 files) | `https://images.assettype.com/prajavani/<cms-entry-path>/<generated-suffix>` — one generated URL per upload; recorded in the asset map |

## 6. Upload / config checklist

Before cutover, complete **all** of the following (each item is required):

- [ ] Upload `app.js` and `styles.css` to Assettype; record their generated URLs.
- [ ] Upload `translations.json` and the six `data/*.json` files (observations, search-index, search-aliases, search-transliterations, categories, metadata); record their generated URLs.
- [ ] Upload `fonts/PrajavaniTextRegular.woff2`; record its generated URL.
- [ ] Upload `assets/OG Image.png`; record its generated URL.
- [ ] Upload every file under `assets/` (168 files: logos, icons, category badges, ~150 commodity thumbnails, empty-state art); record the generated URL of each. Do not fabricate suffixes — export the real URLs from the Assettype media library.
- [ ] Replace every `<generated-suffix>` placeholder in `cms-migration/asset-map.example.json` with the real URLs above (one entry per asset category; the commodity-thumbnail entry covers all ~150 thumbnails via the export).
- [ ] Copy `asset-map.example.json` → `cms-migration/asset-map.json` and fill **every** key the generator requires (the fixed set in `requiredKeys` plus every `./assets/` path referenced by app.js/styles.css, discovered at runtime).
- [ ] Run `node cms-migration/generate_hosted_bundle.js` and confirm it exits 0, writing `cms-migration/dist/app.js` and `cms-migration/dist/styles.css` with no remaining `./assets/`, `./data/`, `./fonts/`, or `./translations.json` references.
- [ ] Replace every placeholder in `cms-migration/hosted-config.example.json` (`assetUrlPattern`, base URLs, entry, runtime JSON, assets) with the real URLs; confirm `assetUrlMapRequired` stays `true`.
- [ ] Replace the JS/CSS/OG URLs in `cms-migration/index.html` with the real generated URLs.
- [ ] Rewrite the hosted copies of `app.js` (`IMG`, `BAKED_COMMODITY_THUMBS`, `CATEGORY_TAB_THUMBS`, `./data/*` fetches, `./translations.json`) and `styles.css` (font `url(...)`) to absolute Assettype URLs per §4 step 3 (Option B).
- [ ] Confirm the `?v=` query on JS/CSS matches `APP_DATA_VERSION` in the hosted `app.js`.
- [ ] Confirm the Assettype host serves correct MIME types and the §8 headers; confirm CORS per the eventual CMS page origin.

Not required to upload: `data/agro_dashboard.db`, `scripts/`, `package.json`, `.github/`, this plan, the root `index.html`. This scaffold does **not** copy the 245 MB of assets or the 26 MB observations payload; they are upload dependencies to be synced separately (Assettype media library upload, or equivalent bulk upload with URL export).

## 7. CMS/CDN requirements

- Serve static files over HTTPS with correct MIME types (`text/html`, `text/javascript` / `application/javascript`, `text/css`, `application/json`, `image/png`, `image/svg+xml`, `font/woff2`).
- Allow GET only; no authentication for runtime assets (the SPA has no API).
- Assettype returns a generated URL per upload (date/hash segments); the CMS page must reference those exact URLs.
- No server-side rendering needed — the SPA is client-only.

## 8. CORS / cache headers

**CORS** — depends on the eventual CMS page origin. If the CMS page and all Assettype-hosted files share one origin, no CORS headers are needed. If the page origin differs from `images.assettype.com`, the asset host must send for JSON/JS/font/image responses:

```
Access-Control-Allow-Origin: https://<cms-page-origin>
```

Confirm what headers the Assettype host provides before cutover.

**Cache headers** (recommended):

| Resource | Cache-Control |
| --- | --- |
| `index.html` (CMS page) | `no-cache` |
| `app.js`, `styles.css` (versioned `?v=`) | `public, max-age=31536000, immutable` |
| `data/*.json`, `translations.json` (versioned `?v=` in fetch) | `public, max-age=86400` (or immutable with version bump) |
| `assets/*`, `fonts/*` | `public, max-age=31536000, immutable` |

Bump the `?v=` query on `app.js`/`styles.css` (currently `20260812-1`) and the `APP_DATA_VERSION` constant whenever content changes; the app version-stamps every `fetchJson()` call, so a stale HTML shell with old `?v=` is the only cache risk.

## 9. Validation checklist

- [ ] HTML shell loads with the **real** Assettype URLs (no `<cms-entry-path>`/`<generated-suffix>` placeholder left in the page or configs).
- [ ] `#app` renders the dashboard (home, categories, search).
- [ ] All six `data/*.json` + `translations.json` requests return 200 with `Content-Type: application/json` (browser devtools → Network).
- [ ] No 404s for any Assettype-hosted image or font request; spot-check commodity thumbnails and the Prajavani font (Kannada glyphs).
- [ ] Search, filters, price-history charts, language toggle, and share/deep-link (`?card=...`) work from the CMS page URL.
- [ ] Social preview: fetch the CMS page URL with a crawler or inspect the OG meta — `og:image` resolves to the hosted absolute URL.
- [ ] CORS: open the CMS page from a second tab/host and confirm no mixed-origin fetch failures.
- [ ] Hard-refresh after cutover to bypass stale cache; confirm the served `?v=` matches `APP_DATA_VERSION`.
- [ ] Every URL in the asset map resolves to the object uploaded for that role (spot-check against the Assettype media library export).
- [ ] The `dist/` output of `generate_hosted_bundle.js` contains **no** `./assets/`, `./data/`, `./fonts/`, or `./translations.json` references — grep the generated `dist/app.js`/`dist/styles.css`.

## 10. Rollback / cutover

- **Cutover:** point the CMS page (or domain) at the pasted `cms-migration/index.html` body after §9 passes against the staging URL. Because the root repo is untouched, this is purely a CMS-side switch.
- **Rollback:** repoint the CMS page to the previous entry (or to the GitHub Pages URL) — no repo change needed. Keep the old CMS entry publishable until the new one has been live for at least one data refresh cycle.

## 11. Open decisions

1. **URL rewrite vs. configurable base:** rewrite a hosted copy of `app.js`/`styles.css` (Option B, recommended) or add a small base-URL bootstrap that overrides the relative paths at load time (adds runtime complexity — currently avoided per the scaffold rules; no runtime config fetch is added).
2. **Origin:** serve everything from one CMS origin (no CORS) vs. split HTML page (CMS) and Assettype assets (`images.assettype.com`) — the latter needs the §8 CORS header; confirm the Assettype host's header support.
3. **Data refresh cadence:** how `data/*.json` gets re-exported (`npm run build:data` or `node scripts/merge_sister_price_data.js`) and re-uploaded to Assettype with new generated URLs — manual step, scheduled job, or CI push.
4. **Image base strategy:** upload thumbnails to Assettype and rewrite `BAKED_COMMODITY_THUMBS`/`IMG`/`CATEGORY_TAB_THUMBS` in the hosted `app.js` using the asset map (required regardless, since Assettype URLs are generated per file) vs. any alternate path-mirroring that Assettype does not support.
5. **Metadata note:** `data/metadata.json` is currently generated and not fetched at runtime; decide whether the hosted copy stays in sync or is dropped from the upload set.

**Status of decisions:** the base-origin decision (Assettype, `https://images.assettype.com/prajavani/`) is **settled**. The generated per-file URLs remain an **open deployment input** — they only exist after upload and must be captured in the asset map before cutover. The executable generator (`cms-migration/generate_hosted_bundle.js`) implements Option B but **cannot produce `dist/` output until real suffixes are supplied** in `cms-migration/asset-map.json`; running it against placeholder values intentionally fails. The dashboard is not production-ready until those real URLs replace every placeholder.
