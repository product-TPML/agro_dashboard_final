"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const codec = require("../scripts/observation_codec");
const scraper = require("../scrape_krama");
const sync = require("../scripts/remote_snapshot_sync");
const { createRunRecord, readRunLog } = require("../scripts/scraper_run_log");

function row(overrides = {}) {
  return {
    rowKey: "2026-08-21|necc_egg|egg|bengaluru", reportDate: "2026-08-21", sourceId: "necc_egg",
    commodity: "Egg", perishability: "perishable", category: "livestock_and_poultry", market: "BENGALURU",
    variety: "", grade: "", arrivals: null, unit: "", minPrice: null, maxPrice: null, modalPrice: null,
    canonicalPrice: 600, canonicalPriceUnit: "100 eggs", priceDisplayUnit: "100 eggs", ...overrides,
  };
}

function run(overrides = {}) {
  return createRunRecord({
    run_id: "remote-run", source: "necc_egg", run_timestamp: "2026-08-25T03:00:00.000Z",
    requested_report_date: "2026-08-25", actual_report_date: "2026-08-25", status: "success",
    overall_status: "success", row_count: 1, accepted_row_count: 1, skipped_row_count: 0,
    merged_row_count: 20, snapshot_status: "updated", error_code: null, error_message: null,
    verification_url: null, ...overrides,
  });
}

function dataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-sync-"));
  fs.writeFileSync(path.join(dir, "categories.json"), JSON.stringify({ categories: [{ id: "livestock_and_poultry", commodities: ["Egg"] }] }));
  fs.writeFileSync(path.join(dir, "search-index.json"), JSON.stringify({ commodities: ["Egg"], markets: ["BENGALURU"], varieties: [] }));
  return dir;
}

function remoteFetcher(values) {
  return async (url) => {
    if (url.endsWith("metadata.json")) return values.metadata;
    if (url.endsWith("observations.json")) return values.observations;
    if (url.endsWith("scraper-runs.json")) return values.runLog;
    throw new Error(`Unexpected URL: ${url}`);
  };
}

function remoteValues(observations, runs = [run()]) {
  return {
    metadata: { generatedAt: "2026-08-25T04:00:00.000Z" },
    observations: codec.encodeObservations(observations),
    runLog: { version: 1, generated_at: "2026-08-25T04:00:00.000Z", retention_days: 31, runs },
  };
}

test("reconciles a stale local snapshot with Cloudflare before a new scrape", async () => {
  const dir = dataDir();
  const localConflict = row({ canonicalPrice: 580 });
  const localOnly = row({ rowKey: "2026-08-20|necc_egg|egg|bengaluru", reportDate: "2026-08-20", canonicalPrice: 570 });
  const remoteConflict = row({ canonicalPrice: 610 });
  const remoteOnly = row({ rowKey: "2026-08-22|necc_egg|egg|mysuru", reportDate: "2026-08-22", market: "MYSURU", canonicalPrice: 620 });
  fs.writeFileSync(path.join(dir, "observations.json"), JSON.stringify(codec.encodeObservations([localConflict, localOnly])));
  fs.writeFileSync(path.join(dir, "scraper-runs.json"), JSON.stringify({ version: 1, generated_at: "2026-08-24T04:00:00.000Z", retention_days: 31, runs: [run({ run_id: "local-run" })] }));

  const result = await sync.reconcileRemoteSnapshot({
    rootDir: path.dirname(dir), dataDir: dir, runId: "sync-run", now: new Date("2026-08-26T04:00:00.000Z"),
    env: { CLOUDFLARE_DATA_BASE_URL: "https://data.example.test" },
    fetchJson: remoteFetcher(remoteValues([remoteConflict, remoteOnly])),
    buildPayloads: scraper.makePayloads,
    publishSnapshot: scraper.publishSnapshot,
  });

  const observations = codec.decodeObservations(JSON.parse(fs.readFileSync(path.join(dir, "observations.json"), "utf8")));
  assert.equal(result.remote_row_count, 2);
  assert.equal(result.merged_row_count, 3);
  assert.equal(observations.find((item) => item.rowKey === localConflict.rowKey).canonicalPrice, 610);
  assert.deepEqual(observations.map((item) => item.rowKey).sort(), [localOnly.rowKey, localConflict.rowKey, remoteOnly.rowKey].sort());
  assert.deepEqual(readRunLog(dir).runs.map((item) => item.run_id).sort(), ["local-run", "remote-run"].sort());
  assert.equal(sync.readRemoteSyncState(path.dirname(dir)).fingerprint, result.fingerprint);
});

test("current scrape rows still win after remote reconciliation", () => {
  const dir = dataDir();
  const baseline = row({ canonicalPrice: 610 });
  fs.writeFileSync(path.join(dir, "observations.json"), JSON.stringify(codec.encodeObservations([baseline])));
  const merged = scraper.loadAndMerge([row({ canonicalPrice: 640 })], dir);
  assert.equal(merged.rows[0].canonicalPrice, 640);
});

test("publish mode automatically enables remote synchronization", () => {
  const options = scraper.parseArgs(["--no-ui", "--publish"]);
  assert.equal(options.publish, true);
  assert.equal(options.syncRemote, true);
});

test("remote run-log records are deduplicated and retention is applied", async () => {
  const dir = dataDir();
  fs.writeFileSync(path.join(dir, "observations.json"), JSON.stringify(codec.encodeObservations([row()])));
  fs.writeFileSync(path.join(dir, "scraper-runs.json"), JSON.stringify({ version: 1, generated_at: "2026-08-25T04:00:00.000Z", retention_days: 31, runs: [run({ row_count: 2 })] }));
  const remoteRun = run({ row_count: 3 });
  await sync.reconcileRemoteSnapshot({
    rootDir: path.dirname(dir), dataDir: dir, runId: "sync-run", now: new Date("2026-08-26T04:00:00.000Z"),
    env: { CLOUDFLARE_DATA_BASE_URL: "https://data.example.test" },
    fetchJson: remoteFetcher(remoteValues([row()], [remoteRun, run({ run_id: "old-run", run_timestamp: "2026-07-20T03:00:00.000Z" })])),
    buildPayloads: scraper.makePayloads,
    publishSnapshot: scraper.publishSnapshot,
  });
  const runs = readRunLog(dir).runs;
  assert.equal(runs.filter((item) => item.run_id === "remote-run").length, 1);
  assert.equal(runs.find((item) => item.run_id === "remote-run").row_count, 3);
  assert.equal(runs.some((item) => item.run_id === "old-run"), false);
});

test("remote configuration and schema errors are actionable", async () => {
  await assert.rejects(() => sync.loadRemoteSnapshot({ env: { CLOUDFLARE_DATA_BASE_URL: "not a url" }, fetchJson: async () => ({}) }), (error) => error.code === "REMOTE_CONFIG_INVALID");
  await assert.rejects(() => sync.loadRemoteSnapshot({ env: { CLOUDFLARE_DATA_BASE_URL: "https://data.example.test" }, fetchJson: remoteFetcher({ metadata: {}, observations: {}, runLog: {} }) }), (error) => error.code === "REMOTE_SCHEMA_INVALID");
});

test("verification rejects a changed Cloudflare snapshot", async () => {
  const first = remoteValues([row({ canonicalPrice: 610 })]);
  const second = remoteValues([row({ canonicalPrice: 611 })]);
  const original = await sync.loadRemoteSnapshot({ env: { CLOUDFLARE_DATA_BASE_URL: "https://data.example.test" }, fetchJson: remoteFetcher(first) });
  await assert.rejects(() => sync.verifyRemoteSnapshot({ env: { CLOUDFLARE_DATA_BASE_URL: "https://data.example.test" }, expectedFingerprint: original.fingerprint, fetchJson: remoteFetcher(second) }), (error) => error.code === "REMOTE_VERSION_CHANGED" && /publication was cancelled/.test(error.message));
});

test("HTTP fetch reports status and invalid JSON errors", async () => {
  const server = http.createServer((request, response) => {
    if (request.url === "/error.json") { response.writeHead(503); response.end("unavailable"); return; }
    response.writeHead(200, { "Content-Type": "application/json" }); response.end("not-json");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    await assert.rejects(() => sync.requestJson(`http://127.0.0.1:${port}/error.json`), (error) => error.code === "REMOTE_HTTP_ERROR");
    await assert.rejects(() => sync.requestJson(`http://127.0.0.1:${port}/invalid.json`), (error) => error.code === "REMOTE_INVALID_JSON");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
