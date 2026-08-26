# Commodity Scraper

## Purpose

This scraper fetches commodity price data from supported government and market sources, normalizes it, merges it with the existing historical snapshot, and writes the result as JSON.

The scraper does not read from or update SQLite.

It can also publish the complete JSON snapshot to the Cloudflare Pages data project.

Every source attempt also writes a sanitized operational summary to `data/scraper-runs.json`. The summary retains 31 days of run records; price observations in `data/observations.json` are retained indefinitely.

## Supported sources

| Source | Data handling |
|---|---|
| Krama | Fetches the selected report date. Uses direct requests first, then Playwright browser fallbacks. |
| NECC | Fetches the selected month, year, and daily egg-price report. |
| Central Silk Board | Reads the current silk-price tables from the website. A date selection is not required. |
| Spices Board | Fetches Kerala prices for the selected date range and checks Cochin/Kochi market rows. |
| Coffee Board | Selects the relevant month and year, downloads the archive PDF, and extracts prices for the selected date. |
| Rubber Board | Checks the daily price page first, then the archive page if no usable rows are found. |

## Requirements on the local system

The following are required:

- Windows for the one-click launcher
- Internet access to the source websites
- Permission to install software on first run, depending on local Windows policy
- Cloudflare credentials only if the scraper must publish data automatically

The one-click launcher can install Node.js LTS through Windows Package Manager (WinGet) when Node.js is missing. It then installs the local npm dependencies, including Wrangler.

The launcher also adds the discovered Node.js installation directory to the current process `PATH`, so npm lifecycle scripts can find `node` immediately after a fresh installation.

The launcher uses an existing Chrome or Edge installation when available. If no supported browser is found, it installs the Playwright Chromium fallback.

If WinGet is unavailable or installation is blocked, install Node.js LTS manually and run the launcher again.

## Required repository files

The safest approach is to clone the complete repository.

The scraper specifically depends on:

- `scrape_krama.js`
- `Launch Commodity Scraper.cmd`
- `Launch Commodity Scraper.vbs`
- `package.json`
- `package-lock.json`
- `scripts/observation_codec.js`
- `scripts/market_aliases.js`
- `scripts/publish_bundle.js`
- `scripts/publish_pages.js`
- `scripts/scraper_run_log.js`
- `google-apps-script/Code.gs` for the optional Google Sheets import
- Existing JSON files under `data/`
- `translations.json` when publishing to Cloudflare

The existing JSON files provide the historical baseline. The scraper merges new rows into this snapshot instead of creating a new file containing only the latest scrape.

The SQLite file `data/agro_dashboard.db` is not required by the scraper.

## First-time setup

### One-click Windows setup

Double-click:

```text
Launch Commodity Scraper.cmd
```

On a new system, the launcher:

1. Checks for Node.js and npm.
2. Prompts before installing Node.js LTS through WinGet if they are missing.
3. Runs `npm install` when the local dependencies are missing.
4. Installs Playwright Chromium only when Chrome or Edge is unavailable.
5. Starts the scraper UI.

The first run requires internet access and may require administrator approval. Later runs reuse the installed runtime and dependencies.

### Manual setup

From the repository root, run:

```bash
npm install
```

This installs the project dependencies, including:

- Playwright
- PDF parsing support
- SQLite support used by other repository tools
- Wrangler as a local project dependency

Wrangler does not need to be installed globally.

## Cloudflare publishing setup

Cloudflare configuration is required only when publishing the JSON bundle. The bundle includes the sanitized run summary so failed runs remain visible to downstream operations.

Create a file named exactly:

```text
.env
```

The file must be in the repository root:

```env
CLOUDFLARE_API_TOKEN=your-pages-edit-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_PAGES_PROJECT=agro-dashboard-data
```

Important:

- The file must be named `.env`, not `.env.txt`.
- Do not commit `.env` to GitHub.
- The API token must have permission to deploy to Cloudflare Pages.
- The Cloudflare project defaults to `agro-dashboard-data`.

The repository already ignores `.env` files through `.gitignore`.

## Running the scraper

### Windows UI flow

Double-click:

```text
Launch Commodity Scraper.cmd
```

This opens the local source and date picker.

When a complete `.env` is present, the launcher runs:

```text
node scrape_krama.js --ui --publish
```

When `.env` is missing or incomplete, it runs local-only:

```text
node scrape_krama.js --ui
```

The local JSON is still updated, and the launcher explains that Cloudflare publication was skipped.

`Launch Commodity Scraper.vbs` remains available as a compatibility shortcut and delegates to the same bootstrap launcher.

### Local JSON-only flow

To update local JSON without attempting Cloudflare publication:

```bash
node scrape_krama.js --ui
```

### Non-interactive all-source publication

```bash
npm run scrape:publish -- --source=all --date=DD/MM/YYYY
```

### Non-interactive source-specific publication

Example:

```bash
npm run scrape:publish -- --source=krama --date=DD/MM/YYYY
```

The date format is:

```text
DD/MM/YYYY
```

Central Silk Board reads the current page and does not require a date in the same way as the other sources.

## Scraper flow

The normal flow is:

```text
Select source and date
        ↓
Fetch source website
        ↓
Retry failed requests
        ↓
Use source-specific browser or archive fallback
        ↓
Parse and normalize rows
        ↓
Validate commodities, markets, varieties, grades, and numeric values
        ↓
Merge with existing JSON snapshot
        ↓
Write updated JSON files
        â†“
Write one sanitized source-level run record per source
        ↓
Optionally publish the complete JSON bundle to Cloudflare
```

## What is handled automatically

The scraper automatically:

- Retries source requests up to three times.
- Normalizes market aliases such as `COCHIN` to `Cochin` and `KARNATAKA` to `Karnataka`.
- Validates rows against the dashboard taxonomy.
- Rejects invalid or incomplete rows.
- Preserves existing historical data.
- Replaces an existing row when the same row key is scraped again.
- Writes JSON snapshots atomically.
- Uses browser fallbacks for Krama when direct requests fail.
- Checks the Rubber Board archive when the daily Rubber Board page returns no usable rows.
- Shows skipped or missing items in the local UI.
- Shows a source verification link and instructions when an individual source returns no rows or fails.
- Omits source-specific verification links when `All Sources` is selected.
- Checks the local runtime and installs missing Node.js, npm dependencies, and browser fallback components from the one-click launcher.
- Creates structured scraper logs under `logs/`.
- Writes one source-level summary per selected source with a shared `run_id` for All Sources.
- Keeps only the latest 31 days in `data/scraper-runs.json` and never removes historical observations.
- Continues the remaining sources during an All Sources run after a source failure, reporting `partial` when appropriate.

## Rebuilding the shareable scraper package

The repository is the source of truth. After changing scraper code, launcher behavior, documentation, or JSON data, rebuild the standalone package from the repository root:

```bash
npm run package:scraper
```

This recreates:

```text
..
Commodity Scraper Package\
Commodity Scraper Package.zip
```

The packaging command verifies that all repository JSON files match the package byte-for-byte. It excludes `.env`, `node_modules`, SQLite files, and logs. Never share a package folder containing a local `.env`; share only a ZIP created by the packaging command or remove the credentials first.

## JSON files updated by the scraper

A successful scrape updates:

```text
data/observations.json
data/search-index.json
data/categories.json
data/metadata.json
data/scraper-runs.json
```

When publishing, the deployment bundle also includes:

```text
translations.json
all data/*.json files
_headers
```

The SQLite database is never included in the Cloudflare JSON deployment.

## Google Sheets import

Copy `google-apps-script/Code.gs` into the existing spreadsheet's Apps Script project. In **Project Settings -> Script Properties**, set:

| Property | Value |
|---|---|
| `SCRAPER_SPREADSHEET_ID` | Existing spreadsheet ID |
| `SCRAPER_SHEET_NAME` | Existing destination tab name |
| `CLOUDFLARE_JSON_URL` | `https://agro-dashboard-data.pages.dev/data/scraper-runs.json` |
| `SCRAPER_TIMEZONE` | `Asia/Kolkata` |
| `SCRAPER_MAX_AGE_HOURS` | Optional freshness limit; default `48` |

Run `importScraperRuns()` for a manual import. It validates the HTTP response, JSON shape, freshness timestamp, record fields, and 31-day retention window. It uses a script lock to prevent overlapping imports and deduplicates on `run_id + source`; failed and partial records are still imported with their status and error fields.

The scraper stores timestamps in UTC ISO format for portability. The importer converts `run_timestamp` to the configured timezone, currently `Asia/Kolkata`, and writes it to the sheet with an `IST` suffix.

After saving the script and reloading the spreadsheet, use the **Scraper Logs** menu to choose **Import now** or **Create/reset daily trigger**. The same functions remain available from the Apps Script editor.

Run `createDailyTrigger()` once to replace earlier importer triggers and create the daily 9:00 AM IST trigger window. Apps Script may execute within the platform's normal time-based trigger window rather than at exactly 09:00.

## Failure behavior

If a source fails, returns no rows, or produces only invalid rows:

- The existing JSON snapshot is preserved.
- The failed source is not allowed to erase historical data.
- The UI reports the issue.
- A source-specific verification link and instructions are shown when applicable.
- Details are written to a structured log file under `logs/`.
- A sanitized source-level run record is written to `data/scraper-runs.json` with a stable error code/message, counts, snapshot status, and verification URL.
- For All Sources, other sources continue. Accepted rows can update the snapshot while failed sources remain marked `snapshot_status: preserved`.
- `npm run scrape:publish` still stages and deploys the refreshed run summary after a scrape failure; it does not report the in-progress deployment as final live state.

If scraping succeeds but Cloudflare publication fails:

- The updated JSON remains available locally.
- The UI reports the publication failure.
- The previous Cloudflare deployment remains live.

## Important caution

Do not run this command casually after scraping:

```bash
npm run build:data
```

That command uses the older SQLite export pipeline and can overwrite JSON files produced by the scraper.

Use the scraper flow when working with live source data.

## Troubleshooting checklist

If the scraper does not work:

1. Confirm Node.js and npm are installed:

   ```bash
   node --version
   npm --version
   ```

2. Install project dependencies:

   ```bash
   npm install
   ```

3. Confirm the source website is reachable in a browser.

4. For Krama issues, confirm Chrome or Edge is installed.

5. If publishing, confirm the file is named `.env` and contains valid Cloudflare credentials.

6. Check the latest file under:

   ```text
   logs/
   ```

7. Confirm that the local JSON files were updated under:

   ```text
   data/
   ```

8. Check the scraper result for skipped rows or missing taxonomy items.

9. If Google Sheets reports stale data, check `generated_at` in the public `data/scraper-runs.json`, the `SCRAPER_MAX_AGE_HOURS` property, and that Cloudflare publication completed.
