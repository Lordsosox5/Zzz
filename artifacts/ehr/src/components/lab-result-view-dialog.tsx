import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Eye, Printer, FlaskConical, HeartPulse, TrendingUp, Minus, ShieldAlert,
} from "lucide-react";
import {
  findTest, fieldStatus,
  type LabTest,
} from "@/lib/lab-tests";
import { useTranslation } from "@/lib/i18n";

export type OrderForReport = {
  id: number;
  testName: string;
  testCode?: string | null;
  patientName?: string | null;
  patientId: number;
  orderedByName?: string | null;
  result?: string | null;
  resultValue?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  isCritical?: boolean | null;
  resultedAt?: string | null;
  createdAt: string;
  priority?: string | null;
  notes?: string | null;
};

type FieldRow = {
  label: string;
  value: string;
  unit: string;
  refRange: string;
  status: "normal" | "abnormal" | "critical" | null;
};

function parseFieldRows(order: OrderForReport, testDef: LabTest | undefined): FieldRow[] {
  if (!order.resultValue) return [];

  if (order.resultValue.startsWith("{")) {
    try {
      const parsed: Record<string, string> = JSON.parse(order.resultValue);
      return Object.entries(parsed).map(([key, val]) => {
        const fieldDef = testDef?.fields.find((f) => f.key === key);
        return {
          label: fieldDef?.label ?? key.toUpperCase(),
          value: val,
          unit: fieldDef?.unit ?? "",
          refRange: fieldDef?.refRange ?? "",
          status: fieldDef ? fieldStatus(fieldDef, val) : null,
        };
      });
    } catch {
      // fall through to single-field
    }
  }

  const fieldDef = testDef?.fields[0];
  return [{
    label: fieldDef?.label ?? order.testName,
    value: order.resultValue,
    unit: order.unit ?? fieldDef?.unit ?? "",
    refRange: order.referenceRange ?? fieldDef?.refRange ?? "",
    status: fieldDef ? fieldStatus(fieldDef, order.resultValue) : null,
  }];
}

function FieldFlag({ status }: { status: "normal" | "abnormal" | "critical" | null }) {
  const { t } = useTranslation();
  if (!status || status === "normal")
    return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs"><Minus className="h-3 w-3" />{t("lab.flagNormal")}</span>;
  if (status === "critical")
    return <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs"><ShieldAlert className="h-3 w-3" />{t("lab.flagCritical")}</span>;
  return <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-xs"><TrendingUp className="h-3 w-3" />{t("lab.flagAbnormal")}</span>;
}

export function LabResultViewDialog({
  order,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  order: OrderForReport;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t, isRtl, language } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const testDef = useMemo(() => findTest(order.testName), [order.testName]);
  const fieldRows = useMemo(() => parseFieldRows(order, testDef), [order, testDef]);

  const resultColor =
    order.result === "critical" ? "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800" :
    order.result === "abnormal" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800" :
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800";

  const resultText =
    order.result === "critical" ? { label: t("lab.resultLabelCritical"), cls: "text-red-600 dark:text-red-400" } :
    order.result === "abnormal" ? { label: t("lab.resultLabelAbnormal"), cls: "text-amber-600 dark:text-amber-400" } :
    { label: t("lab.resultLabelNormal"), cls: "text-emerald-600 dark:text-emerald-400" };

  const priorityLabel =
    order.priority === "stat" ? t("generic.stat") :
    order.priority === "urgent" ? t("generic.urgent") :
    t("lab.routineLabel");

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const dir = language === "ar" ? "rtl" : "ltr";
    const fontFamily = language === "ar"
      ? "'Tajawal', 'Segoe UI', Arial, sans-serif"
      : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

    const orderId = `LAB-${String(order.id).padStart(4, "0")}`;
    const statusClass = order.result === "critical" ? "critical" : order.result === "abnormal" ? "abnormal" : "normal";
    const statusLabel = order.result === "critical" ? t("lab.resultLabelCritical") : order.result === "abnormal" ? t("lab.resultLabelAbnormal") : t("lab.resultLabelNormal");

    const flagHtml = (status: "normal" | "abnormal" | "critical" | null) => {
      if (!status || status === "normal") return `<span class="flag flag-normal">&#10003; ${t("lab.flagNormal")}</span>`;
      if (status === "critical") return `<span class="flag flag-critical">&#9888; ${t("lab.flagCritical")}</span>`;
      return `<span class="flag flag-abnormal">&#8593; ${t("lab.flagAbnormal")}</span>`;
    };

    const refBarHtml = (row: FieldRow) => {
      const num = parseFloat(row.value);
      if (!row.refRange || isNaN(num)) return "";
      const match = row.refRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (!match) return "";
      const lo = parseFloat(match[1]), hi = parseFloat(match[2]);
      if (isNaN(lo) || isNaN(hi) || hi <= lo) return "";
      const range = hi - lo;
      const padding = range * 0.25;
      const min = lo - padding, max = hi + padding;
      const pct = Math.min(100, Math.max(0, ((num - min) / (max - min)) * 100));
      const loPct = ((lo - min) / (max - min)) * 100;
      const hiPct = ((hi - min) / (max - min)) * 100;
      const color = row.status === "critical" ? "#dc2626" : row.status === "abnormal" ? "#d97706" : "#16a34a";
      return `
        <div class="ref-bar-wrap">
          <div class="ref-bar-track">
            <div class="ref-bar-normal" style="left:${loPct}%;width:${hiPct - loPct}%"></div>
            <div class="ref-bar-marker" style="left:${pct}%;background:${color}"></div>
          </div>
          <div class="ref-bar-labels">
            <span>${lo}</span><span>${hi}</span>
          </div>
        </div>`;
    };

    const tableRows = fieldRows.map((row) => `
      <tr class="row-${row.status ?? "normal"}">
        <td class="td-analyte">${row.label}</td>
        <td class="td-value val-${row.status ?? "normal"}">${row.value || "—"}</td>
        <td class="td-unit">${row.unit || "—"}</td>
        <td class="td-ref">${row.refRange || "—"}${refBarHtml(row)}</td>
        <td class="td-flag">${flagHtml(row.status)}</td>
      </tr>`).join("");

    const singleResult = fieldRows.length === 0 && order.result ? `
      <div class="single-result val-${statusClass}">
        ${order.resultValue || order.result}${order.unit ? `<span class="single-unit"> ${order.unit}</span>` : ""}
      </div>
      ${order.referenceRange ? `<p class="single-ref">${t("lab.referenceRangeLabel")} <b>${order.referenceRange}</b></p>` : ""}` : "";

    const notesSection = order.notes ? `
      <div class="section-title">${t("lab.clinicalNotesSection")}</div>
      <div class="notes-box">${order.notes}</div>` : "";

    const criticalBanner = order.isCritical ? `
      <div class="critical-alert">
        <b>⚠ ${t("lab.criticalResultTitle")}</b> — ${t("lab.criticalResultDesc")}
      </div>` : "";

    const now = new Date().toLocaleString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    win.document.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${language}"><head>
  <meta charset="utf-8">
  <title>${t("lab.report")} – ${order.testName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontFamily}; background: #fff; color: #1e293b; font-size: 12.5px; line-height: 1.5; direction: ${dir}; }
    @page { size: A4; margin: 18mm 16mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

    /* ── Header ── */
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px solid #1e40af; margin-bottom: 18px; }
    .hospital-block { display: flex; align-items: center; gap: 12px; }
    .hospital-logo { width: 44px; height: 44px; border-radius: 10px; background: #1e40af; display: flex; align-items: center; justify-content: center; }
    .hospital-logo svg { width: 26px; height: 26px; fill: none; stroke: #fff; stroke-width: 1.8; }
    .hospital-name { font-size: 15px; font-weight: 800; color: #1e293b; line-height: 1.2; }
    .hospital-sub  { font-size: 10px; color: #64748b; font-weight: 500; }
    .report-meta { text-align: ${dir === "rtl" ? "left" : "right"}; }
    .report-id   { font-size: 13px; font-weight: 800; color: #1e40af; font-family: monospace; }
    .report-date { font-size: 10px; color: #94a3b8; margin-top: 2px; }

    /* ── Test title bar ── */
    .test-bar { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
    .test-name { font-size: 16px; font-weight: 800; color: #0f172a; }
    .test-code  { font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px; }
    .priority-badge { padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .priority-stat    { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .priority-urgent  { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
    .priority-routine { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }

    /* ── Critical alert ── */
    .critical-alert { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 7px; padding: 10px 14px; margin-bottom: 14px; color: #b91c1c; font-size: 12px; }

    /* ── Info grid ── */
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
    .info-card { border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 12px; background: #fafbfc; }
    .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; display: block; margin-bottom: 3px; }
    .info-value { font-size: 12.5px; font-weight: 700; color: #1e293b; }

    /* ── Status banner ── */
    .status-banner { border-radius: 10px; padding: 14px 20px; margin-bottom: 16px; border: 2px solid; display: flex; align-items: center; justify-content: space-between; }
    .status-normal   { background: #f0fdf4; border-color: #86efac; }
    .status-abnormal { background: #fffbeb; border-color: #fcd34d; }
    .status-critical { background: #fef2f2; border-color: #fca5a5; }
    .status-left .status-eyebrow { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
    .status-word { font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -0.01em; }
    .word-normal   { color: #15803d; }
    .word-abnormal { color: #b45309; }
    .word-critical { color: #b91c1c; }
    .status-icon { width: 52px; height: 52px; border-radius: 50%; border: 3px solid; display: flex; align-items: center; justify-content: center; }
    .icon-normal   { border-color: #86efac; background: #dcfce7; color: #16a34a; }
    .icon-abnormal { border-color: #fcd34d; background: #fef9c3; color: #ca8a04; }
    .icon-critical { border-color: #fca5a5; background: #fee2e2; color: #dc2626; }
    .status-icon svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 2; }

    /* ── Section title ── */
    .section-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }

    /* ── Results table ── */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #1e40af; }
    thead th { color: #fff; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 9px 12px; text-align: start; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .row-critical { background: #fef2f2 !important; }
    .row-abnormal { background: #fffbeb !important; }
    td { padding: 9px 12px; vertical-align: middle; }
    .td-analyte { font-weight: 600; color: #1e293b; font-size: 12.5px; }
    .td-value   { font-weight: 800; font-size: 14px; font-family: monospace; text-align: center; }
    .td-unit    { text-align: center; color: #64748b; font-size: 11px; font-family: monospace; }
    .td-ref     { color: #64748b; font-size: 11px; font-family: monospace; }
    .td-flag    { text-align: center; }
    .val-normal   { color: #15803d; }
    .val-abnormal { color: #b45309; }
    .val-critical { color: #b91c1c; }

    /* ── Reference bar ── */
    .ref-bar-wrap   { margin-top: 5px; }
    .ref-bar-track  { position: relative; height: 6px; background: #e2e8f0; border-radius: 3px; }
    .ref-bar-normal { position: absolute; top: 0; height: 100%; background: #86efac; border-radius: 3px; }
    .ref-bar-marker { position: absolute; top: -3px; width: 12px; height: 12px; border-radius: 50%; transform: translateX(-50%); border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
    .ref-bar-labels { display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-top: 2px; }

    /* ── Flag ── */
    .flag { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; display: inline-block; }
    .flag-normal   { background: #dcfce7; color: #15803d; }
    .flag-abnormal { background: #fef9c3; color: #a16207; }
    .flag-critical { background: #fee2e2; color: #b91c1c; }

    /* ── Single result (no structured fields) ── */
    .single-result { font-size: 42px; font-weight: 900; font-family: monospace; text-align: center; padding: 24px; border: 1.5px solid #e2e8f0; border-radius: 10px; }
    .single-unit { font-size: 18px; font-weight: 500; color: #64748b; }
    .single-ref  { text-align: center; font-size: 11px; color: #64748b; margin-top: 8px; }

    /* ── Notes ── */
    .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 14px; font-size: 12px; color: #374151; line-height: 1.6; }

    /* ── Footer ── */
    .footer { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
    .footer-left  { font-size: 10px; color: #64748b; font-weight: 600; }
    .footer-right { font-size: 10px; color: #94a3b8; }
    .confidential { text-align: center; font-size: 9px; color: #cbd5e1; margin-top: 8px; letter-spacing: 0.05em; text-transform: uppercase; }
    hr.divider { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
  </style>
</head><body>

  <!-- Header -->
  <div class="header">
    <div class="hospital-block">
      <div class="hospital-logo">
        <svg viewBox="0 0 24 24"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
      </div>
      <div>
        <div class="hospital-name">${t("app.title")}</div>
        <div class="hospital-sub">${t("lab.pediatricLaboratory")}</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-id">${orderId}</div>
      <div class="report-date">${t("lab.reportGenerated")} ${now}</div>
    </div>
  </div>

  <!-- Test title bar -->
  <div class="test-bar">
    <div>
      <div class="test-name">${order.testName}</div>
      ${order.testCode ? `<div class="test-code">${order.testCode}${testDef?.category ? ` &nbsp;·&nbsp; ${testDef.category}` : ""}</div>` : ""}
    </div>
    <span class="priority-badge priority-${order.priority ?? "routine"}">${priorityLabel}</span>
  </div>

  ${criticalBanner}

  <!-- Patient & order info -->
  <div class="info-grid">
    <div class="info-card"><span class="info-label">${t("lab.infoPatient")}</span><div class="info-value">${order.patientName ?? `#${order.patientId}`}</div></div>
    <div class="info-card"><span class="info-label">${t("lab.infoOrderedBy")}</span><div class="info-value">${order.orderedByName ?? "—"}</div></div>
    <div class="info-card"><span class="info-label">${t("lab.infoOrderId")}</span><div class="info-value" style="font-family:monospace">${orderId}</div></div>
    <div class="info-card"><span class="info-label">${t("lab.infoOrderDate")}</span><div class="info-value">${orderedDate}</div></div>
    <div class="info-card"><span class="info-label">${t("lab.infoResultDate")}</span><div class="info-value">${resultedDate}</div></div>
    <div class="info-card"><span class="info-label">${t("lab.infoPriority")}</span><div class="info-value">${priorityLabel}</div></div>
  </div>

  <!-- Overall status banner -->
  ${order.result ? `
  <div class="status-banner status-${statusClass}">
    <div class="status-left">
      <div class="status-eyebrow">${t("lab.overallResult")}</div>
      <div class="status-word word-${statusClass}">${statusLabel}</div>
    </div>
    <div class="status-icon icon-${statusClass}">
      <svg viewBox="0 0 24 24">
        ${statusClass === "normal"
          ? '<path d="M20 6L9 17l-5-5"/>'
          : statusClass === "critical"
            ? '<path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>'
            : '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'}
      </svg>
    </div>
  </div>` : ""}

  <!-- Results section -->
  <div class="section-title">${t("lab.testResultsSection")}</div>
  ${fieldRows.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th style="width:28%">${t("lab.colAnalyte")}</th>
        <th style="width:12%;text-align:center">${t("lab.colValue")}</th>
        <th style="width:12%;text-align:center">${t("lab.colUnit")}</th>
        <th style="width:32%">${t("lab.colReferenceRange")}</th>
        <th style="width:16%;text-align:center">${t("lab.colFlag")}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>` : singleResult}

  ${notesSection}

  <hr class="divider">

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">&#10084; ${t("app.title")} &nbsp;·&nbsp; ${t("lab.pediatricLaboratory")}</div>
    <div class="footer-right">${t("lab.reportGenerated")} ${now}</div>
  </div>
  <div class="confidential">Confidential Medical Record — For Authorized Use Only</div>

</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  const resultedDate = order.resultedAt
    ? new Date(order.resultedAt).toLocaleString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const orderedDate = new Date(order.createdAt).toLocaleString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const infoItems = [
    { label: t("lab.infoPatient"),     value: order.patientName ?? `${t("lab.patientHash")}${order.patientId}` },
    { label: t("lab.infoOrderedBy"),   value: order.orderedByName ?? "—" },
    { label: t("lab.infoPriority"),    value: priorityLabel },
    { label: t("lab.infoOrderDate"),   value: orderedDate },
    { label: t("lab.infoResultDate"),  value: resultedDate },
    { label: t("lab.infoOrderId"),     value: `LAB-${String(order.id).padStart(4, "0")}` },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap border-primary/30 text-primary hover:bg-primary/5">
            <Eye className="h-3.5 w-3.5" /> {t("lab.viewReport")}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-3xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">{order.testName}</DialogTitle>
              {order.testCode && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {order.testCode} · {testDef?.category ?? t("lab.laboratoryCategory")}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> {t("lab.print")}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div id={`lab-report-${order.id}`} className="p-6 space-y-5" dir={isRtl ? "rtl" : "ltr"}>

            {order.isCritical && (
              <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-700 px-4 py-3">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{t("lab.criticalResultTitle")}</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">{t("lab.criticalResultDesc")}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {infoItems.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 border px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-sm font-semibold truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {order.result && (
              <div className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 ${resultColor}`}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{t("lab.overallResult")}</p>
                  <p className={`text-3xl font-black tracking-wide ${resultText.cls}`}>{resultText.label}</p>
                </div>
                <div className={`h-16 w-16 rounded-full border-4 flex items-center justify-center ${
                  order.result === "critical" ? "border-red-300 bg-red-100 dark:bg-red-900/40" :
                  order.result === "abnormal" ? "border-amber-300 bg-amber-100 dark:bg-amber-900/40" :
                  "border-emerald-300 bg-emerald-100 dark:bg-emerald-900/40"
                }`}>
                  {order.result === "critical" ? <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" /> :
                   order.result === "abnormal" ? <TrendingUp className="h-7 w-7 text-amber-600 dark:text-amber-400" /> :
                   <HeartPulse className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("lab.testResultsSection")}</p>
              {fieldRows.length > 0 ? (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-bold text-xs uppercase tracking-wide w-[35%]">{t("lab.colAnalyte")}</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">{t("lab.colValue")}</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">{t("lab.colUnit")}</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">{t("lab.colReferenceRange")}</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">{t("lab.colFlag")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldRows.map((row, i) => (
                        <TableRow
                          key={i}
                          className={
                            row.status === "critical" ? "bg-red-50/60 dark:bg-red-950/20" :
                            row.status === "abnormal" ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                          }
                        >
                          <TableCell className="font-semibold text-sm">{row.label}</TableCell>
                          <TableCell className={`text-center font-bold text-base tabular-nums ${
                            row.status === "critical" ? "text-red-600 dark:text-red-400" :
                            row.status === "abnormal" ? "text-amber-600 dark:text-amber-400" :
                            "text-foreground"
                          }`}>
                            {row.value || "—"}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground font-mono">{row.unit || "—"}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground font-mono">{row.refRange || "—"}</TableCell>
                          <TableCell className="text-center"><FieldFlag status={row.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : order.result ? (
                <div className="rounded-xl border px-6 py-8 text-center bg-muted/20">
                  <p className={`text-4xl font-black mb-1 ${resultText.cls}`}>
                    {order.resultValue || order.result}
                    {order.unit && <span className="text-lg font-semibold text-muted-foreground ms-2">{order.unit}</span>}
                  </p>
                  {order.referenceRange && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("lab.referenceRangeLabel")} <span className="font-mono font-medium">{order.referenceRange}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("lab.noResultValues")}</p>
              )}
            </div>

            {order.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("lab.clinicalNotesSection")}</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg px-4 py-3 border">{order.notes}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="font-semibold">{t("app.title")}</span>
                <span>· {t("lab.pediatricLaboratory")}</span>
              </div>
              <span>
                {t("lab.reportGenerated")} {new Date().toLocaleString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
