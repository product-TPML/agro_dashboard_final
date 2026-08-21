const test = require("node:test");
const assert = require("node:assert/strict");

const analytics = require("../analytics.js");

test("builds the four supported page-view classifications and titles", () => {
  const cases = [
    [{ commodity: "Tomato" }, "commodity", "Tomato"],
    [{ commodity: "Tomato", market: "Mysuru" }, "commodity + market", "Tomato/Mysuru"],
    [{ commodity: "Tomato", variety: "Hybrid" }, "commodity + variety", "Tomato/Hybrid"],
    [
      { commodity: "Tomato", variety: "Hybrid", market: "Mysuru" },
      "commodity + variety + market",
      "Tomato/Hybrid/Mysuru",
    ],
  ];

  cases.forEach(([route, pageType, pageTitle]) => {
    assert.deepEqual(
      analytics.buildPageViewPayload(route, { source: "search bar", searchTerm: "tomato" }),
      {
        event: "page_view",
        page_type: pageType,
        page_title: pageTitle,
        source: "search bar",
        search_term: "tomato",
      }
    );
  });
});

test("does not classify routes without a commodity", () => {
  assert.equal(analytics.buildPageViewPayload({ type: "market", market: "Mysuru" }), null);
});

test("normalizes non-search attribution to no search term", () => {
  assert.deepEqual(
    analytics.buildPageViewPayload(
      { commodity: "Tomato" },
      { source: "image click", searchTerm: "ignored" }
    ),
    {
      event: "page_view",
      page_type: "commodity",
      page_title: "Tomato",
      source: "image click",
      search_term: "NA",
    }
  );

  assert.deepEqual(analytics.normalizeAttribution(), { source: "direct", searchTerm: "NA" });
});

test("builds the fixed-order composite card details value", () => {
  assert.deepEqual(
    analytics.buildCardExpandPayload({
      commodity: "Tomato",
      market: "Mysuru",
      variety: "Hybrid",
      grade: "Average",
    }),
    {
      event: "card_expand",
      card_details: "Tomato|Mysuru|Hybrid|Average",
    }
  );

  assert.deepEqual(
    analytics.buildCardExpandPayload({ commodity: "Tomato", market: "Mysuru", grade: "Average" }),
    {
      event: "card_expand",
      card_details: "Tomato|Mysuru||Average",
    }
  );
});

test("pushes safely into a data layer", () => {
  const target = {};
  const payload = { event: "card_expand", card_details: "Tomato|Mysuru|Hybrid|Average" };

  assert.equal(analytics.pushEvent(target, payload), true);
  assert.deepEqual(target.dataLayer, [payload]);
  assert.equal(analytics.pushEvent(null, payload), false);
});
