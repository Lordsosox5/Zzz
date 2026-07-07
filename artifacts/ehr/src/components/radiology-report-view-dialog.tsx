import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Eye, Printer, Activity, Scan, Zap, Waves,
  CheckCircle2, Clock, FlaskConical,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export type RadiologyOrderForReport = {
  id: number;
  patientId: number;
  patientName?: string | null;
  orderedByName?: string | null;
  modality: string;
  studyDescription: string;
  priority?: string | null;
  status: string;
  report?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

function ModalityIcon({ modality, size = "md" }: { modality: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  const cls = `${sz} text-primary`;
  switch (modality.toLowerCase()) {
    case "ct":         return <Scan className={cls} />;
    case "mri":        return <Activity className={cls} />;
    case "ultrasound": return <Waves className={cls} />;
    default:           return <Zap className={cls} />;
  }
}

const MODALITY_COLOR: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "x-ray":     { bg: "bg-sky-50 dark:bg-sky-950/30",    border: "border-sky-200 dark:border-sky-800",    text: "text-sky-800 dark:text-sky-200",    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200" },
  ct:          { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-800 dark:text-violet-200", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  mri:         { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-800 dark:text-indigo-200", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  ultrasound:  { bg: "bg-teal-50 dark:bg-teal-950/30",  border: "border-teal-200 dark:border-teal-800",  text: "text-teal-800 dark:text-teal-200",  badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
};
const DEFAULT_COLOR = { bg: "bg-muted/30", border: "border-border", text: "text-foreground", badge: "bg-muted text-muted-foreground" };

function getModalityColor(modality: string) {
  return MODALITY_COLOR[modality.toLowerCase()] ?? DEFAULT_COLOR;
}

export function RadiologyReportViewDialog({
  order,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  order: RadiologyOrderForReport;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t, isRtl, language } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const locale = language === "ar" ? "ar-SA" : "en-GB";
  const fmtLong  = { day: "2-digit" as const, month: "long" as const,  year: "numeric" as const };
  const fmtShort = { day: "2-digit" as const, month: "short" as const, year: "numeric" as const, hour: "2-digit" as const, minute: "2-digit" as const };

  const modalityLabel = (m: string) => {
    switch (m.toLowerCase()) {
      case "x-ray":      return t("radiology.xray");
      case "ct":         return t("radiology.ct");
      case "mri":        return t("radiology.mri");
      case "ultrasound": return t("radiology.ultrasound");
      default:           return m.toUpperCase();
    }
  };

  const priorityLabel =
    order.priority === "stat"   ? t("generic.stat") :
    order.priority === "urgent" ? t("generic.urgent") :
    t("generic.routine");

  const accession  = `RAD-${String(order.id).padStart(6, "0")}`;
  const orderedDate   = new Date(order.createdAt).toLocaleString(locale, fmtShort);
  const reportedDate  = order.completedAt ? new Date(order.completedAt).toLocaleString(locale, fmtShort) : "—";
  const scheduledDate = order.scheduledAt ? new Date(order.scheduledAt).toLocaleString(locale, fmtLong)  : "—";
  const isReported    = order.status === "reported";
  const isStat        = order.priority === "stat";
  const isUrgent      = order.priority === "urgent";
  const colors        = getModalityColor(order.modality);

  const handlePrint = () => {
    const el = document.getElementById(`rad-report-${order.id}`);
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const dir = language === "ar" ? "rtl" : "ltr";
    const font = language === "ar"
      ? "'Tajawal', 'Segoe UI', Arial, sans-serif"
      : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    win.document.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8" />
  <title>${accession} – ${order.studyDescription}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    @page{size:A4;margin:20mm 18mm}
    body{font-family:${font};font-size:11pt;color:#111;direction:${dir};background:#fff;line-height:1.5}

    /* ── Letterhead ── */
    .letterhead{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #1d4ed8;margin-bottom:18px}
    .lh-left{}
    .hospital-name{font-size:18pt;font-weight:900;color:#1d4ed8;letter-spacing:-0.02em;line-height:1.1}
    .hospital-sub{font-size:9pt;color:#6b7280;margin-top:2px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase}
    .lh-right{text-align:${dir === "rtl" ? "left" : "right"};font-size:8.5pt;color:#6b7280;line-height:1.8}
    .lh-right strong{color:#374151;font-weight:600}

    /* ── Report title bar ── */
    .report-title-bar{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
    .report-title-text{font-size:13pt;font-weight:800;color:#1e3a8a;letter-spacing:-0.01em}
    .status-stamp{display:inline-flex;align-items:center;gap:6px;border:2px solid;border-radius:6px;padding:5px 12px;font-size:9pt;font-weight:800;letter-spacing:0.06em;text-transform:uppercase}
    .status-stamp.final{border-color:#16a34a;color:#15803d;background:#f0fdf4}
    .status-stamp.pending{border-color:#d97706;color:#b45309;background:#fffbeb}

    /* ── Info grid ── */
    .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
    .info-cell{border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;background:#f9fafb}
    .info-cell.wide{grid-column:span 3}
    .info-cell label{display:block;font-size:7.5pt;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px}
    .info-cell p{font-size:10.5pt;font-weight:600;color:#111}

    /* ── Study block ── */
    .study-block{border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:18px;background:#f0f9ff;display:flex;align-items:center;gap:12px}
    .study-modality-tag{background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:20px;font-size:8.5pt;font-weight:800;letter-spacing:0.05em}
    .study-desc{font-size:13pt;font-weight:700;color:#1e3a8a}
    .study-acc{font-size:9pt;color:#6b7280;margin-top:2px;font-family:monospace}

    /* ── Priority flag ── */
    .priority-stat{background:#fef2f2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:4px;padding:2px 8px;font-size:8pt;font-weight:800;letter-spacing:0.08em}
    .priority-urgent{background:#fffbeb;color:#d97706;border:1.5px solid #fcd34d;border-radius:4px;padding:2px 8px;font-size:8pt;font-weight:800;letter-spacing:0.08em}

    /* ── Report body ── */
    .section-heading{font-size:8pt;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:14px 0 6px;border-bottom:1px solid #f3f4f6;padding-bottom:4px}
    .report-body{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;font-size:11pt;line-height:1.8;white-space:pre-wrap;min-height:120px}

    /* ── Signature ── */
    .sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding-top:14px;border-top:2px solid #1d4ed8}
    .sig-block{text-align:center;min-width:200px}
    .sig-line{border-bottom:1px solid #9ca3af;margin-bottom:4px;min-width:180px;height:28px}
    .sig-label{font-size:8pt;color:#6b7280;font-weight:600}

    /* ── Footer ── */
    .footer{margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:8pt;color:#9ca3af}
    .footer strong{color:#6b7280}
    hr{border:none;border-top:1px solid #e5e7eb;margin:14px 0}
  </style>
</head>
<body>
${el.innerHTML}
</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap border-primary/30 text-primary hover:bg-primary/5">
            <Eye className="h-3.5 w-3.5" /> {t("radiology.viewReport")}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-3xl h-[94vh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* ── Dialog chrome header ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${colors.bg} ${colors.border}`}>
              <ModalityIcon modality={order.modality} />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold leading-tight">{order.studyDescription}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {modalityLabel(order.modality)}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">{accession}</span>
                {isStat && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">STAT</Badge>}
                {isUrgent && !isStat && <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500">URGENT</Badge>}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> {t("lab.print")}
          </Button>
        </div>

        {/* ── Printable body ── */}
        <ScrollArea className="flex-1">
          <div
            id={`rad-report-${order.id}`}
            className="p-6 space-y-0"
            dir={isRtl ? "rtl" : "ltr"}
          >

            {/* ── Letterhead ── */}
            <div className="letterhead flex items-start justify-between pb-4 border-b-2 border-primary mb-5">
              <div>
                <div className="hospital-name text-xl font-black text-primary leading-tight">
                  {language === "ar" ? "مستشفى المزيني للأطفال" : "Almuzini Children Hospital"}
                </div>
                <div className="hospital-sub text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
                  {language === "ar" ? "قسم الأشعة والتصوير الطبي" : "Department of Radiology & Medical Imaging"}
                </div>
              </div>
              <div className={`text-right text-[11px] text-muted-foreground leading-relaxed ${isRtl ? "text-left" : "text-right"}`}>
                <div className="font-semibold text-foreground">{accession}</div>
                <div>{t("radiology.infoOrderDate")}: {orderedDate}</div>
                {order.scheduledAt && <div>{t("radiology.infoScheduled")}: {scheduledDate}</div>}
              </div>
            </div>

            {/* ── Report title + status stamp ── */}
            <div className={`flex items-center justify-between rounded-xl px-5 py-3.5 mb-5 border ${colors.bg} ${colors.border}`}>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${colors.text} opacity-60`}>
                  {t("radiology.department")}
                </p>
                <p className={`text-base font-black ${colors.text}`}>{t("radiology.reportTitle")}</p>
              </div>
              {isReported ? (
                <div className="flex items-center gap-1.5 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 font-black text-xs uppercase tracking-widest status-stamp final">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {language === "ar" ? "تقرير نهائي" : "FINAL REPORT"}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 border-2 border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 font-black text-xs uppercase tracking-widest status-stamp pending">
                  <Clock className="h-3.5 w-3.5" />
                  {language === "ar" ? "قيد الانتظار" : "PENDING"}
                </div>
              )}
            </div>

            {/* ── Study block ── */}
            <div className={`rounded-xl border px-5 py-4 mb-5 flex items-center gap-4 ${colors.bg} ${colors.border}`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${colors.border} bg-white/60 dark:bg-black/20`}>
                <ModalityIcon modality={order.modality} size="lg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${colors.badge}`}>
                    {modalityLabel(order.modality)}
                  </span>
                  {isStat  && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-300 priority-stat">STAT</span>}
                  {isUrgent && !isStat && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 priority-urgent">URGENT</span>}
                </div>
                <p className={`text-lg font-black ${colors.text} leading-tight`}>{order.studyDescription}</p>
              </div>
            </div>

            {/* ── Info grid ── */}
            <div className="grid grid-cols-3 gap-2.5 mb-5 info-grid">
              {[
                { label: t("radiology.infoPatient"),   value: order.patientName ?? `#${order.patientId}`, wide: false },
                { label: t("radiology.infoOrderedBy"), value: order.orderedByName ?? "—",                 wide: false },
                { label: t("radiology.infoPriority"),  value: priorityLabel,                              wide: false },
                { label: t("radiology.infoOrderDate"), value: orderedDate,                                wide: false },
                { label: t("radiology.infoReported"),  value: reportedDate,                               wide: false },
                { label: t("radiology.reportStatus"),  value: isReported ? t("radiology.statusReported") : t("radiology.statusPending"), wide: false },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg border bg-muted/30 px-3.5 py-2.5 info-cell ${item.wide ? "col-span-3" : ""}`}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <Separator className="mb-5" />

            {/* ── Report body ── */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2 section-heading">
                <FlaskConical className="h-3 w-3" />
                {t("radiology.radiologistReport")}
              </p>

              {order.report ? (
                <div className="rounded-xl border bg-card px-6 py-5 report-body">
                  <p className="text-sm leading-loose whitespace-pre-wrap text-foreground font-[450] tracking-wide">
                    {order.report}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed px-6 py-10 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">{t("radiology.noReportFiled")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t("radiology.statusPending")}</p>
                </div>
              )}
            </div>

            {/* ── Signature block (shown only when reported) ── */}
            {isReported && (
              <div className="mt-6 pt-5 border-t-2 border-primary/20 sig-row flex items-end justify-between">
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground text-xs mb-0.5">
                    {language === "ar" ? "مستشفى المزيني للأطفال" : "Almuzini Children Hospital"}
                  </p>
                  <p>{language === "ar" ? "قسم الأشعة والتصوير الطبي" : "Department of Radiology"}</p>
                  <p className="font-mono mt-0.5 text-[10px]">{accession}</p>
                </div>
                <div className="text-center sig-block">
                  <div className="border-b border-muted-foreground/30 h-10 w-48 mb-2 sig-line" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest sig-label">
                    {order.orderedByName ?? (language === "ar" ? "أخصائي الأشعة" : "Radiologist")}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {reportedDate}
                  </p>
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="mt-6 pt-4 border-t flex items-center justify-between text-[10px] text-muted-foreground footer">
              <span>{language === "ar" ? "وثيقة طبية سرية — للاستخدام السريري فقط" : "Confidential medical document — for clinical use only"}</span>
              <span>{t("radiology.reportGenerated")}: {new Date().toLocaleString(locale, fmtShort)}</span>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
