---
name: Supabase to Replit DB migration
description: How the original Supabase client was replaced with Drizzle ORM + Replit PostgreSQL in all API routes
---

# Supabase → Replit DB Migration

**Why:** The project originally used `@supabase/supabase-js` in all Express routes, requiring `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars. These weren't available in Replit environment, so the backend crashed on startup.

**What changed:**
- `artifacts/api-server/src/lib/db.ts` — re-exports `db` from `@workspace/db` and all Drizzle table objects + a `dbError` helper
- `artifacts/api-server/src/lib/supabase.ts` — still exists but is no longer imported anywhere
- All 11 route files now import from `../lib/db` using Drizzle ORM query builders (`eq`, `and`, `gte`, `lte`, `ilike`, `asc`, `desc`, `sql`)

**How to apply:** If adding new routes, import from `../lib/db` not `../lib/supabase`. Use Drizzle's typed query builder.

**Database:** Replit PostgreSQL provisioned; schema pushed via `pnpm --filter @workspace/db run push`; demo data seeded (8 users, 5 patients, drugs, alerts, activity logs).
