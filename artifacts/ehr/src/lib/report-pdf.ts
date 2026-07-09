/* ══════════════════════════════════════════════════════════════════════
   Report Print  — browser window.print() (no jsPDF dependency)
   • Works perfectly with Arabic RTL via native browser text shaping
   • Professional A4 layout via @media print CSS
   • No patient names exposed
══════════════════════════════════════════════════════════════════════ */

export interface PdfKpi {
  label: string;
  value: string | number;
  sub?: string;
}

export interface PdfTrendPoint {
  name: string;
  count: number;
}

export interface PdfTableRow {
  [key: string]: string | number | null | undefined;
}

export interface ReportPdfOptions {
  reportType: string;
  period: string;
  dateRange: string;
  language: "en" | "ar";
  kpis: PdfKpi[];
  trendData: PdfTrendPoint[];
  trendLabel: string;
  tableColumns: string[];
  tableRows: PdfTableRow[];
  interpretation: string[];
}

export interface OverallSection {
  title: string;
  color: [number, number, number];
  kpis: PdfKpi[];
  trendData: PdfTrendPoint[];
  trendLabel: string;
  tableColumns: string[];
  tableRows: PdfTableRow[];
  interpretation: string[];
}

export interface OverallReportPdfOptions {
  period: string;
  dateRange: string;
  language: "en" | "ar";
  sections: OverallSection[];
  execKpis: PdfKpi[];
}

/* ── Colour palette ─────────────────────────────────────────────────── */
const KPI_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function rgb(c: [number, number, number]) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* ── Base HTML shell ─────────────────────────────────────────────────── */
function htmlShell(title: string, body: string, lang: "en" | "ar"): string {
  const isRtl = lang === "ar";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --blue: #2563eb;
    --blue-light: #eff6ff;
    --blue-dark: #1e40af;
    --green: #10b981;
    --amber: #f59e0b;
    --red: #ef4444;
    --gray-900: #0f172a;
    --gray-700: #334155;
    --gray-500: #64748b;
    --gray-200: #e2e8f0;
    --gray-100: #f1f5f9;
    --gray-50: #f8fafc;
  }
  html { font-size: 13px; }
  body {
    font-family: ${isRtl ? "'Tajawal', Arial, sans-serif" : "'Inter', 'Helvetica Neue', Arial, sans-serif"};
    color: var(--gray-900);
    background: #fff;
    direction: ${isRtl ? "rtl" : "ltr"};
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  @media print {
    html { font-size: 11px; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }
  }

  /* ── Layout ── */
  .page { max-width: 794px; margin: 0 auto; background: #fff; }

  /* ── Header ── */
  .report-header {
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%);
    color: #fff;
    padding: 28px 36px 22px;
    position: relative;
    overflow: hidden;
  }
  .report-header::before {
    content: "";
    position: absolute;
    top: -30px; ${isRtl ? "left" : "right"}: -30px;
    width: 120px; height: 120px;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
  }
  .report-header::after {
    content: "";
    position: absolute;
    bottom: -20px; ${isRtl ? "right" : "left"}: 30px;
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(255,255,255,0.05);
  }
  .hospital-name { font-size: 20px; font-weight: 800; letter-spacing: ${isRtl ? "0" : "-.3px"}; }
  .hospital-sub  { font-size: 11px; color: #bfdbfe; margin-top: 2px; font-weight: 500; }
  .report-title  { font-size: 15px; font-weight: 700; margin-top: 12px; }
  .report-meta   { font-size: 10px; color: #bfdbfe; margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap; }

  /* ── Confidential ribbon ── */
  .ribbon {
    background: #1e40af;
    color: #bfdbfe;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 4px 36px;
    text-align: center;
  }

  /* ── Section label ── */
  .section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--gray-500);
    padding: 16px 36px 8px;
  }

  /* ── KPI strip ── */
  .kpi-row {
    display: flex;
    gap: 10px;
    padding: 0 36px 16px;
    flex-direction: ${isRtl ? "row-reverse" : "row"};
  }
  .kpi-card {
    flex: 1;
    background: var(--gray-50);
    border-radius: 10px;
    padding: 12px 14px;
    border: 1px solid var(--gray-200);
    position: relative;
    overflow: hidden;
  }
  .kpi-accent {
    position: absolute;
    top: 0; ${isRtl ? "right" : "left"}: 0;
    width: 4px;
    height: 100%;
    border-radius: 10px 0 0 10px;
  }
  .kpi-label { font-size: 9.5px; color: var(--gray-500); font-weight: 500; text-align: ${isRtl ? "right" : "left"}; }
  .kpi-value { font-size: 22px; font-weight: 800; color: var(--gray-900); text-align: ${isRtl ? "right" : "left"}; line-height: 1.1; margin-top: 3px; }
  .kpi-sub   { font-size: 10px; font-weight: 600; margin-top: 2px; text-align: ${isRtl ? "right" : "left"}; }

  /* ── Mini bar chart ── */
  .chart-wrap {
    margin: 0 36px 16px;
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 10px;
    padding: 14px 16px 10px;
  }
  .chart-label { font-size: 10px; font-weight: 600; color: var(--gray-700); margin-bottom: 10px; text-align: ${isRtl ? "right" : "left"}; }
  .bars-row {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 90px;
    direction: ltr;
  }
  .bar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
    gap: 3px;
    min-width: 0;
    height: 100%;
  }
  .bar-val  { font-size: 8px; color: var(--gray-700); font-weight: 600; }
  .bar-body { width: 100%; border-radius: 3px 3px 0 0; min-height: 3px; }
  .bar-name { font-size: 7.5px; color: var(--gray-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: center; }

  /* ── Interpretation box ── */
  .interp-box {
    margin: 0 36px 16px;
    background: var(--blue-light);
    border-radius: 10px;
    padding: 14px 18px;
    border: 1px solid #bfdbfe;
    border-${isRtl ? "right" : "left"}: 4px solid var(--blue);
  }
  .interp-title { font-size: 10px; font-weight: 700; color: var(--blue); margin-bottom: 8px; text-align: ${isRtl ? "right" : "left"}; }
  .interp-line  { font-size: 11px; color: var(--gray-700); margin-bottom: 5px; line-height: 1.65; text-align: ${isRtl ? "right" : "left"}; }

  /* ── Data table ── */
  .table-wrap { margin: 0 36px 16px; }
  .table-title { font-size: 10px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px; text-align: ${isRtl ? "right" : "left"}; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; direction: ${isRtl ? "rtl" : "ltr"}; }
  th {
    background: var(--blue);
    color: #fff;
    padding: 7px 10px;
    font-weight: 600;
    font-size: 10px;
    text-align: ${isRtl ? "right" : "left"};
    border: 1px solid #1d4ed8;
  }
  td {
    padding: 6px 10px;
    text-align: ${isRtl ? "right" : "left"};
    border: 1px solid var(--gray-200);
    color: var(--gray-700);
    font-size: 10px;
  }
  tr:nth-child(even) td { background: var(--gray-50); }

  /* ── Section divider for overall report ── */
  .section-header {
    padding: 10px 36px;
    margin-bottom: 0;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: rgba(255,255,255,0.7);
    flex-shrink: 0;
  }

  /* ── Summary table ── */
  .summary-table-wrap { padding: 0 36px 16px; }

  /* ── Footer ── */
  .report-footer {
    background: var(--gray-100);
    border-top: 1px solid var(--gray-200);
    padding: 8px 36px;
    font-size: 9px;
    color: var(--gray-500);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* ── Print button (screen only) ── */
  .print-bar {
    background: #1e40af;
    color: #fff;
    padding: 12px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }
  .print-btn {
    background: #fff;
    color: #1e40af;
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
  }
  .print-btn:hover { background: #eff6ff; }
</style>
</head>
<body>
<div class="no-print print-bar">
  <span>${isRtl ? "مستشفى المزيني للأطفال — معاينة التقرير" : "Almuzini Children Hospital — Report Preview"}</span>
  <button class="print-btn" onclick="window.print()">🖨 ${isRtl ? "طباعة / حفظ PDF" : "Print / Save PDF"}</button>
</div>
<div class="page">
${body}
</div>
<script>
  // Auto-print after fonts load
  document.fonts.ready.then(() => {
    setTimeout(() => window.print(), 400);
  });
</script>
</body>
</html>`;
}

/* ── Mini bar chart HTML ────────────────────────────────────────────── */
function barChart(data: PdfTrendPoint[], color: string, label: string): string {
  if (!data.length) return "";
  const max = Math.max(...data.map(d => d.count), 1);
  const bars = data.map(d => {
    const h = Math.max(Math.round((d.count / max) * 84), 3);
    return `
      <div class="bar-col">
        ${d.count > 0 ? `<span class="bar-val">${d.count}</span>` : ""}
        <div class="bar-body" style="height:${h}px;background:${color};"></div>
        <span class="bar-name">${d.name}</span>
      </div>`;
  }).join("");
  return `
    <div class="chart-wrap avoid-break">
      <div class="chart-label">${label}</div>
      <div class="bars-row">${bars}</div>
    </div>`;
}

/* ── KPI row HTML ───────────────────────────────────────────────────── */
function kpiRow(kpis: PdfKpi[]): string {
  const cards = kpis.map((k, i) => {
    const color = KPI_COLORS[i % KPI_COLORS.length];
    return `
      <div class="kpi-card">
        <div class="kpi-accent" style="background:${color};"></div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        ${k.sub ? `<div class="kpi-sub" style="color:${color};">${k.sub}</div>` : ""}
      </div>`;
  }).join("");
  return `<div class="kpi-row">${cards}</div>`;
}

/* ── Interpretation panel HTML ──────────────────────────────────────── */
function interpBox(lines: string[], isRtl: boolean): string {
  if (!lines.length) return "";
  const title = isRtl ? "التحليل والتفسير المهني" : "Professional Analysis & Interpretation";
  const items = lines.map(l => `<div class="interp-line">• ${l}</div>`).join("");
  return `
    <div class="interp-box avoid-break">
      <div class="interp-title">${title}</div>
      ${items}
    </div>`;
}

/* ── Data table HTML ────────────────────────────────────────────────── */
function dataTable(columns: string[], rows: PdfTableRow[], isRtl: boolean, countLabel: string): string {
  if (!rows.length || !columns.length) return "";
  const ths = columns.map(c => `<th>${c}</th>`).join("");
  const trs = rows.slice(0, 80).map(row => {
    const tds = columns.map(col => {
      const key = col.toLowerCase().replace(/\s+/g, "").replace(/[()]/g, "");
      const val = String(row[col] ?? row[key] ?? "—");
      return `<td>${val}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  const label = isRtl
    ? `سجلات الفترة (${rows.length} نتيجة)`
    : `Period Records (${rows.length} entries)`;
  return `
    <div class="table-wrap avoid-break">
      <div class="table-title">${countLabel || label}</div>
      <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    </div>`;
}

/* ── Footer HTML ────────────────────────────────────────────────────── */
function footer(isRtl: boolean, now: string): string {
  const left  = isRtl ? now : "Almuzini Children Hospital — Confidential Medical Report";
  const right = isRtl ? "مستشفى المزيني للأطفال — تقرير طبي سري" : now;
  return `
    <div class="report-footer">
      <span>${left}</span>
      <span>${right}</span>
    </div>`;
}

/* ── Header HTML ────────────────────────────────────────────────────── */
function pageHeader(
  reportTitle: string,
  period: string,
  dateRange: string,
  isRtl: boolean,
  now: string,
): string {
  const hospitalName = isRtl ? "مستشفى المزيني للأطفال" : "Almuzini Children Hospital";
  const hospitalSub  = isRtl ? "نظام السجلات الصحية الإلكترونية للأطفال" : "Pediatric Electronic Health Record System";
  const periodLabel  = isRtl ? "الفترة" : "Period";
  const generatedLabel = isRtl ? "التاريخ" : "Generated";
  return `
    <div class="report-header">
      <div class="hospital-name">${hospitalName}</div>
      <div class="hospital-sub">${hospitalSub}</div>
      <div class="report-title">${reportTitle}</div>
      <div class="report-meta">
        <span>${periodLabel}: ${period}</span>
        <span>${dateRange}</span>
        <span>${generatedLabel}: ${now}</span>
      </div>
    </div>
    <div class="ribbon">${isRtl ? "تقرير طبي سري — للاستخدام الداخلي فقط" : "Confidential Medical Report — Internal Use Only"}</div>`;
}

/* ── Open print window ──────────────────────────────────────────────── */
function openPrintWindow(html: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow popups for this page to print reports.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

/* ══════════════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════════════ */

export async function generateReportPDF(opts: ReportPdfOptions) {
  const isRtl = opts.language === "ar";
  const now = new Date().toLocaleString(isRtl ? "ar-SA" : "en-GB");

  const title = isRtl
    ? `تقرير ${opts.reportType} — ${opts.period}`
    : `${opts.reportType} Report — ${opts.period}`;

  const kpiSectionLabel = isRtl ? "مؤشرات الأداء الرئيسية" : "KEY PERFORMANCE INDICATORS";
  const countLabel = isRtl
    ? `سجلات الفترة (${opts.tableRows.length} نتيجة)`
    : `Period Records (${opts.tableRows.length} entries)`;

  const body = `
    ${pageHeader(title, opts.period, opts.dateRange, isRtl, now)}
    <div class="section-label">${kpiSectionLabel}</div>
    ${kpiRow(opts.kpis)}
    ${opts.trendData.length > 1 ? barChart(opts.trendData, "#2563eb", opts.trendLabel) : ""}
    ${interpBox(opts.interpretation, isRtl)}
    ${dataTable(opts.tableColumns, opts.tableRows, isRtl, countLabel)}
    ${footer(isRtl, now)}
  `;

  openPrintWindow(htmlShell(title, body, opts.language));
}

export async function generateOverallReportPDF(opts: OverallReportPdfOptions) {
  const isRtl = opts.language === "ar";
  const now = new Date().toLocaleString(isRtl ? "ar-SA" : "en-GB");

  const title = isRtl
    ? `التقرير الشامل — ${opts.period}`
    : `Overall Hospital Report — ${opts.period}`;

  /* ── Executive summary table ── */
  const colsAr = ["القسم", "الإجمالي", "المكتمل / المحصّل", "معلق", "التحليل المختصر"];
  const colsEn = ["Department", "Total", "Completed / Collected", "Pending", "Key Insight"];
  const cols = isRtl ? colsAr : colsEn;
  const summaryThs = cols.map(c => `<th>${c}</th>`).join("");
  const summaryTrs = opts.sections.map((s, si) => {
    const color = rgb(s.color);
    const total = String(s.kpis[0]?.value ?? "—");
    const good  = String(s.kpis[1]?.value ?? "—") + (s.kpis[1]?.sub ? ` (${s.kpis[1].sub})` : "");
    const pend  = String(s.kpis[2]?.value ?? "—");
    const note  = (s.interpretation[0] ?? "").substring(0, 70) + (s.interpretation[0]?.length > 70 ? "…" : "");
    const bg    = si % 2 === 0 ? "#fff" : "var(--gray-50)";
    return `<tr style="background:${bg};">
      <td style="font-weight:600;border-${isRtl ? "right" : "left"}:4px solid ${color};">${s.title}</td>
      <td style="font-weight:700;">${total}</td>
      <td style="color:#10b981;font-weight:600;">${good}</td>
      <td style="color:#f59e0b;font-weight:600;">${pend}</td>
      <td style="font-size:9.5px;color:var(--gray-500);">${note}</td>
    </tr>`;
  }).join("");

  /* ── Combined trend chart ── */
  const combinedMap: Record<string, number> = {};
  opts.sections.forEach(s => s.trendData.forEach(d => {
    combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count;
  }));
  const combined = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));

  /* ── Exec KPI row ── */
  const kpiSectionLabel = isRtl ? "الملخص التنفيذي — جميع الأقسام" : "EXECUTIVE SUMMARY — ALL DEPARTMENTS";
  const summaryLabel    = isRtl ? "مؤشرات الأداء" : "PERFORMANCE OVERVIEW";

  const body = `
    ${pageHeader(title, opts.period, opts.dateRange, isRtl, now)}

    <div class="section-label">${kpiSectionLabel}</div>
    ${kpiRow(opts.execKpis)}

    <div class="section-label">${summaryLabel}</div>
    <div class="summary-table-wrap avoid-break">
      <table><thead><tr>${summaryThs}</tr></thead><tbody>${summaryTrs}</tbody></table>
    </div>

    ${combined.length > 1
      ? barChart(combined, "#2563eb",
          isRtl ? "النشاط الكلي للمستشفى خلال الفترة" : "Combined Hospital Activity Over Period")
      : ""}

    ${opts.sections.map((s, si) => {
      const color = rgb(s.color);
      const sectionTitle = isRtl ? `تفاصيل: ${s.title}` : `Detail: ${s.title}`;
      const pb = si > 0 ? ' class="page-break"' : "";
      const kpiColors = [color, color, color, color];
      const kCards = s.kpis.map((k, i) => `
        <div class="kpi-card">
          <div class="kpi-accent" style="background:${kpiColors[i % kpiColors.length]};"></div>
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.value}</div>
          ${k.sub ? `<div class="kpi-sub" style="color:${color};">${k.sub}</div>` : ""}
        </div>`).join("");

      return `
        <div${pb}>
          <div class="section-header" style="background:${color};">
            <div class="section-dot"></div>
            ${sectionTitle}
          </div>
          <div class="kpi-row">${kCards}</div>
          ${s.trendData.length > 1 ? barChart(s.trendData, color, s.trendLabel) : ""}
          ${interpBox(s.interpretation.slice(0, 3), isRtl)}
        </div>`;
    }).join("")}

    ${footer(isRtl, now)}
  `;

  openPrintWindow(htmlShell(title, body, opts.language));
}
