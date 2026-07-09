/* ══════════════════════════════════════════════════════════════════════
   Almuzini Hospital — Professional Report Print Engine
   • Pure browser HTML/SVG/CSS — no external libraries
   • Native Arabic RTL via Tajawal font
   • SVG bar charts + donut charts
   • window.print() → browser PDF save
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

export interface PdfDistItem {
  label: string;
  count: number;
  color: string;
}

export interface PdfDistribution {
  title: string;
  data: PdfDistItem[];
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
  distributions?: PdfDistribution[];
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

/* ═══════════════════════════════ COLOURS ════════════════════════════ */
const PALETTE = ["#2563eb","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#a855f7","#ec4899","#84cc16","#f97316"];
function rgb(c: [number,number,number]) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

/* ═══════════════════════════════ SVG CHARTS ══════════════════════════ */

/** Full-width SVG bar chart for trend/time-series data */
function svgBarChart(data: PdfTrendPoint[], color: string, isRtl: boolean): string {
  if (!data.length) return "";
  const W = 520, H = 140;
  const pL = 36, pR = 12, pT = 14, pB = 32;
  const cW = W - pL - pR, cH = H - pT - pB;
  const max = Math.max(...data.map(d => d.count), 1);
  const steps = 4;
  const gridLines = Array.from({length: steps + 1}, (_, i) => {
    const f = i / steps;
    const y = pT + cH * (1 - f);
    const v = Math.round(max * f);
    return `<line x1="${pL}" y1="${y}" x2="${W-pR}" y2="${y}" stroke="#e2e8f0" stroke-width="${i===0?'0.8':'0.5'}" />
            <text x="${pL-4}" y="${y+3.5}" text-anchor="end" font-size="7.5" fill="#94a3b8" font-family="Arial,sans-serif">${v}</text>`;
  }).join("");

  const barW = Math.min((cW / data.length) * 0.55, 28);
  const slot = cW / data.length;
  const bars = data.map((d, i) => {
    const bh = Math.max((d.count / max) * cH, d.count > 0 ? 3 : 0);
    const bx = pL + slot * i + (slot - barW) / 2;
    const by = pT + cH - bh;
    const mx = bx + barW / 2;
    const lbl = d.name.length > 7 ? d.name.slice(0,6)+"…" : d.name;
    return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
              fill="${color}" rx="2.5" ry="2.5" opacity="0.92"/>
            ${d.count > 0 ? `<text x="${mx.toFixed(1)}" y="${(by-2.5).toFixed(1)}" text-anchor="middle" font-size="7" fill="#1e293b" font-weight="600" font-family="Arial,sans-serif">${d.count}</text>` : ""}
            <text x="${mx.toFixed(1)}" y="${(H-3).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#64748b" font-family="Arial,sans-serif">${lbl}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">
    <rect x="${pL}" y="${pT}" width="${cW}" height="${cH}" fill="#f8fafc" rx="4"/>
    ${gridLines}
    ${bars}
    <line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT+cH}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${pL}" y1="${pT+cH}" x2="${W-pR}" y2="${pT+cH}" stroke="#cbd5e1" stroke-width="1"/>
  </svg>`;
}

/** SVG donut chart with inner total + legend */
function svgDonut(data: PdfDistItem[], isRtl: boolean): string {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0 || !data.length) return `<div style="color:#94a3b8;font-size:10px;text-align:center;padding:12px 0;">${isRtl ? "لا توجد بيانات" : "No data"}</div>`;

  const R = 40, r = 25, cx = 50, cy = 50;
  let angle = -Math.PI / 2;
  const segments = data.map(d => {
    const sweep = (d.count / total) * 2 * Math.PI;
    if (sweep < 0.001) { return null; }
    const ea = angle + sweep;
    const lg = sweep > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    const x2 = cx + R * Math.cos(ea),   y2 = cy + R * Math.sin(ea);
    const ix1 = cx + r * Math.cos(angle), iy1 = cy + r * Math.sin(angle);
    const ix2 = cx + r * Math.cos(ea),   iy2 = cy + r * Math.sin(ea);
    const path = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix2.toFixed(2)} ${iy2.toFixed(2)} A${r} ${r} 0 ${lg} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}Z`;
    const seg = { path, color: d.color };
    angle = ea;
    return seg;
  }).filter(Boolean);

  const totalLabel = isRtl ? "الإجمالي" : "Total";
  const legend = data.map(d => {
    const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px;">
      <div style="width:9px;height:9px;border-radius:2px;background:${d.color};flex-shrink:0;"></div>
      <span style="font-size:9px;color:#334155;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.label}</span>
      <span style="font-size:9px;font-weight:700;color:#0f172a;margin:0 2px;">${d.count}</span>
      <span style="font-size:8.5px;color:#64748b;">${pct}%</span>
    </div>`;
  }).join("");

  return `<div style="display:flex;gap:10px;align-items:center;">
    <svg viewBox="0 0 100 100" width="80" height="80" style="flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
      ${segments.map(s => `<path d="${s!.path}" fill="${s!.color}"/>`).join("")}
      <circle cx="${cx}" cy="${cy}" r="${r-1}" fill="white"/>
      <text x="${cx}" y="${cy-5}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Arial,sans-serif">${total}</text>
      <text x="${cx}" y="${cy+8}" text-anchor="middle" font-size="6.5" fill="#64748b" font-family="Arial,sans-serif">${totalLabel}</text>
    </svg>
    <div style="flex:1;min-width:0;">${legend}</div>
  </div>`;
}

/* ═══════════════════════════ HTML BUILDING BLOCKS ══════════════════════ */

function kpiCards(kpis: PdfKpi[], colors: string[]): string {
  const cards = kpis.map((k, i) => {
    const c = colors[i % colors.length];
    return `<div style="flex:1;background:#f8fafc;border-radius:10px;padding:13px 14px 11px;border:1px solid #e2e8f0;position:relative;overflow:hidden;min-width:0;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${c};"></div>
      <div style="font-size:9px;font-weight:600;color:#64748b;margin-bottom:5px;letter-spacing:.3px;">${k.label}</div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.1;">${k.value}</div>
      ${k.sub ? `<div style="font-size:10px;font-weight:600;color:${c};margin-top:3px;">${k.sub}</div>` : ""}
    </div>`;
  }).join("");
  return `<div style="display:flex;gap:10px;">${cards}</div>`;
}

function sectionLabel(text: string, isRtl: boolean): string {
  return `<div style="font-size:8.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#94a3b8;margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;text-align:${isRtl?"right":"left"};">${text}</div>`;
}

function analysisBox(lines: string[], isRtl: boolean): string {
  if (!lines.length) return "";
  const title = isRtl ? "التحليل والتفسير المهني" : "Professional Analysis & Interpretation";
  const items = lines.map(l => `<div style="font-size:10.5px;color:#334155;margin-bottom:5px;line-height:1.7;padding-${isRtl?"right":"left"}:10px;border-${isRtl?"right":"left"}:2px solid #93c5fd;">• ${l}</div>`).join("");
  return `<div style="background:#eff6ff;border-radius:10px;padding:14px 16px;border:1px solid #bfdbfe;border-${isRtl?"right":"left"}:4px solid #2563eb;margin-top:6px;">
    <div style="font-size:9px;font-weight:700;color:#1d4ed8;margin-bottom:9px;letter-spacing:.5px;text-align:${isRtl?"right":"left"};">◈ ${title}</div>
    ${items}
  </div>`;
}

function distributionGrid(dists: PdfDistribution[], isRtl: boolean): string {
  if (!dists.length) return "";
  const cols = dists.map(d => `
    <div style="flex:1;background:#f8fafc;border-radius:10px;padding:12px 14px;border:1px solid #e2e8f0;min-width:0;">
      <div style="font-size:9px;font-weight:700;color:#475569;margin-bottom:10px;text-align:${isRtl?"right":"left"};">${d.title}</div>
      ${svgDonut(d.data, isRtl)}
    </div>`).join("");
  return `<div style="display:flex;gap:10px;">${cols}</div>`;
}

function pageHeader(reportTitle: string, period: string, dateRange: string, isRtl: boolean, now: string): string {
  const hosp = isRtl ? "مستشفى المزيني للأطفال" : "Almuzini Children Hospital";
  const sub  = isRtl ? "نظام السجلات الصحية الإلكترونية للأطفال — طب الأطفال" : "Pediatric Electronic Health Record System";
  const pLbl = isRtl ? "الفترة" : "Period";
  const gLbl = isRtl ? "تاريخ الإصدار" : "Generated";
  const conf = isRtl ? "تقرير طبي سري — للاستخدام الداخلي فقط" : "CONFIDENTIAL MEDICAL REPORT — INTERNAL USE ONLY";
  return `
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#3b82f6 100%);color:white;padding:26px 32px 22px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-25px;${isRtl?"left":"right"}:-25px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
      <div style="position:absolute;bottom:-15px;${isRtl?"right":"left"}:40px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-direction:${isRtl?"row-reverse":"row"};">
        <div>
          <div style="font-size:19px;font-weight:800;letter-spacing:${isRtl?"0":"-.3px"};">${hosp}</div>
          <div style="font-size:10px;color:#bfdbfe;margin-top:2px;font-weight:400;">${sub}</div>
        </div>
        <div style="text-align:${isRtl?"left":"right"};flex-shrink:0;">
          <div style="font-size:9px;color:#bfdbfe;">${gLbl}</div>
          <div style="font-size:10px;font-weight:600;">${now}</div>
        </div>
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.2);">
        <div style="font-size:15px;font-weight:700;">${reportTitle}</div>
        <div style="font-size:10px;color:#bfdbfe;margin-top:3px;">${pLbl}: ${period} &nbsp;•&nbsp; ${dateRange}</div>
      </div>
    </div>
    <div style="background:#1e3a8a;color:#93c5fd;font-size:8px;font-weight:700;letter-spacing:1.8px;padding:4px 32px;text-align:center;">${conf}</div>`;
}

function pageFooter(isRtl: boolean, now: string, page?: string): string {
  const left  = isRtl ? now : "Almuzini Children Hospital  |  Confidential  |  Not for Distribution";
  const right = isRtl ? "مستشفى المزيني للأطفال  |  سري  |  ممنوع التوزيع" : (page ?? "");
  return `<div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:7px 32px;display:flex;justify-content:space-between;align-items:center;margin-top:24px;">
    <span style="font-size:8px;color:#94a3b8;">${left}</span>
    <span style="font-size:8px;color:#94a3b8;">${right}</span>
  </div>`;
}

/* ═══════════════════════════ HTML SHELL ══════════════════════════════ */

function htmlShell(title: string, body: string, lang: "en"|"ar"): string {
  const isRtl = lang === "ar";
  const ff = isRtl ? "'Tajawal', Arial, sans-serif" : "'Inter','Helvetica Neue', Arial, sans-serif";
  const printBtn = isRtl ? "🖨 طباعة / حفظ PDF" : "🖨  Print / Save as PDF";
  const preview  = isRtl ? "مستشفى المزيني للأطفال — معاينة التقرير" : "Almuzini Children Hospital — Report Preview";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl?"rtl":"ltr"}">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{font-size:13px;}
  body{
    font-family:${ff};
    color:#0f172a;
    background:#e5e7eb;
    direction:${isRtl?"rtl":"ltr"};
    line-height:1.5;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  @page{size:A4 portrait;margin:0;}
  @media print{
    html{font-size:11px;}
    body{background:#fff;}
    .no-print{display:none!important;}
    .page{box-shadow:none!important;margin:0!important;}
  }
  .print-bar{
    background:#1e3a8a;color:#fff;padding:10px 28px;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    font-size:12px;position:sticky;top:0;z-index:100;
  }
  .print-btn{
    background:#fff;color:#1e3a8a;border:none;border-radius:6px;
    padding:7px 18px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;
  }
  .print-btn:hover{background:#eff6ff;}
  .page{
    max-width:794px;margin:16px auto;background:#fff;
    box-shadow:0 4px 24px rgba(0,0,0,.15);
  }
  .body-pad{padding:24px 32px;}
</style>
</head>
<body>
<div class="no-print print-bar">
  <span>${preview}</span>
  <button class="print-btn" onclick="window.print()">${printBtn}</button>
</div>
<div class="page">
${body}
</div>
<script>
  document.fonts.ready.then(()=>{setTimeout(()=>window.print(),500);});
</script>
</body>
</html>`;
}

function openPrint(html: string) {
  const w = window.open("","_blank","width=960,height=750");
  if (!w) { alert("Allow popups to print reports."); return; }
  w.document.write(html);
  w.document.close();
}

/* ═══════════════════════════ PUBLIC API ══════════════════════════════ */

export async function generateReportPDF(opts: ReportPdfOptions) {
  const isRtl = opts.language === "ar";
  const now = new Date().toLocaleString(isRtl ? "ar-SA" : "en-GB");
  const title = isRtl
    ? `تقرير ${opts.reportType} — ${opts.period}`
    : `${opts.reportType} Report — ${opts.period}`;

  const kpiLabel  = isRtl ? "مؤشرات الأداء الرئيسية" : "KEY PERFORMANCE INDICATORS";
  const trendLbl  = isRtl ? "الاتجاه الزمني للبيانات" : "ACTIVITY TREND OVER PERIOD";
  const distLbl   = isRtl ? "التوزيع والتحليل الإحصائي" : "DISTRIBUTION ANALYSIS";
  const analLbl   = isRtl ? "التحليل والاستنتاجات" : "INSIGHTS & ANALYSIS";
  const dists     = opts.distributions ?? [];

  const body = `
    ${pageHeader(title, opts.period, opts.dateRange, isRtl, now)}
    <div class="body-pad">
      ${sectionLabel(kpiLabel, isRtl)}
      ${kpiCards(opts.kpis, PALETTE)}

      ${opts.trendData.length > 1 ? `
        ${sectionLabel(trendLbl, isRtl)}
        <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:14px 16px 8px;">
          <div style="font-size:10px;font-weight:600;color:#475569;margin-bottom:6px;text-align:${isRtl?"right":"left"};">${opts.trendLabel}</div>
          ${svgBarChart(opts.trendData, "#2563eb", isRtl)}
        </div>` : ""}

      ${dists.length ? `
        ${sectionLabel(distLbl, isRtl)}
        ${distributionGrid(dists, isRtl)}` : ""}

      ${opts.interpretation.length ? `
        ${sectionLabel(analLbl, isRtl)}
        ${analysisBox(opts.interpretation, isRtl)}` : ""}
    </div>
    ${pageFooter(isRtl, now)}`;

  openPrint(htmlShell(title, body, opts.language));
}

export async function generateOverallReportPDF(opts: OverallReportPdfOptions) {
  const isRtl = opts.language === "ar";
  const now = new Date().toLocaleString(isRtl ? "ar-SA" : "en-GB");
  const title = isRtl
    ? `التقرير الشامل — ${opts.period}`
    : `Overall Hospital Report — ${opts.period}`;

  /* ── Executive KPI ── */
  const execLbl = isRtl ? "الملخص التنفيذي" : "EXECUTIVE SUMMARY";
  const perfLbl = isRtl ? "نظرة عامة على الأداء" : "PERFORMANCE OVERVIEW";
  const actLbl  = isRtl ? "النشاط الكلي للمستشفى خلال الفترة" : "COMBINED HOSPITAL ACTIVITY OVER PERIOD";
  const secLbl  = isRtl ? "تفاصيل الأقسام" : "DEPARTMENT DETAIL";

  /* ── Dept summary table ── */
  const tCol = isRtl ? ["القسم","الإجمالي","مكتمل / محصّل","معلق","التحليل المختصر"] : ["Department","Total","Completed / Collected","Pending","Key Insight"];
  const tHead = tCol.map(c=>`<th style="background:#2563eb;color:white;padding:8px 11px;text-align:${isRtl?"right":"left"};font-size:10px;font-weight:600;border:1px solid #1d4ed8;">${c}</th>`).join("");
  const tRows = opts.sections.map((s, si) => {
    const c  = rgb(s.color);
    const t  = String(s.kpis[0]?.value ?? "—");
    const g  = String(s.kpis[1]?.value ?? "—") + (s.kpis[1]?.sub ? ` (${s.kpis[1].sub})` : "");
    const p  = String(s.kpis[2]?.value ?? "—");
    const n  = (s.interpretation[0] ?? "").slice(0,72) + ((s.interpretation[0]?.length??0)>72?"…":"");
    const bg = si%2===0?"white":"#f8fafc";
    return `<tr style="background:${bg};">
      <td style="padding:7px 11px;border:1px solid #e2e8f0;font-weight:700;font-size:10.5px;border-${isRtl?"right":"left"}:4px solid ${c};">${s.title}</td>
      <td style="padding:7px 11px;border:1px solid #e2e8f0;font-weight:700;font-size:11px;">${t}</td>
      <td style="padding:7px 11px;border:1px solid #e2e8f0;color:#10b981;font-weight:600;font-size:10.5px;">${g}</td>
      <td style="padding:7px 11px;border:1px solid #e2e8f0;color:#f59e0b;font-weight:600;font-size:10.5px;">${p}</td>
      <td style="padding:7px 11px;border:1px solid #e2e8f0;color:#64748b;font-size:9.5px;">${n}</td>
    </tr>`;
  }).join("");

  /* ── Combined trend ── */
  const combinedMap: Record<string,number> = {};
  opts.sections.forEach(s => s.trendData.forEach(d => { combinedMap[d.name] = (combinedMap[d.name]??0) + d.count; }));
  const combined = Object.entries(combinedMap).map(([name,count])=>({name,count}));

  /* ── Per-section mini cards (2 per row) ── */
  const pairs: OverallSection[][] = [];
  for (let i=0; i<opts.sections.length; i+=2) pairs.push(opts.sections.slice(i,i+2));
  const sectionCards = pairs.map(pair => {
    const cards = pair.map(s => {
      const c = rgb(s.color);
      const kpiHtml = s.kpis.slice(0,3).map((k,i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;${i<s.kpis.length-2?"border-bottom:1px dashed #e2e8f0;":""}">
          <span style="font-size:9.5px;color:#64748b;">${k.label}</span>
          <div style="text-align:${isRtl?"left":"right"};">
            <span style="font-size:11px;font-weight:700;color:#0f172a;">${k.value}</span>
            ${k.sub?`<span style="font-size:8.5px;color:${c};margin-${isRtl?"right":"left"}:4px;">(${k.sub})</span>`:""}
          </div>
        </div>`).join("");

      const trendSvg = s.trendData.length > 1
        ? `<div style="margin:10px 0 4px;">${svgBarChart(s.trendData, c, isRtl)}</div>` : "";
      const interp = s.interpretation[0]
        ? `<div style="font-size:9.5px;color:#64748b;padding-${isRtl?"right":"left"}:8px;border-${isRtl?"right":"left"}:2px solid ${c};line-height:1.6;margin-top:8px;">${s.interpretation[0]}</div>` : "";

      return `<div style="flex:1;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;min-width:0;">
        <div style="background:${c};color:white;padding:8px 14px;font-size:11px;font-weight:700;">${s.title}</div>
        <div style="padding:12px 14px;">
          ${kpiHtml}
          ${trendSvg}
          ${interp}
        </div>
      </div>`;
    }).join("");
    return `<div style="display:flex;gap:12px;margin-bottom:12px;">${cards}</div>`;
  }).join("");

  const body = `
    ${pageHeader(title, opts.period, opts.dateRange, isRtl, now)}
    <div class="body-pad">
      ${sectionLabel(execLbl, isRtl)}
      ${kpiCards(opts.execKpis, PALETTE)}

      ${sectionLabel(perfLbl, isRtl)}
      <table style="width:100%;border-collapse:collapse;font-size:10px;direction:${isRtl?"rtl":"ltr"};">
        <thead><tr>${tHead}</tr></thead>
        <tbody>${tRows}</tbody>
      </table>

      ${combined.length > 1 ? `
        ${sectionLabel(actLbl, isRtl)}
        <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:14px 16px 8px;">
          ${svgBarChart(combined, "#2563eb", isRtl)}
        </div>` : ""}

      ${sectionLabel(secLbl, isRtl)}
      ${sectionCards}
    </div>
    ${pageFooter(isRtl, now)}`;

  openPrint(htmlShell(title, body, opts.language));
}
