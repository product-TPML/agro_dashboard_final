"use strict";

// JSON-only six-source scraper for the compact dashboard snapshot.
// This intentionally does not write data/agro_dashboard.db. Running npm run build:data
// afterwards will export the older SQLite snapshot over these JSON files.

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { spawn } = require("child_process");
const { decodeObservations, encodeObservations } = require("./scripts/observation_codec");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const INDIA_TIME_ZONE = "Asia/Kolkata";
const MAX_RETRIES = 3;
const TIMEOUT_NAV = 90000;
const TIMEOUT_CLICK = 30000;
const SOURCE_IDS = ["krama", "necc_egg", "csb_silk", "rubber_board", "spices_board", "coffee_board"];
const OBSERVATION_COLUMNS = [
  "rowKey", "reportDate", "sourceId", "commodity", "perishability", "category", "market",
  "variety", "grade", "arrivals", "unit", "minPrice", "maxPrice", "modalPrice",
  "canonicalPrice", "canonicalPriceUnit", "priceDisplayUnit",
];
const SOURCE_DISPLAY_UNITS = {
  necc_egg: "100 eggs",
  csb_silk: "Kg",
  spices_board: "per KG",
  coffee_board: "50 Kg",
  rubber_board: "per 100 kg",
};
const RUBBER_GRADES = [
  { gradeId: "7", variety: "RSS4" },
  { gradeId: "9", variety: "RSS5" },
  { gradeId: "10", variety: "ISNR20" },
  { gradeId: "11", variety: "Latex (60%)" },
];
const COFFEE_VARIETIES = ["Arabica Parchment", "Arabica Cherry", "Robusta Parchment", "Robusta Cherry"];
const TARGET_NECC_MARKETS = new Set(["BENGALURU", "MYSURU", "HOSAPETE"]);
const TARGET_RUBBER_MARKETS = new Set(["KOTTAYAM", "KOCHI"]);
const RAW_RUBBER_MARKETS = new Set(["Kottayam", "Kochi"]);
const KNOWN_CANONICAL_MARKETS = new Set(["DEVADURGA"]);
const TARGET_SPICES_MARKET = "Cochin";
const SPICES_EXCLUDED = new Set(["Pepper"]);
const CATEGORY_DEFINITIONS = [
  ["fruits", "Fruits"], ["vegetables", "Vegetables"], ["nuts_and_seeds", "Nuts and Seeds"],
  ["grains_and_pulses", "Grains and Pulses"], ["spices", "Spices"],
  ["livestock_and_poultry", "Livestock and Poultry"], ["miscellaneous", "Miscellaneous"],
];

const URLS = {
  krama: "https://krama.karnataka.gov.in/reports/Main_Rep",
  necc: "https://www.e2necc.com/home/eggprice",
  csb: "https://csb.gov.in/Statistics/silk-prices",
  rubberHome: "https://rubberboard.gov.in/public",
  rubberReport: "https://rubberboard.gov.in/indianPrices",
  rubberArchive: "https://rubberboard.gov.in/archives",
  spices: "https://www.indianspices.com/marketing/price/domestic/current-market-price.html",
  coffeeArchive: "https://coffeeboard.gov.in/Market_Info_Archives.aspx",
};

let logger = null;
let activeRunId = null;

function indiaParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  return Object.fromEntries(formatter.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
}

function indiaTimestamp(date = new Date()) {
  const p = indiaParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+05:30`;
}

function timestampSlug(date = new Date()) {
  return indiaTimestamp(date).replace(/[:+]/g, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function setupLogging() {
  ensureDir(LOGS_DIR);
  const logPath = path.join(LOGS_DIR, `scraper_${timestampSlug()}.jsonl`);
  logger = { logPath, stream: fs.createWriteStream(logPath, { flags: "a" }) };
  return logPath;
}

function closeLogging() {
  if (logger && logger.stream) logger.stream.end();
}

function log(level, event, details = {}) {
  const entry = { timestamp: new Date().toISOString(), level, event, runId: activeRunId || details.runId || null, ...details };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line); else console.log(line);
  if (logger && logger.stream) logger.stream.write(`${line}\n`);
}

function parseArgs(argv) {
  const options = { date: null, sourceId: "krama", uiMode: argv.length === 0, pauseOnExit: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") { printHelp(); process.exit(0); }
    else if (arg === "--date") { options.date = argv[++i]; }
    else if (arg.startsWith("--date=")) options.date = arg.slice(7);
    else if (arg === "--source") options.sourceId = argv[++i];
    else if (arg.startsWith("--source=")) options.sourceId = arg.slice(9);
    else if (arg === "--ui") options.uiMode = true;
    else if (arg === "--no-ui") options.uiMode = false;
    else if (arg === "--no-pause") options.pauseOnExit = false;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (![...SOURCE_IDS, "all"].includes(options.sourceId)) throw new Error(`Unknown source: ${options.sourceId}`);
  return options;
}

function printHelp() {
  console.log(`Commodity dashboard JSON scraper

Usage:
  node scrape_krama.js [options]

Options:
  --date DD/MM/YYYY  Selected date for date-aware sources; default is today in IST.
  --source ID        krama | necc_egg | csb_silk | spices_board | coffee_board | rubber_board | all
  --ui               Start the local source/date picker and /run endpoint.
  --no-ui             Run directly for automation.
  --no-pause          Kept for launcher compatibility; never pauses CLI runs.
  --help, -h          Show this help.

Notes:
  - The scraper publishes JSON only and never updates data/agro_dashboard.db.
  - npm run build:data reads the older SQLite snapshot and can overwrite scraper JSON output.
  - Rows with unknown commodity, market, variety, or grade taxonomy are skipped and listed in the run result and log.
  - If all scraped rows are skipped, the existing snapshot is retained; other validation or source failures still retain it.
  - Logs are written to the repo logs directory.
`);
}

function reportDateStrings(input) {
  if (input) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
    if (!match) throw new Error(`Invalid --date value "${input}". Expected DD/MM/YYYY.`);
    assertIsoDate(`${match[3]}-${match[2]}-${match[1]}`);
    return { dateStr: input, fileDateStr: `${match[3]}-${match[2]}-${match[1]}` };
  }
  const p = indiaParts();
  return { dateStr: `${p.day}/${p.month}/${p.year}`, fileDateStr: `${p.year}-${p.month}-${p.day}` };
}

function assertIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ISO date: ${value}`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ISO date: ${value}`);
}

function normalizeUiDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) throw new Error("Invalid date. Select a date from the picker.");
  return `${match[3]}/${match[2]}/${match[1]}`;
}

async function retry(fn, source, operation, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    log("info", "retry_attempt", { source, operation, attempt, retries });
    try { return await fn(); } catch (error) {
      log("warn", "retry_failure", { source, operation, attempt, error: error.message });
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error(`Retry loop exited for ${operation}`);
}

function request(requestUrl, method = "GET", body = null, headers = {}, binary = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(requestUrl);
    const transport = parsed.protocol === "http:" ? http : https;
    const payload = body === null ? null : (typeof body === "string" ? body : new URLSearchParams(body).toString());
    const requestHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5", ...headers,
    };
    if (payload !== null) {
      requestHeaders["Content-Type"] = requestHeaders["Content-Type"] || "application/x-www-form-urlencoded";
      requestHeaders["Content-Length"] = Buffer.byteLength(payload);
    }
    const req = transport.request({ hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "http:" ? 80 : 443),
      path: parsed.pathname + parsed.search, method, timeout: method === "POST" ? 60000 : 30000, headers: requestHeaders }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: binary ? buffer : buffer.toString("utf8") });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("HTTP timeout")); });
    if (payload !== null) req.write(payload);
    req.end();
  });
}

const httpGet = (url, headers = {}, binary = false) => request(url, "GET", null, headers, binary);
const httpPost = (url, body, headers = {}, binary = false) => request(url, "POST", body, headers, binary);

function decodeHtmlText(value) {
  return String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseLooseNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "-") return null;
  const parsed = Number(String(value).replace(/,/g, "").replace(/[₹$]/g, "").trim());
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value: ${value}`);
  return parsed;
}

function buildRowKey(parts) {
  return parts.map((value) => String(value ?? "").trim().toLowerCase()).join("|");
}

function normalizeMarket(sourceId, value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (sourceId === "necc_egg") return ({ "Bengaluru (CC)": "BENGALURU", Mysuru: "MYSURU", Hospet: "HOSAPETE" }[text] || text.toUpperCase());
  if (sourceId === "krama" && text.toUpperCase() === "DEVDURGA") return "DEVADURGA";
  if (sourceId === "csb_silk") {
    if (text === "Ramanagaram") return "RAMANAGARA";
    if (text === "Shidlaghatta") return "SIDDLAGHATTA";
  }
  return text.toUpperCase();
}

function parseDmyDate(value, separator = "-") {
  const match = new RegExp(`^(\\d{2})\\${separator}(\\d{2})\\${separator}(\\d{4})$`).exec(String(value || "").trim());
  if (!match) throw new Error(`Invalid date: ${value}`);
  const iso = `${match[3]}-${match[2]}-${match[1]}`; assertIsoDate(iso); return iso;
}

function parseAbbrevMonthDate(value) {
  const match = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(String(value || "").trim());
  if (!match) throw new Error(`Invalid abbreviated month date: ${value}`);
  const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const month = months[match[2][0].toUpperCase() + match[2].slice(1).toLowerCase()];
  if (!month) throw new Error(`Invalid month in date: ${value}`);
  const iso = `${match[3]}-${month}-${match[1]}`; assertIsoDate(iso); return iso;
}

function parseDottedDate(value) { return parseDmyDate(value, "."); }

function hiddenFormFields(html) {
  const form = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi)) form[m[1]] = m[2];
  for (const m of html.matchAll(/<textarea[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/gi)) form[m[1]] = m[2];
  return form;
}

function cookieHeader(value, prefixes = []) {
  return (Array.isArray(value) ? value : (value ? [value] : []))
    .map((item) => String(item).split(";")[0].trim()).filter(Boolean)
    .filter((item) => !prefixes.length || prefixes.some((prefix) => item.startsWith(prefix))).join("; ");
}

function parseKramaHtml(html) {
  const headingMatch = html.match(/id="_ctl0_MainContent_Lbl_Heading"[^>]*>([^<]*)/i);
  const names = [...html.matchAll(/<span[^>]*style="[^"]*color:Red[^"]*"[^>]*>\s*COMMODITY:\s*([^<]+)\s*<\/span>/gi)].map((m) => decodeHtmlText(m[1]));
  const tables = [...html.matchAll(/<table[^>]*border-collapse:collapse[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => m[1]);
  const commodities = [];
  names.forEach((name, index) => {
    const rows = [...(tables[index] || "").matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
    if (rows.length < 2) return;
    const headers = [...rows[0].matchAll(/<th[^>]*>([^<]*)<\/th>/gi)].map((m) => decodeHtmlText(m[1]));
    if (!headers.length) return;
    const data = rows.slice(1).map((rowHtml) => {
      const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decodeHtmlText(m[1]));
      if (cells.length === 1 && cells[0] === "No Data Found For The Commodity") return null;
      return Object.fromEntries(headers.map((header, i) => [header, cells[i] || ""]));
    }).filter(Boolean);
    if (data.length) commodities.push({ name, data });
  });
  return { heading: headingMatch ? decodeHtmlText(headingMatch[1]) : "", commodities };
}

function normalizeKramaVariety(value) {
  const text = String(value || "").trim();
  if (text.replace(/\s+/g, " ").toLowerCase() === "iisort without husk") return "IISort  without Husk";
  return text;
}

function normalizeKrama(data, reportDate) {
  return data.commodities.flatMap((commodity) => commodity.data.map((row) => {
    const market = normalizeMarket("krama", row.Market);
    const variety = normalizeKramaVariety(row.Variety);
    return observation({
      rowKey: buildRowKey([reportDate, "krama", commodity.name, market, variety, row.Grade]),
      reportDate, sourceId: "krama", commodity: commodity.name, perishability: null, category: null,
      market, variety, grade: String(row.Grade || "").trim(),
      arrivals: parseLooseNumber(row.Arrivals), unit: String(row.Units || "").trim(),
      minPrice: parseLooseNumber(row["Min (Rs.)"]), maxPrice: parseLooseNumber(row["Max (Rs.)"]), modalPrice: parseLooseNumber(row["Modal (Rs.)"]),
      canonicalPrice: null, canonicalPriceUnit: null, priceDisplayUnit: null,
    });
  }));
}

async function scrapeKramaHttp(dateStr) {
  const first = await retry(() => httpGet(URLS.krama), "krama", "GET Main_Rep");
  if (first.status !== 200) throw new Error(`Krama GET returned status ${first.status}`);
  const cookies = cookieHeader(first.headers["set-cookie"]);
  const vs = hiddenFormFields(first.body);
  if (!vs.__VIEWSTATE || !vs.__EVENTVALIDATION || !vs.__VIEWSTATEGENERATOR) throw new Error("Krama ViewState fields missing");
  const firstPost = await retry(() => httpPost(URLS.krama, {
    __EVENTTARGET: "", __EVENTARGUMENT: "", __LASTFOCUS: "", __VIEWSTATE: vs.__VIEWSTATE,
    __VIEWSTATEGENERATOR: vs.__VIEWSTATEGENERATOR, __EVENTVALIDATION: vs.__EVENTVALIDATION,
    "_ctl0:MainContent:TxtDate": dateStr, "_ctl0:MainContent:RadBtnSel": "C", "_ctl0:MainContent:BtnRep": "View Report",
  }, { Cookie: cookies, Referer: URLS.krama }), "krama", "POST Main_Rep commodity selection");
  if (firstPost.status !== 200) throw new Error(`Krama selection POST returned status ${firstPost.status}`);
  const checkbox = firstPost.body.match(/<input[^>]*type="checkbox"[^>]*id="([^"]*)"[^>]*name="([^"]*)"[^>]*>/i);
  if (!checkbox) throw new Error("Krama commodity checkbox missing");
  const vs2 = hiddenFormFields(firstPost.body);
  const names = checkbox[2].replace(/^_ctl0:MainContent:/, "").split(",").map((v) => v.trim()).filter(Boolean);
  const form = { __EVENTTARGET: "", __EVENTARGUMENT: "", __LASTFOCUS: "", __VIEWSTATE: vs2.__VIEWSTATE,
    __VIEWSTATEGENERATOR: vs2.__VIEWSTATEGENERATOR, __EVENTVALIDATION: vs2.__EVENTVALIDATION,
    "_ctl0:MainContent:BtnRep": "View Report" };
  form[`_ctl0:MainContent:${checkbox[2].replace(/^_ctl0:MainContent:/, "")}`] = "on";
  names.forEach((name) => { if (firstPost.body.includes(`name="_ctl0:MainContent:${name}"`)) form[`_ctl0:MainContent:${name}`] = "on"; });
  const second = await retry(() => httpPost("https://krama.karnataka.gov.in/reports/Commadity", form, { Cookie: cookies, Referer: URLS.krama }), "krama", "POST Commadity report");
  if (second.status !== 200) throw new Error(`Krama report POST returned status ${second.status}`);
  return parseKramaHtml(second.body);
}

function resolveKramaBrowserExecutable(chromium) {
  const candidates = [];
  if (process.env.KRAMA_BROWSER_PATH) candidates.push(process.env.KRAMA_BROWSER_PATH);
  try { candidates.push(chromium.executablePath()); } catch (_) { /* Playwright may not have a bundled browser. */ }

  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles || "";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "";
  candidates.push(
    path.join(localAppData, "ms-playwright", "chromium-1234", "chrome-win64", "chrome.exe"),
    path.join(localAppData, "ms-playwright", "chromium-1223", "chrome-win64", "chrome.exe"),
    path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
  );
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

async function scrapeKramaBrowser(dateStr, headless) {
  const { chromium } = require("playwright");
  const executablePath = resolveKramaBrowserExecutable(chromium);
  const launchOptions = {
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled", ...(headless ? ["--disable-gpu"] : [])],
  };
  // Playwright 1.62 may look for a separate headless-shell executable. The
  // installed full Chromium/Edge executable supports both modes and is also
  // what the working sister scraper can use on this machine.
  if (executablePath) launchOptions.executablePath = executablePath;
  log("info", "krama_browser_launch", { headless, executablePath: executablePath || "playwright-default" });
  const browser = await chromium.launch(launchOptions);
  try {
    const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", viewport: { width: 1280, height: 1024 } });
    const page = await context.newPage();
    await retry(() => page.goto(URLS.krama, { waitUntil: "domcontentloaded", timeout: TIMEOUT_NAV }), "krama", "navigate Main_Rep");
    await page.waitForSelector("#_ctl0_MainContent_BtnRep", { timeout: TIMEOUT_CLICK });
    await page.evaluate((value) => { document.getElementById("_ctl0_MainContent_TxtDate").value = value; document.getElementById("_ctl0_MainContent_RadBtnSel_2").checked = true; }, dateStr);
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: TIMEOUT_NAV }), page.click("#_ctl0_MainContent_BtnRep")]);
    await page.waitForSelector('input[type="checkbox"]', { timeout: TIMEOUT_CLICK });
    // Use Playwright's locator action so the ASP.NET form receives the same
    // click/change event as the working sister scraper.
    await page.locator('input[type="checkbox"]').first().check();
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: TIMEOUT_NAV }), page.click("#_ctl0_MainContent_BtnRep")]);
    await page.waitForSelector('span[style*="color:Red"]', { timeout: TIMEOUT_NAV });
    // Extract the complete DOM and reuse the stable HTML parser. This avoids
    // a large page.evaluate() call that can close the Chromium 1234 page.
    return parseKramaHtml(await page.content());
  } finally { await browser.close(); }
}

async function scrapeKramaWithFallback(dateStr, methods = {}) {
  const attempts = [
    ["http", methods.http || (() => scrapeKramaHttp(dateStr))],
    ["playwright_headless", methods.headless || (() => scrapeKramaBrowser(dateStr, true))],
    ["playwright_headful", methods.headful || (() => scrapeKramaBrowser(dateStr, false))],
  ];
  const failures = [];
  for (const [method, fn] of attempts) {
    try {
      const data = await fn();
      if (!data || !Array.isArray(data.commodities) || !data.commodities.some((item) => item.data && item.data.length)) throw new Error("No Krama commodity rows returned");
      log("info", "krama_method_succeeded", { method });
      return data;
    } catch (error) { failures.push(`${method}: ${error.message}`); log("warn", "krama_method_failed", { method, error: error.message }); }
  }
  throw new Error(`All Krama methods failed: ${failures.join("; ")}`);
}

function parseNeccEggHtml(html, reportDate) {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(reportDate) || [];
  if (!year) throw new Error(`Invalid report date: ${reportDate}`);
  const header = html.match(/<tr[^>]*>\s*<th[^>]*>Name Of Zone \/ Day<\/th>([\s\S]*?)<\/tr>/i);
  if (!header) throw new Error("NECC day header missing");
  const headers = [...header[1].matchAll(/<th[^>]*>([^<]*)<\/th>/gi)].map((m) => m[1].trim());
  const column = headers.findIndex((value) => Number(value) === Number(day));
  if (column < 0) throw new Error(`NECC day ${day} missing`);
  const targets = new Set(["Bengaluru (CC)", "Mysuru", "Hospet"]);
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*align=["']center["'][^>]*>\s*<td[^>]*align=["']left["'][^>]*>([^<]+)<\/td>([\s\S]*?)<\/tr>/gi)) {
    if (!targets.has(match[1].trim())) continue;
    const cells = [...match[2].matchAll(/<td[^>]*>([^<]*)<\/td>/gi)].map((m) => m[1].trim());
    const price = parseLooseNumber(cells[column]); if (price === null) continue;
    const market = normalizeMarket("necc_egg", match[1]);
    rows.push(observation({ rowKey: buildRowKey([reportDate, "necc_egg", "Egg", market]), reportDate, sourceId: "necc_egg", commodity: "Egg", perishability: "perishable", category: "livestock_and_poultry", market, variety: "", grade: "", arrivals: null, unit: "", minPrice: null, maxPrice: null, modalPrice: null, canonicalPrice: price, canonicalPriceUnit: "100 eggs", priceDisplayUnit: "100 eggs" }));
  }
  return rows;
}

function parseCsbSilkHtml(html) {
  const rows = [];
  const block = /<td headers="view-title-table-column"[^>]*>([\s\S]*?)<\/td>\s*<td headers="view-view-table-column"[^>]*>[\s\S]*?<table class="table table-bordered table-striped">([\s\S]*?)<\/table>/gi;
  for (const match of html.matchAll(block)) {
    const variety = decodeHtmlText(match[1]);
    const tbody = match[2].match(/<tbody>([\s\S]*?)<\/tbody>/i); if (!tbody) continue;
    for (const row of tbody[1].matchAll(/<tr>\s*(?:<td[^>]*>([\s\S]*?)<\/td>\s*){6}<\/tr>/gi)) {
      const cells = [...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decodeHtmlText(m[1]));
      rows.push({ variety, market: cells[0], date: cells[1], min: cells[2], max: cells[3], average: cells[4], quantity: cells[5] });
    }
  }
  return rows;
}

function parseSpicesBoardHtml(html) {
  const body = html.match(/<div class="tabstable marketprice">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!body) throw new Error("Spices Board market table missing");
  return [...body[1].matchAll(/<tr>\s*(?:<td[^>]*>([\s\S]*?)<\/td>\s*){9}<\/tr>/gi)].map((match) => {
    const cells = [...match[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decodeHtmlText(m[1]));
    return { date: cells[0], commodity: cells[1], market: cells[2], state: cells[3], grade: cells[4], source: cells[5], min: cells[6], max: cells[7], average: cells[8] };
  });
}

function filterSpicesBoardRows(rows) {
  return rows.filter((row) => row.state === "KERALA" && row.market === TARGET_SPICES_MARKET && !SPICES_EXCLUDED.has(row.commodity));
}

function parseCoffeeBoardRawPriceText(text) {
  const match = String(text || "").match(/Raw Coffee Price\s*\(Karnataka\)\s+as on\s+(\d{2}\.\d{2}\.\d{4})[\s\S]*?(?:₹|â‚¹|Rs\.?)\s*\/\s*50\s*Kg\s*([\s\S]*?)(?:\n\s*\n|Export update:|$)/i);
  if (!match) throw new Error("Coffee Board raw coffee price section missing");
  const ranges = [...match[2].replace(/\s+/g, " ").matchAll(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g)];
  if (ranges.length !== COFFEE_VARIETIES.length) throw new Error(`Expected ${COFFEE_VARIETIES.length} coffee price ranges, found ${ranges.length}`);
  return ranges.map((range, i) => ({ reportDate: parseDottedDate(match[1]), variety: COFFEE_VARIETIES[i], minPrice: parseLooseNumber(range[1]), maxPrice: parseLooseNumber(range[2]) }));
}

function rubberVariety(value) {
  const normalized = decodeHtmlText(value).replace(/\s+/g, " ").trim().toUpperCase();
  if (normalized === "RSS4") return "RSS4";
  if (normalized === "RSS5") return "RSS5";
  if (normalized === "ISNR20") return "ISNR20";
  if (normalized === "LATEX(60%)" || normalized === "LATEX (60%)") return "Latex (60%)";
  return null;
}

function parseRubberPrice(value) {
  const text = decodeHtmlText(value).replace(/\s+/g, " ").trim();
  if (!text || /^(?:-|na|n\/a|holiday|price not available)$/i.test(text)) return null;
  if (!/^[₹$]?\s*[-+]?\d[\d,]*(?:\.\d+)?$/.test(text)) return null;
  return parseLooseNumber(text);
}

function parseRubberBoardDailyHtml(html, expectedVariety) {
  const rows = [];
  for (const block of html.matchAll(/<div[^>]*id="(Kottayam|Kochi|Agartala)"[^>]*>([\s\S]*?)(?=<div[^>]*id=|$)/gi)) {
    if (!RAW_RUBBER_MARKETS.has(block[1])) continue;
    const tbody = block[2].match(/<tbody>([\s\S]*?)<\/tbody>/i); if (!tbody) continue;
    for (const tr of tbody[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decodeHtmlText(m[1]));
      if (cells.length < 2 || !/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(cells[0])) continue;
      const price = parseRubberPrice(cells[1]); if (price === null) continue;
      rows.push({ market: block[1], reportDate: parseDmyDate(cells[0], cells[0].includes("/") ? "/" : "-"), modalPrice: price, variety: expectedVariety });
    }
  }
  return rows;
}

function parseRubberBoardArchiveHtml(html, reportDate) {
  const rows = [];
  for (const table of html.matchAll(/<table\b[^>]*class=["'][^"']*table-bordered[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi)) {
    for (const tr of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => decodeHtmlText(m[1]));
      if (cells.length < 5 || !/^\d+$/.test(cells[0])) continue;
      const market = cells[1].replace(/\s+/g, " ").trim();
      const variety = rubberVariety(cells[2]);
      const price = parseRubberPrice(cells[3]);
      if (!TARGET_RUBBER_MARKETS.has(market.toUpperCase()) || !variety || price === null || price <= 0) continue;
      rows.push({ market, reportDate, modalPrice: price, variety });
    }
  }
  return rows;
}

async function scrapeSource(sourceId, dateInput) {
  if (sourceId === "krama") {
    const { dateStr, fileDateStr } = reportDateStrings(dateInput);
    const observations = normalizeKrama(await scrapeKramaWithFallback(dateStr), fileDateStr);
    return { sourceId, observations, commodityCount: new Set(observations.map((row) => row.commodity)).size };
  }
  if (sourceId === "necc_egg") {
    const { fileDateStr } = reportDateStrings(dateInput); const [year, month] = fileDateStr.split("-");
    const first = await retry(() => httpGet(URLS.necc), sourceId, "GET daily egg prices");
    if (first.status !== 200) throw new Error(`NECC GET returned status ${first.status}`);
    const report = await retry(() => httpPost(URLS.necc, { ddlMonth: month, ddlYear: year, rblReportType: "DailyReport", btnReport: "Get Sheet" }, { Cookie: cookieHeader(first.headers["set-cookie"]), Referer: URLS.necc }), sourceId, "POST daily egg prices");
    if (report.status !== 200) throw new Error(`NECC POST returned status ${report.status}`);
    const observations = parseNeccEggHtml(report.body, fileDateStr); return { sourceId, observations, commodityCount: observations.length ? 1 : 0 };
  }
  if (sourceId === "csb_silk") {
    const response = await retry(() => httpGet(URLS.csb), sourceId, "GET silk prices");
    if (response.status !== 200) throw new Error(`CSB GET returned status ${response.status}`);
    const rows = parseCsbSilkHtml(response.body); const observations = rows.map((row) => { const reportDate = parseDmyDate(row.date, "-"); const market = normalizeMarket(sourceId, row.market); return observation({ rowKey: buildRowKey([reportDate, sourceId, "Silk", market, row.variety, ""]), reportDate, sourceId, commodity: "Silk", perishability: "non-perishable", category: "miscellaneous", market, variety: row.variety, grade: "", arrivals: parseLooseNumber(row.quantity), unit: "Quintal", minPrice: parseLooseNumber(row.min), maxPrice: parseLooseNumber(row.max), modalPrice: parseLooseNumber(row.average), canonicalPrice: null, canonicalPriceUnit: null, priceDisplayUnit: "Kg" }); });
    return { sourceId, observations, commodityCount: observations.length ? 1 : 0 };
  }
  if (sourceId === "spices_board") {
    const { fileDateStr } = reportDateStrings(dateInput); const url = `${URLS.spices}?${new URLSearchParams({ filterState: "KERALA", dateFrom: fileDateStr, dateTo: fileDateStr })}`;
    const response = await retry(() => httpGet(url), sourceId, "GET Kerala spices prices"); if (response.status !== 200) throw new Error(`Spices GET returned status ${response.status}`);
    const rows = filterSpicesBoardRows(parseSpicesBoardHtml(response.body));
    const observations = rows.map((row) => { const price = parseLooseNumber(row.average); if (price === null) return null; const grade = row.grade === "-" ? "" : row.grade; const reportDate = parseAbbrevMonthDate(row.date); return observation({ rowKey: buildRowKey([reportDate, sourceId, row.commodity, TARGET_SPICES_MARKET, "", grade]), reportDate, sourceId, commodity: row.commodity, perishability: "non-perishable", category: null, market: TARGET_SPICES_MARKET, variety: "", grade, arrivals: null, unit: "", minPrice: null, maxPrice: null, modalPrice: null, canonicalPrice: price, canonicalPriceUnit: "per KG", priceDisplayUnit: "per KG" }); }).filter(Boolean);
    return { sourceId, observations, commodityCount: new Set(observations.map((row) => row.commodity)).size };
  }
  if (sourceId === "coffee_board") {
    const { fileDateStr } = reportDateStrings(dateInput); const buffer = await retry(() => downloadCoffeePdf(fileDateStr), sourceId, "download archive PDF"); const text = await parsePdfText(buffer); const rows = parseCoffeeBoardRawPriceText(text);
    const observations = rows.map((row) => observation({ rowKey: buildRowKey([row.reportDate, sourceId, "Coffee", "Karnataka", row.variety, ""]), reportDate: row.reportDate, sourceId, commodity: "Coffee", perishability: "non-perishable", category: "miscellaneous", market: "Karnataka", variety: row.variety, grade: "", arrivals: null, unit: "50 Kg", minPrice: row.minPrice, maxPrice: row.maxPrice, modalPrice: null, canonicalPrice: null, canonicalPriceUnit: null, priceDisplayUnit: "50 Kg" }));
    return { sourceId, observations, commodityCount: observations.length ? 1 : 0 };
  }
  if (sourceId === "rubber_board") {
    const { dateStr, fileDateStr } = reportDateStrings(dateInput);
    const first = await retry(() => httpGet(URLS.rubberHome), sourceId, "GET rubber public home");
    if (first.status !== 200) throw new Error(`Rubber GET returned status ${first.status}`);
    const cookies = cookieHeader(first.headers["set-cookie"]);
    const rows = [];
    let dailyError = null;
    try {
      for (const grade of RUBBER_GRADES) {
        const response = await retry(() => httpPost(URLS.rubberReport, {
          txtCategory: "day", searchFlag: "day", type: "indian", txtFromDate: dateStr, txtToDate: dateStr, grade: grade.gradeId,
        }, { Cookie: cookies, Referer: URLS.rubberHome }), sourceId, `POST rubber daily ${grade.variety}`);
        if (response.status !== 200) throw new Error(`Rubber daily POST returned status ${response.status}`);
        rows.push(...parseRubberBoardDailyHtml(response.body, grade.variety).filter((row) => row.reportDate === fileDateStr));
      }
    } catch (error) {
      dailyError = error;
      log("warn", "rubber_daily_failed", { source: sourceId, error: error.message });
    }

    if (!rows.length) {
      log("info", "rubber_archive_fallback", { source: sourceId, requestedDate: fileDateStr });
      const archive = await retry(() => httpPost(URLS.rubberArchive, { id: fileDateStr, type: "price" }, { Cookie: cookies, Referer: URLS.rubberHome }), sourceId, "POST rubber archive date");
      if (archive.status !== 200) throw new Error(`Rubber archive POST returned status ${archive.status}`);
      rows.push(...parseRubberBoardArchiveHtml(archive.body, fileDateStr));
      if (!rows.length && dailyError) throw new Error(`Rubber daily and archive lookups failed: ${dailyError.message}`);
    }

    const observations = rows.map((row) => {
      const market = normalizeMarket(sourceId, row.market);
      return observation({ rowKey: buildRowKey([row.reportDate, sourceId, "Rubber", market, row.variety, ""]), reportDate: row.reportDate, sourceId, commodity: "Rubber", perishability: "non-perishable", category: "miscellaneous", market, variety: row.variety, grade: "", arrivals: null, unit: "", minPrice: null, maxPrice: null, modalPrice: null, canonicalPrice: row.modalPrice, canonicalPriceUnit: "per 100 kg", priceDisplayUnit: "per 100 kg" });
    });
    return { sourceId, observations, commodityCount: observations.length ? 1 : 0 };
  }
  throw new Error(`Unsupported source: ${sourceId}`);
}

async function parsePdfText(buffer) {
  const module = require("pdf-parse");
  if (module.PDFParse) { const parser = new module.PDFParse({ data: buffer }); try { const result = await parser.getText(); return result.text || ""; } finally { await parser.destroy(); } }
  const result = await module(buffer); return result.text || "";
}

async function downloadCoffeePdf(fileDateStr) {
  const [year, month, day] = fileDateStr.split("-"); const archive = await httpGet(URLS.coffeeArchive); if (archive.status !== 200) throw new Error(`Coffee archive GET returned status ${archive.status}`);
  const cookie = cookieHeader(archive.headers["set-cookie"], ["ASP.NET_SessionId="]); if (!cookie) throw new Error("Coffee archive session cookie missing");
  const monthForm = hiddenFormFields(archive.body); monthForm.__EVENTTARGET = `GridView1$ctl${String(Number(month) + 1).padStart(2, "0")}$LinkButton${year}`; monthForm.__EVENTARGUMENT = ""; monthForm.__LASTFOCUS = "";
  const monthPost = await httpPost(URLS.coffeeArchive, monthForm, { Cookie: cookie, Referer: URLS.coffeeArchive }); if (monthPost.status !== 302) throw new Error(`Coffee month POST returned status ${monthPost.status}`);
  const monthUrl = new URL(monthPost.headers.location || "/Archives_Month.aspx", URLS.coffeeArchive).toString(); const monthPage = await httpGet(monthUrl, { Cookie: cookie, Referer: URLS.coffeeArchive }); if (monthPage.status !== 200) throw new Error(`Coffee month page returned status ${monthPage.status}`);
  const label = `${year},${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1]},${day}`; const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const target = monthPage.body.match(new RegExp(`__doPostBack\\(&#39;([^&]+)&#39;,&#39;[^&]*&#39;\\)\\">\\s*${escaped}\\s*<\\/a>`, "i")); if (!target) throw new Error(`Coffee archive did not list ${label}`);
  const dayForm = hiddenFormFields(monthPage.body); dayForm.__EVENTTARGET = target[1]; dayForm.__EVENTARGUMENT = ""; dayForm.__LASTFOCUS = ""; const pdf = await httpPost(monthUrl, dayForm, { Cookie: cookie, Referer: monthUrl }, true); if (pdf.status !== 200 || !String(pdf.headers["content-type"] || "").toLowerCase().includes("pdf")) throw new Error("Coffee archive did not return a PDF"); return pdf.body;
}

function observation(values) {
  return Object.fromEntries(OBSERVATION_COLUMNS.map((column) => [column, values[column] === undefined ? null : values[column]]));
}

function readJson(dataDir, file) { return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8")); }

function buildTaxonomy(categories, searchIndex, existing) {
  const categoryByCommodity = new Map(); const categoryIds = new Set();
  for (const category of categories.categories || []) { categoryIds.add(category.id); for (const commodity of category.commodities || []) categoryByCommodity.set(commodity, category.id); }
  if (!categoryByCommodity.size) throw new Error("categories.json has no current commodities");
  const markets = new Set([...(searchIndex.markets || []), ...KNOWN_CANONICAL_MARKETS]); const varieties = new Set((searchIndex.varieties || []).map((item) => `${item.commodity}\u0000${item.variety}`));
  const grades = new Set(existing.map((row) => row.grade).filter(Boolean));
  return { categoryByCommodity, categoryIds, markets, varieties, grades };
}

function validateObservations(rows, taxonomy, options = {}) {
  const enforceSourceFilters = options.enforceSourceFilters === true;
  const keys = new Set();
  for (const row of rows) {
    if (JSON.stringify(Object.keys(row)) !== JSON.stringify(OBSERVATION_COLUMNS)) throw new Error("Observation field set/order is invalid");
    if (!row.rowKey || keys.has(row.rowKey)) throw new Error(`Duplicate or empty row key: ${row.rowKey}`); keys.add(row.rowKey);
    assertIsoDate(row.reportDate);
    if (!SOURCE_IDS.includes(row.sourceId)) throw new Error(`Unknown source id: ${row.sourceId}`);
    const category = taxonomy.categoryByCommodity.get(row.commodity); if (!category) throw new Error(`Unknown commodity taxonomy: ${row.commodity}`);
    if (row.category !== category) throw new Error(`Unexpected category for ${row.commodity}: ${row.category}`);
    if (!taxonomy.markets.has(row.market)) throw new Error(`Unknown market taxonomy: ${row.market}`);
    if (enforceSourceFilters && row.variety && !taxonomy.varieties.has(`${row.commodity}\u0000${row.variety}`)) throw new Error(`Unknown variety taxonomy: ${row.commodity}/${row.variety}`);
    if (enforceSourceFilters && row.grade && !taxonomy.grades.has(row.grade)) throw new Error(`Unknown grade taxonomy: ${row.grade}`);
    for (const field of ["arrivals", "minPrice", "maxPrice", "modalPrice", "canonicalPrice"]) if (row[field] !== null && (typeof row[field] !== "number" || !Number.isFinite(row[field]))) throw new Error(`Invalid numeric ${field} in ${row.rowKey}`);
    const expectedUnits = { necc_egg: "100 eggs", spices_board: "per KG", rubber_board: "per 100 kg" };
    if (expectedUnits[row.sourceId] && row.canonicalPriceUnit !== null && row.canonicalPriceUnit !== expectedUnits[row.sourceId]) throw new Error(`Invalid canonical unit for ${row.sourceId}`);
    if (!expectedUnits[row.sourceId] && row.canonicalPriceUnit !== null) throw new Error(`Unexpected canonical unit for ${row.sourceId}`);
    if (row.sourceId !== "krama" && row.priceDisplayUnit !== SOURCE_DISPLAY_UNITS[row.sourceId]) throw new Error(`Invalid display unit for ${row.sourceId}`);
    if (enforceSourceFilters && ["necc_egg", "spices_board", "rubber_board"].includes(row.sourceId) && (typeof row.canonicalPrice !== "number" || row.canonicalPriceUnit !== expectedUnits[row.sourceId])) throw new Error(`Missing canonical price for ${row.sourceId}`);
    if (enforceSourceFilters && row.sourceId === "necc_egg" && (!TARGET_NECC_MARKETS.has(row.market) || row.commodity !== "Egg")) throw new Error("Invalid NECC target row");
    if (enforceSourceFilters && row.sourceId === "rubber_board" && (!TARGET_RUBBER_MARKETS.has(row.market) || !["RSS4", "RSS5", "ISNR20", "Latex (60%)"].includes(row.variety))) throw new Error("Invalid Rubber target row");
    if (enforceSourceFilters && row.sourceId === "coffee_board" && (!COFFEE_VARIETIES.includes(row.variety) || row.market !== "Karnataka")) throw new Error("Invalid Coffee target row");
    if (enforceSourceFilters && row.sourceId === "spices_board" && (row.market !== TARGET_SPICES_MARKET || row.commodity === "Pepper")) throw new Error("Invalid Spices target row");
  }
  return rows;
}

function findUnknownTaxonomies(row, taxonomy, options = {}) {
  const issues = [];
  if (!taxonomy.categoryByCommodity.has(row.commodity)) issues.push({ type: "commodity", value: row.commodity });
  if (!taxonomy.markets.has(row.market)) issues.push({ type: "market", value: row.market });
  if (options.enforceSourceFilters && row.variety && !taxonomy.varieties.has(`${row.commodity}\u0000${row.variety}`)) issues.push({ type: "variety", value: `${row.commodity}/${row.variety}` });
  if (options.enforceSourceFilters && row.grade && !taxonomy.grades.has(row.grade)) issues.push({ type: "grade", value: row.grade });
  return issues;
}

function collectUnknownTaxonomy(unknownTaxonomies, row, issues) {
  for (const issue of issues) {
    const key = `${issue.type}\u0000${issue.value}`;
    const current = unknownTaxonomies.get(key) || { type: issue.type, value: issue.value, rowCount: 0, sources: new Set() };
    current.rowCount += 1;
    current.sources.add(row.sourceId);
    unknownTaxonomies.set(key, current);
  }
}

function serializeUnknownTaxonomies(unknownTaxonomies) {
  return [...unknownTaxonomies.values()]
    .map((item) => ({ ...item, sources: [...item.sources].sort() }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value));
}

function compareRows(a, b) { return a.reportDate.localeCompare(b.reportDate) || a.commodity.localeCompare(b.commodity) || a.market.localeCompare(b.market) || a.variety.localeCompare(b.variety) || a.grade.localeCompare(b.grade) || a.rowKey.localeCompare(b.rowKey); }

function buildSearchIndex(rows, categories) {
  const commodities = [...new Set((categories.categories || []).flatMap((category) => category.commodities || []))].sort((a, b) => a.localeCompare(b));
  const markets = [...new Set(rows.map((row) => row.market).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const varieties = [...new Map(rows.filter((row) => row.variety).map((row) => [`${row.commodity}\u0000${row.variety}`, { commodity: row.commodity, variety: row.variety }])).values()]
    .sort((a, b) => a.variety.localeCompare(b.variety) || a.commodity.localeCompare(b.commodity));
  return { commodities, markets, varieties };
}

function makePayloads(rows, categories) {
  const observations = [...rows].sort(compareRows); const searchIndex = buildSearchIndex(observations, categories);
  return {
    "observations.json": encodeObservations(observations),
    "search-index.json": searchIndex,
    "categories.json": { categories: (categories.categories || []).map((category) => ({ ...category, commodities: [...category.commodities].sort((a, b) => a.localeCompare(b)), commodityCount: category.commodities.length })) },
    "metadata.json": { generatedAt: new Date().toISOString(), observations: observations.length, commodities: searchIndex.commodities.length, markets: searchIndex.markets.length, varieties: searchIndex.varieties.length },
  };
}

function publishSnapshot(payloads, dataDir = DATA_DIR, runId = crypto.randomUUID(), fsApi = fs) {
  const safeId = String(runId).replace(/[^a-zA-Z0-9_-]/g, "_"); const tempDir = path.join(dataDir, `.scraper-temp-${safeId}`); const backupDir = path.join(dataDir, `.scraper-backup-${safeId}`); const names = Object.keys(payloads); const moved = []; const installed = [];
  fsApi.mkdirSync(tempDir, { recursive: true }); fsApi.mkdirSync(backupDir, { recursive: true });
  try {
    for (const name of names) fsApi.writeFileSync(path.join(tempDir, name), `${JSON.stringify(payloads[name])}\n`, "utf8");
    for (const name of names) { const target = path.join(dataDir, name); if (fsApi.existsSync(target)) { fsApi.renameSync(target, path.join(backupDir, name)); moved.push(name); } }
    for (const name of names) { fsApi.renameSync(path.join(tempDir, name), path.join(dataDir, name)); installed.push(name); }
    fsApi.rmSync(tempDir, { recursive: true, force: true }); fsApi.rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    for (const name of installed) { const target = path.join(dataDir, name); if (fsApi.existsSync(target)) fsApi.rmSync(target, { force: true }); }
    for (const name of moved.reverse()) { const backup = path.join(backupDir, name); if (fsApi.existsSync(backup)) fsApi.renameSync(backup, path.join(dataDir, name)); }
    if (fsApi.existsSync(tempDir)) fsApi.rmSync(tempDir, { recursive: true, force: true }); if (fsApi.existsSync(backupDir)) fsApi.rmSync(backupDir, { recursive: true, force: true });
    throw error;
  }
}

function loadAndMerge(newRows, dataDir = DATA_DIR) {
  const categories = readJson(dataDir, "categories.json"); const searchIndex = readJson(dataDir, "search-index.json"); const existing = decodeObservations(readJson(dataDir, "observations.json")); const taxonomy = buildTaxonomy(categories, searchIndex, existing); const merged = new Map();
  existing.forEach((row) => { if (!taxonomy.categoryByCommodity.has(row.commodity)) throw new Error(`Existing row outside taxonomy: ${row.commodity}`); merged.set(row.rowKey, observation({ ...row, category: taxonomy.categoryByCommodity.get(row.commodity) })); });
  const normalizedNewRows = newRows.map((row) => observation({ ...row, category: row.category || taxonomy.categoryByCommodity.get(row.commodity) }));
  const acceptedNewRows = []; const unknownTaxonomies = new Map(); let skippedRowCount = 0;
  normalizedNewRows.forEach((row) => {
    const issues = findUnknownTaxonomies(row, taxonomy, { enforceSourceFilters: true });
    if (issues.length) { skippedRowCount += 1; collectUnknownTaxonomy(unknownTaxonomies, row, issues); return; }
    acceptedNewRows.push(row);
  });
  validateObservations(acceptedNewRows, taxonomy, { enforceSourceFilters: true });
  acceptedNewRows.forEach((row) => merged.set(row.rowKey, row));
  const rows = [...merged.values()]; validateObservations(rows, taxonomy);
  return { rows, categories, taxonomy, acceptedRowCount: acceptedNewRows.length, skippedRowCount, unknownTaxonomies: serializeUnknownTaxonomies(unknownTaxonomies) };
}

async function runScrapeForDate(dateInput, options = {}) {
  const runId = crypto.randomUUID(); const sourceIds = options.sourceId === "all" ? SOURCE_IDS : [options.sourceId || "krama"]; const startedAt = new Date().toISOString();
  const previousRunId = activeRunId; activeRunId = runId;
  log("info", "run_started", { source: sourceIds.join(","), requestedDate: dateInput || null });
  try {
    const scraped = [];
    for (const sourceId of sourceIds) { const result = await scrapeSource(sourceId, sourceId === "csb_silk" ? null : dateInput); if (!result.observations.length) throw new Error(`${sourceId} returned no rows`); scraped.push(...result.observations); log("info", "source_completed", { runId, source: sourceId, rows: result.observations.length }); }
    const merged = loadAndMerge(scraped);
    if (merged.skippedRowCount) log("warn", "taxonomy_rows_skipped", { source: sourceIds.join(","), skippedRowCount: merged.skippedRowCount, unknownTaxonomies: merged.unknownTaxonomies });
    if (!merged.acceptedRowCount) { const error = new Error("All scraped rows were skipped because their taxonomy values are unknown."); error.skippedRowCount = merged.skippedRowCount; error.unknownTaxonomies = merged.unknownTaxonomies; throw error; }
    const payloads = makePayloads(merged.rows, merged.categories); validateObservations(decodeObservations(payloads["observations.json"]), merged.taxonomy); publishSnapshot(payloads, DATA_DIR, runId);
    const reportDates = [...new Set(scraped.map((row) => row.reportDate))]; const result = { ok: true, runId, sourceId: sourceIds.length === 1 ? sourceIds[0] : "all", reportDate: reportDates.length === 1 ? reportDates[0] : reportDates.join(","), rowCount: scraped.length, acceptedRowCount: merged.acceptedRowCount, skippedRowCount: merged.skippedRowCount, unknownTaxonomies: merged.unknownTaxonomies, mergedRowCount: merged.rows.length, logPath: logger && logger.logPath, startedAt, finishedAt: new Date().toISOString() };
    log("info", "run_completed", { ...result }); return result;
  } catch (error) { log("error", "run_failed", { source: sourceIds.join(","), error: error.stack || error.message, skippedRowCount: error.skippedRowCount || 0, unknownTaxonomies: error.unknownTaxonomies || [], finishedAt: new Date().toISOString() }); return { ok: false, runId, sourceId: sourceIds.join(","), error: error.message, skippedRowCount: error.skippedRowCount || 0, unknownTaxonomies: error.unknownTaxonomies || [], logPath: logger && logger.logPath }; }
  finally { activeRunId = previousRunId; }
}

function htmlPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Commodity JSON Scraper</title><style>body{font:16px Segoe UI,Arial;background:#f5f1e8;color:#202522;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}.card{background:#fffaf2;padding:28px;border-radius:20px;width:min(520px,100%);box-shadow:0 15px 40px #0002}label{display:block;font-weight:600;margin:14px 0 7px}select,input,button{width:100%;padding:13px;border:1px solid #d5cdbc;border-radius:10px;font-size:16px;box-sizing:border-box}button{margin-top:18px;background:#1f7045;color:white;font-weight:700;cursor:pointer}.status{margin-top:18px;padding:14px;background:#f0eadf;border-radius:10px;white-space:pre-wrap}.error{background:#fde6e2;color:#8b2118}.success{background:#e5f4e8;color:#14532d}</style></head><body><main class="card"><h1>Commodity JSON Scraper</h1><p>This publishes JSON only; it does not update SQLite.</p><label for="source">Source</label><select id="source"><option value="krama">Krama</option><option value="necc_egg">NECC eggs</option><option value="csb_silk">Central Silk Board</option><option value="spices_board">Spices Board</option><option value="coffee_board">Coffee Board</option><option value="rubber_board">Rubber Board</option><option value="all">All six sources</option></select><label id="dateLabel" for="date">Date</label><input id="date" type="date"><button id="run">Fetch and publish</button><div id="status" class="status">Choose a source and date.</div></main><script>const s=document.querySelector('#source'),d=document.querySelector('#date'),b=document.querySelector('#run'),o=document.querySelector('#status'),dateSources=new Set(['krama','necc_egg','spices_board','coffee_board','rubber_board']);function sync(){const need=dateSources.has(s.value)||s.value==='all';d.hidden=!need;document.querySelector('#dateLabel').hidden=!need;b.disabled=need&&!d.value} s.onchange=sync;d.oninput=sync;sync();b.onclick=async()=>{b.disabled=true;o.className='status';o.textContent='Fetching sources and validating the complete snapshot…';try{const r=await fetch('/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceId:s.value,date:dateSources.has(s.value)||s.value==='all'?d.value:null})});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Run failed');o.className='status success';o.textContent='Completed.\\nSource: '+j.sourceId+'\\nRows: '+j.rowCount+'\\nMerged rows: '+j.mergedRowCount+'\\nLog: '+j.logPath}catch(e){o.className='status error';o.textContent='Run failed.\\n'+e.message}finally{sync()}};</script></body></html>`;
}

function htmlPageWithTaxonomyStatus() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Commodity JSON Scraper</title><style>body{font:16px Segoe UI,Arial;background:#f5f1e8;color:#202522;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}.card{background:#fffaf2;padding:28px;border-radius:20px;width:min(520px,100%);box-shadow:0 15px 40px #0002}label{display:block;font-weight:600;margin:14px 0 7px}select,input,button{width:100%;padding:13px;border:1px solid #d5cdbc;border-radius:10px;font-size:16px;box-sizing:border-box}button{margin-top:18px;background:#1f7045;color:white;font-weight:700;cursor:pointer}.status{margin-top:18px;padding:14px;background:#f0eadf;border-radius:10px;white-space:pre-wrap}.error{background:#fde6e2;color:#8b2118}.success{background:#e5f4e8;color:#14532d}</style></head><body><main class="card"><h1>Commodity JSON Scraper</h1><p>This publishes JSON only; it does not update SQLite.</p><label for="source">Source</label><select id="source"><option value="krama">Krama</option><option value="necc_egg">NECC eggs</option><option value="csb_silk">Central Silk Board</option><option value="spices_board">Spices Board</option><option value="coffee_board">Coffee Board</option><option value="rubber_board">Rubber Board</option><option value="all">All six sources</option></select><label id="dateLabel" for="date">Date</label><input id="date" type="date"><button id="run">Fetch and publish</button><div id="status" class="status">Choose a source and date.</div></main><script>const s=document.querySelector('#source'),d=document.querySelector('#date'),b=document.querySelector('#run'),o=document.querySelector('#status'),dateSources=new Set(['krama','necc_egg','spices_board','coffee_board','rubber_board']);function sync(){const need=dateSources.has(s.value)||s.value==='all';d.hidden=!need;document.querySelector('#dateLabel').hidden=!need;b.disabled=need&&!d.value}function taxonomyText(items){return (items||[]).map(item=>item.type+': '+item.value+' ('+item.rowCount+' row(s), '+item.sources.join(', ')+')').join('\\n')}s.onchange=sync;d.oninput=sync;sync();b.onclick=async()=>{b.disabled=true;o.className='status';o.textContent='Fetching sources and validating the complete snapshot...';try{const r=await fetch('/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceId:s.value,date:dateSources.has(s.value)||s.value==='all'?d.value:null})});const j=await r.json();const unknown=taxonomyText(j.unknownTaxonomies);if(!r.ok||!j.ok){o.className='status error';o.textContent='Run failed.\\n'+(j.error||'Run failed')+(unknown?'\\nUnknown taxonomy values:\\n'+unknown:'');return}o.className='status success';o.textContent='Completed.\\nSource: '+j.sourceId+'\\nRows: '+j.rowCount+'\\nMerged rows: '+j.mergedRowCount+(j.skippedRowCount?'\\nSkipped rows: '+j.skippedRowCount:'')+(unknown?'\\nUnknown taxonomy values skipped:\\n'+unknown:'')+'\\nLog: '+j.logPath}catch(e){o.className='status error';o.textContent='Run failed.\\n'+e.message}finally{sync()}};</script></body></html>`;
}

function htmlPage() { return htmlPageWithTaxonomyStatus(); }

function openBrowser(url) { if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref(); else if (process.platform !== "darwin") spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref(); }

async function startUiServer(config = {}) {
  const runner = config.runner || runScrapeForDate;
  let active = false; const server = require("http").createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(htmlPage()); return; }
    if (req.method === "POST" && req.url === "/run") { if (active) { res.writeHead(409, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "A scrape is already in progress." })); return; } let body = ""; req.on("data", (chunk) => { body += chunk; }); req.on("end", async () => { active = true; try { const payload = JSON.parse(body || "{}"); const sourceId = [...SOURCE_IDS, "all"].includes(payload.sourceId) ? payload.sourceId : "krama"; const date = sourceId === "csb_silk" ? null : normalizeUiDate(payload.date); const result = await runner(date, { sourceId }); res.writeHead(result.ok ? 200 : 500, { "Content-Type": "application/json" }); res.end(JSON.stringify(result)); } catch (error) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: error.message })); } finally { active = false; } }); return; }
    res.writeHead(404); res.end("Not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); const url = `http://127.0.0.1:${address.port}/`; log("info", "ui_started", { url }); if (config.openBrowser !== false) openBrowser(url); return server;
}

async function main() {
  const options = parseArgs(process.argv.slice(2)); setupLogging();
  if (options.uiMode) { await startUiServer(); return; }
  const result = await runScrapeForDate(options.date, options); closeLogging(); process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) main().catch((error) => { if (!logger) setupLogging(); log("error", "fatal", { error: error.stack || error.message }); closeLogging(); process.exitCode = 1; });

module.exports = {
  OBSERVATION_COLUMNS, SOURCE_IDS, buildRowKey, parseLooseNumber, parseKramaHtml, parseNeccEggHtml, parseCsbSilkHtml,
  parseSpicesBoardHtml, filterSpicesBoardRows, parseCoffeeBoardRawPriceText, parseRubberBoardDailyHtml, parseRubberBoardArchiveHtml, parseDmyDate, parseAbbrevMonthDate,
  parseDottedDate, normalizeMarket, normalizeKrama, scrapeKramaWithFallback, validateObservations, buildTaxonomy,
  makePayloads, loadAndMerge, publishSnapshot, reportDateStrings, parseArgs, htmlPage, runScrapeForDate, startUiServer,
};
