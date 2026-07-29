---
name: Mobile app workflow setup
description: How the Expo mobile app is built, served, and surfaced in the Replit preview tab.
---

## Rule
Use `expo export --platform web` (static output) + a custom Node HTTP server (`scripts/serve-web.mjs`) that binds `0.0.0.0:5000`. The workflow must be `outputType: "webview"` and `waitForPort: 5000` because Replit's webview detection only watches port 5000 for non-artifact workflows.

**Why:**
- Metro dev server (`expo start --web`) binds the LAN IP (`172.x.x.x`) only, never `0.0.0.0`, so the Replit port detector never sees it regardless of what `waitForPort` is set to.
- `config.server.host` in `metro.config.js` is silently ignored by Expo CLI.
- A Node proxy forwarding `0.0.0.0:N → localhost:M` does make the port detectable, but Replit webview still requires port 5000 specifically for non-artifact workflows.
- `output: "spa"` in `app.json` skips `+html.tsx`, so JS errors are invisible; `output: "static"` applies `+html.tsx` (which has `window.onerror`) and is the mode that works correctly.

**How to apply:**
- `app.json`: `"web": { "bundler": "metro", "output": "static" }`
- `scripts/serve-web.mjs`: `PORT = 5000`, `listen(PORT, '0.0.0.0', ...)`
- `package.json` web script: `"npx expo export --platform web && node scripts/serve-web.mjs"`
- Workflow command: `pnpm --filter @workspace/mobile run web` (or `node artifacts/mobile/scripts/serve-web.mjs` after pre-building)
- Workflow config: `waitForPort: 5000`, `outputType: "webview"`

## Port conflict
`Start application` also runs EHR on port 5000. Running both simultaneously will cause a conflict. `Start application` is now set to `outputType: "console"` (no port detection) so both can coexist — just don't run `Start application` and the mobile workflow at the exact same time if EHR's port 5000 matters.

The `artifacts/ehr: web` artifact workflow serves EHR on its own port (auto-assigned, ~19866) independently of `Start application`.

## Pre-building dist/
If the workflow times out during `expo export` (slow fresh build > 300 s), pre-build manually:
```bash
cd artifacts/mobile && npx expo export --platform web
```
Then configure the workflow to only run `node artifacts/mobile/scripts/serve-web.mjs` (instant startup, no build).
