# Migration Plan: Hosting the Agro Dashboard from a CMS/CDN

Status: **Draft — root app remains the baseline until hosted URLs are supplied and verified.**
Owner of validation: the requesting user. This document and the `cms-migration/` folder are scaffold/docs only; no root file is modified.

---

## 1. Current architecture

- **Entry point:** root `index.html` — a static shell that mounts `#app` and loads `./styles.css?v=20260812-1` and `./app.js?v=20260812-1`.
- **Runtime:** browser-only SPA (plain HTML/CSS/JS, no framework). `app.js` owns routing, rendering, search, filters, localization, cards, and inline SVG charts.
- **Data:** the browser `fetch()`es JSON at runtime — it never queries SQLite.
- **Assets/fonts:** referenced by hardcoded **relative** URLs in `app.js` (`./assets/...`) and `styles.css` (`./fonts/...`).
- **Deployment today:** GitHub Pages via `.github/workflows/deploy-pages.yml`; the repo root is served as-is.

## 2. Target architecture

- CMS hosts a single HTML entry point (`cms-migration/index.html`) that mounts `#app` and loads **absolute hosted URLs** for JS and CSS.
- JS, CSS, translations, data JSON, fonts, and images are served from the CMS/CDN under `https://YOUR-CMS-CDN.example/agro-dashboard/`.
- The root repo stays untouched and keeps working as the baseline reference.

## 3. Inventory

### Files the browser loads at runtime

| Path in repo | Role | Size |
| --- | --- | --- |
| `index.html` | Shell (to be replaced by `cms-migration/index.html` on CMS) | ~1 KB |
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

1. **Supply URLs.** Replace every `https://YOUR-CMS-CDN.example/...` placeholder in `cms-migration/index.html` and `cms-migration/hosted-config.example.json` with real CMS/CDN URLs. Decide the image-base URL strategy (see §10, Open decisions).
2. **Upload static files** (see §6 for the exact list and layout). Mirror the repo-relative layout under a stable path prefix.
3. **Rewrite or configure runtime URLs.** Two required options, pick one:
   - **Option A (no code change):** upload `app.js`, `styles.css`, `translations.json`, `data/*.json`, `fonts/*`, and `assets/*` under the exact same relative layout at the same origin — then `cms-migration/index.html` cannot use it as-is, because its absolute JS/CSS URLs make the page origin the CMS page origin, while `app.js` still resolves `./data/...` and `./assets/...` **relative to the CMS page**, which may point nowhere.
   - **Option B (recommended):** host a rewritten copy of `app.js` and `styles.css` where every relative URL (`./data/`, `./assets/`, `./fonts/`, `./translations.json`) is replaced with the absolute hosted base URL, and point the HTML shell at those rewritten copies.
4. **Update the HTML shell** `cms-migration/index.html` with the real URLs (JS, CSS, OG image), keeping `#app` as the mount point and the version query (`?v=20260812-1` — keep in sync with `APP_DATA_VERSION` in `app.js`).
5. **Set headers** on the CMS/CDN (see §8).
6. **Validate** against the checklist in §9.
7. **Cut over** (see §11).

### Implemented performance safeguards (root app)

- Below-fold/content images in the active `app.js` render templates now carry `loading="lazy" decoding="async"` (category tab images, commodity gallery tile images, search suggestion images, result/card icons, and non-critical empty/filter icons).
- The home hero background image stays eager and now carries `fetchpriority="high" decoding="async"`; brand/logo images are unchanged.
- CDN requirements for this pass: enable compression (Brotli/gzip) on JSON/JS/CSS and keep the §8 cache headers (versioned bundles `immutable`, `assets/*`/`fonts/*` immutable, `data/*.json` short-lived or versioned) so lazy images and versioned bundles cache predictably.
- Observations are intentionally **not** preloaded, and behavior-heavy render/data rewrites were intentionally **not** made during this pass.

## 5. URL mapping (before → after)

Placeholder host for everything: `https://YOUR-CMS-CDN.example/agro-dashboard/`

| Repo path (relative) | Hosted URL |
| --- | --- |
| `./app.js?v=20260812-1` | `https://YOUR-CMS-CDN.example/agro-dashboard/app.js?v=20260812-1` |
| `./styles.css?v=20260812-1` | `https://YOUR-CMS-CDN.example/agro-dashboard/styles.css?v=20260812-1` |
| `./translations.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/translations.json` |
| `./data/observations.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/data/observations.json` |
| `./data/search-index.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/data/search-index.json` |
| `./data/search-aliases.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/data/search-aliases.json` |
| `./data/search-transliterations.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/data/search-transliterations.json` |
| `./data/categories.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/data/categories.json` |
| `./data/metadata.json` | `https://YOUR-CMS-CDN.example/agro-dashboard/data/metadata.json` (build artifact, not fetched) |
| `./fonts/PrajavaniTextRegular.woff2` | `https://YOUR-CMS-CDN.example/agro-dashboard/fonts/PrajavaniTextRegular.woff2` |
| `./assets/OG Image.png` | `https://YOUR-CMS-CDN.example/agro-dashboard/assets/OG%20Image.png` |
| `./assets/<file>` (168 files) | `https://YOUR-CMS-CDN.example/agro-dashboard/assets/<file>` |

## 6. What to upload

Mirror the repo layout under the hosted prefix. Required for runtime:

- `app.js`, `styles.css` (rewritten to absolute URLs per §4 step 3)
- `translations.json`
- `data/` — all six JSON files (observations, search-index, search-aliases, search-transliterations, categories, metadata)
- `fonts/PrajavaniTextRegular.woff2`
- `assets/` — full tree, ~245 MB / 168 files (thumbnails, logos, badges, OG image)

Not required: `data/agro_dashboard.db`, `scripts/`, `package.json`, `.github/`, this plan. This scaffold does **not** copy the 245 MB of assets or the 26 MB observations payload; they are upload dependencies to be synced separately (e.g., `az storage blob upload-batch`, `aws s3 sync`, CMS media library, or rclone).

## 7. CMS/CDN requirements

- Serve static files over HTTPS with correct MIME types (`text/html`, `text/javascript` / `application/javascript`, `text/css`, `application/json`, `image/png`, `image/svg+xml`, `font/woff2`).
- Allow GET only; no authentication for runtime assets (the SPA has no API).
- Support URL pathing that mirrors the mapping in §5 (a path prefix like `/agro-dashboard/`).
- No server-side rendering needed — the SPA is client-only.

## 8. CORS / cache headers

**CORS** — irrelevant if the HTML page and all assets share one origin. If the CMS page origin differs from the asset host, the CDN must send for JSON/JS/font/image responses:

```
Access-Control-Allow-Origin: https://<cms-page-origin>
```

**Cache headers** (recommended):

| Resource | Cache-Control |
| --- | --- |
| `index.html` (CMS page) | `no-cache` |
| `app.js`, `styles.css` (versioned `?v=`) | `public, max-age=31536000, immutable` |
| `data/*.json`, `translations.json` (versioned `?v=` in fetch) | `public, max-age=86400` (or immutable with version bump) |
| `assets/*`, `fonts/*` | `public, max-age=31536000, immutable` |

Bump the `?v=` query on `app.js`/`styles.css` (currently `20260812-1`) and the `APP_DATA_VERSION` constant whenever content changes; the app version-stamps every `fetchJson()` call, so a stale HTML shell with old `?v=` is the only cache risk.

## 9. Validation checklist

- [ ] HTML shell loads with the **real** hosted URLs (no `YOUR-CMS-CDN.example` left in the page or config).
- [ ] `#app` renders the dashboard (home, categories, search).
- [ ] All six `data/*.json` + `translations.json` requests return 200 with `Content-Type: application/json` (browser devtools → Network).
- [ ] No 404s for any `assets/` or `fonts/` request; spot-check commodity thumbnails and the Prajavani font (Kannada glyphs).
- [ ] Search, filters, price-history charts, language toggle, and share/deep-link (`?card=...`) work from the CMS page URL.
- [ ] Social preview: fetch the CMS page URL with a crawler or inspect the OG meta — `og:image` resolves to the hosted absolute URL.
- [ ] CORS: open the CMS page from a second tab/host and confirm no mixed-origin fetch failures.
- [ ] Hard-refresh after cutover to bypass stale cache; confirm the served `?v=` matches `APP_DATA_VERSION`.

## 10. Rollback / cutover

- **Cutover:** point the CMS page (or domain) at `cms-migration/index.html` after §9 passes against the staging URL. Because the root repo is untouched, this is purely a CMS-side switch.
- **Rollback:** repoint the CMS page to the previous entry (or to the GitHub Pages URL) — no repo change needed. Keep the old CMS entry publishable until the new one has been live for at least one data refresh cycle.

## 11. Open decisions

1. **URL rewrite vs. configurable base:** rewrite a hosted copy of `app.js`/`styles.css` (Option B, recommended) or add a small base-URL bootstrap that overrides the relative paths at load time (adds runtime complexity — currently avoided per the scaffold rules).
2. **Origin:** serve everything from one CMS origin (no CORS) vs. split HTML page (CMS) and assets (CDN) — the latter needs the §8 CORS header.
3. **Data refresh cadence:** how `data/*.json` gets re-exported (`npm run build:data` or `node scripts/merge_sister_price_data.js`) and uploaded — manual step, scheduled job, or CI push to the CDN.
4. **Image base strategy:** keep `assets/` path-mirrored (zero code change beyond the rewrite) vs. uploading thumbnails to a dedicated media CDN and rewriting `BAKED_COMMODITY_THUMBS`/`IMG` in the hosted `app.js`.
5. **Metadata note:** `data/metadata.json` is currently generated and not fetched at runtime; decide whether the hosted copy stays in sync or is dropped from the upload set.
