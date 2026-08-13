"use strict";

// Compact dictionary-encoded observation payloads:
// { version:1, columns:[...], dictionaries:{column:[unique values]}, rows:[[index|null,...]] }
// A null cell encodes a null/undefined original value; anything else is an index
// into dictionaries[column], preserving first-occurrence order.

function buildDictionary(values) {
  const index = new Map();
  const entries = [];
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    const key = `v:${value}`;
    if (!index.has(key)) {
      index.set(key, entries.length);
      entries.push(value);
    }
  }
  return { entries, index };
}

function encodeObservations(rows) {
  const columns = Object.keys(rows[0]);
  const dictionaries = {};
  for (const column of columns) {
    dictionaries[column] = buildDictionary(rows.map((row) => row[column])).entries;
  }
  const encodedRows = rows.map((row) =>
    columns.map((column) => {
      const value = row[column];
      if (value === null || value === undefined) {
        return null;
      }
      return dictionaries[column].indexOf(value);
    }),
  );
  return { version: 1, columns, dictionaries, rows: encodedRows };
}

function decodeObservations(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.rows.map((encodedRow) => {
    const row = {};
    encodedRow.forEach((cell, i) => {
      const column = payload.columns[i];
      row[column] = cell === null ? null : payload.dictionaries[column][cell];
    });
    return row;
  });
}

module.exports = { encodeObservations, decodeObservations };
