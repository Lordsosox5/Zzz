/**
 * Mobile dev script: initial build → serve → watch → rebuild on change.
 * Uses Node.js built-in fs.watch (recursive) — no extra dependencies needed.
 */
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dir, "..");
const DIST   = path.resolve(ROOT, "dist");

// Directories to watch for source changes
const WATCH_DIRS = ["app", "components", "lib", "context", "hooks", "constants", "assets"].map(
  (d) => path.resolve(ROOT, d)
);

// ── Build ──────────────────────────────────────────────────────────────────
let building = false;
let pendingRebuild = false;

function build(label = "build") {
  if (building) {
    pendingRebuild = true;
    return;
  }
  building = true;
  console.log(`\n[mobile] ${label} starting…`);
  const start = Date.now();

  const proc = spawn(
    "npx",
    ["expo", "export", "--platform", "web"],
    { cwd: ROOT, stdio: "inherit", shell: true }
  );

  proc.on("close", (code) => {
    building = false;
    if (code === 0) {
      console.log(`[mobile] ${label} done (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    } else {
      console.error(`[mobile] ${label} FAILED (exit ${code})`);
    }
    if (pendingRebuild) {
      pendingRebuild = false;
      build("rebuild");
    }
  });
}

// ── Serve ──────────────────────────────────────────────────────────────────
function startServer() {
  const server = spawn("node", [path.resolve(__dir, "serve-web.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
  server.on("close", (code) => {
    console.error(`[mobile] server exited (${code}) — restarting…`);
    setTimeout(startServer, 1000);
  });
}

// ── Watch ──────────────────────────────────────────────────────────────────
let debounce;

function watchDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.watch(dir, { recursive: true }, (event, filename) => {
      // Ignore dist/ changes and non-source files
      if (!filename) return;
      if (filename.startsWith("dist")) return;
      if (/node_modules/.test(filename)) return;

      clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log(`[mobile] changed: ${filename}`);
        build("rebuild");
      }, 300);
    });
  } catch {
    // Directory may not exist yet — silently skip
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log("[mobile] initial build…");
build("initial build");

// Start the static server immediately (it'll serve whatever is in dist/)
startServer();

// Watch all source directories
for (const dir of WATCH_DIRS) {
  watchDir(dir);
}
// Also watch root-level config files (metro.config.js, app.json, babel.config.js)
try {
  fs.watch(ROOT, { recursive: false }, (event, filename) => {
    if (!filename) return;
    if (/\.(json|js|ts)$/.test(filename)) {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log(`[mobile] config changed: ${filename}`);
        build("rebuild");
      }, 300);
    }
  });
} catch { /* ignore */ }

console.log("[mobile] watching for changes…");
