import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

/* ══════════════════════════════════════════════════════════════════════
   TYPES & COLOUR CONSTANTS
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

const BRAND_BLUE  = [37, 99, 235]   as [number, number, number];
const BRAND_LIGHT = [239, 246, 255] as [number, number, number];
const GRAY_DARK   = [30, 41, 59]    as [number, number, number];
const GRAY_MID    = [100, 116, 139] as [number, number, number];
const GRAY_LIGHT  = [241, 245, 249] as [number, number, number];
const WHITE       = [255, 255, 255] as [number, number, number];
const KPI_COLORS: [number, number, number][] = [
  [59, 130, 246],
  [16, 185, 129],
  [239, 68, 68],
  [139, 92, 246],
];

/* ══════════════════════════════════════════════════════════════════════
   HTML → CANVAS → PDF  (Arabic path)
   The browser renders Arabic text with proper shaping. We capture it
   via html2canvas and slice it into A4 pages.
══════════════════════════════════════════════════════════════════════ */

const A4_W_PX = 794;   // A4 at 96 dpi
const A4_H_PX = 1123;

function rgbCss(c: [number, number, number]) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function miniBarChart(data: PdfTrendPoint[], color: string, label: string): string {
  if (!data.length) return "";
  const max = Math.max(...data.map(d => d.count), 1);
  const bars = data.map(d => {
    const h = Math.max(Math.round((d.count / max) * 80), 2);
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0;">
        <span style="font-size:9px;color:#1e293b;">${d.count || ""}</span>
        <div style="width:100%;height:${h}px;background:${color};border-radius:2px 2px 0 0;"></div>
        <span style="font-size:8px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${d.name}</span>
      </div>`;
  }).join("");
  return `
    <div style="padding:0 24px 16px;">
      <div style="font-size:11px;font-weight:600;color:#1e293b;margin-bottom:8px;text-align:right;">${label}</div>
      <div style="background:#f1f5f9;border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:flex-end;gap:3px;height:110px;direction:ltr;">
          ${bars}
        </div>
      </div>
    </div>`;
}

function kpiCards(kpis: PdfKpi[], colors: string[]): string {
  return kpis.map((k, i) => {
    const c = colors[i % colors.length];
    return `
      <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:12px 14px;border-right:4px solid ${c};min-width:0;">
        <div style="font-size:10px;color:#64748b;margin-bottom:4px;text-align:right;">${k.label}</div>
        <div style="font-size:20px;font-weight:700;color:#1e293b;text-align:right;">${k.value}</div>
        ${k.sub ? `<div style="font-size:10px;color:${c};text-align:right;">${k.sub}</div>` : ""}
      </div>`;
  }).join("");
}

function dataTable(columns: string[], rows: PdfTableRow[]): string {
  if (!rows.length) return "";
  const ths = columns.map(c => `<th style="background:#2563EB;color:white;padding:8px 10px;text-align:right;font-size:11px;font-weight:600;border:1px solid #bfdbfe;">${c}</th>`).join("");
  const trs = rows.slice(0, 80).map((row, ri) => {
    const bg = ri % 2 === 0 ? "white" : "#f1f5f9";
    const tds = columns.map(col => {
      const key = col.toLowerCase().replace(/\s+/g, "");
      const val = String(row[col] ?? row[key] ?? "—");
      return `<td style="padding:6px 10px;text-align:right;font-size:10px;color:#1e293b;border:1px solid #e2e8f0;">${val}</td>`;
    }).join("");
    return `<tr style="background:${bg};">${tds}</tr>`;
  }).join("");
  return `
    <div style="padding:0 24px 16px;">
      <div style="font-size:11px;font-weight:600;color:#1e293b;margin-bottom:8px;text-align:right;">
        سجلات الفترة (${rows.length} نتيجة)
      </div>
      <table style="width:100%;border-collapse:collapse;direction:rtl;">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

function buildArabicReportHTML(opts: ReportPdfOptions): string {
  const kpiColorStrs = KPI_COLORS.map(c => rgbCss(c));
  const now = new Date().toLocaleString("ar");
  return `
    <div style="width:${A4_W_PX}px;background:white;font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#1e293b;">

      <!-- Header -->
      <div style="background:#2563EB;color:white;padding:20px 24px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-20px;left:-20px;width:80px;height:80px;background:rgba(255,255,255,0.08);border-radius:50%;"></div>
        <div style="font-size:20px;font-weight:700;margin-bottom:4px;">مستشفى المزيني للأطفال</div>
        <div style="font-size:11px;color:#bfdbfe;margin-bottom:8px;">نظام السجلات الصحية الإلكترونية للأطفال</div>
        <div style="font-size:15px;font-weight:600;">${opts.reportType} — تقرير</div>
        <div style="font-size:10px;color:#bfdbfe;margin-top:4px;">
          الفترة: ${opts.period} &nbsp;•&nbsp; ${opts.dateRange}
          &nbsp;&nbsp; | &nbsp;&nbsp; التاريخ: ${now}
        </div>
      </div>

      <!-- KPIs -->
      <div style="padding:16px 24px 8px;">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;margin-bottom:10px;text-align:right;">مؤشرات الأداء الرئيسية</div>
        <div style="display:flex;gap:10px;flex-direction:row-reverse;">
          ${kpiCards(opts.kpis, kpiColorStrs)}
        </div>
      </div>

      <!-- Chart -->
      ${opts.trendData.length ? miniBarChart(opts.trendData, "#2563EB", opts.trendLabel) : ""}

      <!-- Interpretation -->
      <div style="margin:0 24px 16px;background:#eff6ff;border-radius:8px;padding:16px;border-right:4px solid #2563EB;">
        <div style="font-size:11px;font-weight:700;color:#2563EB;margin-bottom:8px;text-align:right;">التفسير والتحليل المهني</div>
        ${opts.interpretation.map(l => `<div style="font-size:11px;color:#1e293b;margin-bottom:5px;line-height:1.6;text-align:right;">• ${l}</div>`).join("")}
      </div>

      <!-- Table -->
      ${dataTable(opts.tableColumns, opts.tableRows)}

      <!-- Footer -->
      <div style="background:#f1f5f9;padding:8px 24px;font-size:9px;color:#64748b;text-align:right;">
        مستشفى المزيني للأطفال — تقرير طبي سري
      </div>
    </div>`;
}

function buildArabicOverallHTML(opts: OverallReportPdfOptions, section?: OverallSection, isExec?: boolean): string {
  const kpiColorStrs = KPI_COLORS.map(c => rgbCss(c));
  const now = new Date().toLocaleString("ar");
  const colorStr = section ? rgbCss(section.color) : "#2563EB";

  if (isExec) {
    const summaryRows = opts.sections.map(s => {
      const total = String(s.kpis[0]?.value ?? "—");
      const good  = String(s.kpis[1]?.value ?? "—");
      const pend  = String(s.kpis[2]?.value ?? "—");
      const note  = (s.interpretation[0] ?? "—").substring(0, 60);
      return `<tr style="background:white;">
        <td style="padding:6px 10px;text-align:right;font-size:10px;border:1px solid #e2e8f0;">${s.title}</td>
        <td style="padding:6px 10px;text-align:right;font-size:10px;border:1px solid #e2e8f0;">${total}</td>
        <td style="padding:6px 10px;text-align:right;font-size:10px;border:1px solid #e2e8f0;">${good}</td>
        <td style="padding:6px 10px;text-align:right;font-size:10px;border:1px solid #e2e8f0;">${pend}</td>
        <td style="padding:6px 10px;text-align:right;font-size:9px;color:#64748b;border:1px solid #e2e8f0;">${note}…</td>
      </tr>`;
    }).join("");

    const combinedMap: Record<string, number> = {};
    opts.sections.forEach(s => s.trendData.forEach(d => { combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count; }));
    const combined = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));

    return `
      <div style="width:${A4_W_PX}px;background:white;font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#1e293b;">
        <div style="background:#2563EB;color:white;padding:20px 24px;">
          <div style="font-size:18px;font-weight:700;margin-bottom:4px;">مستشفى المزيني للأطفال</div>
          <div style="font-size:10px;color:#bfdbfe;margin-bottom:8px;">التقرير الشامل — جميع الأقسام</div>
          <div style="font-size:10px;color:#bfdbfe;">الفترة: ${opts.period} • ${opts.dateRange} | التاريخ: ${now}</div>
        </div>

        <div style="padding:16px 24px 8px;">
          <div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:10px;text-align:right;">الملخص التنفيذي — جميع الأقسام</div>
          <div style="font-size:10px;color:#64748b;margin-bottom:12px;text-align:right;">تقرير موحد للفترة: ${opts.period}</div>
          <div style="display:flex;gap:8px;flex-direction:row-reverse;">
            ${kpiCards(opts.execKpis, kpiColorStrs)}
          </div>
        </div>

        <div style="padding:0 24px 16px;">
          <table style="width:100%;border-collapse:collapse;direction:rtl;">
            <thead>
              <tr style="background:#2563EB;color:white;">
                <th style="padding:8px 10px;text-align:right;font-size:11px;border:1px solid #bfdbfe;">القسم</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;border:1px solid #bfdbfe;">الإجمالي</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;border:1px solid #bfdbfe;">مكتمل</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;border:1px solid #bfdbfe;">معلق</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;border:1px solid #bfdbfe;">ملاحظة</th>
              </tr>
            </thead>
            <tbody>${summaryRows}</tbody>
          </table>
        </div>

        ${combined.length ? miniBarChart(combined, "#2563EB", "النشاط الكلي للمستشفى خلال الفترة") : ""}

        <div style="background:#f1f5f9;padding:8px 24px;font-size:9px;color:#64748b;text-align:right;">
          مستشفى المزيني للأطفال — تقرير طبي سري
        </div>
      </div>`;
  }

  if (!section) return "";
  return `
    <div style="width:${A4_W_PX}px;background:white;font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#1e293b;">
      <div style="background:#2563EB;color:white;padding:14px 24px;">
        <div style="font-size:15px;font-weight:700;">مستشفى المزيني للأطفال</div>
        <div style="font-size:9px;color:#bfdbfe;">الفترة: ${opts.period} • ${opts.dateRange}</div>
      </div>

      <div style="background:${colorStr};color:white;padding:10px 24px;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:600;">${section.title}</div>
      </div>

      <div style="padding:0 24px 8px;">
        <div style="display:flex;gap:8px;flex-direction:row-reverse;">
          ${kpiCards(section.kpis, [colorStr, colorStr, colorStr, colorStr])}
        </div>
      </div>

      ${section.trendData.length ? miniBarChart(section.trendData, colorStr, section.trendLabel) : ""}

      <div style="margin:0 24px 16px;background:#f8fafc;border-radius:8px;padding:14px;border-right:4px solid ${colorStr};">
        <div style="font-size:11px;font-weight:700;color:${colorStr};margin-bottom:8px;text-align:right;">تحليل</div>
        ${section.interpretation.map(l => `<div style="font-size:11px;color:#1e293b;margin-bottom:5px;line-height:1.6;text-align:right;">• ${l}</div>`).join("")}
      </div>

      ${dataTable(section.tableColumns, section.tableRows)}

      <div style="background:#f1f5f9;padding:8px 24px;font-size:9px;color:#64748b;text-align:right;">
        مستشفى المزيني للأطفال — تقرير طبي سري
      </div>
    </div>`;
}

async function renderHtmlToPdfPages(html: string): Promise<string[]> {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;top:-9999px;left:-9999px;z-index:-1;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  await document.fonts.ready;

  const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  document.body.removeChild(container);

  const pageH = A4_H_PX * 2; // scaled 2x
  const totalH = canvas.height;
  const pages: string[] = [];

  for (let top = 0; top < totalH; top += pageH) {
    const h = Math.min(pageH, totalH - top);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, h);
    ctx.drawImage(canvas, 0, -top);
    pages.push(slice.toDataURL("image/jpeg", 0.88));
  }

  return pages;
}

async function pagesFromHtml(htmlStr: string, doc: jsPDF, isFirst: boolean) {
  const pages = await renderHtmlToPdfPages(htmlStr);
  pages.forEach((imgData, i) => {
    if (!isFirst || i > 0) doc.addPage();
    doc.addImage(imgData, "JPEG", 0, 0, 210, 297);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   ENGLISH  path — pure jsPDF vector text (unchanged)
══════════════════════════════════════════════════════════════════════ */

function drawPageHeader(doc: jsPDF, W: number, period: string, dateRange: string) {
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Almuzini Children Hospital", 14, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Pediatric EHR — Overall Hospital Report", 14, 19);
  doc.text(`Period: ${period}  •  ${dateRange}`, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 25, { align: "right" });
}

function drawKpiRow(doc: jsPDF, kpis: PdfKpi[], color: [number, number, number], y: number, W: number): number {
  const kpiW = (W - 28 - (kpis.length - 1) * 3) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiW + 3);
    const c = KPI_COLORS[i % KPI_COLORS.length];
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, "F");
    doc.setFillColor(...c);
    doc.roundedRect(x, y, 2.5, 18, 1, 1, "F");
    doc.setTextColor(...GRAY_MID);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label.toUpperCase(), x + 6, y + 5);
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(String(kpi.value), x + 6, y + 13);
    if (kpi.sub) {
      doc.setTextColor(...c);
      doc.setFontSize(5.5);
      doc.text(String(kpi.sub), x + 6, y + 17);
    }
  });
  return y + 22;
}

function drawMiniChart(doc: jsPDF, data: PdfTrendPoint[], color: [number, number, number], label: string, y: number, W: number): number {
  if (!data.length) return y;
  const chartH = 28, chartW = W - 28;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const barW = Math.min(chartW / data.length - 1.5, 12);
  const gap = (chartW - barW * data.length) / (data.length + 1);
  if (label) {
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(label, 14, y);
    y += 3;
  }
  doc.setFillColor(...GRAY_LIGHT);
  doc.roundedRect(14, y, chartW, chartH + 8, 2, 2, "F");
  data.forEach((d, i) => {
    const bh = Math.max((d.count / maxVal) * chartH, 1);
    const bx = 14 + gap + i * (barW + gap);
    const by = y + 2 + chartH - bh;
    doc.setFillColor(...color);
    doc.roundedRect(bx, by, barW, bh, 0.8, 0.8, "F");
    if (d.count > 0) {
      doc.setTextColor(...GRAY_DARK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.5);
      doc.text(String(d.count), bx + barW / 2, by - 0.5, { align: "center" });
    }
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.text(d.name.length > 5 ? d.name.substring(0, 5) : d.name, bx + barW / 2, y + chartH + 7, { align: "center" });
  });
  return y + chartH + 12;
}

function drawInterpBox(doc: jsPDF, lines: string[], color: [number, number, number], y: number, W: number): number {
  const lineH = 4.5;
  const wrapped: string[] = [];
  lines.forEach(l => doc.splitTextToSize(`• ${l}`, W - 36).forEach((s: string) => wrapped.push(s)));
  const boxH = wrapped.length * lineH + 8;
  const lr = Math.min(255, color[0] + 150), lg = Math.min(255, color[1] + 150), lb = Math.min(255, color[2] + 150);
  doc.setFillColor(lr, lg, lb);
  doc.roundedRect(14, y, W - 28, boxH, 2, 2, "F");
  doc.setFillColor(...color);
  doc.roundedRect(14, y, 2.5, boxH, 1, 1, "F");
  doc.setTextColor(...color);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("ANALYSIS", 20, y + 5);
  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  wrapped.forEach((line, i) => doc.text(line, 20, y + 10 + i * lineH));
  return y + boxH + 4;
}

function addEnglishFooters(doc: jsPDF) {
  const total = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Almuzini Children Hospital — Confidential Medical Report", 14, H - 4);
    doc.text(`Page ${p} of ${total}`, W - 14, H - 4, { align: "right" });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════════════ */

export async function generateReportPDF(opts: ReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  if (opts.language === "ar") {
    /* ── Arabic: render HTML with browser, capture via html2canvas ── */
    const html = buildArabicReportHTML(opts);
    await pagesFromHtml(html, doc, true);
    doc.save(`${opts.reportType.replace(/\s/g, "-")}-${opts.period}-report.pdf`);
    return;
  }

  /* ── English: vector jsPDF ── */
  let y = 0;

  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Almuzini Children Hospital", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pediatric Electronic Health Record System", 14, 21);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${opts.reportType} Report`, 14, 30);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text(`Period: ${opts.period}  •  ${opts.dateRange}`, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 36, { align: "right" });
  y = 46;

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("KEY PERFORMANCE INDICATORS", 14, y);
  y += 4;

  const kpiW = (W - 28 - (opts.kpis.length - 1) * 4) / opts.kpis.length;
  opts.kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiW + 4);
    const color = KPI_COLORS[i % KPI_COLORS.length];
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, kpiW, 22, 2, 2, "F");
    doc.setFillColor(...color);
    doc.roundedRect(x, y, 3, 22, 1, 1, "F");
    doc.setTextColor(...GRAY_MID);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    const ll = doc.splitTextToSize(kpi.label.toUpperCase(), kpiW - 8);
    doc.text(ll, x + 7, y + 6);
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(String(kpi.value), x + 7, y + 15);
    if (kpi.sub) {
      doc.setTextColor(...color);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(String(kpi.sub), x + 7, y + 20);
    }
  });
  y += 28;

  if (opts.trendData.length) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(opts.trendLabel, 14, y);
    y += 4;
    y = drawMiniChart(doc, opts.trendData, BRAND_BLUE, "", y, W);
  }

  const interpY = y;
  const ilines: string[] = [];
  opts.interpretation.forEach(l => doc.splitTextToSize(`• ${l}`, W - 32).forEach((s: string) => ilines.push(s)));
  const iH = ilines.length * 5 + 10;
  doc.setFillColor(...BRAND_LIGHT);
  doc.roundedRect(14, interpY, W - 28, iH, 2, 2, "F");
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(14, interpY, 3, iH, 1, 1, "F");
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PROFESSIONAL INTERPRETATION", 20, interpY + 6);
  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  ilines.forEach((l, i) => doc.text(l, 20, interpY + 12 + i * 5));
  y = interpY + iH + 6;

  if (opts.tableRows.length) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Period Records (${opts.tableRows.length} records)`, 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [opts.tableColumns],
      body: opts.tableRows.map(row =>
        opts.tableColumns.map(col => {
          const key = col.toLowerCase().replace(/\s+/g, "");
          return String(row[col] ?? row[key] ?? "—");
        })
      ),
      theme: "grid",
      headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 8, fontStyle: "bold", cellPadding: 3 },
      bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      styles: { lineColor: [226, 232, 240] as [number,number,number], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
  }

  addEnglishFooters(doc);
  doc.save(`${opts.reportType.replace(/\s/g, "-")}-${opts.period}-report.pdf`);
}

export async function generateOverallReportPDF(opts: OverallReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  if (opts.language === "ar") {
    /* ── Arabic: exec summary page + one page per section ── */
    await pagesFromHtml(buildArabicOverallHTML(opts, undefined, true), doc, true);
    for (const section of opts.sections) {
      await pagesFromHtml(buildArabicOverallHTML(opts, section, false), doc, false);
    }
    doc.save(`Overall-Hospital-${opts.period}-report.pdf`);
    return;
  }

  /* ── English: vector jsPDF ── */
  drawPageHeader(doc, W, opts.period, opts.dateRange);
  let y = 38;

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY — ALL DEPARTMENTS", 14, y);
  y += 5;
  doc.setTextColor(...GRAY_MID);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Consolidated report for: ${opts.period}`, 14, y);
  y += 6;
  y = drawKpiRow(doc, opts.execKpis, BRAND_BLUE, y, W);
  y += 2;

  const summaryHead = [["Department", "Total", "Completed / Paid", "Pending", "Highlight"]];
  const summaryBody = opts.sections.map(s => [
    s.title,
    String(s.kpis[0]?.value ?? "—"),
    String(s.kpis[1]?.value ?? "—"),
    String(s.kpis[2]?.value ?? "—"),
    (s.interpretation[0] ?? "—").substring(0, 55) + "…",
  ]);
  autoTable(doc, {
    startY: y,
    head: summaryHead,
    body: summaryBody,
    theme: "grid",
    headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 7.5, fontStyle: "bold", cellPadding: 2.5 },
    bodyStyles: { fontSize: 6.5, textColor: GRAY_DARK, cellPadding: 2 },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    styles: { lineColor: [226, 232, 240] as [number,number,number], lineWidth: 0.1 },
    columnStyles: { 4: { cellWidth: 55 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const combinedMap: Record<string, number> = {};
  opts.sections.forEach(s => s.trendData.forEach(d => { combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count; }));
  const combined = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));
  if (combined.length && y < 220) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Combined Hospital Activity Over Period", 14, y);
    y += 2;
    y = drawMiniChart(doc, combined, BRAND_BLUE, "", y, W);
  }

  opts.sections.forEach(section => {
    doc.addPage();
    drawPageHeader(doc, W, opts.period, opts.dateRange);
    y = 36;

    doc.setFillColor(...section.color);
    doc.roundedRect(14, y, W - 28, 8, 2, 2, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(section.title.toUpperCase(), 18, y + 5.5);
    y += 12;

    y = drawKpiRow(doc, section.kpis, section.color, y, W);
    y += 2;

    if (section.trendData.length) y = drawMiniChart(doc, section.trendData, section.color, section.trendLabel, y, W);

    y = drawInterpBox(doc, section.interpretation, section.color, y, W);

    if (section.tableRows.length) {
      doc.setTextColor(...GRAY_DARK);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Period Records (${section.tableRows.length})`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [section.tableColumns],
        body: section.tableRows.map(row =>
          section.tableColumns.map(col => {
            const key = col.toLowerCase().replace(/\s+/g, "");
            return String(row[col] ?? row[key] ?? "—");
          })
        ),
        theme: "grid",
        headStyles: { fillColor: section.color, textColor: WHITE, fontSize: 7, fontStyle: "bold", cellPadding: 2 },
        bodyStyles: { fontSize: 6.5, textColor: GRAY_DARK, cellPadding: 1.8 },
        alternateRowStyles: { fillColor: GRAY_LIGHT },
        styles: { lineColor: [226, 232, 240] as [number,number,number], lineWidth: 0.1 },
        margin: { left: 14, right: 14 },
      });
    }
  });

  addEnglishFooters(doc);
  doc.save(`Overall-Hospital-${opts.period}-report.pdf`);
}
