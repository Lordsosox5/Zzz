import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const BRAND_BLUE  = [37, 99, 235] as [number, number, number];
const BRAND_LIGHT = [239, 246, 255] as [number, number, number];
const GRAY_DARK   = [30, 41, 59] as [number, number, number];
const GRAY_MID    = [100, 116, 139] as [number, number, number];
const GRAY_LIGHT  = [241, 245, 249] as [number, number, number];
const WHITE       = [255, 255, 255] as [number, number, number];
const KPI_COLORS: [number, number, number][] = [
  [59, 130, 246],
  [16, 185, 129],
  [239, 68, 68],
  [139, 92, 246],
];

function hex(rgb: [number, number, number]) {
  return rgb;
}

export function generateReportPDF(opts: ReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  const isRtl = opts.language === "ar";

  /* ── Header band ── */
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, W, 38, "F");

  doc.setFillColor(255, 255, 255, 0.08);
  doc.circle(W - 10, -5, 30, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Almuzini Children Hospital", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Pediatric Electronic Health Record System", 14, 21);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const reportTitle = isRtl
    ? `${opts.reportType} — تقرير`
    : `${opts.reportType} Report`;
  doc.text(reportTitle, 14, 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text(`Period: ${opts.period}  •  ${opts.dateRange}`, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 36, { align: "right" });

  y = 46;

  /* ── Section: KPIs ── */
  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(isRtl ? "مؤشرات الأداء الرئيسية" : "KEY PERFORMANCE INDICATORS", 14, y);
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
    const labelLines = doc.splitTextToSize(kpi.label.toUpperCase(), kpiW - 8);
    doc.text(labelLines, x + 7, y + 6);

    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(String(kpi.value), x + 7, y + 15);

    if (kpi.sub) {
      doc.setTextColor(...color);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(kpi.sub, x + 7, y + 20);
    }
  });
  y += 28;

  /* ── Section: Mini bar chart ── */
  if (opts.trendData.length > 0) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(opts.trendLabel, 14, y);
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
        doc.setFontSize(5.5);
        doc.text(String(d.count), bx + barW / 2, by - 1, { align: "center" });
      }

      doc.setTextColor(...GRAY_MID);
      doc.setFontSize(5.5);
      const label = d.name.length > 6 ? d.name.substring(0, 6) : d.name;
      doc.text(label, bx + barW / 2, chartY + chartH + 8, { align: "center" });
    });

    y += chartH + 16;
  }

  /* ── Section: Interpretation ── */
  doc.setFillColor(...BRAND_LIGHT);
  const interpY = y;
  const interpLineH = 5;
  const interpLines: string[] = [];
  opts.interpretation.forEach(line => {
    const wrapped = doc.splitTextToSize(`• ${line}`, W - 32);
    wrapped.forEach((l: string) => interpLines.push(l));
  });
  const interpH = interpLines.length * interpLineH + 10;
  doc.roundedRect(14, interpY, W - 28, interpH, 2, 2, "F");

  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(14, interpY, 3, interpH, 1, 1, "F");

  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    isRtl ? "التفسير والتحليل المهني" : "PROFESSIONAL INTERPRETATION",
    20, interpY + 6,
  );

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  interpLines.forEach((line, i) => {
    doc.text(line, 20, interpY + 12 + i * interpLineH);
  });

  y = interpY + interpH + 6;

  /* ── Section: Data table ── */
  if (opts.tableRows.length > 0) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      isRtl ? `سجلات الفترة (${opts.tableRows.length} نتيجة)` : `Period Records (${opts.tableRows.length} records)`,
      14, y,
    );
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [opts.tableColumns],
      body: opts.tableRows.map(row =>
        opts.tableColumns.map(col => {
          const key = col.toLowerCase().replace(/\s+/g, "");
          const val = row[col] ?? row[key] ?? "—";
          return String(val);
        })
      ),
      theme: "grid",
      headStyles: {
        fillColor: BRAND_BLUE,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: GRAY_DARK,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: GRAY_LIGHT,
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      margin: { left: 14, right: 14 },
    });
  }

  /* ── Footer on every page ── */
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(0, pageH - 10, W, 10, "F");
    doc.setTextColor(...GRAY_MID);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("Almuzini Children Hospital — Confidential Medical Report", 14, pageH - 4);
    doc.text(`Page ${p} of ${pageCount}`, W - 14, pageH - 4, { align: "right" });
  }

  const fileName = `${opts.reportType.replace(/\s/g, "-")}-${opts.period}-report.pdf`;
  doc.save(fileName);
}

/* ─────────────────────────────────────────────────────────────────────
   OVERALL REPORT — multi-section consolidated PDF
───────────────────────────────────────────────────────────────────────*/

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
  execKpis: PdfKpi[];   // top-level summary row
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

function drawSectionHeader(doc: jsPDF, title: string, color: [number, number, number], y: number, W: number) {
  doc.setFillColor(...color);
  doc.roundedRect(14, y, W - 28, 8, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 18, y + 5.5);
  return y + 12;
}

function drawKpiRow(doc: jsPDF, kpis: PdfKpi[], color: [number, number, number], y: number, W: number): number {
  const kpiW = (W - 28 - (kpis.length - 1) * 3) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiW + 3);
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, "F");
    doc.setFillColor(...color);
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
      doc.setTextColor(...color);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(kpi.sub, x + 6, y + 17);
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

  doc.setTextColor(...GRAY_MID);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(label, 14, y);
  y += 3;

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
      doc.setFontSize(4.5);
      doc.text(String(d.count), bx + barW / 2, by - 0.5, { align: "center" });
    }
    doc.setTextColor(...GRAY_MID);
    doc.setFontSize(4.5);
    const lbl = d.name.length > 5 ? d.name.substring(0, 5) : d.name;
    doc.text(lbl, bx + barW / 2, y + chartH + 7, { align: "center" });
  });
  return y + chartH + 12;
}

function drawInterpBox(doc: jsPDF, lines: string[], color: [number, number, number], y: number, W: number): number {
  const interpLineH = 4.5;
  const wrapped: string[] = [];
  lines.forEach(l => doc.splitTextToSize(`• ${l}`, W - 36).forEach((s: string) => wrapped.push(s)));
  const boxH = wrapped.length * interpLineH + 8;

  doc.setFillColor(color[0], color[1], color[2], 0.06 as any);
  doc.setFillColor(color[0] + 150 > 255 ? 255 : color[0] + 150,
                   color[1] + 150 > 255 ? 255 : color[1] + 150,
                   color[2] + 150 > 255 ? 255 : color[2] + 150);
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
  wrapped.forEach((line, i) => doc.text(line, 20, y + 10 + i * interpLineH));
  return y + boxH + 4;
}

export function generateOverallReportPDF(opts: OverallReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const isRtl = opts.language === "ar";

  /* ── Page 1: Executive Summary ── */
  drawPageHeader(doc, W, opts.period, opts.dateRange);

  let y = 38;

  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(isRtl ? "ملخص تنفيذي — جميع الأقسام" : "EXECUTIVE SUMMARY — ALL DEPARTMENTS", 14, y);
  y += 5;

  doc.setTextColor(...GRAY_MID);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(isRtl ? `تقرير موحد لفترة: ${opts.period}` : `Consolidated report for: ${opts.period}`, 14, y);
  y += 6;

  /* Executive KPI row */
  y = drawKpiRow(doc, opts.execKpis, BRAND_BLUE, y, W);
  y += 2;

  /* Summary table — one row per module */
  const summaryHead = isRtl
    ? [["القسم", "الإجمالي", "مكتمل/مدفوع/مصروف", "معلق/متأخر", "ملاحظة"]]
    : [["Department", "Total", "Completed / Paid / Dispensed", "Pending / Outstanding", "Highlight"]];

  const summaryBody = opts.sections.map(s => {
    const total = s.kpis[0]?.value ?? "—";
    const good  = s.kpis[1]?.value ?? "—";
    const pend  = s.kpis[2]?.value ?? "—";
    const note  = s.interpretation[0] ?? "—";
    return [s.title, String(total), String(good), String(pend), note.substring(0, 60) + (note.length > 60 ? "…" : "")];
  });

  autoTable(doc, {
    startY: y,
    head: summaryHead,
    body: summaryBody,
    theme: "grid",
    headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontSize: 7.5, fontStyle: "bold", cellPadding: 2.5 },
    bodyStyles: { fontSize: 6.5, textColor: GRAY_DARK, cellPadding: 2 },
    alternateRowStyles: { fillColor: GRAY_LIGHT },
    styles: { lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1 },
    columnStyles: { 4: { cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  /* Combined trend chart (sum all sections' trend data by label) */
  const combinedMap: Record<string, number> = {};
  opts.sections.forEach(s => s.trendData.forEach(d => {
    combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count;
  }));
  const combinedTrend = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));

  if (combinedTrend.length > 0 && y < H - 60) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(isRtl ? "النشاط الكلي للمستشفى خلال الفترة" : "Combined Hospital Activity Over Period", 14, y);
    y += 2;
    y = drawMiniChart(doc, combinedTrend, BRAND_BLUE, "", y, W);
  }

  /* ── Per-section pages ── */
  opts.sections.forEach(section => {
    doc.addPage();
    drawPageHeader(doc, W, opts.period, opts.dateRange);
    y = 36;

    y = drawSectionHeader(doc, section.title, section.color, y, W);
    y += 2;

    y = drawKpiRow(doc, section.kpis, section.color, y, W);
    y += 2;

    if (section.trendData.length > 0) {
      y = drawMiniChart(doc, section.trendData, section.color, section.trendLabel, y, W);
    }

    y = drawInterpBox(doc, section.interpretation, section.color, y, W);

    if (section.tableRows.length > 0) {
      doc.setTextColor(...GRAY_DARK);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(isRtl
        ? `سجلات الفترة (${section.tableRows.length})`
        : `Period Records (${section.tableRows.length})`, 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [section.tableColumns],
        body: section.tableRows.map(row =>
          section.tableColumns.map(col => {
            const key = col.toLowerCase().replace(/\s+/g, "");
            const val = row[col] ?? row[key] ?? "—";
            return String(val);
          })
        ),
        theme: "grid",
        headStyles: { fillColor: section.color, textColor: WHITE, fontSize: 7, fontStyle: "bold", cellPadding: 2 },
        bodyStyles: { fontSize: 6.5, textColor: GRAY_DARK, cellPadding: 1.8 },
        alternateRowStyles: { fillColor: GRAY_LIGHT },
        styles: { lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1 },
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
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("Almuzini Children Hospital — Confidential Medical Report", 14, pH - 4);
    doc.text(`Page ${p} of ${pageCount}`, W - 14, pH - 4, { align: "right" });
  }

  doc.save(`Overall-Hospital-${opts.period}-report.pdf`);
}
