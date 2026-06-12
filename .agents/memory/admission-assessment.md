---
name: Admission Assessment Feature
description: Architecture decisions for the 5-section new patient admission form and its backend storage.
---

## What was built
- `new-patient.tsx` now has 5 collapsible section cards (color-coded left borders)
- Sections 2-5 are optional; if any field is non-empty they create an `admissionAssessment` record after patient creation
- The sticky submit bar shows a "Clinical data will be saved" badge when sections 2-5 have content

## DB changes
- `patients` table got 5 new columns (ALTER TABLE): `residence`, `weight`, `height`, `admission_date`, `discharge_date`
- New table `admission_assessments` with 30+ text columns covering sections 2-5

**Why:** Separate table keeps patient demographics clean and allows assessment to be created/updated independently of the patient record.

## API
- New routes in `artifacts/api-server/src/routes/admissions.ts`:
  - `GET /api/patients/:id/assessment` — fetch assessment by patient ID
  - `POST /api/admission-assessments` — create assessment
  - `PATCH /api/admission-assessments/:id` — update assessment
- `authorId` defaults to 1 (no auth middleware yet); replace with `req.user.id` when added

## Codegen pipeline
- Source: `lib/api-spec/openapi.yaml`
- Run: `pnpm --filter @workspace/api-spec run codegen`
- Generates both `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`
- Must run codegen after every openapi.yaml change before using new hooks

## DB migration approach
- No drizzle-kit push available; use `psql "$DATABASE_URL" -c "..."` directly
- tsx not available as a standalone binary; api-server also can't exec tsx directly
- psql is always available in the container

**How to apply:** For any future schema changes: 1) edit schema file, 2) psql ALTER/CREATE, 3) edit openapi.yaml, 4) run codegen, 5) restart API server.
