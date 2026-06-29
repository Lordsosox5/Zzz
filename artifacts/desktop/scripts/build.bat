@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  Almuzini EHR — Desktop Build Script (Windows)
REM  Usage:
REM    set SUPABASE_URL=https://xxxx.supabase.co
REM    set SUPABASE_ANON_KEY=eyJ...
REM    pnpm --filter @workspace/desktop run build
REM ═══════════════════════════════════════════════════════════════════════════
setlocal enabledelayedexpansion

echo.
echo  Almuzini EHR - Desktop Builder (Windows)
echo ==========================================
echo.

REM ── Validate credentials ──────────────────────────────────────────────────
if "%SUPABASE_URL%"=="" (
  echo Error: SUPABASE_URL is not set. >&2
  echo Set it first: set SUPABASE_URL=https://xxxx.supabase.co >&2
  exit /b 1
)
if "%SUPABASE_ANON_KEY%"=="" (
  echo Error: SUPABASE_ANON_KEY is not set. >&2
  exit /b 1
)

echo [OK] Credentials found.

REM ── Write config.json ────────────────────────────────────────────────────
echo [1/4] Writing config.json...
(
  echo {
  echo   "supabaseUrl": "%SUPABASE_URL%",
  echo   "supabaseAnonKey": "%SUPABASE_ANON_KEY%"
  echo }
) > config.json
if %errorlevel% neq 0 ( echo Failed to write config.json & exit /b 1 )

REM ── Build API server ──────────────────────────────────────────────────────
echo [2/4] Building API server...
cd ..\..
pnpm --filter @workspace/api-server run build
if %errorlevel% neq 0 ( echo API server build failed & exit /b 1 )

REM ── Build frontend ────────────────────────────────────────────────────────
echo [3/4] Building React frontend...
set BASE_PATH=/
set PORT=19866
set VITE_SUPABASE_URL=%SUPABASE_URL%
set VITE_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
pnpm --filter @workspace/ehr run build
if %errorlevel% neq 0 ( echo Frontend build failed & exit /b 1 )

REM ── Package Electron ──────────────────────────────────────────────────────
echo [4/4] Packaging with electron-builder...
cd artifacts\desktop
pnpm exec electron-builder --win
if %errorlevel% neq 0 ( echo Electron build failed & exit /b 1 )

REM ── Cleanup ───────────────────────────────────────────────────────────────
del /f /q config.json 2>nul
echo [OK] Cleaned up config.json

echo.
echo  Build complete!
echo  Installer output: artifacts\desktop\dist-electron\
echo.
endlocal
