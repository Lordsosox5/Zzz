/* ═══════════════════════════════════════════════════════════════════════
   report-print.ts
   Professional browser-print reporting for Almuzini Children Hospital EHR.
   Opens a styled HTML window and calls window.print() — zero external deps.
   IMPORTANT: No patient names, IDs, or any PII is ever included.
              Only aggregate statistics and anonymised distributions.
════════════════════════════════════════════════════════════════════════ */

export interface PrintKpi {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

export interface PrintTrendPoint {
  name: string;
  count: number;
}

export interface PrintDistRow {
  label: string;
  count: number;
  color?: string;
}

export interface PrintDist {
  title: string;
  rows: PrintDistRow[];
}

export interface PrintSection {
  title: string;
  accent: string;
  kpis: PrintKpi[];
  trendData: PrintTrendPoint[];
  trendLabel: string;
  distributions: PrintDist[];
  analysis: string[];
}

export interface PrintReportOptions {
  reportTitle: string;
  period: string;
  dateRange: string;
  language: "en" | "ar";
  sections: PrintSection[];
}

/* ─────────────────────── SVG Inline Bar Chart ─────────────────────── */
function svgBarChart(data: PrintTrendPoint[], color: string, label: string): string {
  if (!data.length) return "";
  const W = 540, H = 90;
  const max = Math.max(...data.map(d => d.count), 1);
  const n = data.length;
  const barW = Math.max((W * 0.78) / n - 3, 3);
  const gap = (W - barW * n) / (n + 1);

  const gridLines = [0.25, 0.5, 0.75, 1].map(f => {
    const y = H - f * H;
    return `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.6"/>
            <text x="-4" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af">${Math.round(max * f)}</text>`;
  }).join("");

  const bars = data.map((d, i) => {
    const bh = Math.max((d.count / max) * H, d.count > 0 ? 3 : 0);
    const x = (gap + i * (barW + gap)).toFixed(1);
    const y = (H - bh).toFixed(1);
    const cx = (gap + i * (barW + gap) + barW / 2).toFixed(1);
    const name = d.name.length > 7 ? d.name.slice(0, 7) + "…" : d.name;
    return [
      `<rect x="${x}" y="${y}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" rx="2.5" opacity="0.88"/>`,
      d.count > 0
        ? `<text x="${cx}" y="${(Number(y) - 2.5).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#374151">${d.count}</text>`
        : "",
      `<text x="${cx}" y="${(H + 13).toFixed(1)}" text-anchor="middle" font-size="7" fill="#6b7280">${name}</text>`,
    ].join("");
  }).join("");

  return `
    <div class="chart-wrap">
      <div class="chart-label">${label}</div>
      <svg viewBox="-28 -6 ${W + 34} ${H + 24}" width="100%" style="max-height:136px;overflow:visible;">
        <rect x="0" y="0" width="${W}" height="${H}" fill="#f8fafc" rx="4"/>
        ${gridLines}
        ${bars}
      </svg>
    </div>`;
}

/* ─────────────────────── KPI Cards ────────────────────────────────── */
function kpiGrid(kpis: PrintKpi[]): string {
  const cards = kpis.map(k => `
    <div class="kpi-card" style="border-top:3px solid ${k.color};">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" style="color:${k.color};">${k.value}</div>
      ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ""}
    </div>`).join("");
  return `<div class="kpi-grid">${cards}</div>`;
}

/* ─────────────────────── Distribution Table ───────────────────────── */
function distTable(dist: PrintDist): string {
  const total = dist.rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) return "";
  const rows = dist.rows.filter(r => r.count > 0).map(r => {
    const pct = ((r.count / total) * 100).toFixed(1);
    const barPct = ((r.count / total) * 100).toFixed(1);
    const c = r.color ?? "#3b82f6";
    return `
      <tr>
        <td class="dl"><span class="dot" style="background:${c};"></span>${r.label}</td>
        <td class="dc">${r.count}</td>
        <td class="dp">${pct}%</td>
        <td class="db"><div class="bt"><div class="bf" style="width:${barPct}%;background:${c};"></div></div></td>
      </tr>`;
  }).join("");
  return `
    <div class="dist-block">
      <div class="dist-title">${dist.title}</div>
      <table class="dist-table"><tbody>${rows}</tbody></table>
    </div>`;
}

/* ─────────────────────── Analysis Panel ───────────────────────────── */
function analysisPanel(lines: string[], accent: string, title: string): string {
  if (!lines.length) return "";
  const bg = lightBg(accent);
  return `
    <div class="analysis-wrap" style="border-left:4px solid ${accent};background:${bg};">
      <div class="analysis-title" style="color:${accent};">&#10003; ${title}</div>
      <ul class="analysis-list">
        ${lines.map(l => `<li>${l}</li>`).join("")}
      </ul>
    </div>`;
}

function lightBg(hex: string): string {
  const m: Record<string, string> = {
    "#3b82f6":"#eff6ff","#8b5cf6":"#f5f3ff","#f59e0b":"#fffbeb","#10b981":"#ecfdf5",
    "#ef4444":"#fef2f2","#06b6d4":"#ecfeff","#a855f7":"#faf5ff","#0ea5e9":"#f0f9ff",
    "#2563eb":"#eff6ff","#1d4ed8":"#eff6ff",
  };
  return m[hex.toLowerCase()] ?? "#f8fafc";
}

/* ─────────────────────── One Section Block ────────────────────────── */
function buildSection(s: PrintSection, isAr: boolean): string {
  const analysisTitle = isAr ? "التحليل والاستنتاجات المهنية" : "Analysis & Clinical Insights";
  const dists = s.distributions
    .filter(d => d.rows.some(r => r.count > 0))
    .map(d => distTable(d)).join("");
  return `
    <div class="report-section">
      <div class="sec-header" style="background:${s.accent};">${s.title}</div>
      ${kpiGrid(s.kpis)}
      ${s.trendData.length > 1 ? svgBarChart(s.trendData, s.accent, s.trendLabel) : ""}
      ${dists ? `<div class="dist-grid">${dists}</div>` : ""}
      ${analysisPanel(s.analysis, s.accent, analysisTitle)}
    </div>`;
}

/* ─────────────────────── Full Page HTML ───────────────────────────── */
function buildHTML(opts: PrintReportOptions): string {
  const isAr = opts.language === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const now = new Date().toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "long", timeStyle: "short" });

  const hospName  = isAr ? "مستشفى المزيني للأطفال" : "Almuzini Children Hospital";
  const hospSub   = isAr ? "نظام السجلات الصحية الإلكترونية للأطفال" : "Pediatric Electronic Health Record System";
  const confNote  = isAr
    ? "وثيقة سرية — للاستخدام الداخلي فقط — لا تحتوي على بيانات المرضى الشخصية"
    : "Confidential — Internal Use Only — No Patient Identifiable Information Included";
  const printBtn  = isAr ? "🖨 طباعة" : "🖨 Print";
  const closeBtn  = isAr ? "✕ إغلاق" : "✕ Close";
  const periodLbl = isAr ? "الفترة" : "Period";
  const rangeLbl  = isAr ? "النطاق" : "Date Range";
  const genLbl    = isAr ? "وقت الطباعة" : "Generated";
  const footNote  = isAr ? "مستشفى المزيني للأطفال — وثيقة سرية داخلية" : "Almuzini Children Hospital — Confidential Internal Document";

  const sectionsHTML = opts.sections.map((s, i) =>
    (i > 0 ? '<div class="page-break"></div>' : "") + buildSection(s, isAr)
  ).join("");

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${hospName} — ${opts.reportTitle}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${isAr ? "'Segoe UI Arabic','Tajawal'," : ""}'Segoe UI',Arial,sans-serif;
       font-size:10.5pt;color:#1e293b;background:#fff;direction:${dir};}

  /* ── Print ── */
  @page{size:A4;margin:14mm 16mm 18mm}
  @media print{
    body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    .no-print{display:none!important}
    .page-break{page-break-before:always;break-before:page;height:0}
    .report-section{page-break-inside:avoid}
    .rpt-footer{display:block!important}
  }
  @media screen{.rpt-footer{display:none}}

  /* ── Toolbar ── */
  .toolbar{display:flex;justify-content:space-between;align-items:center;
    padding:10px 20px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;gap:10px}
  .toolbar-title{font-size:9pt;color:#64748b;font-weight:500}
  .btn{padding:7px 18px;border-radius:5px;border:none;cursor:pointer;font-size:9.5pt;font-weight:600;letter-spacing:0.2px}
  .btn-print{background:#1d4ed8;color:#fff}
  .btn-print:hover{background:#1e40af}
  .btn-close{background:#e2e8f0;color:#374151}
  .btn-close:hover{background:#cbd5e1}

  /* ── Report Header ── */
  .rpt-header{background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);color:#fff;
    padding:20px 24px;position:relative;overflow:hidden}
  .rpt-header::before{content:"";position:absolute;top:-40px;right:-40px;
    width:130px;height:130px;background:rgba(255,255,255,0.07);border-radius:50%}
  .rpt-header::after{content:"";position:absolute;bottom:-50px;left:30px;
    width:100px;height:100px;background:rgba(255,255,255,0.05);border-radius:50%}
  .hosp-name{font-size:16pt;font-weight:700;letter-spacing:0.2px;position:relative}
  .hosp-sub{font-size:8pt;color:#93c5fd;margin-top:2px;position:relative}
  .rpt-title{font-size:12pt;font-weight:600;margin-top:10px;padding-top:9px;
    border-top:1px solid rgba(255,255,255,0.2);position:relative}
  .rpt-meta{font-size:7.5pt;color:#bfdbfe;margin-top:5px;
    display:flex;flex-wrap:wrap;gap:12px;position:relative}
  .rpt-meta span{display:flex;align-items:center;gap:4px}

  /* ── Confidential Banner ── */
  .conf-banner{background:#fef9c3;border-bottom:1px solid #fde047;
    padding:5px 24px;font-size:7.5pt;color:#713f12;font-weight:600;text-align:center;
    display:flex;align-items:center;justify-content:center;gap:6px}

  /* ── Section ── */
  .report-section{margin:14px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .sec-header{color:#fff;padding:10px 16px;font-size:10.5pt;font-weight:600}

  /* ── KPI Cards ── */
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));
    gap:10px;padding:14px 16px;background:#f8fafc;border-bottom:1px solid #f1f5f9}
  .kpi-card{background:#fff;border-radius:6px;padding:12px 13px;
    border:1px solid #e2e8f0;border-top-width:3px}
  .kpi-label{font-size:7pt;color:#64748b;font-weight:600;text-transform:uppercase;
    letter-spacing:0.5px;margin-bottom:5px;line-height:1.3}
  .kpi-value{font-size:19pt;font-weight:800;line-height:1.05}
  .kpi-sub{font-size:7.5pt;color:#64748b;margin-top:3px}

  /* ── Chart ── */
  .chart-wrap{padding:12px 16px 4px;background:#fff;border-bottom:1px solid #f1f5f9}
  .chart-label{font-size:8pt;font-weight:700;color:#374151;margin-bottom:8px}

  /* ── Distributions ── */
  .dist-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid #f1f5f9}
  .dist-block{background:#f8fafc;border-radius:6px;padding:12px;border:1px solid #e5e7eb}
  .dist-title{font-size:8pt;font-weight:700;color:#374151;margin-bottom:8px;
    padding-bottom:5px;border-bottom:1px solid #e5e7eb}
  .dist-table{width:100%;border-collapse:collapse}
  .dist-table td{padding:3.5px 3px;font-size:8pt;vertical-align:middle}
  .dl{color:#374151;display:flex;align-items:center;gap:5px}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .dc{text-align:center;font-weight:700;color:#1e293b;width:32px}
  .dp{text-align:center;color:#64748b;font-size:7.5pt;width:36px}
  .db{width:80px}
  .bt{background:#e5e7eb;border-radius:3px;height:5px;overflow:hidden}
  .bf{height:100%;border-radius:3px}

  /* ── Analysis ── */
  .analysis-wrap{margin:12px 16px 14px;border-radius:6px;padding:13px 16px;
    border-left-style:solid;border-left-width:4px}
  .analysis-title{font-size:8.5pt;font-weight:700;margin-bottom:8px}
  .analysis-list{padding-${dir==="rtl"?"right":"left"}:14px;color:#374151}
  .analysis-list li{font-size:8.5pt;line-height:1.75;margin-bottom:1px}

  /* ── Footer ── */
  .rpt-footer{background:#f1f5f9;border-top:1px solid #e2e8f0;padding:7px 24px;
    font-size:7pt;color:#64748b;display:flex;justify-content:space-between;align-items:center;
    margin-top:20px}
</style>
</head>
<body>

<!-- Toolbar (screen only) -->
<div class="toolbar no-print">
  <div class="toolbar-title">&#128196; ${opts.reportTitle} &mdash; ${opts.period}</div>
  <div style="display:flex;gap:8px;">
    <button class="btn btn-close" onclick="window.close()">${closeBtn}</button>
    <button class="btn btn-print" onclick="window.print()">${printBtn}</button>
  </div>
</div>

<!-- Report Header -->
<div class="rpt-header">
  <div class="hosp-name">${hospName}</div>
  <div class="hosp-sub">${hospSub}</div>
  <div class="rpt-title">${opts.reportTitle}</div>
  <div class="rpt-meta">
    <span><b>${periodLbl}:</b>&nbsp;${opts.period}</span>
    <span><b>${rangeLbl}:</b>&nbsp;${opts.dateRange}</span>
    <span><b>${genLbl}:</b>&nbsp;${now}</span>
  </div>
</div>

<!-- Confidential Banner -->
<div class="conf-banner">
  &#9888;&nbsp;${confNote}
</div>

<!-- Sections -->
${sectionsHTML}

<!-- Footer -->
<div class="rpt-footer">
  <span>${footNote}</span>
  <span>${now}</span>
</div>

<script>
  if (window.opener || document.referrer) {
    window.addEventListener('load', function() {
      setTimeout(function(){ window.print(); }, 500);
    });
  }
</script>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════════
   PUBLIC API
════════════════════════════════════════════════════════════════════════ */
export function printReport(opts: PrintReportOptions): void {
  const html = buildHTML(opts);
  const win = window.open("", "_blank", "width=980,height=780,scrollbars=yes,resizable=yes");
  if (!win) {
    alert(
      opts.language === "ar"
        ? "يرجى السماح بالنوافذ المنبثقة لهذا الموقع لاستخدام خاصية الطباعة."
        : "Please allow pop-ups for this site to use the Print feature.",
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
