/* ══════════════════════════════════════════════════════════════════════
   Almuzini Hospital — Premium Report Engine v3
   • Zero external dependencies — pure browser HTML / SVG / CSS
   • Full bidirectional (RTL / LTR) layout — Tajawal + Inter fonts
   • Charts: gradient bar, horizontal ranking bar, donut with gap
   • Mini sparklines inside KPI cards
   • window.print() → browser PDF
══════════════════════════════════════════════════════════════════════ */

export interface PdfKpi   { label: string; value: string | number; sub?: string; }
export interface PdfTrendPoint { name: string; count: number; }
export interface PdfTableRow  { [key: string]: string | number | null | undefined; }
export interface PdfDistItem  { label: string; count: number; color: string; }
export interface PdfDistribution { title: string; data: PdfDistItem[]; }

export interface ReportPdfOptions {
  reportType: string; period: string; dateRange: string;
  language: "en" | "ar";
  kpis: PdfKpi[]; trendData: PdfTrendPoint[]; trendLabel: string;
  tableColumns: string[]; tableRows: PdfTableRow[];
  interpretation: string[]; distributions?: PdfDistribution[];
}

export interface OverallSection {
  title: string; color: [number, number, number];
  kpis: PdfKpi[]; trendData: PdfTrendPoint[]; trendLabel: string;
  tableColumns: string[]; tableRows: PdfTableRow[]; interpretation: string[];
}

export interface OverallReportPdfOptions {
  period: string; dateRange: string; language: "en" | "ar";
  sections: OverallSection[]; execKpis: PdfKpi[];
}

/* ─── Palette ────────────────────────────────────────────────────── */
const PALETTE = ["#2563eb","#10b981","#f59e0b","#8b5cf6","#ef4444",
                 "#06b6d4","#a855f7","#ec4899","#84cc16","#f97316"];
function rgb(c: [number,number,number]) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
let _uid = 0;
function uid() { return `r${(++_uid).toString(36)}`; }

/* ─── Hospital SVG icon (medical cross) ──────────────────────────── */
const HOSPITAL_ICON = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <rect width="44" height="44" rx="10" fill="rgba(255,255,255,0.15)"/>
  <rect x="18" y="8"  width="8" height="28" rx="3" fill="white"/>
  <rect x="8"  y="18" width="28" height="8" rx="3" fill="white"/>
</svg>`;

/* ═══════════════════════════ CHARTS ═════════════════════════════════ */

/* Mini sparkline for KPI cards */
function miniSparkline(data: PdfTrendPoint[], color: string): string {
  if (data.length < 2) return "";
  const W = 72, H = 26, p = 2;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => {
    const x = p + (i / (data.length - 1)) * (W - 2 * p);
    const y = H - p - (d.count / max) * (H - 2 * p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(" ");
  const fill = `${p},${H - p} ${line} ${W - p},${H - p}`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
    <polygon points="${fill}" fill="${color}" opacity="0.15"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${pts[pts.length-1].split(",")[0]}" cy="${pts[pts.length-1].split(",")[1]}" r="2.5" fill="${color}"/>
  </svg>`;
}

/* Vertical gradient bar chart (trend / time-series) */
function svgBarChart(data: PdfTrendPoint[], color: string, _isRtl: boolean): string {
  if (data.length < 2) return "";
  const W = 520, H = 155, pL = 38, pR = 14, pT = 16, pB = 34;
  const cW = W - pL - pR, cH = H - pT - pB;
  const max = Math.max(...data.map(d => d.count), 1);
  const avg = data.reduce((s, d) => s + d.count, 0) / data.length;
  const steps = 4;
  const gid = uid();

  const gridLines = Array.from({length: steps + 1}, (_, i) => {
    const f = i / steps;
    const y = pT + cH * (1 - f);
    const v = Math.round(max * f);
    const isDashed = i > 0 && i < steps;
    return `<line x1="${pL}" y1="${y.toFixed(1)}" x2="${W - pR}" y2="${y.toFixed(1)}"
              stroke="${isDashed ? "#e2e8f0" : "#cbd5e1"}" stroke-width="0.6"
              ${isDashed ? 'stroke-dasharray="3,3"' : ""}/>
            <text x="${(pL - 5).toFixed(1)}" y="${(y + 3.5).toFixed(1)}"
              text-anchor="end" font-size="7.5" fill="#94a3b8" font-family="Arial,sans-serif">${v}</text>`;
  }).join("");

  /* average line */
  const avgY = pT + cH * (1 - avg / max);
  const avgLine = `<line x1="${pL}" y1="${avgY.toFixed(1)}" x2="${W - pR}" y2="${avgY.toFixed(1)}"
    stroke="${color}" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.45"/>`;

  const barW = Math.min((cW / data.length) * 0.54, 26);
  const slot  = cW / data.length;

  const bars = data.map((d, i) => {
    const bh  = Math.max((d.count / max) * cH, d.count > 0 ? 3 : 0);
    const bx  = pL + slot * i + (slot - barW) / 2;
    const by  = pT + cH - bh;
    const mx  = bx + barW / 2;
    const lbl = d.name.length > 7 ? d.name.slice(0, 6) + "…" : d.name;
    return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
              fill="url(#${gid})" rx="3" ry="3"/>
            ${d.count > 0 ? `<text x="${mx.toFixed(1)}" y="${(by - 3).toFixed(1)}"
              text-anchor="middle" font-size="7" font-weight="700" fill="${color}"
              font-family="Arial,sans-serif">${d.count}</text>` : ""}
            <text x="${mx.toFixed(1)}" y="${(H - 4).toFixed(1)}"
              text-anchor="middle" font-size="7.5" fill="#64748b" font-family="Arial,sans-serif">${lbl}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;overflow:visible;">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.45"/>
      </linearGradient>
    </defs>
    <rect x="${pL}" y="${pT}" width="${cW}" height="${cH}" fill="#f8fafc" rx="4"/>
    ${gridLines}
    ${avgLine}
    ${bars}
    <line x1="${pL}" y1="${pT}" x2="${pL}" y2="${pT + cH}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${pL}" y1="${pT + cH}" x2="${W - pR}" y2="${pT + cH}" stroke="#cbd5e1" stroke-width="1"/>
  </svg>`;
}

/* Stats strip below trend chart */
function statsStrip(data: PdfTrendPoint[], color: string, isRtl: boolean): string {
  if (!data.length) return "";
  const total = data.reduce((s, d) => s + d.count, 0);
  const avg   = (total / data.length).toFixed(1);
  const mx    = Math.max(...data.map(d => d.count));
  const mn    = Math.min(...data.map(d => d.count));
  const peak  = data.find(d => d.count === mx)?.name ?? "";

  const items = isRtl
    ? [
        { l: "الإجمالي",   v: total.toString() },
        { l: "المتوسط",    v: avg },
        { l: "الأعلى",     v: `${mx} (${peak})` },
        { l: "الأدنى",     v: mn.toString() },
      ]
    : [
        { l: "Total",   v: total.toString() },
        { l: "Average", v: avg },
        { l: "Peak",    v: `${mx} (${peak})` },
        { l: "Low",     v: mn.toString() },
      ];

  const cells = items.map(it => `
    <div style="flex:1;text-align:center;padding:6px 4px;border-${isRtl?"left":"right"}:1px solid #e2e8f0;">
      <div style="font-size:8px;color:#94a3b8;margin-bottom:2px;">${it.l}</div>
      <div style="font-size:11px;font-weight:700;color:${color};">${it.v}</div>
    </div>`).join("");

  return `<div style="display:flex;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;direction:${isRtl?"rtl":"ltr"};">
    ${cells}
    <div style="flex:1;text-align:center;padding:6px 4px;">
      <div style="font-size:8px;color:#94a3b8;margin-bottom:2px;">${isRtl?"الفترات":"Points"}</div>
      <div style="font-size:11px;font-weight:700;color:#64748b;">${data.length}</div>
    </div>
  </div>`;
}

/* Donut chart with white segment gaps */
function svgDonut(data: PdfDistItem[], isRtl: boolean): string {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total || !data.length)
    return `<div style="color:#94a3b8;font-size:10px;text-align:center;padding:16px 0;">${isRtl ? "لا توجد بيانات" : "No data"}</div>`;

  const R = 42, r = 27, cx = 52, cy = 52, GAP = 0.04;
  let angle = -Math.PI / 2;
  const segs = data.map(d => {
    const sweep = (d.count / total) * 2 * Math.PI;
    if (sweep < 0.001) return null;
    const sa = angle + GAP / 2, ea = angle + sweep - GAP / 2;
    const lg = (ea - sa) > Math.PI ? 1 : 0;
    const p  = (a: number, rad: number) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
    const path = `M${p(sa,R)} A${R},${R} 0 ${lg},1 ${p(ea,R)} L${p(ea,r)} A${r},${r} 0 ${lg},0 ${p(sa,r)}Z`;
    angle += sweep;
    return { path, color: d.color };
  }).filter(Boolean);

  const gid = uid();
  const filterDef = `<defs><filter id="${gid}" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.12"/>
  </filter></defs>`;

  const totalLbl = isRtl ? "الإجمالي" : "Total";
  const legend = data.map(d => {
    const pct = Math.round((d.count / total) * 100);
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;direction:${isRtl?"rtl":"ltr"};">
      <div style="width:10px;height:10px;border-radius:3px;background:${d.color};flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.15);"></div>
      <span style="font-size:9.5px;color:#334155;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.label}</span>
      <span style="font-size:10px;font-weight:700;color:#0f172a;">${d.count}</span>
      <span style="font-size:8.5px;color:${d.color};font-weight:600;min-width:28px;text-align:center;background:${d.color}18;border-radius:4px;padding:0 3px;">${pct}%</span>
    </div>`;
  }).join("");

  return `<div style="display:flex;align-items:center;gap:12px;direction:${isRtl?"rtl":"ltr"};">
    <svg viewBox="0 0 104 104" width="90" height="90" style="flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
      ${filterDef}
      <g filter="url(#${gid})">
        ${segs.map(s => `<path d="${s!.path}" fill="${s!.color}"/>`).join("")}
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="white"/>
      <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="12" font-weight="800"
        fill="#0f172a" font-family="Arial,sans-serif">${total}</text>
      <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="7"
        fill="#94a3b8" font-family="Arial,sans-serif">${totalLbl}</text>
    </svg>
    <div style="flex:1;min-width:0;">${legend}</div>
  </div>`;
}

/* Horizontal ranking bar chart (for >4 items) */
function svgHorizBar(data: PdfDistItem[], isRtl: boolean): string {
  if (!data.length) return "";
  const items = data.slice(0, 8);
  const total  = items.reduce((s, d) => s + d.count, 0) || 1;
  const maxVal = Math.max(...items.map(d => d.count), 1);
  const rowH = 22, lblW = 90, valW = 44, barZone = 200, W = lblW + barZone + valW;
  const H = items.length * rowH + 4;

  const rows = items.map((d, i) => {
    const y    = i * rowH + 2;
    const barW = (d.count / maxVal) * (barZone - 6);
    const pct  = Math.round((d.count / total) * 100);
    const gid2 = uid();
    const lbl  = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label;
    const mid  = y + rowH / 2;

    if (isRtl) {
      return `
        <defs>
          <linearGradient id="${gid2}" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%"   stop-color="${d.color}" stop-opacity="1"/>
            <stop offset="100%" stop-color="${d.color}" stop-opacity="0.4"/>
          </linearGradient>
        </defs>
        <text x="${W - 4}" y="${mid + 4}" text-anchor="end" font-size="8.5"
          fill="#334155" font-family="Arial,sans-serif">${lbl}</text>
        <rect x="${valW + barZone - 4 - barW}" y="${y + 4}" width="${barW}" height="${rowH - 8}"
          fill="url(#${gid2})" rx="3"/>
        <text x="${valW - 4}" y="${mid + 4}" text-anchor="end" font-size="8.5"
          font-weight="700" fill="${d.color}" font-family="Arial,sans-serif">${d.count}</text>
        <text x="${valW - 26}" y="${mid + 4}" text-anchor="end" font-size="7.5"
          fill="#94a3b8" font-family="Arial,sans-serif">${pct}%</text>`;
    }

    return `
      <defs>
        <linearGradient id="${gid2}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="${d.color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${d.color}" stop-opacity="0.4"/>
        </linearGradient>
      </defs>
      <text x="${lblW - 5}" y="${mid + 4}" text-anchor="end" font-size="8.5"
        fill="#334155" font-family="Arial,sans-serif">${lbl}</text>
      <rect x="${lblW + 3}" y="${y + 4}" width="${barW}" height="${rowH - 8}"
        fill="url(#${gid2})" rx="3"/>
      <text x="${lblW + barZone - 2}" y="${mid + 4}" text-anchor="end" font-size="8.5"
        font-weight="700" fill="${d.color}" font-family="Arial,sans-serif">${d.count}</text>
      <text x="${W - 2}" y="${mid + 4}" text-anchor="end" font-size="7.5"
        fill="#94a3b8" font-family="Arial,sans-serif">${pct}%</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;max-width:${W}px;height:auto;display:block;">
    ${rows}
  </svg>`;
}

/* Smart chart selector: donut ≤4 items, horizontal bar >4 items */
function smartChart(dist: PdfDistribution, isRtl: boolean): string {
  if (dist.data.length <= 4) return svgDonut(dist.data, isRtl);
  return svgHorizBar(dist.data, isRtl);
}

/* ═══════════════════════════ HTML BLOCKS ════════════════════════════ */

/* Rich KPI cards with mini sparklines */
function kpiCards(kpis: PdfKpi[], colors: string[], trendData: PdfTrendPoint[], isRtl: boolean): string {
  const cards = kpis.map((k, i) => {
    const c = colors[i % colors.length];
    return `<div style="flex:1;min-width:0;background:white;border-radius:12px;border:1px solid #e2e8f0;
              overflow:hidden;position:relative;box-shadow:0 1px 6px rgba(0,0,0,.05);">
      <div style="height:4px;background:${c};"></div>
      <div style="padding:12px 14px 10px;">
        <div style="font-size:8.5px;font-weight:600;color:#64748b;letter-spacing:.4px;margin-bottom:4px;
                    text-align:${isRtl?"right":"left"};">${k.label}</div>
        <div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1;
                    text-align:${isRtl?"right":"left"};">${k.value}</div>
        ${k.sub ? `<div style="font-size:10px;font-weight:600;color:${c};margin-top:4px;
                    text-align:${isRtl?"right":"left"};">${k.sub}</div>` : ""}
        <div style="margin-top:8px;display:flex;justify-content:flex-${isRtl?"start":"end"};">
          ${miniSparkline(trendData.slice(0, 10), c)}
        </div>
      </div>
    </div>`;
  }).join("");
  return `<div style="display:flex;gap:10px;direction:${isRtl?"rtl":"ltr"};">${cards}</div>`;
}

/* Section title with coloured accent dot */
function sectionTitle(text: string, color: string, isRtl: boolean): string {
  const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};
                  margin-${isRtl?"left":"right"}:7px;flex-shrink:0;"></span>`;
  return `<div style="display:flex;align-items:center;direction:${isRtl?"rtl":"ltr"};
              margin:20px 0 10px;padding-bottom:7px;border-bottom:1.5px solid #e2e8f0;">
    ${dot}
    <span style="font-size:9px;font-weight:700;letter-spacing:1.5px;color:#64748b;">${text}</span>
  </div>`;
}

/* Distribution grid — 2 per row, smart chart selection */
function distributionGrid(dists: PdfDistribution[], isRtl: boolean): string {
  if (!dists.length) return "";
  const pairs: PdfDistribution[][] = [];
  for (let i = 0; i < dists.length; i += 2) pairs.push(dists.slice(i, i + 2));

  return pairs.map(pair => {
    const cols = pair.map(d => `
      <div style="flex:1;min-width:0;background:white;border-radius:12px;border:1px solid #e2e8f0;
                  padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.04);">
        <div style="font-size:9px;font-weight:700;color:#475569;margin-bottom:12px;
                    letter-spacing:.3px;text-align:${isRtl?"right":"left"};">${d.title}</div>
        ${smartChart(d, isRtl)}
      </div>`).join("");
    return `<div style="display:flex;gap:10px;direction:${isRtl?"rtl":"ltr"};">${cols}</div>`;
  }).join('<div style="height:10px;"></div>');
}

/* Analysis box */
function analysisBox(lines: string[], isRtl: boolean): string {
  if (!lines.length) return "";
  const title = isRtl ? "التحليل والاستنتاجات المهنية" : "Professional Analysis & Insights";
  const items = lines.map(l => `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;
                direction:${isRtl?"rtl":"ltr"};">
      <div style="width:18px;height:18px;border-radius:50%;background:#dbeafe;display:flex;
                  align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
        <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="5" r="3.5" fill="#2563eb"/>
        </svg>
      </div>
      <div style="font-size:10.5px;color:#334155;line-height:1.75;flex:1;
                  text-align:${isRtl?"right":"left"};">${l}</div>
    </div>`).join("");

  return `<div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border-radius:12px;
              padding:16px 18px;border:1px solid #bfdbfe;
              border-${isRtl?"right":"left"}:4px solid #2563eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;
                direction:${isRtl?"rtl":"ltr"};">
      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3.5c.55 0 1 .45 1 1V11a1 1 0 01-2 0V8.5c0-.55.45-1 1-1z" fill="#1d4ed8"/>
      </svg>
      <span style="font-size:10px;font-weight:700;color:#1d4ed8;letter-spacing:.4px;">${title}</span>
    </div>
    ${items}
  </div>`;
}

/* ═══════════════════════════ HEADER & FOOTER ════════════════════════ */

function pageHeader(reportTitle: string, period: string, dateRange: string, isRtl: boolean, now: string, accent: string = "#2563eb"): string {
  const hosp  = isRtl ? "مستشفى المزيني للأطفال" : "Almuzini Children Hospital";
  const sub   = isRtl ? "نظام المعلومات الصحية للأطفال — السجلات الطبية الإلكترونية" : "Pediatric Health Information System — Electronic Medical Records";
  const gLbl  = isRtl ? "تاريخ الإصدار" : "Generated";
  const pLbl  = isRtl ? "الفترة" : "Period";
  const dLbl  = isRtl ? "النطاق الزمني" : "Date range";
  const conf  = isRtl ? "⬛  تقرير طبي سري — للاستخدام الداخلي فقط  ⬛" : "⬛  CONFIDENTIAL MEDICAL REPORT — INTERNAL USE ONLY  ⬛";
  const rCode = `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return `
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 45%,${accent} 100%);
                color:white;padding:0;position:relative;overflow:hidden;">
      <!-- decorative circles -->
      <div style="position:absolute;top:-40px;${isRtl?"left":"right"}:-40px;width:160px;height:160px;
                  border-radius:50%;background:rgba(255,255,255,0.05);"></div>
      <div style="position:absolute;bottom:-30px;${isRtl?"right":"left"}:60px;width:100px;height:100px;
                  border-radius:50%;background:rgba(255,255,255,0.04);"></div>

      <!-- top bar: hospital identity -->
      <div style="padding:22px 30px 16px;display:flex;align-items:center;
                  justify-content:space-between;direction:${isRtl?"rtl":"ltr"};">
        <div style="display:flex;align-items:center;gap:14px;direction:${isRtl?"rtl":"ltr"};">
          ${HOSPITAL_ICON}
          <div style="text-align:${isRtl?"right":"left"};">
            <div style="font-size:18px;font-weight:800;letter-spacing:${isRtl?"0":"-.2px"};">${hosp}</div>
            <div style="font-size:9.5px;color:#93c5fd;margin-top:2px;">${sub}</div>
          </div>
        </div>
        <div style="text-align:${isRtl?"left":"right"};flex-shrink:0;">
          <div style="font-size:8px;color:#93c5fd;text-transform:uppercase;letter-spacing:.8px;">${gLbl}</div>
          <div style="font-size:10px;font-weight:600;margin-top:1px;">${now}</div>
          <div style="font-size:8px;color:#64748b;margin-top:3px;font-family:monospace;">${rCode}</div>
        </div>
      </div>

      <!-- report title bar -->
      <div style="background:rgba(0,0,0,0.25);padding:14px 30px;
                  border-top:1px solid rgba(255,255,255,0.12);
                  border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:16px;font-weight:800;letter-spacing:${isRtl?"0":"-.1px"};
                    text-align:${isRtl?"right":"left"};">${reportTitle}</div>
        <div style="display:flex;gap:20px;margin-top:6px;direction:${isRtl?"rtl":"ltr"};">
          <span style="font-size:9px;color:#93c5fd;">${pLbl}: <strong style="color:white;">${period}</strong></span>
          <span style="font-size:9px;color:#93c5fd;">${dLbl}: <strong style="color:white;">${dateRange}</strong></span>
        </div>
      </div>
    </div>
    <div style="background:#1e3a8a;color:#93c5fd;font-size:7.5px;font-weight:700;
                letter-spacing:2px;padding:4px 30px;text-align:center;">${conf}</div>`;
}

function pageFooter(isRtl: boolean, now: string): string {
  const lft  = isRtl ? now : "Almuzini Children Hospital  |  Confidential  |  Not for Distribution";
  const rgt  = isRtl ? "مستشفى المزيني للأطفال  |  سري  |  ممنوع التوزيع" : "";
  const copy = "© 2025 Almuzini Children Hospital — Almuzini Pediatric EHR System";
  return `<div style="background:linear-gradient(90deg,#f1f5f9,#e2e8f0);border-top:1px solid #cbd5e1;
              padding:8px 30px;margin-top:20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:7.5px;color:#94a3b8;">${lft}</span>
      <span style="font-size:7.5px;color:#94a3b8;">${rgt}</span>
    </div>
    <div style="font-size:7px;color:#cbd5e1;text-align:center;margin-top:3px;">${copy}</div>
  </div>`;
}

/* ═══════════════════════════ HTML SHELL ═════════════════════════════ */

function htmlShell(title: string, body: string, lang: "en" | "ar"): string {
  const isRtl = lang === "ar";
  const ff    = isRtl
    ? "'Tajawal','Noto Sans Arabic',Arial,sans-serif"
    : "'Inter','Helvetica Neue',Arial,sans-serif";
  const printBtn = isRtl ? "🖨  طباعة / حفظ PDF" : "🖨  Print / Save as PDF";
  const preview  = isRtl ? "مستشفى المزيني للأطفال — معاينة التقرير" : "Almuzini Children Hospital — Report Preview";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{font-size:13px;}
  body{
    font-family:${ff};
    color:#0f172a;
    background:#d1d5db;
    direction:${isRtl ? "rtl" : "ltr"};
    line-height:1.55;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  @page{size:A4 portrait;margin:0;}
  @media print{
    html{font-size:11px;}
    body{background:#fff;}
    .no-print{display:none!important;}
    .page{box-shadow:none!important;margin:0!important;border-radius:0!important;}
    .page-break{page-break-before:always;}
  }
  .no-print.print-bar{
    background:linear-gradient(90deg,#1e3a8a,#2563eb);
    color:#fff;padding:11px 28px;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    font-size:12px;position:sticky;top:0;z-index:100;
    box-shadow:0 2px 8px rgba(0,0,0,.3);
  }
  .print-btn{
    background:white;color:#1e3a8a;border:none;border-radius:7px;
    padding:7px 20px;font-weight:700;font-size:12px;cursor:pointer;
    font-family:inherit;transition:background .15s;
  }
  .print-btn:hover{background:#dbeafe;}
  .page{
    max-width:794px;margin:18px auto;background:#fff;
    box-shadow:0 4px 32px rgba(0,0,0,.18);border-radius:4px;
    overflow:hidden;
  }
  .body-pad{padding:22px 30px;}
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
  document.fonts.ready.then(function(){ setTimeout(function(){ window.print(); }, 600); });
</script>
</body>
</html>`;
}

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=970,height=780");
  if (!w) { alert("Please allow popups to generate reports."); return; }
  w.document.write(html);
  w.document.close();
}

/* ═══════════════════════════ PUBLIC API ═════════════════════════════ */

export async function generateReportPDF(opts: ReportPdfOptions) {
  const isRtl  = opts.language === "ar";
  const now    = new Date().toLocaleString(isRtl ? "ar-SA" : "en-GB");
  const title  = isRtl
    ? `تقرير ${opts.reportType} — ${opts.period}`
    : `${opts.reportType} Report — ${opts.period}`;

  const accent = PALETTE[0]; // blue

  const KPI_LBL  = isRtl ? "مؤشرات الأداء الرئيسية" : "KEY PERFORMANCE INDICATORS";
  const TREND_LBL = isRtl ? "الاتجاه الزمني للنشاط" : "ACTIVITY TREND OVER PERIOD";
  const DIST_LBL  = isRtl ? "التوزيع الإحصائي والتحليل" : "STATISTICAL DISTRIBUTION";
  const ANAL_LBL  = isRtl ? "الاستنتاجات والتوصيات" : "INSIGHTS & RECOMMENDATIONS";
  const dists = opts.distributions ?? [];

  const body = `
    ${pageHeader(title, opts.period, opts.dateRange, isRtl, now, accent)}
    <div class="body-pad">

      ${sectionTitle(KPI_LBL, accent, isRtl)}
      ${kpiCards(opts.kpis, PALETTE, opts.trendData, isRtl)}

      ${opts.trendData.length > 1 ? `
        ${sectionTitle(TREND_LBL, PALETTE[0], isRtl)}
        <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;
                    padding:14px 16px 8px;box-shadow:0 1px 4px rgba(0,0,0,.04);">
          <div style="font-size:9.5px;font-weight:600;color:#475569;margin-bottom:8px;
                      text-align:${isRtl ? "right" : "left"};">${opts.trendLabel}</div>
          ${svgBarChart(opts.trendData, accent, isRtl)}
        </div>
        ${statsStrip(opts.trendData, accent, isRtl)}
      ` : ""}

      ${dists.length ? `
        ${sectionTitle(DIST_LBL, PALETTE[1], isRtl)}
        ${distributionGrid(dists, isRtl)}
      ` : ""}

      ${opts.interpretation.length ? `
        ${sectionTitle(ANAL_LBL, PALETTE[2], isRtl)}
        ${analysisBox(opts.interpretation, isRtl)}
      ` : ""}

    </div>
    ${pageFooter(isRtl, now)}`;

  openPrint(htmlShell(title, body, opts.language));
}

export async function generateOverallReportPDF(opts: OverallReportPdfOptions) {
  const isRtl = opts.language === "ar";
  const now   = new Date().toLocaleString(isRtl ? "ar-SA" : "en-GB");
  const title = isRtl ? `التقرير الشامل — ${opts.period}` : `Overall Hospital Report — ${opts.period}`;

  const EXEC_LBL  = isRtl ? "الملخص التنفيذي" : "EXECUTIVE SUMMARY";
  const PERF_LBL  = isRtl ? "أداء الأقسام" : "DEPARTMENT PERFORMANCE";
  const ACT_LBL   = isRtl ? "النشاط الكلي للمستشفى" : "COMBINED HOSPITAL ACTIVITY";
  const DEPT_LBL  = isRtl ? "تفاصيل الأقسام" : "DEPARTMENT DETAIL";

  /* combined trend */
  const combinedMap: Record<string, number> = {};
  opts.sections.forEach(s => s.trendData.forEach(d => { combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count; }));
  const combined: PdfTrendPoint[] = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));

  /* dept table */
  const thStyle = `background:#1e3a8a;color:white;padding:8px 12px;font-size:9.5px;font-weight:600;
    border:1px solid #1d4ed8;text-align:${isRtl ? "right" : "left"};`;
  const tCols = isRtl
    ? ["القسم", "الإجمالي", "مكتمل / محصّل", "معلق", "الملاحظة"]
    : ["Department", "Total", "Completed / Collected", "Pending", "Key Insight"];
  const thead = tCols.map(c => `<th style="${thStyle}">${c}</th>`).join("");

  const tbody = opts.sections.map((s, i) => {
    const c  = rgb(s.color);
    const t  = String(s.kpis[0]?.value ?? "—");
    const g  = String(s.kpis[1]?.value ?? "—") + (s.kpis[1]?.sub ? ` (${s.kpis[1].sub})` : "");
    const p  = String(s.kpis[2]?.value ?? "—");
    const note = (s.interpretation[0] ?? "").slice(0, 68) + ((s.interpretation[0]?.length ?? 0) > 68 ? "…" : "");
    const bg = i % 2 === 0 ? "white" : "#f8fafc";
    return `<tr style="background:${bg};">
      <td style="padding:7px 12px;border:1px solid #e2e8f0;font-weight:700;font-size:10.5px;
        border-${isRtl ? "right" : "left"}:4px solid ${c};">${s.title}</td>
      <td style="padding:7px 12px;border:1px solid #e2e8f0;font-weight:800;font-size:11px;">${t}</td>
      <td style="padding:7px 12px;border:1px solid #e2e8f0;color:#10b981;font-weight:600;font-size:10.5px;">${g}</td>
      <td style="padding:7px 12px;border:1px solid #e2e8f0;color:#f59e0b;font-weight:600;font-size:10.5px;">${p}</td>
      <td style="padding:7px 12px;border:1px solid #e2e8f0;color:#64748b;font-size:9px;">${note}</td>
    </tr>`;
  }).join("");

  /* per-section mini cards (2 per row) */
  const pairs: OverallSection[][] = [];
  for (let i = 0; i < opts.sections.length; i += 2) pairs.push(opts.sections.slice(i, i + 2));

  const sectionCards = pairs.map(pair => {
    const cards = pair.map(s => {
      const c = rgb(s.color);
      const kpiList = s.kpis.slice(0, 3).map((k, i2) => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:5px 0;${i2 < 2 ? "border-bottom:1px dashed #f1f5f9;" : ""}
                    direction:${isRtl ? "rtl" : "ltr"};">
          <span style="font-size:9px;color:#64748b;">${k.label}</span>
          <div>
            <span style="font-size:12px;font-weight:800;color:#0f172a;">${k.value}</span>
            ${k.sub ? `<span style="font-size:8px;color:${c};margin-${isRtl ? "right" : "left"}:3px;">(${k.sub})</span>` : ""}
          </div>
        </div>`).join("");

      const spark = s.trendData.length > 1
        ? `<div style="margin:8px 0 2px;background:#f8fafc;border-radius:6px;padding:6px 8px 2px;">
             ${svgBarChart(s.trendData, c, isRtl)}
           </div>` : "";
      const note = s.interpretation[0]
        ? `<div style="font-size:9px;color:#64748b;line-height:1.6;margin-top:8px;
                       padding-${isRtl ? "right" : "left"}:8px;border-${isRtl ? "right" : "left"}:2px solid ${c};
                       text-align:${isRtl ? "right" : "left"};">${s.interpretation[0]}</div>` : "";

      return `<div style="flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:12px;
                          overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05);">
        <div style="background:${c};color:white;padding:9px 14px;font-size:11px;font-weight:700;
                    text-align:${isRtl ? "right" : "left"};">${s.title}</div>
        <div style="padding:12px 14px;">
          ${kpiList}
          ${spark}
          ${note}
        </div>
      </div>`;
    }).join("");
    return `<div style="display:flex;gap:12px;margin-bottom:12px;direction:${isRtl ? "rtl" : "ltr"};">${cards}</div>`;
  }).join("");

  const execTrend = opts.execKpis.length ? opts.sections[0]?.trendData ?? [] : [];

  const body = `
    ${pageHeader(title, opts.period, opts.dateRange, isRtl, now, "#1d4ed8")}
    <div class="body-pad">

      ${sectionTitle(EXEC_LBL, PALETTE[0], isRtl)}
      ${kpiCards(opts.execKpis, PALETTE, execTrend, isRtl)}

      ${sectionTitle(PERF_LBL, PALETTE[1], isRtl)}
      <table style="width:100%;border-collapse:collapse;direction:${isRtl ? "rtl" : "ltr"};">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>

      ${combined.length > 1 ? `
        ${sectionTitle(ACT_LBL, PALETTE[2], isRtl)}
        <div style="background:white;border-radius:12px;border:1px solid #e2e8f0;
                    padding:14px 16px 8px;box-shadow:0 1px 4px rgba(0,0,0,.04);">
          ${svgBarChart(combined, "#2563eb", isRtl)}
        </div>
        ${statsStrip(combined, "#2563eb", isRtl)}
      ` : ""}

      ${sectionTitle(DEPT_LBL, PALETTE[3], isRtl)}
      ${sectionCards}

    </div>
    ${pageFooter(isRtl, now)}`;

  openPrint(htmlShell(title, body, opts.language));
}
