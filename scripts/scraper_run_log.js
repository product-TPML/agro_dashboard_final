"use strict";

// The published run log is intentionally a small, stable summary. Detailed
// diagnostics remain in logs/*.jsonl and never enter the Cloudflare bundle.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RUN_LOG_VERSION = 1;
const RUN_LOG_RETENTION_DAYS = 31;
const RUN_LOG_FILE = "scraper-runs.json";
const RUN_LOG_FIELDS = [
  "run_id", "source", "run_timestamp", "requested_report_date", "actual_report_date",
  "status", "overall_status", "row_count", "accepted_row_count", "skipped_row_count",
  "merged_row_count", "snapshot_status", "error_code", "error_message", "verification_url",
];

function emptyRunLog(generatedAt = new Date().toISOString()) {
  return { version: RUN_LOG_VERSION, generated_at: generatedAt, retention_days: RUN_LOG_RETENTION_DAYS, runs: [] };
}

function readRunLog(dataDir) {
  const file = path.join(dataDir, RUN_LOG_FILE);
  if (!fs.existsSync(file)) return emptyRunLog();
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const runs = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.runs) ? parsed.runs : [];
  return {
    version: RUN_LOG_VERSION,
    generated_at: parsed && parsed.generated_at ? parsed.generated_at : new Date().toISOString(),
    retention_days: RUN_LOG_RETENTION_DAYS,
    runs: runs.filter(Boolean),
  };
}

function parseTimestamp(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : null;
}

function pruneRunRecords(records, now = new Date()) {
  const cutoff = now.getTime() - RUN_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    const timestamp = parseTimestamp(record && record.run_timestamp);
    return timestamp !== null && timestamp >= cutoff && timestamp <= now.getTime() + 5 * 60 * 1000;
  });
}

function writeRunLog(dataDir, records, now = new Date(), fsApi = fs) {
  fsApi.mkdirSync(dataDir, { recursive: true });
  const generatedAt = now.toISOString();
  const payload = JSON.stringify({
    version: RUN_LOG_VERSION,
    generated_at: generatedAt,
    retention_days: RUN_LOG_RETENTION_DAYS,
    runs: pruneRunRecords(records, now),
  }, null, 2) + "\n";
  const temp = path.join(dataDir, `.${RUN_LOG_FILE}.${crypto.randomUUID()}.tmp`);
  fsApi.writeFileSync(temp, payload, "utf8");
  fsApi.renameSync(temp, path.join(dataDir, RUN_LOG_FILE));
}

function appendRunRecords(dataDir, records, now = new Date(), fsApi = fs) {
  const current = readRunLog(dataDir);
  writeRunLog(dataDir, [...current.runs, ...records], now, fsApi);
  return readRunLog(dataDir);
}

function sanitizeErrorMessage(value) {
  let message = String(value == null ? "" : value).split(/\r?\n/)[0].trim();
  message = message
    .replace(/(?:Bearer\s+|token\s*[=:]\s*)[^\s,;]+/gi, "[redacted]")
    .replace(/CLOUDFLARE_[A-Z0-9_]+\s*[=:]\s*[^\s,;]+/gi, "[redacted]")
    .replace(/[A-Za-z]:\\[^\s]+/g, "[local path]")
    .replace(/\/[^\s]+\/node_modules\/[^\s]+/g, "[local path]")
    .replace(/([?&](?:token|key|secret|password|authorization)=)[^&\s]+/gi, "$1[redacted]");
  return message.slice(0, 500) || "Run failed.";
}

function errorCode(error, fallback = "SOURCE_ERROR") {
  if (error && typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code)) return error.code;
  return fallback;
}

function createRunRecord(values) {
  const record = {};
  for (const field of RUN_LOG_FIELDS) record[field] = values[field] === undefined ? null : values[field];
  for (const field of ["row_count", "accepted_row_count", "skipped_row_count", "merged_row_count"]) {
    record[field] = Number.isFinite(record[field]) ? record[field] : 0;
  }
  if (record.error_message !== null) record.error_message = sanitizeErrorMessage(record.error_message);
  if (record.verification_url && !/^https:\/\//i.test(record.verification_url)) record.verification_url = null;
  return record;
}

function newRunId() {
  return crypto.randomUUID();
}

module.exports = {
  RUN_LOG_VERSION,
  RUN_LOG_RETENTION_DAYS,
  RUN_LOG_FILE,
  RUN_LOG_FIELDS,
  emptyRunLog,
  readRunLog,
  pruneRunRecords,
  writeRunLog,
  appendRunRecords,
  sanitizeErrorMessage,
  errorCode,
  createRunRecord,
  newRunId,
};
