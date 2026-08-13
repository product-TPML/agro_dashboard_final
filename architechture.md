# Architecture

## Runtime

The dashboard is a browser-only static SPA. The root `index.html` mounts `#app`, loads the plain `app.js` and `styles.css` bundles, and the browser fetches generated JSON data at runtime. SQLite is a build-time source artifact only.

## Asset hosting

**Prajavani Assettype is the selected asset host.** Hosted base: `https://images.assettype.com/prajavani/`. Assettype assigns every uploaded file its own generated URL under that base (date/hash segments; shape `https://images.assettype.com/prajavani/<cms-entry-path>/<generated-suffix>`). Per-file generated URLs are mapped explicitly: `cms-migration/asset-map.json` is the required production map (schema in `cms-migration/asset-map.example.json`, one `suffixes` entry per repo-relative path), and `cms-migration/hosted-config.example.json` records `assetUrlPattern` with `assetUrlMapRequired: true`. Image URLs cannot be derived from local filenames because of the inserted date/hash segments.

## CMS/CDN migration

`cms-migration/index.html` is a separate CMS entry-point scaffold. It is pasted into the CMS as the page body/snippet and currently loads the deployed GitHub Pages JavaScript, CSS, data, and images through the page `<base>` URL. Because that base points to a different origin than a local CMS preview, `app.js` builds same-origin absolute URLs for `history.pushState`; this keeps navigation inside the CMS page while relative runtime assets continue resolving from GitHub Pages. The migration can return to Assettype URLs once real generated URLs are recorded and hosted dependencies are verified.

The hosted copies of `app.js` and `styles.css` must be rewritten so their data, image, and font URLs resolve against the Assettype host (no `./`-relative paths survive on the CMS page). This rewrite is executed by `cms-migration/generate_hosted_bundle.js` (Node standard library only): it reads the root `app.js`/`styles.css` plus the production map `cms-migration/asset-map.json`, validates that every required entry (app.js, styles.css, translations.json, the six `data/*.json` runtime files, the Prajavani font, and every `./assets/` path referenced by app.js/styles.css) carries a real Assettype suffix, rewrites `./translations.json`, `./data/*`, `./assets/*` and the font `url()` to absolute `https://images.assettype.com/prajavani/` URLs (preserving query strings), and writes `cms-migration/dist/app.js` + `dist/styles.css`. It fails (exit 1) on missing or placeholder entries and never fabricates URLs; `dist/` output cannot be produced until real Assettype suffixes are supplied. Runtime data is intentionally fetched on demand rather than embedded in the HTML; the large observations payload and image tree remain external dependencies. No runtime config fetch is used — the asset map and config manifest are documentation/templates, and the hosted bundles are rewritten with the final URLs.

## Performance safeguards

Non-critical rendered images use native lazy loading and asynchronous decoding. The hero image remains eager with high fetch priority. The CMS entry point includes a preconnect hint for `images.assettype.com`. Enabled buttons use an explicit pointer cursor while disabled buttons retain a not-allowed cursor, so desktop interaction affordances are consistent. Data fetching and application rendering behavior remain unchanged.
