"use strict";

// Reconciles a local scraper snapshot with the public Cloudflare snapshot
// before a publish-enabled run. This module intentionally uses only Node's
// standard library so it can ship in the standalone scraper package.
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { decodeObservations } = require("./observation_codec");
const {
  RUN_LOG_FIELDS, pruneRunRecords, readRunLog, writeRunLog,
} = require("./scraper_run_log");

const DEFAULT_DATA_BASE_URL = "https://agro-dashboard-data.pages.dev";
const REMOTE_FILES = Object.freeze({
  observations: "data/observations.json",
  runLog: "data/scraper-runs.json",
  metadata: "data/metadata.json",
});
const REMOTE_STATE_FILE = path.join("logs", ".remote-snapshot-state.json");
const OBSERVATION_COLUMNS = [
  "rowKey", "reportDate", "sourceId", "commodity", "perishability", "category", "market",
  "variety", "grade", "arrivals", "unit", "minPrice", "maxPrice", "modalPrice",
  "canonicalPrice", "canonicalPriceUnit", "priceDisplayUnit",
];
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

function remoteError(code, message, cause = null) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function dataBaseUrl(env = {}) {
  const raw = env.CLOUDFLARE_DATA_BASE_URL || DEFAULT_DATA_BASE_URL;
  let parsed;
  try { parsed = new URL(raw); } catch (error) { throw remoteError("REMOTE_CONFIG_INVALID", "CLOUDFLARE_DATA_BASE_URL must be a valid HTTPS URL.", error); }
  if (parsed.protocol !== "https:") throw remoteError("REMOTE_CONFIG_INVALID", "CLOUDFLARE_DATA_BASE_URL must use HTTPS.");
  if (parsed.username || parsed.password) throw remoteError("REMOTE_CONFIG_INVALID", "CLOUDFLARE_DATA_BASE_URL must not contain credentials.");
  return parsed.toString().replace(/\/$/, "");
}

function requestJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch (error) { reject(remoteError("REMOTE_CONFIG_INVALID", "The Cloudflare JSON URL is invalid.", error)); return; }
    const client = parsed.protocol === "https:" ? https : parsed.protocol === "http:" ? http : null;
    if (!client) { reject(remoteError("REMOTE_CONFIG_INVALID", "The Cloudflare JSON URL must use HTTPS.")); return; }
    const request = client.get(parsed, { headers: { Accept: "application/json" } }, (response) => {
      const status = response.statusCode || 0;
      if (status < 200 || status >= 300) {
        response.resume();
        reject(remoteError("REMOTE_HTTP_ERROR", `Cloudflare JSON request returned HTTP ${status}.`));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          request.destroy(remoteError("REMOTE_RESPONSE_TOO_LARGE", "Cloudflare JSON response exceeded the allowed size."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch (error) { reject(remoteError("REMOTE_INVALID_JSON", `Cloudflare returned invalid JSON from ${parsed.pathname}.`, error)); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(remoteError("REMOTE_TIMEOUT", `Timed out reading Cloudflare JSON after ${timeoutMs} ms.`)));
    request.on("error", (error) => {
      if (error && error.code && /^REMOTE_/.test(error.code)) reject(error);
      else reject(remoteError("REMOTE_FETCH_FAILED", `Could not access Cloudflare JSON at ${parsed.pathname}.`, error));
    });
  });
}

function validateObservationPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare observations JSON must be an object.");
  if (payload.version !== 1 || JSON.stringify(payload.columns) !== JSON.stringify(OBSERVATION_COLUMNS)) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare observations JSON has an unsupported schema.");
  if (!payload.dictionaries || typeof payload.dictionaries !== "object" || !Array.isArray(payload.rows)) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare observations JSON is missing dictionaries or rows.");
  for (const column of OBSERVATION_COLUMNS) if (!Array.isArray(payload.dictionaries[column])) throw remoteError("REMOTE_SCHEMA_INVALID", `Cloudflare observations JSON is missing the ${column} dictionary.`);
  for (const encodedRow of payload.rows) {
    if (!Array.isArray(encodedRow) || encodedRow.length !== OBSERVATION_COLUMNS.length) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare observations JSON contains an invalid row.");
    encodedRow.forEach((cell, index) => {
      if (cell !== null && (!Number.isInteger(cell) || cell < 0 || cell >= payload.dictionaries[OBSERVATION_COLUMNS[index]].length)) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare observations JSON contains an invalid dictionary index.");
    });
  }
  return decodeObservations(payload);
}

function normalizeRunLog(payload) {
  const value = Array.isArray(payload) ? { runs: payload } : payload;
  if (!value || typeof value !== "object" || !Array.isArray(value.runs)) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare scraper-runs JSON has an invalid shape.");
  const runs = value.runs.map((record) => {
    if (!record || typeof record !== "object") throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare scraper-runs JSON contains an invalid record.");
    for (const field of RUN_LOG_FIELDS) if (!Object.prototype.hasOwnProperty.call(record, field)) throw remoteError("REMOTE_SCHEMA_INVALID", `Cloudflare scraper-runs JSON is missing ${field}.`);
    if (!record.run_id || !record.source || !Number.isFinite(Date.parse(record.run_timestamp))) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare scraper-runs JSON contains an invalid run identity or timestamp.");
    return Object.fromEntries(RUN_LOG_FIELDS.map((field) => [field, record[field]]));
  });
  return { version: 1, generated_at: value.generated_at || null, retention_days: 31, runs };
}

function canonicalRunRecords(records) {
  return records.map((record) => RUN_LOG_FIELDS.map((field) => record[field]))
    .sort((a, b) => `${a[0]}\u0000${a[1]}`.localeCompare(`${b[0]}\u0000${b[1]}`));
}

function fingerprintRemoteSnapshot(snapshot) {
  const observations = [...snapshot.observations].sort((a, b) => String(a.rowKey).localeCompare(String(b.rowKey)));
  const payload = JSON.stringify({ observations, runs: canonicalRunRecords(snapshot.runLog.runs) });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function loadRemoteSnapshot(options = {}) {
  const baseUrl = dataBaseUrl(options.env || {});
  const fetcher = options.fetchJson || requestJson;
  const [metadata, observationPayload, runPayload] = await Promise.all([
    fetcher(`${baseUrl}/${REMOTE_FILES.metadata}`, options.requestOptions),
    fetcher(`${baseUrl}/${REMOTE_FILES.observations}`, options.requestOptions),
    fetcher(`${baseUrl}/${REMOTE_FILES.runLog}`, options.requestOptions),
  ]);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw remoteError("REMOTE_SCHEMA_INVALID", "Cloudflare metadata JSON has an invalid shape.");
  const observations = validateObservationPayload(observationPayload);
  const runLog = normalizeRunLog(runPayload);
  const snapshot = { baseUrl, metadata, observations, runLog };
  snapshot.fingerprint = fingerprintRemoteSnapshot(snapshot);
  return snapshot;
}

function runRecordKey(record) { return `${record.run_id}\u0000${record.source}`; }

function mergeRunLogs(localLog, remoteLog) {
  const records = new Map();
  for (const record of localLog.runs || []) records.set(runRecordKey(record), record);
  // Cloudflare is the baseline for an existing run record. The current run
  // is appended after this reconciliation and therefore wins if it repeats a key.
  for (const record of remoteLog.runs || []) records.set(runRecordKey(record), record);
  return [...records.values()];
}

function readLocalObservations(dataDir) {
  const file = path.join(dataDir, "observations.json");
  if (!fs.existsSync(file)) throw remoteError("LOCAL_SNAPSHOT_MISSING", "Local data/observations.json is missing; restore the scraper package before publishing.");
  try { return validateObservationPayload(JSON.parse(fs.readFileSync(file, "utf8"))); }
  catch (error) { if (error && /^REMOTE_/.test(error.code || "")) throw remoteError("LOCAL_SNAPSHOT_INVALID", "Local data/observations.json has an invalid schema.", error); throw remoteError("LOCAL_SNAPSHOT_INVALID", "Local data/observations.json is not valid JSON.", error); }
}

function mergeObservations(localRows, remoteRows) {
  const rows = new Map();
  for (const row of localRows) rows.set(row.rowKey, row);
  for (const row of remoteRows) rows.set(row.rowKey, row);
  return [...rows.values()];
}

function statePath(rootDir) { return path.join(rootDir, REMOTE_STATE_FILE); }

function writeRemoteSyncState(rootDir, state, fsApi = fs) {
  const file = statePath(rootDir);
  fsApi.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fsApi.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fsApi.renameSync(temp, file);
}

function readRemoteSyncState(rootDir, fsApi = fs) {
  const file = statePath(rootDir);
  if (!fsApi.existsSync(file)) return null;
  try { return JSON.parse(fsApi.readFileSync(file, "utf8")); }
  catch (error) { throw remoteError("LOCAL_SYNC_STATE_INVALID", "The local remote-sync state is invalid; start a fresh publish run.", error); }
}

function clearRemoteSyncState(rootDir, fsApi = fs) {
  fsApi.rmSync(statePath(rootDir), { force: true });
}

async function reconcileRemoteSnapshot(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const dataDir = options.dataDir || path.join(rootDir, "data");
  const now = options.now || new Date();
  const runId = options.runId || crypto.randomUUID();
  clearRemoteSyncState(rootDir, options.fsApi || fs);
  const remote = await loadRemoteSnapshot(options);
  const localRows = readLocalObservations(dataDir);
  const localLog = readRunLog(dataDir);
  const rows = mergeObservations(localRows, remote.observations);
  const categoriesFile = path.join(dataDir, "categories.json");
  if (!fs.existsSync(categoriesFile)) throw remoteError("LOCAL_SNAPSHOT_MISSING", "Local data/categories.json is missing; restore the scraper package before publishing.");
  let categories;
  try { categories = JSON.parse(fs.readFileSync(categoriesFile, "utf8")); }
  catch (error) { throw remoteError("LOCAL_SNAPSHOT_INVALID", "Local data/categories.json is not valid JSON.", error); }
  if (typeof options.buildPayloads !== "function" || typeof options.publishSnapshot !== "function") throw remoteError("REMOTE_SYNC_INTERNAL", "Remote reconciliation is missing its snapshot builders.");
  const payloads = options.buildPayloads(rows, categories);
  options.publishSnapshot(payloads, dataDir, runId, options.fsApi || fs);
  writeRunLog(dataDir, mergeRunLogs(localLog, remote.runLog), now, options.fsApi || fs);
  const state = { version: 1, run_id: runId, synced_at: now.toISOString(), fingerprint: remote.fingerprint };
  writeRemoteSyncState(rootDir, state, options.fsApi || fs);
  return { ok: true, ...state, local_row_count: localRows.length, remote_row_count: remote.observations.length, merged_row_count: rows.length, remote_run_count: remote.runLog.runs.length };
}

async function verifyRemoteSnapshot(options = {}) {
  const remote = await loadRemoteSnapshot(options);
  if (remote.fingerprint !== options.expectedFingerprint) throw remoteError("REMOTE_VERSION_CHANGED", "Cloudflare changed while this scrape was running; publication was cancelled. Run the scrape again to merge the latest snapshot.");
  return remote;
}

module.exports = {
  DEFAULT_DATA_BASE_URL, REMOTE_FILES, REMOTE_STATE_FILE, OBSERVATION_COLUMNS,
  dataBaseUrl, requestJson, validateObservationPayload, normalizeRunLog,
  fingerprintRemoteSnapshot, loadRemoteSnapshot, mergeObservations, mergeRunLogs,
  writeRemoteSyncState, readRemoteSyncState, clearRemoteSyncState,
  reconcileRemoteSnapshot, verifyRemoteSnapshot, remoteError,
};
