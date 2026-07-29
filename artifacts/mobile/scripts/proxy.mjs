/**
 * Replit dev proxy — binds 0.0.0.0:3000 so Replit's port detector can find it,
 * then forwards all HTTP and WebSocket traffic to Metro on localhost:3001.
 *
 * Metro itself only binds to the LAN IP (172.x.x.x), so the workflow port-open
 * check would time-out without this shim.
 */
import http from 'http';
import net  from 'net';

const PROXY_PORT  = 8083;
const TARGET_PORT = 3001;
const TARGET_HOST = 'localhost';

// ── HTTP proxy ────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const opts = {
    hostname: TARGET_HOST,
    port:     TARGET_PORT,
    path:     req.url,
    method:   req.method,
    headers:  req.headers,
  };

  const proxy = http.request(opts, (upstream) => {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('[proxy] HTTP error:', err.message);
    if (!res.headersSent) { res.writeHead(502); res.end('Proxy error'); }
  });

  req.pipe(proxy, { end: true });
});

// ── WebSocket proxy (Metro HMR / fast-refresh) ────────────────────────────────
server.on('upgrade', (req, socket, head) => {
  const conn = net.connect(TARGET_PORT, TARGET_HOST);

  conn.on('connect', () => {
    // Re-emit the full HTTP Upgrade request to the upstream Metro server
    let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    raw += '\r\n';
    conn.write(raw);
    if (head && head.length > 0) conn.write(head);
  });

  conn.pipe(socket);
  socket.pipe(conn);
  conn.on('error', () => { try { socket.destroy(); } catch (_) {} });
  socket.on('error', () => { try { conn.destroy();  } catch (_) {} });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[proxy] 0.0.0.0:${PROXY_PORT} → ${TARGET_HOST}:${TARGET_PORT}`);
});
