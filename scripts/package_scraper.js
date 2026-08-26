"use strict";

// Rebuilds the standalone scraper folder and ZIP from this repository.
// The repository is the source of truth; credentials and runtime installs are
// intentionally excluded from the distributable package.
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.resolve(ROOT_DIR, "..", "Commodity Scraper Package");
const ZIP_FILE = path.resolve(ROOT_DIR, "..", "Commodity Scraper Package.zip");

const ROOT_FILES = [
  ".env.example",
  "Launch Commodity Scraper.cmd",
  "Launch Commodity Scraper.vbs",
  "package-lock.json",
  "package.json",
  "SCRAPER_README.md",
  "scrape_krama.js",
  "translations.json",
];
const SCRIPT_FILES = ["market_aliases.js", "observation_codec.js", "package_scraper.js", "publish_bundle.js", "publish_pages.js", "scraper_run_log.js"];
const GENERATED_ROOT_FILES = new Set(ROOT_FILES);
const GOOGLE_APPS_SCRIPT_FILES = ["Code.gs"];
const GENERATED_DIRS = ["data", "scripts", "google-apps-script"];

function fail(message) {
  throw new Error(message);
}

function copyFile(source, destination) {
  if (!fs.existsSync(source)) fail(`Required file is missing: ${source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) copyFile(from, to);
  }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
}

function jsonFiles(rootDir) {
  const files = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) files.push(entry.name);
  }
  const dataDir = path.join(rootDir, "data");
  for (const entry of fs.readdirSync(dataDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) files.push(path.join("data", entry.name));
  }
  return files.sort();
}

function cleanGeneratedOutput() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  // The output directory is a distributable package: credentials must never
  // remain in either the folder or the ZIP. Unknown non-secret local files
  // are preserved.
  fs.rmSync(path.join(OUTPUT_DIR, ".env"), { force: true });
  for (const file of GENERATED_ROOT_FILES) fs.rmSync(path.join(OUTPUT_DIR, file), { force: true });
  for (const directory of GENERATED_DIRS) fs.rmSync(path.join(OUTPUT_DIR, directory), { recursive: true, force: true });
}

function buildStagingDirectory() {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "commodity-scraper-package-"));
  for (const file of ROOT_FILES) copyFile(path.join(ROOT_DIR, file), path.join(staging, file));

  const dataSource = path.join(ROOT_DIR, "data");
  const dataTarget = path.join(staging, "data");
  fs.mkdirSync(dataTarget, { recursive: true });
  for (const entry of fs.readdirSync(dataSource, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) copyFile(path.join(dataSource, entry.name), path.join(dataTarget, entry.name));
  }

  const scriptsTarget = path.join(staging, "scripts");
  fs.mkdirSync(scriptsTarget, { recursive: true });
  for (const file of SCRIPT_FILES) copyFile(path.join(ROOT_DIR, "scripts", file), path.join(scriptsTarget, file));
  const appsTarget = path.join(staging, "google-apps-script");
  fs.mkdirSync(appsTarget, { recursive: true });
  for (const file of GOOGLE_APPS_SCRIPT_FILES) copyFile(path.join(ROOT_DIR, "google-apps-script", file), path.join(appsTarget, file));
  return staging;
}

function createZip(staging) {
  if (process.platform !== "win32") fail("Scraper package ZIP creation currently requires Windows PowerShell.");
  const quote = (value) => `'${value.replace(/'/g, "''")}'`;
  const command = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `if (Test-Path -LiteralPath ${quote(ZIP_FILE)}) { Remove-Item -LiteralPath ${quote(ZIP_FILE)} -Force }`,
    `[System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(staging)}, ${quote(ZIP_FILE)})`,
  ].join("; ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { stdio: "inherit" });
  if (result.status !== 0) fail(`Could not create ZIP archive (exit code ${result.status}).`);
}

function verifyJsonParity(packageDir) {
  const files = jsonFiles(ROOT_DIR);
  for (const relative of files) {
    const source = path.join(ROOT_DIR, relative);
    const packaged = path.join(packageDir, relative);
    if (!fs.existsSync(packaged)) fail(`Package is missing JSON file: ${relative}`);
    if (sha256(source) !== sha256(packaged)) fail(`JSON differs between repo and package: ${relative}`);
  }
  return files.length;
}

function main() {
  if (path.resolve(ROOT_DIR) === path.resolve(OUTPUT_DIR)) {
    fail("Run npm run package:scraper from the main repository, not from the standalone package.");
  }
  const staging = buildStagingDirectory();
  try {
    cleanGeneratedOutput();
    copyTree(staging, OUTPUT_DIR);
    const jsonCount = verifyJsonParity(OUTPUT_DIR);
    createZip(staging);
    console.log(`[package] wrote ${OUTPUT_DIR}`);
    console.log(`[package] wrote ${ZIP_FILE}`);
    console.log(`[package] verified ${jsonCount} JSON files byte-for-byte.`);
    console.log("[package] .env, node_modules, SQLite files, and logs were excluded.");
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`[package] ${error.message}`);
  process.exitCode = 1;
}
