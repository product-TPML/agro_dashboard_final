const test = require("node:test");
const assert = require("node:assert/strict");

const ordering = require("../result_ordering.js");

function row(market, reportDate, values = {}) {
  return {
    market,
    reportDate,
    commodity: values.commodity || "Tomato",
    variety: values.variety || "",
    grade: values.grade || "",
  };
}

test("orders markets alphabetically before freshness", () => {
  const rows = [
    row("Mysuru", "2026-08-20"),
    row("Cochin", "2026-08-18"),
    row("BENGALURU", "2026-08-17"),
  ];

  rows.sort(ordering.compareRows);
  assert.deepEqual(rows.map((entry) => entry.market), ["BENGALURU", "Cochin", "Mysuru"]);
});

test("orders newest rows first within the same market", () => {
  const rows = [
    row("Mysuru", "2026-08-18", { variety: "Hybrid" }),
    row("Mysuru", "2026-08-20", { variety: "Local" }),
    row("Mysuru", "2026-08-19", { variety: "Round" }),
  ];

  rows.sort(ordering.compareRows);
  assert.deepEqual(rows.map((entry) => entry.reportDate), ["2026-08-20", "2026-08-19", "2026-08-18"]);
});

test("uses existing commodity, variety, and grade tie-breakers", () => {
  const rows = [
    row("Mysuru", "2026-08-20", { commodity: "Tomato", variety: "Hybrid", grade: "A" }),
    row("Mysuru", "2026-08-20", { commodity: "Apple", variety: "Local", grade: "A" }),
    row("Mysuru", "2026-08-20", { commodity: "Apple", variety: "Local", grade: "B" }),
  ];

  rows.sort(ordering.compareRows);
  assert.deepEqual(rows.map((entry) => `${entry.commodity}/${entry.variety}/${entry.grade}`), [
    "Apple/Local/A",
    "Apple/Local/B",
    "Tomato/Hybrid/A",
  ]);
});

test("keeps market-search commodity ties ordered by variety", () => {
  const rows = [
    row("Mysuru", "2026-08-20", { variety: "Round" }),
    row("Mysuru", "2026-08-20", { variety: "Hybrid" }),
  ];

  rows.sort((left, right) => ordering.compareRows(left, right, { marketSearchCommodity: true }));
  assert.deepEqual(rows.map((entry) => entry.variety), ["Hybrid", "Round"]);
});

test("places missing report dates after dated rows within a market", () => {
  const rows = [row("Mysuru", ""), row("Mysuru", "2026-08-20")];

  rows.sort(ordering.compareRows);
  assert.deepEqual(rows.map((entry) => entry.reportDate), ["2026-08-20", ""]);
});
