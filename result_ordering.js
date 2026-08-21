(function(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.CommodityDashboardResultOrdering = factory();
})(typeof self !== "undefined" ? self : globalThis, function() {
  const marketCollator = new Intl.Collator("en", { sensitivity: "base" });

  function cleanValue(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function compareText(left, right) {
    const leftValue = cleanValue(left);
    const rightValue = cleanValue(right);
    const comparison = marketCollator.compare(leftValue, rightValue);
    if (comparison !== 0) {
      return comparison;
    }
    return leftValue.localeCompare(rightValue);
  }

  function compareLatestReportDates(left, right) {
    const leftDate = cleanValue(left);
    const rightDate = cleanValue(right);

    if (leftDate && !rightDate) {
      return -1;
    }
    if (!leftDate && rightDate) {
      return 1;
    }
    if (leftDate === rightDate) {
      return 0;
    }

    return rightDate.localeCompare(leftDate);
  }

  function compareTieBreakers(left, right, options = {}) {
    if (options.marketSearchCommodity) {
      return compareText(left.variety, right.variety);
    }

    const commodityCompare = compareText(left.commodity, right.commodity);
    if (commodityCompare !== 0) {
      return commodityCompare;
    }

    const varietyCompare = compareText(left.variety, right.variety);
    if (varietyCompare !== 0) {
      return varietyCompare;
    }

    return compareText(left.grade, right.grade);
  }

  function compareRows(left, right, options = {}) {
    const marketCompare = compareText(left.market, right.market);
    if (marketCompare !== 0) {
      return marketCompare;
    }

    const freshnessCompare = compareLatestReportDates(left.reportDate, right.reportDate);
    if (freshnessCompare !== 0) {
      return freshnessCompare;
    }

    return compareTieBreakers(left, right, options);
  }

  return Object.freeze({
    compareLatestReportDates,
    compareRows,
    compareText,
  });
});
