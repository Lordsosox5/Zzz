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
    const el = document.getElementById(`lab-report-${order.id}`);
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const dir = language === "ar" ? "rtl" : "ltr";
    const fontFamily = language === "ar" ? "'Tajawal', 'Segoe UI', Arial, sans-serif" : "'Segoe UI', Arial, sans-serif";
    win.document.write(`
      <html dir="${dir}"><head>
        <title>${t("lab.report")} – ${order.testName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: ${fontFamily}; }
          body { background: #fff; color: #111; padding: 32px; font-size: 13px; direction: ${dir}; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
          .info-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
          .info-item label { font-size: 10px; color: #9ca3af; display: block; margin-bottom: 2px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
          .info-item p { font-size: 13px; font-weight: 600; }
          .status-banner { border-radius: 10px; padding: 14px 18px; margin: 16px 0; border: 2px solid; display: flex; align-items: center; justify-content: space-between; }
          .status-normal { background: #f0fdf4; border-color: #bbf7d0; }
          .status-abnormal { background: #fffbeb; border-color: #fde68a; }
          .status-critical { background: #fef2f2; border-color: #fecaca; }
          .status-label-normal { font-size: 26px; font-weight: 900; color: #15803d; }
          .status-label-abnormal { font-size: 26px; font-weight: 900; color: #b45309; }
          .status-label-critical { font-size: 26px; font-weight: 900; color: #b91c1c; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f8fafc; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; padding: 8px 12px; text-align: start; border-bottom: 2px solid #e5e7eb; }
          td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
          .flag-critical { color: #b91c1c; font-weight: 700; }
          .flag-abnormal { color: #b45309; font-weight: 700; }
          .flag-normal { color: #15803d; }
          .critical-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; margin: 12px 0; color: #b91c1c; font-weight: 700; font-size: 12px; }
          .section-title { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; margin-top: 16px; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
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
