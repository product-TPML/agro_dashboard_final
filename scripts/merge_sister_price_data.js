const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const Database = require("better-sqlite3");
const { decodeObservations, encodeObservations } = require("./observation_codec");
const { normalizeMarketName } = require("./market_aliases");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const SISTER_ROOT = path.resolve(
  process.argv[2] || "C:\\Users\\harsh\\Downloads\\Claude_experiments\\Commodity-dashboard-master-local-merged-view",
);
const SISTER_DB_PATH = path.join(SISTER_ROOT, "data", "agro_dashboard.db");

const SOURCE_PRICE_DISPLAY_UNITS = {
  necc_egg: "100 eggs",
  csb_silk: "Kg",
  spices_board: "per KG",
  coffee_board: "50 Kg",
  rubber_board: "per 100 kg",
};

function main() {
  const categories = readJson("categories.json");
  const searchIndex = readJson("search-index.json");
  const existingObservations = decodeObservations(readJson("observations.json"));
  const categoryByCommodity = buildCategoryMap(categories);

  if (!fs.existsSync(SISTER_DB_PATH)) {
    throw new Error(`Sister database not found: ${SISTER_DB_PATH}`);
  }

  const db = new Database(SISTER_DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const sisterRows = db.prepare(`
      SELECT
        row_key,
        report_date,
        source_id,
        commodity,
        perishability,
        market,
        variety,
        grade,
        arrivals,
        unit,
        min_price,
        max_price,
        modal_price,
        canonical_price,
        canonical_price_unit
      FROM price_observations_flat
      ORDER BY report_date ASC, commodity ASC, market ASC, variety ASC, grade ASC
    `).all();

    const merged = new Map();
    let excludedExisting = 0;
    let excludedSister = 0;

    for (const row of existingObservations) {
      if (!categoryByCommodity.has(row.commodity)) {
        excludedExisting += 1;
        continue;
      }
      merged.set(row.rowKey, {
        ...row,
        category: categoryByCommodity.get(row.commodity),
      });
    }

    for (const row of sisterRows) {
      const category = categoryByCommodity.get(row.commodity);
      if (!category) {
        excludedSister += 1;
        continue;
      }
      merged.set(row.row_key, mapObservationRow(row, category));
    }

    const observations = [...merged.values()].sort(compareObservations);
    assertUniqueRowKeys(observations);
    assertCurrentTaxonomy(observations, categoryByCommodity);

    const normalizedSearchIndex = {
      ...searchIndex,
      markets: [...new Set((searchIndex.markets || []).map(normalizeMarketName))].sort((left, right) => left.localeCompare(right)),
    };
    const encodedObservations = encodeObservations(observations);
    const metadata = {
      generatedAt: new Date().toISOString(),
      snapshotId: crypto.createHash("sha256").update(JSON.stringify(encodedObservations)).digest("hex"),
      observations: observations.length,
      commodities: normalizedSearchIndex.commodities.length,
      markets: normalizedSearchIndex.markets.length,
      varieties: normalizedSearchIndex.varieties.length,
    };

    writeJson("observations.json", encodedObservations);
    writeJson("search-index.json", normalizedSearchIndex);
    writeJson("metadata.json", metadata);

    console.log(JSON.stringify({
      sisterDatabase: SISTER_DB_PATH,
      sisterRows: sisterRows.length,
      mergedRows: observations.length,
      excludedExistingRows: excludedExisting,
      excludedSisterRows: excludedSister,
      metadata,
    }, null, 2));
  } finally {
    db.close();
  }
}

function buildCategoryMap(payload) {
  const map = new Map();
  for (const category of payload.categories || []) {
    for (const commodity of category.commodities || []) {
      map.set(commodity, category.id);
    }
  }
  if (map.size === 0) {
    throw new Error("Current categories.json contains no commodities");
  }
  return map;
}

function mapObservationRow(row, category) {
  return {
    rowKey: row.row_key,
    reportDate: normalizeReportDateValue(row.report_date),
    sourceId: row.source_id,
    commodity: row.commodity,
    perishability: row.perishability,
    category,
    market: normalizeMarketName(row.market),
    variety: row.variety,
    grade: row.grade,
    arrivals: row.arrivals,
    unit: row.unit,
    minPrice: row.min_price,
    maxPrice: row.max_price,
    modalPrice: row.modal_price,
    canonicalPrice: row.canonical_price,
    canonicalPriceUnit: row.canonical_price_unit,
    priceDisplayUnit: getPriceDisplayUnit(row),
  };
}

function getPriceDisplayUnit(row) {
  if (["spices_board", "rubber_board", "necc_egg"].includes(row.source_id)) {
    return row.canonical_price_unit || SOURCE_PRICE_DISPLAY_UNITS[row.source_id] || null;
  }
  if (row.source_id === "coffee_board") {
    return row.unit || SOURCE_PRICE_DISPLAY_UNITS.coffee_board;
  }
  return SOURCE_PRICE_DISPLAY_UNITS[row.source_id] || null;
}

function compareObservations(left, right) {
  return left.reportDate.localeCompare(right.reportDate)
    || left.commodity.localeCompare(right.commodity)
    || left.market.localeCompare(right.market)
    || left.variety.localeCompare(right.variety)
    || left.grade.localeCompare(right.grade);
}

function assertUniqueRowKeys(observations) {
  const keys = new Set(observations.map((row) => row.rowKey));
  if (keys.size !== observations.length) {
    throw new Error("Merged observations contain duplicate row keys");
  }
}

function assertCurrentTaxonomy(observations, categoryByCommodity) {
  for (const row of observations) {
    if (!categoryByCommodity.has(row.commodity)) {
      throw new Error(`Merged row is outside the current taxonomy: ${row.commodity}`);
    }
    if (row.category !== categoryByCommodity.get(row.commodity)) {
      throw new Error(`Merged row has an unexpected category: ${row.commodity}`);
    }
  }
}

function normalizeReportDateValue(value) {
  const raw = String(value || "").trim();
  if (!raw || /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const match = raw.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (!match) {
    return raw;
  }
  return `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
}

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8"));
}

function writeJson(fileName, payload) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), `${JSON.stringify(payload)}\n`, "utf8");
}

main();
