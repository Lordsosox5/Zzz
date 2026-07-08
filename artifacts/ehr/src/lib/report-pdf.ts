import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ══════════════════════════════════════════════════════════════════════
   ARABIC TEXT SUPPORT
   - loadArabicFont: fetches Tajawal TTF and registers it with jsPDF
   - shapeArabic: maps Unicode Arabic letters → contextual presentation forms
   - ar: shape + reverse words for LTR rendering in jsPDF
══════════════════════════════════════════════════════════════════════ */

// Contextual forms: [isolated, final, initial, medial]
const AF: Record<string, [string, string, string, string]> = {
  '\u0621': ['\uFE80', '\uFE80', '',      ''     ], // ء
  '\u0622': ['\uFE81', '\uFE82', '',      ''     ], // آ
  '\u0623': ['\uFE83', '\uFE84', '',      ''     ], // أ
  '\u0624': ['\uFE85', '\uFE86', '',      ''     ], // ؤ
  '\u0625': ['\uFE87', '\uFE88', '',      ''     ], // إ
  '\u0626': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'], // ئ
  '\u0627': ['\uFE8D', '\uFE8E', '',      ''     ], // ا
  '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // ب
  '\u0629': ['\uFE93', '\uFE94', '',      ''     ], // ة
  '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // ت
  '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // ث
  '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // ج
  '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // ح
  '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // خ
  '\u062F': ['\uFEA9', '\uFEAA', '',      ''     ], // د
  '\u0630': ['\uFEAB', '\uFEAC', '',      ''     ], // ذ
  '\u0631': ['\uFEAD', '\uFEAE', '',      ''     ], // ر
  '\u0632': ['\uFEAF', '\uFEB0', '',      ''     ], // ز
  '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // س
  '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // ش
  '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // ص
  '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // ض
  '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // ط
  '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // ظ
  '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // ع
  '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // غ
  '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // ف
  '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // ق
  '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // ك
  '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // ل
  '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // م
  '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // ن
  '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // ه
  '\u0648': ['\uFEED', '\uFEEE', '',      ''     ], // و
  '\u0649': ['\uFEEF', '\uFEF0', '',      ''     ], // ى
  '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // ي
  // Common extended Arabic
  '\u0671': ['\uFB50', '\uFB51', '',      ''     ], // ٱ
  '\u0679': ['\uFB66', '\uFB67', '\uFB68', '\uFB69'], // ٹ
  '\u067E': ['\uFB56', '\uFB57', '\uFB58', '\uFB59'], // پ
  '\u0686': ['\uFB7A', '\uFB7B', '\uFB7C', '\uFB7D'], // چ
  '\u06A9': ['\uFB8E', '\uFB8F', '\uFB90', '\uFB91'], // ک
  '\u06AF': ['\uFB92', '\uFB93', '\uFB94', '\uFB95'], // گ
  '\u06CC': ['\uFBFC', '\uFBFD', '\uFBFE', '\uFBFF'], // ی
};

// Characters that do NOT connect to the following (left side) character
const NO_LEFT: Set<string> = new Set([
  '\u0621','\u0622','\u0623','\u0624','\u0625','\u0627',
  '\u0629','\u062F','\u0630','\u0631','\u0632','\u0648','\u0649','\u0671',
]);

function isArabicChar(c: string): boolean {
  const cp = c.codePointAt(0)!;
  return (cp >= 0x0600 && cp <= 0x06FF) ||
         (cp >= 0xFB50 && cp <= 0xFDFF) ||
         (cp >= 0xFE70 && cp <= 0xFEFF);
}

function shapeArabic(text: string): string {
  const chars = [...text];
  return chars.map((c, i) => {
    const forms = AF[c];
    if (!forms) return c;
    const prev = i > 0 ? chars[i - 1] : '';
    const next = i < chars.length - 1 ? chars[i + 1] : '';
    const fromRight = isArabicChar(prev) && !NO_LEFT.has(prev); // prev connects to us
    const toLeft    = isArabicChar(next) && !NO_LEFT.has(c);    // we connect to next
    if (fromRight && toLeft && forms[3]) return forms[3];        // medial
    if (!fromRight && toLeft && forms[2]) return forms[2];       // initial
    if (fromRight && forms[1]) return forms[1];                  // final
    return forms[0];                                             // isolated
  }).join('');
}

function isArabicWord(w: string): boolean {
  return [...w].some(c => isArabicChar(c));
}

/** Shape Arabic text and reverse it for LTR rendering in jsPDF */
function ar(text: string | number): string {
  if (typeof text === 'number') return String(text);
  const shaped = shapeArabic(text);
  const tokens = shaped.split(' ');
  const reversed = tokens
    .map(w => isArabicWord(w) ? [...w].reverse().join('') : w)
    .reverse();
  return reversed.join(' ');
}

/** Load Tajawal font into jsPDF's virtual FS. Returns true on success. */
let _tajawalB64: string | null = null;

async function loadArabicFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!_tajawalB64) {
      const res = await fetch('/fonts/tajawal-regular.ttf');
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      _tajawalB64 = btoa(bin);
    }
    doc.addFileToVFS('Tajawal-Regular.ttf', _tajawalB64);
    doc.addFont('Tajawal-Regular.ttf', 'Tajawal', 'normal');
    return true;
  } catch {
    return false;
  }
}

function setFont(doc: jsPDF, arabicLoaded: boolean, style: 'normal' | 'bold' = 'normal') {
  if (arabicLoaded) {
    doc.setFont('Tajawal', 'normal');
  } else {
    doc.setFont('helvetica', style);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SHARED TYPES & COLOURS
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
   SINGLE-MODULE REPORT PDF
══════════════════════════════════════════════════════════════════════ */

export async function generateReportPDF(opts: ReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  const isRtl = opts.language === "ar";
  const arabic = isRtl ? await loadArabicFont(doc) : false;
  const t = (s: string | number) => isRtl ? ar(String(s)) : String(s);

  /* ── Header band ── */
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, W, 38, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(W - 10, -5, 30, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Almuzini Children Hospital", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pediatric Electronic Health Record System", 14, 21);

  doc.setFontSize(11);
  setFont(doc, arabic, 'bold');
  const titleText = isRtl ? t(`${opts.reportType} — تقرير`) : `${opts.reportType} Report`;
  if (isRtl) {
    doc.text(titleText, W - 14, 30, { align: 'right' });
  } else {
    doc.text(titleText, 14, 30);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text(`Period: ${opts.period}  •  ${opts.dateRange}`, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 36, { align: "right" });

  y = 46;

  /* ── KPIs ── */
  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(9);
  setFont(doc, arabic, 'bold');
  const kpiHeader = isRtl ? t("مؤشرات الأداء الرئيسية") : "KEY PERFORMANCE INDICATORS";
  if (isRtl) doc.text(kpiHeader, W - 14, y, { align: 'right' });
  else        doc.text(kpiHeader, 14, y);
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
    setFont(doc, arabic, 'normal');
    const labelLines = doc.splitTextToSize(t(kpi.label).toUpperCase(), kpiW - 8);
    if (isRtl) doc.text(labelLines, x + kpiW - 4, y + 6, { align: 'right' });
    else       doc.text(labelLines, x + 7, y + 6);

    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(13);
    setFont(doc, arabic, 'bold');
    const valStr = String(kpi.value);
    if (isRtl) doc.text(valStr, x + kpiW - 4, y + 15, { align: 'right' });
    else       doc.text(valStr, x + 7, y + 15);

    if (kpi.sub) {
      doc.setTextColor(...color);
      doc.setFontSize(7);
      setFont(doc, arabic, 'normal');
      if (isRtl) doc.text(String(kpi.sub), x + kpiW - 4, y + 20, { align: 'right' });
      else       doc.text(String(kpi.sub), x + 7, y + 20);
    }
  });
  y += 28;

  /* ── Mini bar chart ── */
  if (opts.trendData.length > 0) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(9);
    setFont(doc, arabic, 'bold');
    if (isRtl) doc.text(t(opts.trendLabel), W - 14, y, { align: 'right' });
    else       doc.text(opts.trendLabel, 14, y);
    y += 4;

    const chartH = 36;
    const chartW = W - 28;
    const chartX = 14;
    const chartY = y;
    const maxVal = Math.max(...opts.trendData.map(d => d.count), 1);
    const barW = Math.min(chartW / opts.trendData.length - 2, 14);
    const gap = (chartW - barW * opts.trendData.length) / (opts.trendData.length + 1);

    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(chartX, chartY, chartW, chartH + 10, 2, 2, "F");
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.1);
    for (let g = 0; g <= 4; g++) {
      const lineY = chartY + 4 + (chartH * g) / 4;
      doc.line(chartX + 4, lineY, chartX + chartW - 4, lineY);
    }

    opts.trendData.forEach((d, i) => {
      const bh = Math.max((d.count / maxVal) * chartH, 1);
      const bx = chartX + gap + i * (barW + gap);
      const by = chartY + 4 + chartH - bh;
      doc.setFillColor(...BRAND_BLUE);
      doc.roundedRect(bx, by, barW, bh, 1, 1, "F");
      if (d.count > 0) {
        doc.setTextColor(...GRAY_DARK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.text(String(d.count), bx + barW / 2, by - 1, { align: "center" });
      }
      doc.setTextColor(...GRAY_MID);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      const label = d.name.length > 6 ? d.name.substring(0, 6) : d.name;
      doc.text(label, bx + barW / 2, chartY + chartH + 8, { align: "center" });
    });
    y += chartH + 16;
  }

  /* ── Interpretation panel ── */
  doc.setFillColor(...BRAND_LIGHT);
  const interpY = y;
  const interpLineH = 5;
  const interpLines: string[] = [];
  opts.interpretation.forEach(line => {
    const processed = isRtl ? t(`• ${line}`) : `• ${line}`;
    const wrapped = doc.splitTextToSize(processed, W - 32);
    wrapped.forEach((l: string) => interpLines.push(l));
  });
  const interpH = interpLines.length * interpLineH + 10;
  doc.roundedRect(14, interpY, W - 28, interpH, 2, 2, "F");
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(14, interpY, 3, interpH, 1, 1, "F");

  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(8);
  setFont(doc, arabic, 'bold');
  const interpTitle = isRtl ? t("التفسير والتحليل المهني") : "PROFESSIONAL INTERPRETATION";
  if (isRtl) doc.text(interpTitle, W - 20, interpY + 6, { align: 'right' });
  else       doc.text(interpTitle, 20, interpY + 6);

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(7.5);
  setFont(doc, arabic, 'normal');
  interpLines.forEach((line, i) => {
    if (isRtl) doc.text(line, W - 20, interpY + 12 + i * interpLineH, { align: 'right' });
    else       doc.text(line, 20, interpY + 12 + i * interpLineH);
  });
  y = interpY + interpH + 6;

  /* ── Data table ── */
  if (opts.tableRows.length > 0) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(9);
    setFont(doc, arabic, 'bold');
    const tableTitle = isRtl
      ? t(`سجلات الفترة (${opts.tableRows.length} نتيجة)`)
      : `Period Records (${opts.tableRows.length} records)`;
    if (isRtl) doc.text(tableTitle, W - 14, y, { align: 'right' });
    else       doc.text(tableTitle, 14, y);
    y += 3;

    const processedColumns = isRtl ? opts.tableColumns.map(c => t(c)) : opts.tableColumns;
    const processedBody = opts.tableRows.map(row =>
      opts.tableColumns.map(col => {
        const key = col.toLowerCase().replace(/\s+/g, "");
        const val = String(row[col] ?? row[key] ?? "—");
        return isRtl ? t(val) : val;
      })
    );

    autoTable(doc, {
      startY: y,
      head: [processedColumns],
      body: processedBody,
      theme: "grid",
      headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 8, fontStyle: "bold", cellPadding: 3, font: arabic ? 'Tajawal' : 'helvetica', halign: isRtl ? 'right' : 'left' },
      bodyStyles: { fontSize: 7.5, textColor: GRAY_DARK, cellPadding: 2.5, font: arabic ? 'Tajawal' : 'helvetica', halign: isRtl ? 'right' : 'left' },
      alternateRowStyles: { fillColor: GRAY_LIGHT },
      styles: { lineColor: [226, 232, 240] as [number,number,number], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
  }

  /* ── Footer ── */
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(0, pageH - 10, W, 10, "F");
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Almuzini Children Hospital — Confidential Medical Report", 14, pageH - 4);
    doc.text(`Page ${p} of ${pageCount}`, W - 14, pageH - 4, { align: "right" });
  }

  const fileName = `${opts.reportType.replace(/\s/g, "-")}-${opts.period}-report.pdf`;
  doc.save(fileName);
}

/* ══════════════════════════════════════════════════════════════════════
   OVERALL REPORT
══════════════════════════════════════════════════════════════════════ */

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

function drawSectionHeader(doc: jsPDF, title: string, color: [number, number, number], y: number, W: number, isRtl: boolean, arabic: boolean, t: (s: string) => string) {
  doc.setFillColor(...color);
  doc.roundedRect(14, y, W - 28, 8, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  if (arabic) doc.setFont('Tajawal', 'normal');
  else        doc.setFont("helvetica", "bold");
  if (isRtl) doc.text(t(title), W - 18, y + 5.5, { align: 'right' });
  else       doc.text(title.toUpperCase(), 18, y + 5.5);
  return y + 12;
}

function drawKpiRow(doc: jsPDF, kpis: PdfKpi[], color: [number, number, number], y: number, W: number, isRtl: boolean, arabic: boolean, t: (s: string) => string): number {
  const kpiW = (W - 28 - (kpis.length - 1) * 3) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiW + 3);
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, "F");
    doc.setFillColor(...color);
    doc.roundedRect(x, y, 2.5, 18, 1, 1, "F");

    doc.setTextColor(...GRAY_MID);
    doc.setFontSize(5.5);
    if (arabic) doc.setFont('Tajawal', 'normal');
    else        doc.setFont('helvetica', 'normal');
    if (isRtl) doc.text(t(kpi.label), x + kpiW - 4, y + 5, { align: 'right' });
    else       doc.text(kpi.label.toUpperCase(), x + 6, y + 5);

    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(11);
    if (arabic) doc.setFont('Tajawal', 'normal');
    else        doc.setFont('helvetica', 'bold');
    if (isRtl) doc.text(String(kpi.value), x + kpiW - 4, y + 13, { align: 'right' });
    else       doc.text(String(kpi.value), x + 6, y + 13);

    if (kpi.sub) {
      doc.setTextColor(...color);
      doc.setFontSize(5.5);
      if (isRtl) doc.text(String(kpi.sub), x + kpiW - 4, y + 17, { align: 'right' });
      else       doc.text(String(kpi.sub), x + 6, y + 17);
    }
  });
  return y + 22;
}

function drawMiniChart(doc: jsPDF, data: PdfTrendPoint[], color: [number, number, number], label: string, y: number, W: number): number {
  if (data.length === 0) return y;
  const chartH = 28;
  const chartW = W - 28;
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
  doc.setDrawColor(...GRAY_MID);
  doc.setLineWidth(0.08);
  for (let g = 0; g <= 3; g++) {
    const lineY = y + 2 + (chartH * g) / 3;
    doc.line(17, lineY, 14 + chartW - 3, lineY);
  }
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
    const lbl = d.name.length > 5 ? d.name.substring(0, 5) : d.name;
    doc.text(lbl, bx + barW / 2, y + chartH + 7, { align: "center" });
  });
  return y + chartH + 12;
}

function drawInterpBox(doc: jsPDF, lines: string[], color: [number, number, number], y: number, W: number, isRtl: boolean, arabic: boolean, t: (s: string) => string): number {
  const interpLineH = 4.5;
  const wrapped: string[] = [];
  lines.forEach(l => {
    const processed = isRtl ? t(`• ${l}`) : `• ${l}`;
    doc.splitTextToSize(processed, W - 36).forEach((s: string) => wrapped.push(s));
  });
  const boxH = wrapped.length * interpLineH + 8;

  const lightR = Math.min(255, color[0] + 150);
  const lightG = Math.min(255, color[1] + 150);
  const lightB = Math.min(255, color[2] + 150);
  doc.setFillColor(lightR, lightG, lightB);
  doc.roundedRect(14, y, W - 28, boxH, 2, 2, "F");
  doc.setFillColor(...color);
  doc.roundedRect(14, y, 2.5, boxH, 1, 1, "F");

  doc.setTextColor(...color);
  doc.setFontSize(6.5);
  if (arabic) doc.setFont('Tajawal', 'normal');
  else        doc.setFont('helvetica', 'bold');
  if (isRtl) doc.text(t("تحليل"), W - 20, y + 5, { align: 'right' });
  else       doc.text("ANALYSIS", 20, y + 5);

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(6.5);
  if (arabic) doc.setFont('Tajawal', 'normal');
  else        doc.setFont('helvetica', 'normal');
  wrapped.forEach((line, i) => {
    if (isRtl) doc.text(line, W - 20, y + 10 + i * interpLineH, { align: 'right' });
    else       doc.text(line, 20, y + 10 + i * interpLineH);
  });
  return y + boxH + 4;
}

export async function generateOverallReportPDF(opts: OverallReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const isRtl = opts.language === "ar";
  const arabic = isRtl ? await loadArabicFont(doc) : false;
  const t = (s: string | number) => isRtl ? ar(String(s)) : String(s);

  /* ── Page 1: Executive Summary ── */
  drawPageHeader(doc, W, opts.period, opts.dateRange);
  let y = 38;

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(10);
  if (arabic) doc.setFont('Tajawal', 'normal');
  else        doc.setFont('helvetica', 'bold');
  const execTitle = isRtl ? t("ملخص تنفيذي — جميع الأقسام") : "EXECUTIVE SUMMARY — ALL DEPARTMENTS";
  if (isRtl) doc.text(execTitle, W - 14, y, { align: 'right' });
  else       doc.text(execTitle, 14, y);
  y += 5;

  doc.setTextColor(...GRAY_MID);
  doc.setFontSize(7);
  if (arabic) doc.setFont('Tajawal', 'normal');
  else        doc.setFont('helvetica', 'normal');
  const subTitle = isRtl ? t(`تقرير موحد لفترة: ${opts.period}`) : `Consolidated report for: ${opts.period}`;
  if (isRtl) doc.text(subTitle, W - 14, y, { align: 'right' });
  else       doc.text(subTitle, 14, y);
  y += 6;

  y = drawKpiRow(doc, opts.execKpis, BRAND_BLUE, y, W, isRtl, arabic, t);
  y += 2;

  /* Summary table */
  const summaryHead = isRtl
    ? [[t("القسم"), t("الإجمالي"), t("مكتمل"), t("معلق"), t("ملاحظة")]]
    : [["Department", "Total", "Completed / Paid", "Pending / Outstanding", "Highlight"]];

  const summaryBody = opts.sections.map(s => {
    const total = String(s.kpis[0]?.value ?? "—");
    const good  = String(s.kpis[1]?.value ?? "—");
    const pend  = String(s.kpis[2]?.value ?? "—");
    const note  = s.interpretation[0] ?? "—";
    const noteShort = note.substring(0, 55) + (note.length > 55 ? "…" : "");
    return isRtl
      ? [t(s.title), total, good, pend, t(noteShort)]
      : [s.title, total, good, pend, noteShort];
  });

  autoTable(doc, {
    startY: y,
    head: summaryHead,
    body: summaryBody,
    theme: "grid",
    headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 7.5, fontStyle: "bold", cellPadding: 2.5, font: arabic ? 'Tajawal' : 'helvetica', halign: isRtl ? 'right' : 'left' },
    bodyStyles: { fontSize: 6.5, textColor: GRAY_DARK, cellPadding: 2, font: arabic ? 'Tajawal' : 'helvetica', halign: isRtl ? 'right' : 'left' },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    styles: { lineColor: [226, 232, 240] as [number,number,number], lineWidth: 0.1 },
    columnStyles: { 4: { cellWidth: 55 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  /* Combined trend chart */
  const combinedMap: Record<string, number> = {};
  opts.sections.forEach(s => s.trendData.forEach(d => {
    combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count;
  }));
  const combined = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));

  if (combined.length > 0 && y < H - 60) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(8.5);
    if (arabic) doc.setFont('Tajawal', 'normal');
    else        doc.setFont('helvetica', 'bold');
    const chartTitle = isRtl ? t("النشاط الكلي للمستشفى خلال الفترة") : "Combined Hospital Activity Over Period";
    if (isRtl) doc.text(chartTitle, W - 14, y, { align: 'right' });
    else       doc.text(chartTitle, 14, y);
    y += 2;
    y = drawMiniChart(doc, combined, BRAND_BLUE, "", y, W);
  }

  /* ── Per-section pages ── */
  opts.sections.forEach(section => {
    doc.addPage();
    drawPageHeader(doc, W, opts.period, opts.dateRange);
    y = 36;

    y = drawSectionHeader(doc, section.title, section.color, y, W, isRtl, arabic, t);
    y += 2;

    y = drawKpiRow(doc, section.kpis, section.color, y, W, isRtl, arabic, t);
    y += 2;

    if (section.trendData.length > 0) {
      y = drawMiniChart(doc, section.trendData, section.color, section.trendLabel, y, W);
    }

    y = drawInterpBox(doc, section.interpretation, section.color, y, W, isRtl, arabic, t);

    if (section.tableRows.length > 0) {
      doc.setTextColor(...GRAY_DARK);
      doc.setFontSize(7.5);
      if (arabic) doc.setFont('Tajawal', 'normal');
      else        doc.setFont('helvetica', 'bold');
      const recTitle = isRtl
        ? t(`سجلات الفترة (${section.tableRows.length})`)
        : `Period Records (${section.tableRows.length})`;
      if (isRtl) doc.text(recTitle, W - 14, y, { align: 'right' });
      else       doc.text(recTitle, 14, y);
      y += 2;

      const cols = isRtl ? section.tableColumns.map(c => t(c)) : section.tableColumns;
      const body = section.tableRows.map(row =>
        section.tableColumns.map(col => {
          const key = col.toLowerCase().replace(/\s+/g, "");
          const val = String(row[col] ?? row[key] ?? "—");
          return isRtl ? t(val) : val;
        })
      );

      autoTable(doc, {
        startY: y,
        head: [cols],
        body,
        theme: "grid",
        headStyles: { fillColor: section.color, textColor: WHITE, fontSize: 7, fontStyle: "bold", cellPadding: 2, font: arabic ? 'Tajawal' : 'helvetica', halign: isRtl ? 'right' : 'left' },
        bodyStyles: { fontSize: 6.5, textColor: GRAY_DARK, cellPadding: 1.8, font: arabic ? 'Tajawal' : 'helvetica', halign: isRtl ? 'right' : 'left' },
        alternateRowStyles: { fillColor: GRAY_LIGHT },
        styles: { lineColor: [226, 232, 240] as [number,number,number], lineWidth: 0.1 },
        margin: { left: 14, right: 14 },
      });
    }
  });

  /* ── Footer on every page ── */
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(0, pH - 10, W, 10, "F");
    doc.setTextColor(...GRAY_MID);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Almuzini Children Hospital — Confidential Medical Report", 14, pH - 4);
    doc.text(`Page ${p} of ${pageCount}`, W - 14, pH - 4, { align: "right" });
  }

  doc.save(`Overall-Hospital-${opts.period}-report.pdf`);
}
