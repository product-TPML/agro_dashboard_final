"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const codec = require("../scripts/observation_codec");
const scraper = require("../scrape_krama");

const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");

function eggRow(values = {}) {
  return {
    rowKey: "2026-08-16|necc_egg|egg|bengaluru", reportDate: "2026-08-16", sourceId: "necc_egg",
    commodity: "Egg", perishability: "perishable", category: "livestock_and_poultry", market: "BENGALURU",
    variety: "", grade: "", arrivals: null, unit: "", minPrice: null, maxPrice: null, modalPrice: null,
    canonicalPrice: 600, canonicalPriceUnit: "100 eggs", priceDisplayUnit: "100 eggs", ...values,
  };
}

test("source parsers accept saved fixtures and reject malformed input", () => {
  assert.equal(scraper.parseKramaHtml(fixture("krama.html")).commodities[0].data[0].Market, "Mysuru");
  assert.equal(scraper.parseNeccEggHtml(fixture("necc.html"), "2026-08-17").length, 3);
  assert.equal(scraper.parseCsbSilkHtml(fixture("csb.html"))[0].variety, "Bivoltine Seed Cocoon");
  const spiceRows = scraper.parseSpicesBoardHtml(fixture("spices.html"));
  assert.equal(spiceRows.length, 2);
  assert.deepEqual(scraper.filterSpicesBoardRows(spiceRows).map((item) => item.commodity), ["Clove"]);
  assert.equal(scraper.parseCoffeeBoardRawPriceText(fixture("coffee.txt")).length, 4);
  assert.equal(scraper.parseRubberBoardDailyHtml(fixture("rubber.html"), "RSS4").length, 2);
  const rubberArchiveRows = scraper.parseRubberBoardArchiveHtml(fixture("rubber-archive.html"), "2025-06-03");
  assert.equal(rubberArchiveRows.length, 6);
  assert.deepEqual(rubberArchiveRows.map((row) => row.variety), ["RSS4", "RSS5", "RSS4", "RSS5", "ISNR20", "Latex (60%)"]);
  assert.ok(rubberArchiveRows.every((row) => ["Kottayam", "Kochi"].includes(row.market)));
  assert.throws(() => scraper.parseNeccEggHtml("<html></html>", "2026-08-17"), /header/);
  assert.throws(() => scraper.parseCoffeeBoardRawPriceText("not a report"), /section/);
  assert.throws(() => scraper.parseDmyDate("31-02-2026", "-"), /Invalid ISO/);
});

test("Rubber daily parser skips headers and non-price rows", () => {
  const html = `<div id="Kottayam"><table><tbody><tr><th>RSS4</th><th>In INR</th></tr><tr><td>14-08-2026</td><td>27900.0</td></tr><tr><td>15-08-2026</td><td>Holiday</td></tr></tbody></table></div>`;
  assert.deepEqual(scraper.parseRubberBoardDailyHtml(html, "RSS4"), [{ market: "Kottayam", reportDate: "2026-08-14", modalPrice: 27900, variety: "RSS4" }]);
  assert.deepEqual(scraper.parseRubberBoardArchiveHtml("<html><table class='table table-bordered'><tr><td>bad</td></tr></table></html>", "2026-08-14"), []);
});

test("date normalization covers all source formats", () => {
  assert.equal(scraper.reportDateStrings("17/08/2026").fileDateStr, "2026-08-17");
  assert.equal(scraper.parseDmyDate("17-08-2026", "-"), "2026-08-17");
  assert.equal(scraper.parseDottedDate("17.08.2026"), "2026-08-17");
  assert.equal(scraper.parseAbbrevMonthDate("17-Aug-2026"), "2026-08-17");
  assert.equal(scraper.normalizeMarket("krama", "DEVDURGA"), "DEVADURGA");
  assert.equal(scraper.normalizeMarket("csb_silk", "Shidlaghatta"), "SIDDLAGHATTA");
  assert.equal(scraper.normalizeMarket("spices_board", "COCHIN"), "Cochin");
});

test("Krama uses canonical markets in observations and row keys", () => {
  const rows = scraper.normalizeKrama({ commodities: [{ name: "Bajra", data: [{
    Market: "DEVDURGA", Variety: "Local", Grade: "Medium", Arrivals: "1", Units: "Quintal",
    "Min (Rs.)": "2500", "Max (Rs.)": "2600", "Modal (Rs.)": "2550",
  }] }] }, "2026-08-11");
  assert.equal(rows[0].market, "DEVADURGA");
  assert.match(rows[0].rowKey, /\|devadurga\|/);

  const varietyRows = scraper.normalizeKrama({ commodities: [{ name: "Coconut (Per 1000)", data: [{
    Market: "DEVDURGA", Variety: "IISort without Husk", Grade: "Average", Arrivals: "1", Units: "Each",
    "Min (Rs.)": "1", "Max (Rs.)": "2", "Modal (Rs.)": "2",
  }] }] }, "2026-08-11");
  assert.equal(varietyRows[0].variety, "IISort  without Husk");

  const categories = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "categories.json"), "utf8"));
  const searchIndex = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "search-index.json"), "utf8"));
  const taxonomy = scraper.buildTaxonomy(categories, searchIndex, []);
  const category = categories.categories.find((item) => item.commodities.includes("Bajra")).id;
  scraper.validateObservations([{ ...rows[0], category }], taxonomy);
});

test("Krama uses HTTP, headless Playwright, then headful Playwright in order", async () => {
  const calls = [];
  const result = await scraper.scrapeKramaWithFallback("17/08/2026", {
    http: async () => { calls.push("http"); throw new Error("blocked"); },
    headless: async () => { calls.push("headless"); return { commodities: [] }; },
    headful: async () => { calls.push("headful"); return { commodities: [{ name: "Egg", data: [{ Market: "BENGALURU" }] }] }; },
  });
  assert.deepEqual(calls, ["http", "headless", "headful"]);
  assert.equal(result.commodities[0].name, "Egg");
});

test("codec round-trips the exact compact observation columns", () => {
  const source = [eggRow()];
  const encoded = codec.encodeObservations(source);
  assert.deepEqual(encoded.columns, scraper.OBSERVATION_COLUMNS);
  assert.deepEqual(codec.decodeObservations(encoded), source);
  assert.deepEqual(Object.keys(encoded), ["version", "columns", "dictionaries", "rows"]);
});

test("merge replaces duplicate row keys while retaining history", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-scraper-"));
  const old = eggRow({ rowKey: "old", reportDate: "2026-08-15", canonicalPrice: 580 });
  fs.writeFileSync(path.join(dir, "categories.json"), JSON.stringify({ categories: [{ id: "livestock_and_poultry", label: "Livestock and Poultry", commodities: ["Egg"], commodityCount: 1 }] }));
  fs.writeFileSync(path.join(dir, "search-index.json"), JSON.stringify({ commodities: ["Egg"], markets: ["BENGALURU"], varieties: [] }));
  fs.writeFileSync(path.join(dir, "observations.json"), JSON.stringify(codec.encodeObservations([old])));
  const merged = scraper.loadAndMerge([eggRow({ rowKey: "old", reportDate: "2026-08-15", canonicalPrice: 610 })], dir);
  assert.equal(merged.rows.length, 1);
  assert.equal(merged.rows[0].canonicalPrice, 610);
});

test("unknown taxonomy rows are skipped and reported while valid rows merge", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-taxonomy-skip-"));
  const categories = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "categories.json"), "utf8"));
  const searchIndex = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "search-index.json"), "utf8"));
  const old = eggRow({ rowKey: "old", reportDate: "2026-08-15", canonicalPrice: 580 });
  fs.writeFileSync(path.join(dir, "categories.json"), JSON.stringify(categories));
  fs.writeFileSync(path.join(dir, "search-index.json"), JSON.stringify(searchIndex));
  fs.writeFileSync(path.join(dir, "observations.json"), JSON.stringify(codec.encodeObservations([old])));

  const valid = eggRow({ rowKey: "valid", market: "BENGALURU", canonicalPrice: 610 });
  const unknown = eggRow({ rowKey: "unknown", market: "UNKNOWN_MARKET", canonicalPrice: 620 });
  const merged = scraper.loadAndMerge([valid, unknown], dir);
  assert.deepEqual(merged.rows.map((row) => row.rowKey).sort(), ["old", "valid"]);
  assert.equal(merged.acceptedRowCount, 1);
  assert.equal(merged.skippedRowCount, 1);
  assert.deepEqual(merged.unknownTaxonomies, [{ type: "market", value: "UNKNOWN_MARKET", rowCount: 1, sources: ["necc_egg"] }]);
});

test("taxonomy and numeric validation reject unknown values", () => {
  const taxonomy = scraper.buildTaxonomy({ categories: [{ id: "livestock_and_poultry", commodities: ["Egg"] }] }, { markets: ["BENGALURU"], varieties: [] }, []);
  assert.throws(() => scraper.validateObservations([eggRow({ commodity: "Unknown" })], taxonomy, { enforceSourceFilters: true }), /Unknown commodity/);
  assert.throws(() => scraper.validateObservations([eggRow({ canonicalPrice: "600" })], taxonomy, { enforceSourceFilters: true }), /Invalid numeric/);
});

test("publisher rolls back the original files after an install failure", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-publish-"));
  const original = { "observations.json": "old-observations\n", "search-index.json": "old-search\n" };
  for (const [name, value] of Object.entries(original)) fs.writeFileSync(path.join(dir, name), value);
  const payloads = { "observations.json": { rows: [1] }, "search-index.json": { rows: [2] } };
  let renames = 0;
  const fsApi = Object.create(fs);
  fsApi.renameSync = (...args) => { renames += 1; if (renames === 3) throw new Error("simulated install failure"); return fs.renameSync(...args); };
  assert.throws(() => scraper.publishSnapshot(payloads, dir, "rollback-test", fsApi), /simulated/);
  for (const [name, value] of Object.entries(original)) assert.equal(fs.readFileSync(path.join(dir, name), "utf8"), value);
});

test("help text is represented in the local UI and source contract", () => {
  assert.match(scraper.htmlPage(), /publishes JSON only/);
  assert.match(scraper.htmlPage(), /Fetching data from/);
  assert.match(scraper.htmlPage(), /status-spinner/);
  assert.match(scraper.htmlPage(), /querySelectorAll\('button, input, select'\)/);
  assert.match(scraper.htmlPage(), /Items not available in database/);
  assert.match(scraper.htmlPage(), /Copy missing items/);
  assert.match(scraper.htmlPage(), /commodity: 'Commodity'/);
  assert.match(scraper.htmlPage(), /market: 'Market'/);
  assert.match(scraper.htmlPage(), /variety: 'Variety'/);
  assert.match(scraper.htmlPage(), /grade: 'Grade'/);
  assert.match(scraper.htmlPage(), /not available in database/);
  assert.deepEqual(scraper.SOURCE_IDS, ["krama", "necc_egg", "csb_silk", "rubber_board", "spices_board", "coffee_board"]);
});

test("local UI serves the picker and routes /run to the scraper", async () => {
  let call;
  const server = await scraper.startUiServer({ openBrowser: false, runner: async (date, options) => {
    call = { date, sourceId: options.sourceId };
    return { ok: true, sourceId: options.sourceId, rowCount: 1 };
  } });
  const address = server.address();
  try {
    const page = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Commodity JSON Scraper/);
    const response = await fetch(`http://127.0.0.1:${address.port}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId: "necc_egg", date: "2026-08-17" }) });
    assert.equal(response.status, 200);
    assert.deepEqual(call, { date: "17/08/2026", sourceId: "necc_egg" });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
