/*
 * Google Apps Script importer for data/scraper-runs.json.
 *
 * Defaults are preconfigured for the project's spreadsheet and Cloudflare
 * endpoint below. Script Properties may override them when needed:
 *   SCRAPER_SPREADSHEET_ID  Existing spreadsheet ID
 *   SCRAPER_SHEET_NAME      Destination tab name
 *   CLOUDFLARE_JSON_URL     Published scraper-runs.json URL
 *   SCRAPER_TIMEZONE        Asia/Kolkata
 *   SCRAPER_MAX_AGE_HOURS   Optional; defaults to 48
 */

var CONFIG_KEYS = {
  spreadsheetId: "SCRAPER_SPREADSHEET_ID",
  sheetName: "SCRAPER_SHEET_NAME",
  jsonUrl: "CLOUDFLARE_JSON_URL",
  timezone: "SCRAPER_TIMEZONE",
  maxAgeHours: "SCRAPER_MAX_AGE_HOURS"
};

var DEFAULT_CONFIG = {
  spreadsheetId: "1hbCFKb3gXePQHdA7s_iBoMkXDYQ60duEEKBVg376cSI",
  sheetName: "scraper_logs",
  jsonUrl: "https://agro-dashboard-data.pages.dev/data/scraper-runs.json",
  timezone: "Asia/Kolkata"
};

var RETENTION_DAYS = 31;
var DEFAULT_MAX_AGE_HOURS = 48;
var HEADERS = [
  "run_id", "source", "run_timestamp", "requested_report_date", "actual_report_date",
  "status", "overall_status", "row_count", "accepted_row_count", "skipped_row_count",
  "merged_row_count", "snapshot_status", "error_code", "error_message", "verification_url"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Scraper Logs")
    .addItem("Import now", "importScraperRunsFromMenu")
    .addItem("Create/reset daily trigger", "createDailyTriggerFromMenu")
    .addToUi();
}

function importScraperRunsFromMenu() {
  try {
    var result = importScraperRuns();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Imported " + result.imported + " new run(s); skipped " + result.skipped_duplicates_or_retained + ".",
      "Scraper Logs",
      8
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert("Scraper Logs import failed: " + error.message);
  }
}

function createDailyTriggerFromMenu() {
  try {
    var result = createDailyTrigger();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Daily import trigger created for the " + result.window + " " + result.timezone + " window.",
      "Scraper Logs",
      8
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert("Could not create the daily trigger: " + error.message);
  }
}

function getScraperRunsConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var config = {
    spreadsheetId: properties.getProperty(CONFIG_KEYS.spreadsheetId) || DEFAULT_CONFIG.spreadsheetId,
    sheetName: properties.getProperty(CONFIG_KEYS.sheetName) || DEFAULT_CONFIG.sheetName,
    jsonUrl: properties.getProperty(CONFIG_KEYS.jsonUrl) || DEFAULT_CONFIG.jsonUrl,
    timezone: properties.getProperty(CONFIG_KEYS.timezone) || DEFAULT_CONFIG.timezone,
    maxAgeHours: Number(properties.getProperty(CONFIG_KEYS.maxAgeHours) || DEFAULT_MAX_AGE_HOURS)
  };
  if (!config.spreadsheetId || !config.sheetName || !config.jsonUrl) {
    throw new Error("Set SCRAPER_SPREADSHEET_ID, SCRAPER_SHEET_NAME, and CLOUDFLARE_JSON_URL in Script Properties.");
  }
  if (!isFinite(config.maxAgeHours) || config.maxAgeHours <= 0) throw new Error("SCRAPER_MAX_AGE_HOURS must be a positive number.");
  return config;
}

function importScraperRuns() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("Another scraper-run import is already in progress.");
  try {
    var config = getScraperRunsConfig_();
    var response = UrlFetchApp.fetch(config.jsonUrl, { muteHttpExceptions: true, followRedirects: true });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      throw new Error("Cloudflare run-log request returned HTTP " + response.getResponseCode() + ".");
    }
    var payload;
    try { payload = JSON.parse(response.getContentText()); } catch (error) { throw new Error("Cloudflare run-log response was not valid JSON."); }
    var generatedAt = payload && (payload.generated_at || payload.generatedAt);
    validateFreshness_(generatedAt, config.maxAgeHours);
    var records = payload && Array.isArray(payload.runs) ? payload.runs : [];
    var cutoff = new Date().getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    records = records.map(validateRecord_).filter(function(record) {
      var timestamp = Date.parse(record.run_timestamp);
      return timestamp >= cutoff && timestamp <= new Date().getTime() + 5 * 60 * 1000;
    });

    var sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
    if (!sheet) throw new Error("Destination tab does not exist: " + config.sheetName);
    ensureHeaders_(sheet);
    var existingKeys = readExistingKeys_(sheet);
    var fresh = records.filter(function(record) {
      var key = record.run_id + "\u0000" + record.source;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    if (fresh.length) {
      var rows = fresh.map(function(record) { return recordToRow_(record, config.timezone); });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }
    return { imported: fresh.length, skipped_duplicates_or_retained: records.length - fresh.length, fetched: records.length, generated_at: generatedAt };
  } finally {
    lock.releaseLock();
  }
}

function createDailyTrigger() {
  var config = getScraperRunsConfig_();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "importScraperRuns") ScriptApp.deleteTrigger(trigger);
  });
  var trigger = ScriptApp.newTrigger("importScraperRuns")
    .timeBased()
    .atHour(9)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(config.timezone)
    .create();
  return { triggerId: trigger.getUniqueId(), timezone: config.timezone, window: "09:00-09:15" };
}

function validateFreshness_(generatedAt, maxAgeHours) {
  var timestamp = Date.parse(generatedAt || "");
  if (!isFinite(timestamp)) throw new Error("Run-log freshness metadata is missing or invalid.");
  var now = new Date().getTime();
  if (timestamp > now + 5 * 60 * 1000) throw new Error("Run-log freshness timestamp is in the future.");
  if (now - timestamp > maxAgeHours * 60 * 60 * 1000) throw new Error("Run-log is older than the configured freshness window.");
}

function validateRecord_(record) {
  if (!record || !record.run_id || !record.source || !record.run_timestamp) throw new Error("Run-log record is missing run_id, source, or run_timestamp.");
  if (!/^[a-z0-9_-]+$/i.test(String(record.run_id))) throw new Error("Run-log record has an invalid run_id.");
  if (Date.parse(record.run_timestamp) !== Date.parse(record.run_timestamp)) throw new Error("Run-log record has an invalid run_timestamp.");
  var statuses = ["success", "failed"];
  if (statuses.indexOf(record.status) < 0) throw new Error("Run-log record has an invalid status.");
  ["row_count", "accepted_row_count", "skipped_row_count", "merged_row_count"].forEach(function(field) {
    if (!Number.isFinite(Number(record[field])) || Number(record[field]) < 0) throw new Error("Run-log record has an invalid " + field + ".");
  });
  if (record.error_message && String(record.error_message).length > 500) throw new Error("Run-log error_message is too long.");
  if (record.verification_url && !/^https:\/\//i.test(record.verification_url)) throw new Error("Run-log verification_url is not HTTPS.");
  return record;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }
  var current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (current.join("\u0000") !== HEADERS.join("\u0000")) throw new Error("Destination tab headers do not match the scraper run-log contract.");
}

function readExistingKeys_(sheet) {
  var keys = new Set();
  if (sheet.getLastRow() < 2) return keys;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  values.forEach(function(row) {
    if (row[0] && row[1]) keys.add(String(row[0]) + "\u0000" + String(row[1]));
  });
  return keys;
}

function recordToRow_(record, timezone) {
  return HEADERS.map(function(field) {
    var value = record[field];
    if (field === "run_timestamp" && value) {
      // The scraper stores an unambiguous UTC ISO timestamp. Convert only the
      // spreadsheet presentation value so operators see the IST run time.
      value = Utilities.formatDate(new Date(value), timezone, "yyyy-MM-dd HH:mm:ss") + " IST";
    }
    return value === undefined || value === null ? "" : value;
  });
}
