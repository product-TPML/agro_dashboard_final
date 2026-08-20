const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { encodeObservations } = require("./observation_codec");
const { normalizeMarketName } = require("./market_aliases");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "data", "agro_dashboard.db");
const DATA_DIR = path.join(ROOT_DIR, "data");

const SOURCE_PRICE_DISPLAY_UNITS = {
  necc_egg: "100 eggs",
  csb_silk: "Kg",
  spices_board: "per KG",
  coffee_board: "50 Kg",
  rubber_board: "per 100 kg",
};

const CATEGORY_OVERRIDES = {
  Clove: "spices",
  "Dry Chillies": "spices",
  Mace: "spices",
  Nutmeg: "spices",
  Pepper: "spices",
  Turmeric: "spices",
  "Bull (For Each)": "livestock_and_poultry",
  "Calf (For Each)": "livestock_and_poultry",
  "Cow (For Each)": "livestock_and_poultry",
  "Goat (For Each)": "livestock_and_poultry",
  "He Baffalo (For Each)": "livestock_and_poultry",
  Egg: "livestock_and_poultry",
  "Ox (For Each)": "livestock_and_poultry",
  "Ram (For Each)": "livestock_and_poultry",
  "She Baffalo (For Each)": "livestock_and_poultry",
  "She Goat (For Each)": "livestock_and_poultry",
  "Sheep (For Each)": "livestock_and_poultry",
  Bullar: "grains_and_pulses",
  Sajje: "grains_and_pulses",
  "Cowpea (Veg)": "vegetables",
  Millets: "grains_and_pulses",
  "Other Fruits": "fruits",
};

function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const observations = db.prepare(`
      SELECT
        row_key,
        report_date,
        source_id,
        commodity,
        perishability,
        category,
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
    `).all().map(mapObservationRow);

    const searchIndex = {
      commodities: db.prepare("SELECT name FROM commodities ORDER BY name ASC").all().map((row) => row.name),
      markets: [...new Set(db.prepare("SELECT name FROM markets ORDER BY name ASC").all().map((row) => normalizeMarketName(row.name)))].sort((left, right) => left.localeCompare(right)),
      varieties: db.prepare(`
        SELECT DISTINCT commodity, variety
        FROM price_observations_flat
        WHERE variety <> ''
        ORDER BY variety ASC, commodity ASC
      `).all().map((row) => ({
        commodity: row.commodity,
        variety: row.variety,
      })),
    };

    const metadata = {
      generatedAt: new Date().toISOString(),
      observations: observations.length,
      commodities: searchIndex.commodities.length,
      markets: searchIndex.markets.length,
      varieties: searchIndex.varieties.length,
    };

    fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJson("observations.json", encodeObservations(observations));
    writeJson("search-index.json", searchIndex);
    writeJson("categories.json", buildCategoryData(db));
    writeJson("metadata.json", metadata);

    console.log(`Built static dashboard data in ${DATA_DIR}`);
    console.log(JSON.stringify(metadata, null, 2));
  } finally {
    db.close();
  }
}

function mapObservationRow(row) {
  return {
    rowKey: row.row_key,
    reportDate: normalizeReportDateValue(row.report_date),
    sourceId: row.source_id,
    commodity: row.commodity,
    perishability: row.perishability,
    category: row.category,
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

function buildCategoryData(db) {
  const definitions = [
    { id: "fruits", label: "Fruits" },
    { id: "vegetables", label: "Vegetables" },
    { id: "nuts_and_seeds", label: "Nuts and Seeds" },
    { id: "grains_and_pulses", label: "Grains and Pulses" },
    { id: "spices", label: "Spices" },
    { id: "livestock_and_poultry", label: "Livestock and Poultry" },
    { id: "miscellaneous", label: "Miscellaneous" },
  ];
  const rows = db.prepare(`
    SELECT
      c.name AS commodity,
      COALESCE(cm.category, c.category) AS category
    FROM commodities c
    LEFT JOIN commodity_mapping cm ON cm.commodity_id = c.id
    ORDER BY c.name ASC
  `).all();
  const grouped = new Map();

  rows.forEach((row) => {
    const category = CATEGORY_OVERRIDES[row.commodity] || row.category;
    if (!category) {
      return;
    }
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(row.commodity);
  });

  return {
    categories: definitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      commodityCount: (grouped.get(definition.id) || []).length,
      commodities: (grouped.get(definition.id) || []).slice().sort((left, right) => left.localeCompare(right)),
    })),
  };
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
  return `${match[3]}-${padDatePart(match[2])}-${padDatePart(match[1])}`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function writeJson(fileName, payload) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), `${JSON.stringify(payload)}\n`, "utf8");
}

main();
