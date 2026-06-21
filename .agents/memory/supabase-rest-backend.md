---
name: Supabase REST-only backend
description: All API routes use @supabase/supabase-js; direct DB is DNS-blocked; Node 20 needs ws package for realtime.
---

## Rule
All route files (`auth`, `patients`, `appointments`, `clinical`, `prescriptions`, `lab`, `billing`, `pharmacy`, `staff`, `vaccinations`, `admissions`, `discharge-summaries`, `dashboard`, `units`) use the `supabase` client from `artifacts/api-server/src/lib/supabase.ts`. Drizzle ORM is **permanently removed** from all routes.

**Why:** Supabase direct DB host (`db.PROJECT.supabase.co`) and all pooler regions are DNS-unresolvable from Replit. Only the Supabase REST API (PostgREST) is reachable.

## How to apply
- Use `supabase.from('table').select/insert/update` for all DB operations.
- Columns in Supabase are `snake_case`; use `toSnake()` before inserts/updates, `mapRow()`/`mapRows()` to convert responses back to camelCase.
- `dbError(error, res)` returns `true` and sends the error response if Supabase returned an error.
- **Node 20 WebSocket fix**: `createClient` must include `realtime: { transport: ws }` (import `ws` from the `ws` package), otherwise startup crashes with "Node.js 20 detected without native WebSocket support".
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are Replit Secrets. RLS is open on all tables (anon key works).
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are Replit shared env vars (auto-available to Vite).

## On import / first-time setup
Only two manual steps are needed after importing the project:
1. Add `SUPABASE_URL` = `https://vhiekleynomremcampnd.supabase.co` as a Replit Secret
2. Add `SUPABASE_ANON_KEY` = (anon key) as a Replit Secret

Everything else is baked into code/config:
- `post-merge.sh` runs only `pnpm install --frozen-lockfile` (no db push needed)
- The "Start application" workflow runs: `pnpm install && PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=5000 BASE_PATH=/ pnpm --filter @workspace/ehr run dev`
- No Replit PostgreSQL / Drizzle push step — Supabase is the only DB

## initMrnCounter / initInvoiceCounter
Both read from Supabase on startup to sync in-memory counters. Acceptable for demo; use DB sequences for production.
