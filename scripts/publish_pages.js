"use strict";
// Scrape -> stage -> deploy to Cloudflare Pages. Node stdlib only.
// Usage: node scripts/publish_pages.js [--source ID] [--date DD/MM/YYYY]
//        npm run scrape:publish -- --source=ID --date=DD/MM/YYYY
const { spawn } = require("child_process");
const path = require("path");
const { stageAndDeploy, loadEnv } = require("./publish_bundle.js");

const ROOT = path.resolve(__dirname, "..");
const SCRAPER = path.join(ROOT, "scrape_krama.js");

function run(cmd, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: "inherit" });
    child.on("error", (err) => {
      console.error(`[publish] failed to start ${cmd}: ${err.message}`);
      resolve({ code: 1, signal: null });
    });
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function main() {
  const env = loadEnv(ROOT);
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    console.error("[publish] CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required (set in .env or the environment).");
    process.exitCode = 1;
    return;
  }

  // 1. Run the scraper (no UI, and never --publish to avoid recursion). Default --source all.
  //    npm forwards `--source=X --date=Y` as npm_config_source/npm_config_date env vars
  //    (and may also pass stray positionals); direct invocation uses --source/--date argv.
  const userArgs = process.argv.slice(2);
  let source = null;
  let date = null;
  for (let i = 0; i < userArgs.length; i++) {
    const a = userArgs[i];
    if (a === "--source") source = userArgs[++i];
    else if (a.startsWith("--source=")) source = a.slice("--source=".length);
    else if (a === "--date") date = userArgs[++i];
    else if (a.startsWith("--date=")) date = a.slice("--date=".length);
    else if (a === "--no-ui") { /* always no-ui */ }
    else {
      console.error(`[publish] unexpected argument: ${a}`);
      process.exitCode = 1;
      return;
    }
  }
  if (source == null && env.npm_config_source && env.npm_config_source !== "true") source = env.npm_config_source;
  if (date == null && env.npm_config_date && env.npm_config_date !== "true") date = env.npm_config_date;

  const scrapeArgs = ["scrape_krama.js", "--no-ui"];
  scrapeArgs.push("--source", source || "all");
  if (date) scrapeArgs.push("--date", date);
  console.log(`[publish] scraping: ${scrapeArgs.join(" ")}`);
  const scrape = await run(process.execPath, scrapeArgs, { cwd: ROOT });
  if (scrape.code !== 0 || scrape.signal) {
    console.error(`[publish] scraper exited with code ${scrape.code}${scrape.signal ? ` (${scrape.signal})` : ""}; not deploying.`);
    process.exitCode = 1;
    return;
  }

  // 2. Stage and deploy via the shared module.
  const deploy = await stageAndDeploy({ rootDir: ROOT });
  if (!deploy.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`[publish] fatal: ${err.stack || err.message}`);
  process.exitCode = 1;
});
