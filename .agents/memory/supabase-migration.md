---
name: Supabase to Replit DB migration (reverted)
description: Routes were temporarily migrated to Drizzle/Replit DB, then reverted back to Supabase client once SUPABASE_ANON_KEY and SUPABASE_DATABASE_URL were provided
---

# Supabase Connection

**Current state:** All API routes use the Supabase JS client via `artifacts/api-server/src/lib/supabase.ts`.

**Required secrets (all set):**
- `SUPABASE_URL` — set in userenv shared (https://vhiekleynomremcampnd.supabase.co)
- `SUPABASE_ANON_KEY` — set as Replit secret
- `SUPABASE_DATABASE_URL` — set as Replit secret (used by drizzle.config.ts for schema migrations)

**How drizzle.config.ts works:** Checks `SUPABASE_DATABASE_URL` first, then falls back to `DATABASE_URL`. When `SUPABASE_DATABASE_URL` is set it also enables `ssl: { rejectUnauthorized: false }`.

**lib/db.ts** still exists (re-exports Drizzle db + tables) but is not used by routes — it was from a temporary Drizzle migration. Routes import from `../lib/supabase` only.

**Why:** User wanted to use their Supabase project as the database, not Replit PostgreSQL.
