---
name: Supabase REST-only backend
description: All API routes use @supabase/supabase-js; direct DB is DNS-blocked; Node 20 needs ws package for realtime.
---

## Rule
All 14 route files (`auth`, `patients`, `appointments`, `clinical`, `prescriptions`, `lab`, `billing`, `pharmacy`, `staff`, `vaccinations`, `admissions`, `discharge-summaries`, `dashboard`, `units`) use the `supabase` client from `artifacts/api-server/src/lib/supabase.ts`. Drizzle ORM is no longer used by any route.

**Why:** Supabase direct DB host (`db.PROJECT.supabase.co`) and all pooler regions are DNS-unresolvable from Replit. Only the Supabase REST API (PostgREST) is reachable.

## How to apply
- Use `supabase.from('table').select/insert/update` for all DB operations.
- Columns in Supabase are `snake_case`; use `toSnake()` before inserts/updates, `mapRow()`/`mapRows()` to convert responses back to camelCase.
- `dbError(error, res)` returns `true` and sends the error response if Supabase returned an error.
- **Node 20 WebSocket fix**: `createClient` must include `realtime: { transport: ws }` (import `ws` from the `ws` package), otherwise startup crashes with "Node.js 20 detected without native WebSocket support".
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are in Replit userenv (`.replit`). RLS is open on all tables (anon key works).
- `initMrnCounter()` in `patients.ts` queries the Supabase `patients` table for the max MRN on startup.
- `units.ts` exports `units[]` array (in-memory cache) populated via `refreshUnitsCache()` from Supabase; `patients.ts` imports this for unit lookups.
