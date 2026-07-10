---
name: Patient Excel export anonymization
description: How the Patients page "Export Excel" feature anonymizes data — random Research ID, excluded fields, single-sheet layout.
---

The Patients page bulk Excel export (in `artifacts/ehr/src/pages/patients.tsx`, `handleExport`) is intentionally de-identified for research/compliance use:

- Database ID and MRN are never included — a "Research ID" (`RID-XXXX-NNNN`) is used as the sole row identifier instead. It's a deterministic, salted hash of the patient's real DB id (not `Math.random()`), so the same patient gets the same Research ID on every export, but the real id can't be recovered from it or from the code.
- Patient name, guardian/mother's name, and admission date are excluded from every column.
- Output is a single worksheet (not the previous 12-tab workbook) with one row per patient; related records (diagnoses, prescriptions, labs, radiology, appointments, vaccinations, growth, notes, discharge, invoices) are aggregated into pipe-joined text cells rather than separate sheets, so the whole dataset stays on one page.

**Why:** user explicitly required hiding identifying fields and consolidating multi-sheet output into one page for external/research sharing.

**How to apply:** if new patient-related fields or record types are added, keep following this pattern — no raw DB id/MRN/name/guardian name/admission date in the export, and aggregate any new one-to-many relations into the same single sheet rather than adding new tabs.
