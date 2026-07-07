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
import { printHtml } from "@/lib/print-html";

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
    const dir = language === "ar" ? "rtl" : "ltr";
    const isAr = language === "ar";
    const fontFamily = isAr
      ? "'Tajawal', 'Segoe UI', Arial, sans-serif"
      : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

    const orderId = `LAB-${String(order.id).padStart(5, "0")}`;
    const statusClass = order.result === "critical" ? "critical" : order.result === "abnormal" ? "abnormal" : "normal";
    const statusLabel = order.result === "critical" ? t("lab.resultLabelCritical") : order.result === "abnormal" ? t("lab.resultLabelAbnormal") : t("lab.resultLabelNormal");
    const now = new Date().toLocaleString(isAr ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    // ── Flag cell ──────────────────────────────────────────────────
    const flagHtml = (status: "normal" | "abnormal" | "critical" | null) => {
      if (!status || status === "normal")
        return `<span class="badge badge-normal">&#10003;&nbsp;${t("lab.flagNormal")}</span>`;
      if (status === "critical")
        return `<span class="badge badge-critical">&#9650;&nbsp;${t("lab.flagCritical")}</span>`;
      return `<span class="badge badge-abnormal">&#8593;&nbsp;${t("lab.flagAbnormal")}</span>`;
    };

    // ── Mini reference bar ─────────────────────────────────────────
    const refBarHtml = (row: FieldRow) => {
      const num = parseFloat(row.value);
      if (!row.refRange || isNaN(num)) return `<span class="ref-text">${row.refRange || "—"}</span>`;
      const m = row.refRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
      if (!m) return `<span class="ref-text">${row.refRange}</span>`;
      const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
      if (isNaN(lo) || isNaN(hi) || hi <= lo) return `<span class="ref-text">${row.refRange}</span>`;
      const pad = (hi - lo) * 0.3;
      const vmin = lo - pad, vmax = hi + pad;
      const pct  = Math.min(100, Math.max(0, ((num - vmin) / (vmax - vmin)) * 100));
      const loPct = ((lo - vmin) / (vmax - vmin)) * 100;
      const hiPct = ((hi - vmin) / (vmax - vmin)) * 100;
      const dotColor = row.status === "critical" ? "#dc2626" : row.status === "abnormal" ? "#d97706" : "#16a34a";
      return `
        <span class="ref-text">${row.refRange}</span>
        <div class="rbar-wrap">
          <div class="rbar-track">
            <div class="rbar-zone" style="left:${loPct}%;width:${hiPct - loPct}%"></div>
            <div class="rbar-dot" style="left:${pct}%;background:${dotColor}"></div>
          </div>
          <div class="rbar-ends"><span>${lo}</span><span>${hi}</span></div>
        </div>`;
    };

    // ── Table rows ─────────────────────────────────────────────────
    const tableRows = fieldRows.map((row, i) => {
      const s = row.status ?? "normal";
      const accentColor = s === "critical" ? "#dc2626" : s === "abnormal" ? "#d97706" : "transparent";
      const rowBg = s === "critical" ? "#fff5f5" : s === "abnormal" ? "#fffbeb" : i % 2 === 1 ? "#f8fafc" : "#fff";
      return `<tr style="background:${rowBg};">
        <td class="td-name" style="border-${dir === "rtl" ? "right" : "left"}:3px solid ${accentColor}">${row.label}</td>
        <td class="td-val s-${s}">${row.value || "—"}</td>
        <td class="td-unit">${row.unit || "—"}</td>
        <td class="td-ref">${refBarHtml(row)}</td>
        <td class="td-flag">${flagHtml(row.status)}</td>
      </tr>`;
    }).join("");

    // ── Single value fallback ──────────────────────────────────────
    const singleBlock = fieldRows.length === 0 && order.result ? `
      <div class="single-wrap">
        <div class="single-val s-${statusClass}">
          ${order.resultValue || order.result}
          ${order.unit ? `<span class="single-unit">${order.unit}</span>` : ""}
        </div>
        ${order.referenceRange ? `<div class="single-ref">${t("lab.referenceRangeLabel")} &nbsp;<b>${order.referenceRange}</b></div>` : ""}
      </div>` : "";

    // ── Status stamp ───────────────────────────────────────────────
    const stampColors = {
      normal:   { bg: "#f0fdf4", border: "#4ade80", text: "#15803d", icon: "M20 6L9 17l-5-5" },
      abnormal: { bg: "#fffbeb", border: "#fbbf24", text: "#b45309", icon: "M12 9v4m0 4h.01" },
      critical: { bg: "#fef2f2", border: "#f87171", text: "#b91c1c", icon: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" },
    }[statusClass];

    const stampHtml = order.result ? `
      <div class="stamp" style="background:${stampColors.bg};border-color:${stampColors.border}">
        <div>
          <div class="stamp-eyebrow">${t("lab.overallResult")}</div>
          <div class="stamp-word" style="color:${stampColors.text}">${statusLabel}</div>
        </div>
        <svg class="stamp-icon" viewBox="0 0 24 24" style="stroke:${stampColors.text}">
          <path d="${stampColors.icon}" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>` : "";

    printHtml(`<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <title>${t("lab.report")} – ${order.testName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      background: #fff; color: #1e293b;
      font-size: 12px; line-height: 1.55;
      direction: ${dir};
    }
    @page { size: A4; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

    /* ── Page wrapper ── */
    .page { min-height: 297mm; display: flex; flex-direction: column; }
    .body-content { padding: 0 22mm 12mm; flex: 1; }

    /* ── Letterhead ── */
    .letterhead {
      background: #0f2855;
      color: #fff;
      padding: 14px 22mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0;
    }
    .lh-left { display: flex; align-items: center; gap: 14px; }
    .lh-logo {
      width: 46px; height: 46px; border-radius: 10px;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .lh-logo svg { width: 28px; height: 28px; }
    .lh-hosp  { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
    .lh-dept  { font-size: 10.5px; color: #93c5fd; font-weight: 500; margin-top: 1px; }
    .lh-right { text-align: ${dir === "rtl" ? "left" : "right"}; }
    .lh-id    { font-size: 13px; font-weight: 800; font-family: monospace; color: #93c5fd; letter-spacing: 0.05em; }
    .lh-date  { font-size: 10px; color: #cbd5e1; margin-top: 3px; }

    /* ── Accent stripe ── */
    .stripe { height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 60%, #10b981 100%); margin-bottom: 18px; }

    /* ── Report type banner ── */
    .report-banner {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px; margin-bottom: 16px;
    }
    .report-title-block .report-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 3px; }
    .report-title-block .report-test  { font-size: 19px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .report-title-block .report-sub   { font-size: 10.5px; color: #64748b; font-family: monospace; margin-top: 3px; }
    .priority-pill {
      padding: 4px 13px; border-radius: 999px;
      font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
      border: 1.5px solid;
    }
    .p-stat    { background:#fef2f2; color:#b91c1c; border-color:#fca5a5; }
    .p-urgent  { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
    .p-routine { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }

    /* ── Info panel: 2-column ── */
    .info-panel {
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
      gap: 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .info-col { padding: 14px 16px; }
    .info-divider { background: #e2e8f0; }
    .info-col-title {
      font-size: 9px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.12em; color: #94a3b8;
      border-bottom: 1px solid #f1f5f9; padding-bottom: 7px; margin-bottom: 10px;
    }
    .info-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 7px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-key { font-size: 10.5px; color: #64748b; white-space: nowrap; }
    .info-val { font-size: 11.5px; font-weight: 700; color: #1e293b; text-align: ${dir === "rtl" ? "left" : "right"}; word-break: break-word; }
    .mono { font-family: monospace; }

    /* ── Critical alert ── */
    .crit-alert {
      display: flex; align-items: flex-start; gap: 10px;
      background: #fef2f2; border: 1.5px solid #fca5a5;
      border-radius: 7px; padding: 11px 14px; margin-bottom: 14px;
    }
    .crit-alert-icon { font-size: 16px; color: #dc2626; flex-shrink: 0; margin-top: 1px; }
    .crit-alert-title { font-size: 12px; font-weight: 800; color: #b91c1c; }
    .crit-alert-body  { font-size: 11px; color: #ef4444; margin-top: 2px; }

    /* ── Status stamp ── */
    .stamp {
      display: flex; align-items: center; justify-content: space-between;
      border: 2px solid; border-radius: 10px;
      padding: 13px 18px; margin-bottom: 16px;
    }
    .stamp-eyebrow { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 4px; }
    .stamp-word    { font-size: 26px; font-weight: 900; line-height: 1; }
    .stamp-icon    { width: 42px; height: 42px; stroke-width: 2; fill: none; flex-shrink: 0; }

    /* ── Section header ── */
    .sec-head {
      display: flex; align-items: center; gap: 8px;
      font-size: 9px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.14em; color: #64748b;
      margin: 18px 0 8px;
    }
    .sec-head::after { content:""; flex:1; height:1px; background:#e2e8f0; }

    /* ── Results table ── */
    .tbl-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    thead tr { background: #0f2855; }
    thead th {
      color: #e2e8f0; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      padding: 9px 12px; text-align: start;
    }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    td { padding: 9px 12px; vertical-align: middle; }
    .td-name { font-weight: 700; font-size: 12px; color: #1e293b; padding-${dir === "rtl" ? "right" : "left"}: 10px; }
    .td-val  { font-weight: 800; font-size: 14px; font-family: monospace; text-align: center; }
    .td-unit { text-align: center; color: #64748b; font-size: 10.5px; font-family: monospace; }
    .td-ref  { font-size: 10.5px; color: #475569; }
    .td-flag { text-align: center; white-space: nowrap; }
    .s-normal   { color: #15803d; }
    .s-abnormal { color: #b45309; }
    .s-critical { color: #b91c1c; }

    /* ── Reference bar ── */
    .ref-text  { display: block; font-family: monospace; font-size: 10.5px; color: #475569; margin-bottom: 4px; }
    .rbar-wrap { width: 100%; }
    .rbar-track { position: relative; height: 5px; background: #e2e8f0; border-radius: 3px; }
    .rbar-zone  { position: absolute; top: 0; height: 100%; background: #bbf7d0; border-radius: 3px; }
    .rbar-dot   { position: absolute; top: -3.5px; width: 12px; height: 12px; border-radius: 50%; transform: translateX(-50%); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    .rbar-ends  { display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; margin-top: 2px; }

    /* ── Badge ── */
    .badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .badge-normal   { background: #dcfce7; color: #15803d; }
    .badge-abnormal { background: #fef3c7; color: #92400e; }
    .badge-critical { background: #fee2e2; color: #b91c1c; }

    /* ── Single value ── */
    .single-wrap { border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; text-align: center; }
    .single-val  { font-size: 48px; font-weight: 900; font-family: monospace; line-height: 1; }
    .single-unit { font-size: 20px; font-weight: 500; color: #64748b; margin-${dir === "rtl" ? "right" : "left"}: 8px; }
    .single-ref  { font-size: 11.5px; color: #64748b; margin-top: 10px; }

    /* ── Notes ── */
    .notes-box {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 7px; padding: 12px 16px;
      font-size: 11.5px; color: #374151; line-height: 1.65;
    }

    /* ── Signature section ── */
    .sig-section {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 20px; margin-top: 24px; padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-block { }
    .sig-line  { border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 5px; }
    .sig-label { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }

    /* ── Footer ── */
    .footer {
      padding: 10px 22mm 10mm;
      border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      margin-top: auto;
    }
    .footer-l { font-size: 9.5px; color: #64748b; font-weight: 600; }
    .footer-r { font-size: 9px; color: #94a3b8; text-align: ${dir === "rtl" ? "left" : "right"}; }
    .footer-conf { font-size: 8.5px; color: #cbd5e1; text-align: center; text-transform: uppercase; letter-spacing: 0.06em; padding-top: 3px; }
  </style>
</head>
<body>
<div class="page">

  <!-- ══ LETTERHEAD ══ -->
  <div class="letterhead">
    <div class="lh-left">
      <div class="lh-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
      <div>
        <div class="lh-hosp">${t("app.title")}</div>
        <div class="lh-dept">${t("lab.pediatricLaboratory")}</div>
      </div>
    </div>
    <div class="lh-right">
      <div class="lh-id">${orderId}</div>
      <div class="lh-date">${t("lab.reportGenerated")} ${now}</div>
    </div>
  </div>
  <div class="stripe"></div>

  <!-- ══ BODY ══ -->
  <div class="body-content">

    <!-- Report title + priority -->
    <div class="report-banner">
      <div class="report-title-block">
        <div class="report-label">${t("lab.testResultsSection")}</div>
        <div class="report-test">${order.testName}</div>
        ${order.testCode || testDef?.category ? `<div class="report-sub">${[order.testCode, testDef?.category].filter(Boolean).join(" &nbsp;·&nbsp; ")}</div>` : ""}
      </div>
      <span class="priority-pill p-${order.priority ?? "routine"}">${priorityLabel}</span>
    </div>

    <!-- ── Critical alert ── -->
    ${order.isCritical ? `
    <div class="crit-alert">
      <div class="crit-alert-icon">&#9888;</div>
      <div>
        <div class="crit-alert-title">${t("lab.criticalResultTitle")}</div>
        <div class="crit-alert-body">${t("lab.criticalResultDesc")}</div>
      </div>
    </div>` : ""}

    <!-- ── Patient | Order info ── -->
    <div class="info-panel">
      <div class="info-col">
        <div class="info-col-title">${t("lab.infoPatient")}</div>
        <div class="info-row">
          <span class="info-key">${t("lab.infoPatient")}</span>
          <span class="info-val">${order.patientName ?? `#${order.patientId}`}</span>
        </div>
        <div class="info-row">
          <span class="info-key">${t("lab.infoOrderedBy")}</span>
          <span class="info-val">${order.orderedByName ?? "—"}</span>
        </div>
      </div>
      <div class="info-divider"></div>
      <div class="info-col">
        <div class="info-col-title">${t("lab.infoOrderId")}</div>
        <div class="info-row">
          <span class="info-key">${t("lab.infoOrderId")}</span>
          <span class="info-val mono">${orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-key">${t("lab.infoPriority")}</span>
          <span class="info-val">${priorityLabel}</span>
        </div>
        <div class="info-row">
          <span class="info-key">${t("lab.infoOrderDate")}</span>
          <span class="info-val">${orderedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-key">${t("lab.infoResultDate")}</span>
          <span class="info-val">${resultedDate}</span>
        </div>
      </div>
    </div>

    <!-- ── Overall result stamp ── -->
    ${stampHtml}

    <!-- ── Results ── -->
    <div class="sec-head">${t("lab.testResultsSection")}</div>
    ${fieldRows.length > 0 ? `
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:26%">${t("lab.colAnalyte")}</th>
            <th style="width:13%;text-align:center">${t("lab.colValue")}</th>
            <th style="width:12%;text-align:center">${t("lab.colUnit")}</th>
            <th style="width:33%">${t("lab.colReferenceRange")}</th>
            <th style="width:16%;text-align:center">${t("lab.colFlag")}</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>` : singleBlock}

    <!-- ── Clinical notes ── -->
    ${order.notes ? `
    <div class="sec-head">${t("lab.clinicalNotesSection")}</div>
    <div class="notes-box">${order.notes}</div>` : ""}

    <!-- ── Signature / verification ── -->
    <div class="sig-section">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${isAr ? "توقيع أخصائي المختبر" : "Laboratory Specialist Signature"}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">${isAr ? "التاريخ والوقت" : "Date & Time"}</div>
      </div>
    </div>

  </div><!-- /body-content -->

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <div class="footer-l">&#10084;&nbsp; ${t("app.title")} &nbsp;·&nbsp; ${t("lab.pediatricLaboratory")}</div>
    <div class="footer-r">
      ${orderId}<br>
      <span class="footer-conf">${isAr ? "سجل طبي سري — للاستخدام المرخص فقط" : "Confidential Medical Record — For Authorized Use Only"}</span>
    </div>
  </div>

</div><!-- /page -->
</body></html>`);
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
