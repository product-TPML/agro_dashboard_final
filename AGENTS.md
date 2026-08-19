# Local agent instructions

## Scraper entry point

- When asked to run the scraper, launch `Launch Commodity Scraper.vbs` from the repository root.
- This opens the local source/date picker UI so the user can choose the source and date.
- Do not run `node scrape_krama.js` directly unless the user explicitly requests CLI/automation mode.

## Architecture documentation

- Read `ARCHITECTURE.md` before making changes that affect entry points, runtime data flow, scraping/publication, builds, deployment, or CMS hosting.
- Update `ARCHITECTURE.md` in the same change whenever one of those architectural boundaries or flows changes.
- Keep it high-level and factual; do not update it for isolated styling, copy, or routine data refreshes.
