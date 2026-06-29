#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Almuzini EHR — Desktop Build Script
#  Usage (from repo root or artifacts/desktop/):
#    export SUPABASE_URL="https://xxxx.supabase.co"
#    export SUPABASE_ANON_KEY="eyJ..."
#    pnpm --filter @workspace/desktop run build          # native platform
#    pnpm --filter @workspace/desktop run build:win      # Windows
#    pnpm --filter @workspace/desktop run build:mac      # macOS
#    pnpm --filter @workspace/desktop run build:linux    # Linux AppImage
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

PLATFORM_FLAG="${1:-}"   # optional: --win | --mac | --linux

# ── Resolve directories ───────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$DESKTOP_DIR")")"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Almuzini EHR — Desktop Builder         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 0: validate credentials ─────────────────────────────────────────────
if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "✗ Error: SUPABASE_URL is not set." >&2
  echo "  Set it before running: export SUPABASE_URL=https://xxxx.supabase.co" >&2
  exit 1
fi
if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "✗ Error: SUPABASE_ANON_KEY is not set." >&2
  echo "  Set it before running: export SUPABASE_ANON_KEY=eyJ..." >&2
  exit 1
fi

echo "✓ Credentials found."

# ── Step 1: write config.json (bundled into the installer) ───────────────────
echo "1/4  Writing config.json..."
cat > "$DESKTOP_DIR/config.json" <<JSON
{
  "supabaseUrl": "${SUPABASE_URL}",
  "supabaseAnonKey": "${SUPABASE_ANON_KEY}"
}
JSON
echo "     → $DESKTOP_DIR/config.json"

# ── Step 2: build the API server ─────────────────────────────────────────────
echo "2/4  Building API server (Express + esbuild)..."
cd "$REPO_ROOT"
pnpm --filter @workspace/api-server run build
echo "     → artifacts/api-server/dist/"

# ── Step 3: build the React frontend ─────────────────────────────────────────
echo "3/4  Building frontend (Vite + React)..."
BASE_PATH=/ PORT=19866 \
  VITE_SUPABASE_URL="${SUPABASE_URL}" \
  VITE_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  pnpm --filter @workspace/ehr run build
echo "     → artifacts/ehr/dist/public/"

# ── Step 4: package with electron-builder ────────────────────────────────────
echo "4/4  Packaging with electron-builder..."
cd "$DESKTOP_DIR"
if [[ -n "$PLATFORM_FLAG" ]]; then
  pnpm exec electron-builder "$PLATFORM_FLAG"
else
  pnpm exec electron-builder
fi

# ── Cleanup: remove config.json with credentials ──────────────────────────────
rm -f "$DESKTOP_DIR/config.json"
echo "     ✓ Cleaned up config.json"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Build complete!                        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Installer output:  artifacts/desktop/dist-electron/"
echo ""
