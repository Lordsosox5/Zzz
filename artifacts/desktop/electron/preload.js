'use strict';

// Minimal preload — no Node.js APIs are exposed to the renderer.
//
// The EHR frontend communicates exclusively via:
//   • HTTP fetch to /api/* (same-origin, handled by the embedded Express server)
//   • Supabase JS client (connects to the cloud via HTTPS)
//
// No IPC bridge is needed. contextBridge is intentionally left empty
// to keep the attack surface small.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('__electronDesktop', {
  isDesktop: true,
  platform:  process.platform,
});
