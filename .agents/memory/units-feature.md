---
name: Units feature implementation
description: Hospital units management page, API route, new staff roles, and unit selector in new-patient form.
---

## What was built
- **`artifacts/api-server/src/routes/units.ts`** — In-memory CRUD (GET/POST/PATCH) for units; seeded with 6 defaults (General Pediatrics, PICU, NICU, Emergency, Surgical Ward, Outpatient Clinic). Registered in routes/index.ts.
- **`artifacts/ehr/src/pages/units.tsx`** — Full management page: type-badge cards grid, add/edit dialog, activate/deactivate, filter by type; uses `useListUnits`/`useCreateUnit`/`useUpdateUnit` hooks.
- **`lib/api-spec/openapi.yaml`** — Added `/units`, `/units/{id}` paths + `Unit`/`UnitInput`/`UnitUpdate` schemas. Also added `unitId` to `PatientInput`/`PatientUpdate`.
- **Codegen re-run** after both schema additions.
- **`artifacts/ehr/src/lib/permissions.ts`** — Added `house_officer` and `medical_officer` roles with full `ROLE_DEFINITIONS` entries + updated `canWriteClinicalNotes`, `canPrescribe`, `canAdmitNewPatient`, `canRecordVitals`, added `canManageUnits`.
- **`artifacts/ehr/src/lib/i18n.tsx`** — Added `nav.units`, all `units.*` keys, `patient.unit`, `staff.houseOfficer`, `staff.medicalOfficer`.
- **`artifacts/ehr/src/components/layout/AppLayout.tsx`** — Added `Building2` icon and `{ href: "/units", icon: Building2, labelKey: "nav.units" }` to `ALL_NAV_ITEMS`.
- **`artifacts/ehr/src/App.tsx`** — Added `import Units` + `/units` protected route.
- **`artifacts/ehr/src/pages/new-patient.tsx`** — Added `useListUnits` import, `unitId` to demo state, unit `<Select>` field in Admission section. UnitId is NOT sent to patient creation API (Supabase patients table lacks `unit_id` column).
- **`artifacts/ehr/src/pages/staff.tsx`** — Added `house_officer` and `medical_officer` to the `ROLES` dropdown.

## Why in-memory for units
Supabase direct DB is not reachable from Replit (see supabase-direct-db.md). In-memory store resets on server restart but works fully for demo. To productionize: create the `units` table in Supabase Dashboard, then switch the route to use the Supabase JS client.
