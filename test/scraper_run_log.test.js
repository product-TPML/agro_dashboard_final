"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const scraper = require("../scrape_krama");
const { decodeObservations } = require("../scripts/observation_codec");
const {
  RUN_LOG_FIELDS, appendRunRecords, createRunRecord, pruneRunRecords, readRunLog, sanitizeErrorMessage,
} = require("../scripts/scraper_run_log");

function record(overrides = {}) {
  return createRunRecord({
    run_id: "run-1", source: "krama", run_timestamp: "2026-08-25T03:30:00.000Z",
    requested_report_date: "2026-08-25", actual_report_date: "2026-08-25", status: "success",
    overall_status: "success", row_count: 2, accepted_row_count: 2, skipped_row_count: 0,
    merged_row_count: 10, snapshot_status: "updated", error_code: null, error_message: null,
    verification_url: null, ...overrides,
  });
}

function eggRow(overrides = {}) {
  return {
    rowKey: "2026-08-25-necc", reportDate: "2026-08-25", sourceId: "necc_egg", commodity: "Egg",
    perishability: "perishable", category: "livestock_and_poultry", market: "BENGALURU", variety: "",
    grade: "", arrivals: null, unit: "", minPrice: null, maxPrice: null, modalPrice: null,
    canonicalPrice: 610, canonicalPriceUnit: "100 eggs", priceDisplayUnit: "100 eggs", ...overrides,
  };
}

function tempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scraper-run-"));
  fs.writeFileSync(path.join(dir, "categories.json"), JSON.stringify({ categories: [{ id: "livestock_and_poultry", commodities: ["Egg"] }] }));
  fs.writeFileSync(path.join(dir, "search-index.json"), JSON.stringify({ commodities: ["Egg"], markets: ["BENGALURU"], varieties: [] }));
  fs.writeFileSync(path.join(dir, "observations.json"), "[]\n");
  return dir;
}

test("published run records have a fixed sanitized contract", () => {
  const value = createRunRecord({ ...record(), error_message: "Bearer super-secret C:\\Users\\operator\\private.log\nstack" });
  assert.deepEqual(Object.keys(value), RUN_LOG_FIELDS);
  assert.match(value.error_message, /\[redacted\]/);
  assert.doesNotMatch(value.error_message, /super-secret|private\.log/);
});

test("run log retention keeps the rolling 31-day window", () => {
  const now = new Date("2026-08-25T00:00:00.000Z");
  const kept = record({ run_id: "kept", run_timestamp: "2026-07-25T00:00:00.000Z" });
  const old = record({ run_id: "old", run_timestamp: "2026-07-24T23:59:59.000Z" });
  assert.deepEqual(pruneRunRecords([kept, old], now).map((item) => item.run_id), ["kept"]);
});

test("run log appends source records without changing observation data", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scraper-run-log-"));
  const observationFile = path.join(dir, "observations.json");
  fs.writeFileSync(observationFile, "observation snapshot\n");
  appendRunRecords(dir, [record()], new Date("2026-08-25T04:00:00.000Z"));
  assert.equal(fs.readFileSync(observationFile, "utf8"), "observation snapshot\n");
  assert.equal(readRunLog(dir).runs.length, 1);
  assert.equal(readRunLog(dir).runs[0].run_id, "run-1");
});

test("empty error messages receive a safe fallback", () => {
  assert.equal(sanitizeErrorMessage("\nstack"), "Run failed.");
});

test("a failed source preserves observations and still writes a run summary", async () => {
  const dir = tempDataDir();
  const before = fs.readFileSync(path.join(dir, "observations.json"), "utf8");
  const result = await scraper.runScrapeForDate("25/08/2026", {
    sourceId: "necc_egg", dataDir: dir,
    scrapeSource: async () => { throw scraper.codedError("NO_ROWS", "necc_egg returned no rows"); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.snapshotStatus, "preserved");
  assert.equal(fs.readFileSync(path.join(dir, "observations.json"), "utf8"), before);
  const log = JSON.parse(fs.readFileSync(path.join(dir, "scraper-runs.json"), "utf8"));
  assert.deepEqual(log.runs[0], {
    run_id: result.runId, source: "necc_egg", run_timestamp: log.runs[0].run_timestamp,
    requested_report_date: "2026-08-25", actual_report_date: null, status: "failed", overall_status: "failed",
    row_count: 0, accepted_row_count: 0, skipped_row_count: 0, merged_row_count: 0, snapshot_status: "preserved",
    error_code: "NO_ROWS", error_message: "necc_egg returned no rows", verification_url: scraper.SOURCE_VERIFICATION_URLS.necc_egg,
  });
});

test("All Sources continues after failures and records a shared partial run", async () => {
  const dir = tempDataDir();
  const result = await scraper.runScrapeForDate("25/08/2026", {
    sourceId: "all", dataDir: dir,
    scrapeSource: async (sourceId) => {
      if (sourceId !== "necc_egg") throw scraper.codedError("SOURCE_ERROR", `${sourceId} unavailable`);
      return { observations: [eggRow()] };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.overallStatus, "partial");
  assert.equal(result.snapshotStatus, "updated");
  const log = JSON.parse(fs.readFileSync(path.join(dir, "scraper-runs.json"), "utf8"));
  assert.equal(log.runs.length, 7);
  assert.equal(new Set(log.runs.map((item) => item.run_id)).size, 1);
  assert.equal(log.runs.find((item) => item.source === "necc_egg").status, "success");
  assert.equal(log.runs.find((item) => item.source === "krama").error_code, "SOURCE_ERROR");
  assert.equal(decodeObservations(JSON.parse(fs.readFileSync(path.join(dir, "observations.json"), "utf8"))).length, 1);
});
