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
