/**
 * Static file server for the Expo web export (dist/).
 * Serves on 0.0.0.0:8082.
 * For static routes, serves the matching HTML file.
 * For unknown paths, falls back to dist/index.html (SPA fallback).
 */
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT    = 8082;
const __dir   = path.dirname(fileURLToPath(import.meta.url));
const DIST    = path.resolve(__dir, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Add CORS headers for cross-origin requests (Replit proxy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // 1. Try the exact file path first (for assets, JS bundles, etc.)
  let filePath = path.join(DIST, urlPath);

  // 2. If it's a directory, look for index.html inside it (static route)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // 3. If still not found, check for <path>/index.html (static route without trailing slash)
  if (!fs.existsSync(filePath)) {
    const asDir = path.join(DIST, urlPath, 'index.html');
    if (fs.existsSync(asDir)) {
      filePath = asDir;
    } else {
      // 4. SPA fallback: serve root index.html for all unmatched paths
      filePath = path.join(DIST, 'index.html');
    }
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[web] Serving dist/ on http://0.0.0.0:${PORT}`);
});
