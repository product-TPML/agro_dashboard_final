# Architecture

## Runtime

The dashboard is a browser-only static SPA. The root `index.html` mounts `#app`, loads the plain `app.js` and `styles.css` bundles, and the browser fetches generated JSON data at runtime. SQLite is a build-time source artifact only.

## CMS/CDN migration

`cms-migration/index.html` is a separate CMS entry-point scaffold. It mounts the same `#app` and references hosted JavaScript, CSS, and social-preview assets using absolute URL placeholders. The migration keeps the root GitHub Pages app as the baseline until real CMS/CDN URLs and hosted dependencies are verified.

The hosted copies of `app.js` and `styles.css` must resolve their data, image, and font URLs against the CMS/CDN host. Runtime data is intentionally fetched on demand rather than embedded in the HTML; the large observations payload and image tree remain external CDN dependencies.

## Performance safeguards

Non-critical rendered images use native lazy loading and asynchronous decoding. The hero image remains eager with high fetch priority. The CMS entry point includes a CDN preconnect hint. Data fetching and application rendering behavior remain unchanged.
