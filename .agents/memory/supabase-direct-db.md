---
name: Supabase direct DB unreachable
description: The Supabase direct database hostname is not DNS-resolvable from Replit containers; only the PostgREST REST API is accessible.
---

## The rule
`db.PROJECTID.supabase.co:5432` gives `ENOTFOUND` — DNS lookup fails from the Replit container.
`executeSql` connects to the Replit local PostgreSQL (`DATABASE_URL`), NOT Supabase.
The Supabase JS client (PostgREST) IS reachable at `https://PROJECTID.supabase.co`.

**Why:** Replit containers block or can't resolve Supabase's direct database hostnames. Only their CDN/REST layer is exposed.

## How to apply
- **Creating new Supabase tables:** Cannot be done via direct psql or pg client from Replit. Options:
  1. Use in-memory store in the API route (acceptable for demo; note to migrate for prod).
  2. Use Supabase Dashboard manually to create tables.
  3. Use Supabase Management API (needs service_role key, not anon key).
- **Schema cache refresh:** `NOTIFY pgrst, 'reload schema'` via executeSql hits the local DB, NOT Supabase PostgREST — ineffective.
- **Workaround used for units:** In-memory store seeded with 6 default units in `artifacts/api-server/src/routes/units.ts`.
- **PostgREST schema cache error:** `"Could not find the table 'public.X' in the schema cache"` means the table doesn't exist in Supabase, not a caching issue.
