"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const Database = require("better-sqlite3");
const { decodeObservations, encodeObservations } = require("./observation_codec");
const { normalizeMarketName } = require("./market_aliases");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "agro_dashboard.db");
const CANONICAL_MARKET = "Cochin";

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8"));
}

function writeJson(fileName, payload) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), `${JSON.stringify(payload)}\n`, "utf8");
}

function migrateDatabase() {
  const db = new Database(DB_PATH, { fileMustExist: true });
  db.pragma("foreign_keys = ON");
  try {
    const canonical = db.prepare("SELECT id FROM markets WHERE name = ?").get(CANONICAL_MARKET);
    if (!canonical) throw new Error(`Canonical market not found: ${CANONICAL_MARKET}`);

    const aliases = db.prepare("SELECT id, name FROM markets WHERE lower(name) = lower(?) AND id <> ? ORDER BY id").all(CANONICAL_MARKET, canonical.id);
    const aliasCounts = new Map(aliases.map((alias) => [alias.id, db.prepare("SELECT COUNT(*) AS count FROM price_observations WHERE market_id = ?").get(alias.id).count]));
    const migrate = db.transaction(() => {
      const updateObservations = db.prepare("UPDATE price_observations SET market_id = ? WHERE market_id = ?");
      const copyMappings = db.prepare("INSERT OR IGNORE INTO market_district_mapping (market_id, district_id, notes) SELECT ?, district_id, notes FROM market_district_mapping WHERE market_id = ?");
      const deleteMappings = db.prepare("DELETE FROM market_district_mapping WHERE market_id = ?");
      const deleteMarket = db.prepare("DELETE FROM markets WHERE id = ?");
      for (const alias of aliases) {
        updateObservations.run(canonical.id, alias.id);
        copyMappings.run(canonical.id, alias.id);
        deleteMappings.run(alias.id);
        deleteMarket.run(alias.id);
      }
    });
    migrate();

    const remaining = db.prepare("SELECT id, name FROM markets WHERE lower(name) = lower(?) ORDER BY id").all(CANONICAL_MARKET);
    if (remaining.length !== 1 || remaining[0].name !== CANONICAL_MARKET) {
      throw new Error(`Market migration did not leave one canonical value: ${JSON.stringify(remaining)}`);
    }
    return { aliases: aliases.map((alias) => alias.name), observationsMoved: aliases.reduce((total, alias) => total + aliasCounts.get(alias.id), 0) };
  } finally {
    db.close();
  }
}

function normalizeRuntimeArtifacts() {
  const observations = decodeObservations(readJson("observations.json")).map((row) => ({
    ...row,
    market: normalizeMarketName(row.market),
  }));
  const rowKeys = new Set(observations.map((row) => row.rowKey));
  if (rowKeys.size !== observations.length) throw new Error("Market normalization created duplicate observation row keys");

  const searchIndex = readJson("search-index.json");
  searchIndex.markets = [...new Set((searchIndex.markets || []).map(normalizeMarketName))].sort((left, right) => left.localeCompare(right));

  const translations = readJson("../translations.json");
  if (!translations.markets || (!translations.markets[CANONICAL_MARKET] && !translations.markets.COCHIN)) {
    throw new Error(`Missing translation for canonical market: ${CANONICAL_MARKET}`);
  }
  if (!translations.markets[CANONICAL_MARKET]) translations.markets[CANONICAL_MARKET] = translations.markets.COCHIN;
  delete translations.markets.COCHIN;

  const encodedObservations = encodeObservations(observations);
  const metadata = {
    ...readJson("metadata.json"),
    generatedAt: new Date().toISOString(),
    snapshotId: crypto.createHash("sha256").update(JSON.stringify(encodedObservations)).digest("hex"),
    observations: observations.length,
    commodities: searchIndex.commodities.length,
    markets: searchIndex.markets.length,
    varieties: searchIndex.varieties.length,
  };

  writeJson("observations.json", encodedObservations);
  writeJson("search-index.json", searchIndex);
  writeJson("metadata.json", metadata);
  fs.writeFileSync(path.join(ROOT_DIR, "translations.json"), `${JSON.stringify(translations, null, 2)}\n`, "utf8");
  return { observations: observations.length, markets: searchIndex.markets.length, translation: translations.markets[CANONICAL_MARKET] };
}

const databaseResult = migrateDatabase();
const artifactResult = normalizeRuntimeArtifacts();
console.log(JSON.stringify({ databaseResult, artifactResult }, null, 2));
