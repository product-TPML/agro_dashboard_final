"use strict";

const CANONICAL_MARKET_ALIASES = Object.freeze({
  COCHIN: "Cochin",
});

function normalizeMarketName(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return CANONICAL_MARKET_ALIASES[text.toUpperCase()] || text;
}

module.exports = { CANONICAL_MARKET_ALIASES, normalizeMarketName };
