'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn }    = require('child_process');
const { existsSync, readFileSync } = require('fs');
const http  = require('http');
const path  = require('path');

// ── Lightweight startup flags ──────────────────────────────────────────────
// Limit JS heap in the main process (API server runs as a child process)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
// Disable unused background services to save CPU / memory
app.commandLine.appendSwitch('disable-features', 'MediaRouter,GlobalMediaControls,BackForwardCache');
app.commandLine.appendSwitch('disable-background-networking');
// Use a fixed app user model ID (Windows taskbar grouping)
if (process.platform === 'win32') {
  app.setAppUserModelId('com.almuzini.ehr');
}

// ── Constants ──────────────────────────────────────────────────────────────
const IS_DEV   = !app.isPackaged;
const API_PORT = 48080; // high port — unlikely to clash with other services

// ── Resolve resource paths ─────────────────────────────────────────────────
// In dev  : electron . is run from artifacts/desktop/  → __dirname = electron/
// Packaged: resources are at process.resourcesPath
function getPaths() {
  if (IS_DEV) {
    const base = path.resolve(__dirname, '..');
    return {
      api:    path.join(base, '..', 'api-server', 'dist', 'index.mjs'),
      www:    path.join(base, '..', 'ehr', 'dist', 'public'),
      config: path.join(base, 'config.json'),
    };
  }
  return {
    api:    path.join(process.resourcesPath, 'api', 'index.mjs'),
    www:    path.join(process.resourcesPath, 'www'),
    config: path.join(process.resourcesPath, 'config.json'),
  };
}

// ── Supabase credentials ───────────────────────────────────────────────────
// Priority: bundled config.json (built by build script) → environment variables
function loadConfig(configPath) {
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (raw.supabaseUrl && raw.supabaseAnonKey) return raw;
    } catch { /* fall through */ }
  }
  return {
    supabaseUrl:     process.env.SUPABASE_URL     ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  };
}

// ── Internal API server ────────────────────────────────────────────────────
let apiProcess = null;

function startApiServer(paths, config) {
  // ELECTRON_RUN_AS_NODE=1 causes the Electron binary to behave as plain Node.js
  // — no need to ship a separate Node runtime.
  apiProcess = spawn(process.execPath, ['--enable-source-maps', paths.api], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT:              String(API_PORT),
      NODE_ENV:          'production',
      DESKTOP_MODE:      '1',
      FRONTEND_DIST:     paths.www,
      SUPABASE_URL:      config.supabaseUrl,
      SUPABASE_ANON_KEY: config.supabaseAnonKey,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  apiProcess.stdout.on('data', d => {
    if (IS_DEV) process.stdout.write('[api] ' + d);
  });
  apiProcess.stderr.on('data', d => {
    if (IS_DEV) process.stderr.write('[api] ' + d);
  });
  apiProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null && signal !== 'SIGTERM') {
      console.error(`[desktop] API server exited unexpectedly (code ${code})`);
    }
  });
}

// ── Wait for the HTTP server to accept connections ─────────────────────────
function waitForServer(url, timeoutMs = 15000) {
  return new Promise(resolve => {
    const deadline = Date.now() + timeoutMs;
    const attempt  = () => {
      http.get(url, () => resolve(true)).on('error', () => {
        if (Date.now() < deadline) setTimeout(attempt, 300);
        else resolve(false);
      });
    };
    attempt();
  });
}

// ── BrowserWindow ──────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1440,
    height:    900,
    minWidth:  1024,
    minHeight: 680,
    title:     'Almuzini Children Hospital EHR',
    // Match light-mode background so there's no white flash before React mounts
    backgroundColor: '#f2f4f8',
    show: false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
      // DevTools only in development — saves ~30 MB in production
      devTools:         IS_DEV,
      // Disable spell-check for medical terms
      spellcheck:       false,
      // Enable hardware acceleration for smooth charts / animations
      backgroundThrottling: false,
    },
  });

  // Clean, app-like look — no browser menu bar
  mainWindow.setMenuBarVisibility(false);
  if (process.platform !== 'darwin') mainWindow.setMenu(null);

  mainWindow.loadURL(`http://localhost:${API_PORT}/`);

  // Show only once fully rendered → no blank-window flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (IS_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Open external links (e.g. mailto:, https://) in the OS default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost')) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const paths  = getPaths();
  const config = loadConfig(paths.config);

  // ── Guard: credentials must be present ──────────────────────────────────
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    dialog.showErrorBox(
      'Configuration Error',
      'Supabase credentials are not configured.\n\n' +
      'Please re-run the build script with SUPABASE_URL and SUPABASE_ANON_KEY set.\n\n' +
      `Expected config file: ${paths.config}`,
    );
    app.quit();
    return;
  }

  // ── Guard: API server build must exist ──────────────────────────────────
  if (!existsSync(paths.api)) {
    dialog.showErrorBox(
      'Missing Build Output',
      'The API server bundle was not found.\n\n' +
      `Expected: ${paths.api}\n\n` +
      'Run the build script first:\n  pnpm run build',
    );
    app.quit();
    return;
  }

  // ── Start the embedded API server ───────────────────────────────────────
  startApiServer(paths, config);

  const ready = await waitForServer(`http://localhost:${API_PORT}/api/healthz`);
  if (!ready) {
    dialog.showErrorBox(
      'Startup Error',
      'The embedded server did not start in time.\n\n' +
      'This may be caused by a port conflict on port ' + API_PORT + '.\n' +
      'Close any other application using that port and try again.',
    );
    app.quit();
    return;
  }

  createWindow();

  // macOS: re-open the window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Gracefully terminate the embedded API server before the app exits
  if (apiProcess) {
    apiProcess.kill('SIGTERM');
    apiProcess = null;
  }
});
