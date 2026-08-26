"use strict";
// Shared scrape -> stage -> deploy to Cloudflare Pages. Node stdlib only.
// Exports stageAndDeploy({ rootDir }) which returns { ok, ... } and never
// terminates the host process (safe to call from the scraper UI server).
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_PROJECT = "agro-dashboard-data";

function readJsonIfPresent(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) { return null; }
}

function loadEnv(rootDir) {
  const env = { ...process.env };
  const envFile = path.join(rootDir, ".env");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value; // local project config wins; never print values
    }
  }
  return env;
}

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

async function stageAndDeploy({ rootDir = process.cwd() } = {}) {
  const env = loadEnv(rootDir);
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    const msg = "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required (set in .env or the environment).";
    console.error(`[publish] ${msg}`);
    return { ok: false, error: msg };
  }
  const project = env.CLOUDFLARE_PAGES_PROJECT || DEFAULT_PROJECT;

  const bundle = fs.mkdtempSync(path.join(os.tmpdir(), "agro-publish-"));
  try {
    // Stage root translations.json, every data/*.json (never the SQLite DB), and _headers.
    fs.copyFileSync(path.join(rootDir, "translations.json"), path.join(bundle, "translations.json"));
    const dataDir = path.join(rootDir, "data");
    const dataOut = path.join(bundle, "data");
    fs.mkdirSync(dataOut, { recursive: true });
    for (const name of fs.readdirSync(dataDir)) {
      if (name.endsWith(".json")) fs.copyFileSync(path.join(dataDir, name), path.join(dataOut, name));
    }
    fs.writeFileSync(
      path.join(bundle, "_headers"),
      [
        "/*",
        "  Access-Control-Allow-Origin: *",
        "  Access-Control-Allow-Methods: GET, HEAD, OPTIONS",
        "  Cache-Control: no-cache",
        "",
      ].join("\n")
    );

    // These timestamps describe the contents staged for this deployment. They
    // are freshness metadata, not a claim that the deployment has finished or
    // is already serving this version.
    const metadata = readJsonIfPresent(path.join(dataDir, "metadata.json"));
    const runLog = readJsonIfPresent(path.join(dataDir, "scraper-runs.json"));
    const freshness = {
      snapshot_generated_at: metadata && metadata.generatedAt ? metadata.generatedAt : null,
      run_log_generated_at: runLog && runLog.generated_at ? runLog.generated_at : null,
    };

    // Deploy with Wrangler, passing the loaded environment.
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const deployArgs = ["wrangler", "pages", "deploy", bundle, `--project-name=${project}`];
    console.log(`[publish] deploying to Cloudflare Pages project "${project}"`);
    const deploy = await run(npx, deployArgs, { cwd: rootDir, env, shell: process.platform === "win32" });
    if (deploy.code !== 0 || deploy.signal) {
      const msg = `deployment failed with code ${deploy.code}${deploy.signal ? ` (${deploy.signal})` : ""}`;
      console.error(`[publish] ${msg}`);
      return { ok: false, error: msg, code: deploy.code, signal: deploy.signal };
    }
    console.log("[publish] deployment complete.");
    return { ok: true, project, freshness };
  } catch (err) {
    const msg = err.stack || err.message;
    console.error(`[publish] ${msg}`);
    return { ok: false, error: msg };
  } finally {
    fs.rmSync(bundle, { recursive: true, force: true });
  }
}

module.exports = { stageAndDeploy, loadEnv };
