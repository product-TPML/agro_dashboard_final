# Dharane Price Embed

Use the script below in Prajavani content home and article pages. It injects an auto-height widget with Shadow DOM style isolation and reads the existing dashboard observations and scraper-run JSON files.

```html
<script src="https://product-tpml.github.io/agro_dashboard_final/embed.js?lang=kn&v=20260827-tight23"></script>
```

- The compact widget randomly shows two changed-price commodities and rotates to a new pair every nine seconds; it only shows reports announced today or yesterday.
- It shows four commodities on wide desktop, three on medium widths, and two on mobile.
- Each card displays the variety with the highest available maximum price on that commodity's latest report date and links to that commodity's Dharane page in a new tab.
- If no report was announced today or yesterday, it collapses and renders nothing instead of stale prices or a failure message.
- Each card uses the same CDN commodity thumbnail as the dashboard and shows the max-price change from the previous comparable update with the dashboard-style up/down arrow.
- Each rotation uses a short 3D top-roll entrance; steep changes receive a continuous color, scale, and card-background emphasis.
- The Dharane logo and “all prices” CTA link to the Dharane home page.
- Use `?lang=en` for the English version.
- The widget is auto-height, so no iframe height is required and cards cannot be clipped after the price.
- The widget reads `https://agro-dashboard-data.pages.dev/data/observations.json`, `https://agro-dashboard-data.pages.dev/data/scraper-runs.json`, and `https://agro-dashboard-data.pages.dev/translations.json`.

## Cloudflare-only HTML variant

Use this standalone HTML file when the widget code should be included in the embed itself rather than loaded as a separate hosted script:

```html
<iframe src="https://product-tpml.github.io/agro_dashboard_final/embed-cloudflare.html?lang=kn&v=20260827-cloudflare1" title="Prajavani Dharane prices" style="display:block;width:100%;height:160px;border:0" loading="lazy"></iframe>
```

The file contains the same UI, responsive behavior, animations, image mapping, and links as `embed.js`. Its only runtime JSON requests are to Cloudflare, with no local JSON fallback. Use `?lang=en` for English when hosted as a page, or change the inline script's `data-lang="kn"` to `data-lang="en"` when pasting the HTML into an English CMS page. The widget ignores duplicate executions within the same embed wrapper and still uses the existing CDN-hosted logo and commodity thumbnails.

## Bookmarklet

Open `embed-bookmarklet.txt`, copy its complete single line, create a browser bookmark, and paste the line into the bookmark's URL field. Clicking that bookmarklet on any page copies the embedded full `embed-cloudflare-tight.html` source.

The bookmarklet is **generated** and **self-contained**: `npm run build:bookmarklet` runs `scripts/build_bookmarklet.js`, which gzips `embed-cloudflare-tight.html` and Base64-encodes it directly into the single-line bookmarklet. It works without any deployment — the HTML is embedded, so nothing is fetched at runtime. On click it decodes the payload with `atob` + `Uint8Array`, decompresses it via `Blob` + `DecompressionStream('gzip')` + `Response.text()`, and copies the exact HTML using the Clipboard API with a textarea/`execCommand` fallback, then shows a clear success or failure alert.

**Rerun `npm run build:bookmarklet` after any change to `embed-cloudflare-tight.html`** so the embedded payload stays in sync with the canonical HTML.
