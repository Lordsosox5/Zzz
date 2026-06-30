# Building Almuzini EHR Desktop (Tauri + Windows)

## Prerequisites

### On Windows (recommended — native Windows build)

1. **Install Rust**: https://rustup.rs/
2. **Install Node.js 20+** and **pnpm**: https://pnpm.io/
3. **Install WebView2** (usually already present on Windows 10/11; if not, install from Microsoft)
4. **Install Build Tools for Visual Studio 2022** (C++ workload) — needed by Rust for MSVC target

### Environment Variables

Before building, set these in your shell (or a `.env` file in this folder):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

These are baked into the binary at build time. Do **not** use your service-role key here — only the public anon key.

---

## Development

```bash
# From the repo root
pnpm install

# Start the Tauri dev window (opens a native window on Windows)
cd artifacts/desktop
pnpm tauri:dev
```

---

## Building a Windows Installer

```bash
cd artifacts/desktop

# Full NSIS + MSI installer for Windows x64
pnpm tauri:build
```

Output: `src-tauri/target/release/bundle/nsis/Almuzini EHR_0.1.0_x64-setup.exe`

### Cross-compile from Linux → Windows (advanced)

```bash
# Install the Windows target and cargo-xwin
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin

# Then build with:
TAURI_ENV_PLATFORM=windows cargo tauri build --target x86_64-pc-windows-msvc -- --config "bundle.targets=[\"nsis\"]"
```

---

## Architecture

The desktop app calls **Supabase directly** — no separate API server needed:

```
Tauri WebView (Windows)
  └── React frontend (src/)
        └── @supabase/supabase-js → Supabase cloud
```

- **Login** authenticates against the `staff` table (supports bcrypt-hashed passwords)
- **Dashboard** queries patient counts, today's appointments, critical lab flags
- **Patients** — full list, search, add new patient
- **Appointments** — day view with date picker

---

## Icon Generation

Before building, generate icons from a 1024×1024 PNG source:

```bash
# From artifacts/desktop/
npx @tauri-apps/cli icon path/to/your-logo-1024x1024.png
```

This generates all required sizes under `src-tauri/icons/`.
