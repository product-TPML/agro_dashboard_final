#!/usr/bin/env node
'use strict';

/*
 * generate_hosted_bundle.js
 * -------------------------
 * Executable migration layer for hosting the Namma Krishi Prices SPA on
 * Prajavani Assettype. Reads the root app.js and styles.css plus a production
 * asset map, and writes rewritten copies (dist/app.js, dist/styles.css) whose
 * relative runtime URLs (./translations.json, ./data/*, ./assets/*, and the
 * font url() in styles.css) are replaced with absolute
 * https://images.assettype.com/prajavani/ URLs.
 *
 * The map cannot be populated with real values yet: Assettype assigns each
 * upload its own generated suffix (date/hash segments) that is unknown until
 * upload time. This tool therefore refuses to run on missing or placeholder
 * entries — it never fabricates URLs.
 *
 * Node standard library only. No dependencies.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://images.assettype.com/prajavani/';
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MAP_PATH = path.join(__dirname, 'asset-map.json');
const DEFAULT_OUT_DIR = path.join(__dirname, 'dist');

// Map keys that must always carry a real suffix, whether or not the current
// root app.js/styles.css happen to reference them (the CMS entry point and the
// hosted copies need them regardless).
const REQUIRED_KEYS = [
  'app.js',
  'styles.css',
  'translations.json',
  'data/observations.json',
  'data/search-index.json',
  'data/search-aliases.json',
  'data/search-transliterations.json',
  'data/categories.json',
  'data/metadata.json',
  'fonts/PrajavaniTextRegular.woff2',
];

const USAGE = `Usage:
  node cms-migration/generate_hosted_bundle.js [map-path] [out-dir]

Arguments (both optional):
  map-path   production asset map JSON (default: cms-migration/asset-map.json)
  out-dir    output directory          (default: cms-migration/dist)

Map schema (JSON object with a "suffixes" object):
  { "suffixes": {
      "app.js": "<suffix>",
      "styles.css": "<suffix>",
      "translations.json": "<suffix>",
      "data/observations.json": "<suffix>",        ... six runtime JSON files ...,
      "fonts/PrajavaniTextRegular.woff2": "<suffix>",
      "assets/<file>": "<suffix>",                 ... every asset referenced by app.js/styles.css ...
  } }

Each value is the part of the hosted URL after ${BASE_URL} (a full https://
URL is also accepted). Values containing placeholders such as <generated-suffix>
or <cms-entry-path> are rejected.

Behavior:
  1. Reads the root app.js and styles.css.
  2. Validates the map: real entries are required for app.js, styles.css,
     translations.json, the six data/*.json runtime files, the Prajavani font,
     and every ./assets/ path referenced by app.js/styles.css.
  3. Rewrites ./translations.json, ./data/*, and ./assets/* in app.js, and the
     font url() in styles.css, to absolute Assettype URLs, preserving query
     strings (?v=...) exactly.
  4. Writes out-dir/app.js and out-dir/styles.css, creating out-dir if needed.

Exits nonzero on any validation error. Real Assettype-generated suffixes are
required — URLs are never fabricated.`;

// Matches every literal ./assets/... , ./data/... , ./fonts/... or
// ./translations.json reference including any ?query suffix.
const REF_RE = /\.\/(?:assets|data|fonts|translations\.json)([^`"'(),;\s]*)/g;

function fail(message) {
  console.error(`[generate_hosted_bundle] ${message}`);
  process.exit(1);
}

function readRequired(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    fail(`cannot read ${file}: ${e.message}`);
    return null;
  }
}

function scanReferences(source) {
  const found = [];
  let m;
  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(source)) !== null) found.push(m[0]);
  return [...new Set(found)];
}

// ./assets/tomato-thumb-real.png?v=2  ->  assets/tomato-thumb-real.png
function keyOf(ref) {
  return ref.slice(2).replace(/\?.*$/, '');
}

function loadSuffixes(mapPath) {
  const raw = readRequired(mapPath);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    fail(`map ${mapPath} is not valid JSON: ${e.message}`);
  }
  const suffixes = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed.suffixes : null;
  if (!suffixes || typeof suffixes !== 'object' || Array.isArray(suffixes)) {
    fail(`map ${mapPath} must be a JSON object with a "suffixes" object (see asset-map.example.json).`);
  }
  return suffixes;
}

function isPlaceholder(value) {
  if (typeof value !== 'string') return true;
  const v = value.trim();
  if (v === '') return true;
  if (/[<>]/.test(v)) return true; // <generated-suffix>, <cms-entry-path>, ...
  if (/^YOUR-/i.test(v)) return true;
  return false;
}

function validateMap(suffixes, referencedKeys) {
  const errors = [];
  const missing = new Set();
  for (const key of REQUIRED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(suffixes, key)) missing.add(key);
  }
  for (const key of referencedKeys) {
    if (!Object.prototype.hasOwnProperty.call(suffixes, key)) missing.add(key);
  }
  for (const key of [...missing].sort()) errors.push(`missing map entry: ${key}`);
  for (const [key, value] of Object.entries(suffixes)) {
    if (isPlaceholder(value)) errors.push(`placeholder map entry: ${key} = ${JSON.stringify(value)}`);
  }
  return errors;
}

// Map value is the suffix after /prajavani/; a full https:// URL also works.
function resolveUrl(value) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return BASE_URL + v.replace(/^\/+/, '');
}

function buildReplacements(refs, suffixes) {
  const replacements = {};
  for (const ref of refs) {
    const key = keyOf(ref);
    const query = ref.includes('?') ? ref.slice(ref.indexOf('?')) : '';
    replacements[ref] = resolveUrl(suffixes[key]) + query;
  }
  return replacements;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewrite(source, replacements) {
  // Longest literals first so query-suffixed variants win over bare paths.
  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  const re = new RegExp(keys.map(escapeRegExp).join('|'), 'g');
  let count = 0;
  const out = source.replace(re, (m) => {
    count += 1;
    return replacements[m];
  });
  return { out, count };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    console.log(USAGE);
    process.exit(0);
  }
  const mapPath = args[0] ? path.resolve(args[0]) : DEFAULT_MAP_PATH;
  const outDir = args[1] ? path.resolve(args[1]) : DEFAULT_OUT_DIR;

  const appJs = readRequired(path.join(REPO_ROOT, 'app.js'));
  const css = readRequired(path.join(REPO_ROOT, 'styles.css'));
  const suffixes = loadSuffixes(mapPath);

  const appRefs = scanReferences(appJs);
  const cssRefs = scanReferences(css);
  const referencedKeys = [...new Set([...appRefs, ...cssRefs].map(keyOf))];

  const errors = validateMap(suffixes, referencedKeys);
  if (errors.length) {
    console.error(`[generate_hosted_bundle] production map validation failed: ${mapPath}`);
    for (const e of errors) console.error(`  ${e}`);
    console.error('Real Assettype-generated suffixes are required for every key above. URLs are never fabricated.');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const appResult = rewrite(appJs, buildReplacements(appRefs, suffixes));
  const cssResult = rewrite(css, buildReplacements(cssRefs, suffixes));

  fs.writeFileSync(path.join(outDir, 'app.js'), appResult.out, 'utf8');
  fs.writeFileSync(path.join(outDir, 'styles.css'), cssResult.out, 'utf8');

  const leftover = [...(appResult.out.match(/\.\/(?:assets|data|fonts|translations\.json)/g) || []),
    ...(cssResult.out.match(/\.\/(?:assets|data|fonts|translations\.json)/g) || [])];
  if (leftover.length) {
    console.error(`[generate_hosted_bundle] warning: ${leftover.length} relative URL reference(s) remain in dist output`);
  }
  console.log(`[generate_hosted_bundle] OK: wrote ${path.join(outDir, 'app.js')} (${appResult.count} URL refs rewritten) and ${path.join(outDir, 'styles.css')} (${cssResult.count} URL refs rewritten)`);
}

main();
