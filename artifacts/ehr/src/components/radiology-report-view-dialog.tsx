import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Eye, Printer, Activity, HeartPulse, Scan, Zap, Waves,
} from "lucide-react";

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

function ModalityIcon({ modality }: { modality: string }) {
  const cls = "h-5 w-5 text-primary";
  switch (modality.toLowerCase()) {
    case "ct":        return <Scan className={cls} />;
    case "mri":       return <Activity className={cls} />;
    case "ultrasound":return <Waves className={cls} />;
    default:          return <Zap className={cls} />;
  }
}

function modalityLabel(modality: string): string {
  switch (modality.toLowerCase()) {
    case "x-ray":     return "X-Ray";
    case "ct":        return "CT Scan";
    case "mri":       return "MRI";
    case "ultrasound":return "Ultrasound";
    default:          return modality.toUpperCase();
  }
}

export function RadiologyReportViewDialog({ order }: { order: RadiologyOrderForReport }) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    const el = document.getElementById(`rad-report-${order.id}`);
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head>
        <title>Radiology Report – ${order.studyDescription}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          body { background: #fff; color: #111; padding: 32px; font-size: 13px; }
          .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 20px; }
          .hospital { font-size: 18px; font-weight: 800; color: #1d4ed8; }
          .department { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 16px 0; }
          .info-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
          .info-item label { font-size: 10px; color: #9ca3af; display: block; margin-bottom: 2px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
          .info-item p { font-size: 13px; font-weight: 600; }
          .study-block { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin: 12px 0; }
          .study-label { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
          .study-value { font-size: 16px; font-weight: 700; color: #1e3a8a; }
          .modality-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; margin-bottom: 8px; }
          .report-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0; line-height: 1.7; font-size: 13px; white-space: pre-wrap; }
          .section-title { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin: 16px 0 8px; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const orderedDate  = new Date(order.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const reportedDate = order.completedAt
    ? new Date(order.completedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const scheduledDate = order.scheduledAt
    ? new Date(order.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap border-primary/30 text-primary hover:bg-primary/5">
          <Eye className="h-3.5 w-3.5" /> View Report
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ModalityIcon modality={order.modality} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">{order.studyDescription}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs font-semibold tracking-wide">
                  {modalityLabel(order.modality)}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">RAD-{String(order.id).padStart(4, "0")}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div id={`rad-report-${order.id}`} className="p-6 space-y-5">

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Patient",    value: order.patientName ?? `Patient #${order.patientId}` },
                { label: "Ordered By", value: order.orderedByName ?? "—" },
                { label: "Priority",   value: order.priority ? order.priority.charAt(0).toUpperCase() + order.priority.slice(1) : "Routine" },
                { label: "Order Date", value: orderedDate },
                { label: "Scheduled",  value: scheduledDate },
                { label: "Reported",   value: reportedDate },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 border px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-sm font-semibold truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Study details */}
            <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 px-5 py-4 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700">
                <ModalityIcon modality={order.modality} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Study Description</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">{order.studyDescription}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mt-0.5">{modalityLabel(order.modality)}</p>
              </div>
            </div>

            <Separator />

            {/* Report */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Radiologist's Report</p>
              {order.report ? (
                <div className="rounded-xl border bg-muted/30 px-5 py-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{order.report}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed px-5 py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No report has been filed yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Status: <span className="capitalize font-medium">{order.status}</span></p>
                </div>
              )}
            </div>

            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="font-semibold">Almuzini Children Hospital</span>
                <span>· Radiology Department</span>
              </div>
              <span>Generated {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
