# Almuzini Children Hospital EHR

A full-stack enterprise pediatric Electronic Health Record (EHR) / Hospital Information System (HIS) platform for مستشفى المزيني للأطفال (Almuzini Children Hospital). Bilingual (Arabic RTL + English LTR), dark/light mode, role-based access, and all major clinical modules.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## ⚠️ First-time setup (after importing this project)

The only manual step required is adding two Replit Secrets. Everything else is already configured in the code.

Go to **Secrets** in the left panel and add:

| Secret key | Value |
|---|---|
| `SUPABASE_URL` | `https://vhiekleynomremcampnd.supabase.co` |
| `SUPABASE_ANON_KEY` | _(your Supabase anon key)_ |

Then click **Run**. The app will start automatically.

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- API: Express 5 (port 8080, proxied at `/api`)
- Frontend: React + Vite (port 5000, proxied at `/`)
- Database: **Supabase** (PostgreSQL via REST API using `@supabase/supabase-js`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- UI: shadcn/ui, Tailwind CSS, Tajawal font

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/db/src/schema/index.ts` — Drizzle ORM schemas (used for type definitions only)
- `lib/api-client-react/src/` — generated hooks + Zod schemas
- `artifacts/api-server/src/routes/` — all Express route handlers (use Supabase client)
- `artifacts/api-server/src/lib/supabase.ts` — Supabase client + helpers (mapRow, mapRows, toSnake)
- `artifacts/ehr/src/pages/` — all frontend pages
- `artifacts/ehr/src/lib/auth.ts` — token storage + `setAuthTokenGetter` initialization
- `artifacts/ehr/src/lib/supabase.ts` — Supabase client for the frontend
- `artifacts/ehr/src/lib/i18n.tsx` — bilingual translation context

## Architecture decisions

- **Database: Supabase via REST API** — all backend routes use `@supabase/supabase-js` client with `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Direct PostgreSQL connections are not used. Data returned in snake_case is converted to camelCase via `mapRow()`/`mapRows()`. Inserts/updates are converted from camelCase to snake_case via `toSnake()`.
- **Token auth (not cookie auth)**: token stored in localStorage, injected via `setAuthTokenGetter` in `lib/api-client-react/src/custom-fetch.ts`. Auth is decoded server-side from base64 (MVP; upgrade to JWT for production).
- **Password storage in plaintext** (MVP only — seed users have simple passwords for demo). Upgrade to bcrypt for production.
- **In-memory MRN/invoice counters**: counters reset on server restart. Acceptable for demo; use a DB sequence for production.
- **Bilingual RTL/LTR**: language toggle updates `dir` and `lang` on `<html>` element; all UI strings in `i18n.tsx` translation object.
- **Role-based access**: roles stored in `users.role` column (super_admin, pediatric_consultant, pediatric_specialist, nurse, emergency_physician, pharmacist, lab_technician, billing_officer).

## Product

- **Dashboard**: stats (patients, appointments, bed occupancy, alerts, revenue), today's appointments, recent activity feed, alerts panel
- **Patients**: searchable list with MRN, registration form, patient profile with tabs (notes, prescriptions, labs, vaccinations, growth)
- **Appointments**: scheduler with date filter, status management
- **Clinical Notes**: SOAP and progress notes
- **Diagnoses**: ICD-10 coded diagnoses per patient
- **Prescriptions**: Rx management by patient/status
- **Laboratory**: orders, results (critical results flagged), pending/resulted status
- **Radiology**: orders by modality (X-Ray/CT/MRI/Ultrasound), report entry
- **Pharmacy**: drug inventory with low-stock alerts, controlled substances flag
- **Billing**: invoices with paid/pending/partial status, revenue stats
- **Staff**: directory by role/department
- **Vaccinations**: registry per patient
- **Growth Monitoring**: weight/height/BMI charts with percentile tracking
- **Settings**: language, dark mode, user profile

## Demo credentials

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Super Admin |
| dr.sarah | password123 | Pediatric Consultant |
| dr.khalid | password123 | Pediatric Specialist |
| nurse.fatima | password123 | Nurse |
| dr.omar | password123 | Emergency Physician |
| pharmacist.noor | password123 | Pharmacist |
| lab.tech | password123 | Lab Technician |
| billing.officer | password123 | Billing Officer |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- All API routes use the Supabase client — do NOT revert to Drizzle ORM for data access
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be set as Replit Secrets (not env vars)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set as shared env vars (auto-available)
- Always run `pnpm --filter @workspace/api-spec run codegen` after modifying `lib/api-spec/openapi.yaml`
- Do not add new artifacts to root `tsconfig.json` — it's for libs only
- `pnpm install` must be run after adding new packages to any workspace package
- The `lib/db` schema is kept for type inference only — Drizzle push is no longer needed

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
