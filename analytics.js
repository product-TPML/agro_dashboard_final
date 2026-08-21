(function(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.CommodityDashboardAnalytics = factory();
})(typeof self !== "undefined" ? self : globalThis, function() {
  const VALID_SOURCES = new Set(["search bar", "image click", "direct"]);

  function cleanValue(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function normalizeAttribution(attribution) {
    const source = VALID_SOURCES.has(attribution && attribution.source)
      ? attribution.source
      : "direct";
    const searchTerm = source === "search bar"
      ? cleanValue(attribution && attribution.searchTerm) || "NA"
      : "NA";

    return { source, searchTerm };
  }

  function getPageType(route) {
    if (!route || !cleanValue(route.commodity)) {
      return "";
    }

    const hasMarket = Boolean(cleanValue(route.market));
    const hasVariety = Boolean(cleanValue(route.variety));
    if (hasVariety && hasMarket) {
      return "commodity + variety + market";
    }
    if (hasVariety) {
      return "commodity + variety";
    }
    if (hasMarket) {
      return "commodity + market";
    }
    return "commodity";
  }

  function getPageTitle(route) {
    if (!getPageType(route)) {
      return "";
    }

    return [route.commodity, route.variety, route.market]
      .map(cleanValue)
      .filter(Boolean)
      .join("/");
  }

  function buildPageViewPayload(route, attribution) {
    const pageType = getPageType(route);
    if (!pageType) {
      return null;
    }

    const normalizedAttribution = normalizeAttribution(attribution);
    return {
      event: "page_view",
      page_type: pageType,
      page_title: getPageTitle(route),
      source: normalizedAttribution.source,
      search_term: normalizedAttribution.searchTerm,
    };
  }

  function sanitizeCardValue(value) {
    return cleanValue(value).replaceAll("|", "/");
  }

  function buildCardExpandPayload(row) {
    if (!row) {
      return null;
    }

    return {
      event: "card_expand",
      card_details: [row.commodity, row.market, row.variety, row.grade]
        .map(sanitizeCardValue)
        .join("|"),
    };
  }

  function pushEvent(target, payload) {
    if (!target || !payload) {
      return false;
    }

    try {
      if (!Array.isArray(target.dataLayer)) {
        target.dataLayer = [];
      }
      target.dataLayer.push(payload);
      return true;
    } catch (error) {
      return false;
    }
  }

  return Object.freeze({
    buildCardExpandPayload,
    buildPageViewPayload,
    getPageTitle,
    getPageType,
    normalizeAttribution,
    pushEvent,
  });
});
