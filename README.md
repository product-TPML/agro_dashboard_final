# Commodity Dashboard Lite

Static commodity dashboard for GitHub Pages.

## Runtime

The browser loads the dashboard from `index.html` and reads the generated JSON files in `data/`. The SQLite snapshot is retained in `data/agro_dashboard.db` as the source artifact for rebuilding those files; the browser does not query SQLite directly.

The hosted dashboard includes:

- Commodity, market, and variety search
- Category and commodity rails
- Cascading filters
- Cards and table result layouts
- Price deltas and inline price history
- English/Kannada localization

The map workflow is intentionally excluded. The JSON-only six-source scraper is available at
`scrape_krama.js`, with a hidden Windows launcher at `Launch Commodity Scraper.vbs`.

## Social previews

`index.html` provides one static Open Graph/Twitter preview image at `assets/OG Image.png`. Because this is a client-only SPA, social crawlers cannot receive card-specific server-rendered previews unless the deployment later adds pre-rendered pages. The image must be deployed at the same public site URL; it does not need a separate image host.

## Rebuild Static Data

Install the only build dependency and regenerate the browser payloads:

```bash
npm install
npm run build:data
```

The command reads `data/agro_dashboard.db` and rewrites:

- `data/observations.json`
- `data/search-index.json`
- `data/categories.json`
- `data/metadata.json`

Warning: `npm run build:data` reads the older SQLite snapshot. It can overwrite JSON produced by
the scraper. The scraper never updates SQLite; use `node scrape_krama.js --no-ui --source SOURCE
--date DD/MM/YYYY` for automation, or launch the VBS file for the local source/date picker.

## Scraper

The scraper covers Krama, NECC eggs, Central Silk Board, Spices Board, Coffee Board, and Rubber
Board. It merges successful observations into the existing compact snapshot by `rowKey`, validates
the complete result, and atomically publishes observations, search index, categories, and metadata.
Rows with unknown commodity, market, variety, or grade taxonomy are skipped and reported in the UI,
CLI result, and structured log. If all scraped rows are skipped, or a source fails or returns no rows,
the existing snapshot is retained. Other validation failures also retain the snapshot.

Rubber Board first submits the official daily-price form with its required `txtCategory=day` field.
If that response has no usable domestic rows, it queries the official `/archives` date-result endpoint
and parses the date-specific Indian price table. The Rubber adapter publishes only Kottayam and Kochi
rows for RSS4, RSS5, ISNR20, and Latex (60%).

```bash
node scrape_krama.js --help
npm test
```

## GitHub Pages

Configure Pages to deploy the `main` branch from the repository root. No Node server is required for the hosted site.
