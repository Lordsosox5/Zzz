---
name: Arabic PDF export
description: How Arabic PDF export works in the Reports module — font sourcing, shaping, and BiDi reversal.
---

## Font
- Source: `artifacts/ehr/node_modules/@fontsource/tajawal/files/tajawal-arabic-400-normal.woff`
- Converted to TTF via a custom Node.js WOFF→TTF parser (strips WOFF header, decompresses zlib tables, writes TTF offset table).
- Output: `artifacts/ehr/public/fonts/tajawal-regular.ttf` (27 KB, 14 tables).
- Served at `/fonts/tajawal-regular.ttf` by Vite from the `public/` folder.
- Loaded at runtime by `loadArabicFont(doc)` in `report-pdf.ts`; base64 is cached in `_tajawalB64` so only one fetch per session.

## Arabic text pipeline (in report-pdf.ts)
1. `shapeArabic(text)` — maps each Arabic char to its contextual Unicode Presentation Form (FE70–FEFF block) based on neighbors. Uses `AF` table (47 chars, including extended: پ چ ک گ ی) and `NO_LEFT` set for right-join-only chars (ا و ر ز etc.).
2. `reverseForLtr(text)` — splits by space; reverses word order; reverses characters within purely-Arabic words only (numbers/Latin stay LTR).
3. `ar(text)` = shapeArabic + reverseForLtr, applied to all Arabic strings before passing to jsPDF.
4. All jsPDF `text()` calls use `align: 'right'` when `isRtl`.
5. `autoTable` headStyles/bodyStyles use `font: 'Tajawal'` and `halign: 'right'` when `isRtl`.

## Async
- `generateReportPDF` and `generateOverallReportPDF` are both `async`.
- `exportToPDF` in `reports.tsx` is `async` and `await`s each generator.

**Why:** jsPDF renders LTR only; without shaping, Arabic letters appear isolated (not joined). Without reversal, words appear in wrong visual order. The combined pipeline produces correctly connected and ordered Arabic text.

**How to apply:** Wrap all Arabic strings with `t(str)` inside the generators (t = `ar` when isRtl, identity when not). Never pass raw Arabic to `doc.text()` directly.
