import { useRef, useState } from "react";
import { type Invoice } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Receipt, User, DollarSign, FileText, Printer } from "lucide-react";

export function InvoiceViewDialog({
  invoice,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  invoice: Invoice;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t, isRtl, language } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const printRef = useRef<HTMLDivElement>(null);

  const balance = invoice.totalAmount - (invoice.paidAmount ?? 0);

  const statusLabel =
    invoice.status === "paid"    ? t("billing.status.paid") :
    invoice.status === "partial" ? t("billing.status.partial") :
                                   t("billing.status.pending");

  const statusColor =
    invoice.status === "paid"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
      : invoice.status === "partial"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
      : "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800";

  const paymentMethodLabel =
    invoice.paymentMethod === "cash"      ? t("billing.cash") :
    invoice.paymentMethod === "card"      ? t("billing.card") :
    invoice.paymentMethod === "insurance" ? t("billing.insurance") :
    invoice.paymentMethod;

  const dateStr = new Date(invoice.createdAt).toLocaleDateString(
    language === "ar" ? "ar-SA" : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const dir = isRtl ? "rtl" : "ltr";
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="UTF-8" />
  <title>${t("billing.invoice")} ${invoice.invoiceNumber ? "#" + invoice.invoiceNumber : ""}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', Arial, sans-serif; color: #111; background: #fff; padding: 40px; font-size: 14px; direction: ${dir}; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .hospital-name { font-size: 20px; font-weight: 700; color: #1d4ed8; }
    .hospital-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .invoice-meta { text-align: ${isRtl ? "left" : "right"}; }
    .invoice-num { font-size: 18px; font-weight: 700; color: #111; }
    .invoice-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 6px; border: 1px solid; }
    .status-paid { background: #f0fdf4; color: #15803d; border-color: #86efac; }
    .status-partial { background: #fffbeb; color: #b45309; border-color: #fcd34d; }
    .status-pending { background: #fff7ed; color: #c2410c; border-color: #fdba74; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
    .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #111; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 10px 12px; text-align: ${isRtl ? "right" : "left"}; border-bottom: 1px solid #e5e7eb; }
    th.num { text-align: center; }
    th.money { text-align: ${isRtl ? "left" : "right"}; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    td.num { text-align: center; color: #374151; }
    td.money { text-align: ${isRtl ? "left" : "right"}; font-variant-numeric: tabular-nums; }
    td.total-cell { font-weight: 600; }
    .totals { display: flex; flex-direction: column; align-items: ${isRtl ? "flex-start" : "flex-end"}; gap: 6px; margin-bottom: 24px; }
    .total-row { display: flex; gap: 48px; font-size: 13px; align-items: center; }
    .total-row .label { color: #6b7280; }
    .total-row .value { font-variant-numeric: tabular-nums; min-width: 80px; text-align: ${isRtl ? "left" : "right"}; }
    .total-row.grand { font-size: 16px; font-weight: 700; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
    .total-row.paid-row .value { color: #15803d; font-weight: 600; }
    .total-row.balance-row .value { color: #c2410c; font-weight: 700; }
    .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #374151; margin-bottom: 24px; }
    .footer { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 8px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="hospital-name">${t("app.title")}</div>
      <div class="hospital-sub">${t("billing.hospitalFooter")}</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-num">${t("billing.invoice")} ${invoice.invoiceNumber ? "#" + invoice.invoiceNumber : "#" + String(invoice.id).padStart(4, "0")}</div>
      <div class="invoice-date">${dateStr}</div>
      <span class="status-badge status-${invoice.status}">${statusLabel}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">${t("billing.patient")}</div>
      <div class="info-value">${invoice.patientName ?? t("billing.patient") + " #" + invoice.patientId}</div>
    </div>
    <div class="info-card">
      <div class="info-label">${t("billing.paymentMethod")}</div>
      <div class="info-value">${paymentMethodLabel}</div>
    </div>
  </div>

  <div class="section-title">${t("billing.lineItems")}</div>
  <table>
    <thead>
      <tr>
        <th>${t("billing.itemDescription")}</th>
        <th class="num">${t("billing.qty")}</th>
        <th class="money">${t("billing.unitPrice")}</th>
        <th class="money">${t("billing.total")}</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items && invoice.items.length > 0
        ? invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="num">${item.quantity}</td>
          <td class="money">SDG ${Number(item.unitPrice).toFixed(2)}</td>
          <td class="money total-cell">SDG ${Number(item.total).toFixed(2)}</td>
        </tr>`).join("")
        : `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:20px">${t("billing.noItems")}</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span class="label">${t("billing.subtotal")}</span>
      <span class="value">SDG ${invoice.totalAmount.toFixed(2)}</span>
    </div>
    ${(invoice.discount ?? 0) > 0 ? `
    <div class="total-row">
      <span class="label">${t("billing.discount")}</span>
      <span class="value" style="color:#15803d">−SDG ${Number(invoice.discount ?? 0).toFixed(2)}</span>
    </div>` : ""}
    <div class="total-row grand">
      <span class="label">${t("billing.total")}</span>
      <span class="value">SDG ${invoice.totalAmount.toFixed(2)}</span>
    </div>
    <div class="total-row paid-row">
      <span class="label">${t("billing.paid")}</span>
      <span class="value">SDG ${Number(invoice.paidAmount ?? 0).toFixed(2)}</span>
    </div>
    ${balance > 0.001 ? `
    <div class="total-row balance-row">
      <span class="label">${t("billing.balanceDue")}</span>
      <span class="value">SDG ${balance.toFixed(2)}</span>
    </div>` : ""}
  </div>

  ${invoice.notes ? `
  <div class="section-title">${t("generic.notes")}</div>
  <div class="notes-box">${invoice.notes}</div>` : ""}

  <div class="footer">
    <span>${t("billing.hospitalFooter")}</span>
    <span>${t("billing.printed")} ${new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> {t("generic.view")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {t("billing.invoice")}{" "}
                {invoice.invoiceNumber
                  ? `#${invoice.invoiceNumber}`
                  : `#${String(invoice.id).padStart(4, "0")}`}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-semibold uppercase tracking-wider border px-3 py-1 ${statusColor}`} variant="outline">
              {statusLabel}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              {t("billing.printInvoice")}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5" ref={printRef}>
            {/* Patient + Payment */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: User, label: t("billing.patient"), value: invoice.patientName ?? `${t("billing.patient")} #${invoice.patientId}` },
                { icon: DollarSign, label: t("billing.paymentMethod"), value: paymentMethodLabel },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-muted/40 border px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  </div>
                  <p className="text-sm font-semibold truncate">{value}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Line items */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                {t("billing.lineItems")}
              </p>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold text-xs uppercase tracking-wide">{t("billing.itemDescription")}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-center w-20">{t("billing.qty")}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-end w-28">{t("billing.unitPrice")}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-end w-28">{t("billing.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{item.description}</TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-end text-sm tabular-nums">SDG {Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-end font-semibold text-sm tabular-nums">SDG {Number(item.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground text-sm">
                          {t("billing.noItems")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex flex-col items-end gap-1.5 text-sm">
              <div className="flex items-center gap-16">
                <span className="text-muted-foreground">{t("billing.subtotal")}</span>
                <span className="font-medium tabular-nums w-28 text-end">SDG {invoice.totalAmount.toFixed(2)}</span>
              </div>
              {(invoice.discount ?? 0) > 0 && (
                <div className="flex items-center gap-16 text-emerald-600">
                  <span>{t("billing.discount")}</span>
                  <span className="font-medium tabular-nums w-28 text-end">−SDG {Number(invoice.discount ?? 0).toFixed(2)}</span>
                </div>
              )}
              <Separator className="w-60 my-1" />
              <div className="flex items-center gap-16 text-base font-bold">
                <span>{t("billing.total")}</span>
                <span className="tabular-nums w-28 text-end">SDG {invoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-16 text-emerald-600">
                <span className="text-sm font-medium">{t("billing.paid")}</span>
                <span className="font-semibold tabular-nums w-28 text-end">SDG {Number(invoice.paidAmount ?? 0).toFixed(2)}</span>
              </div>
              {balance > 0.001 && (
                <div className="flex items-center gap-16 text-orange-600">
                  <span className="text-sm font-medium">{t("billing.balanceDue")}</span>
                  <span className="font-bold tabular-nums w-28 text-end">SDG {balance.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("generic.notes")}</p>
                  </div>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg px-4 py-3 border">{invoice.notes}</p>
                </div>
              </>
            )}

            {/* Footer */}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{t("billing.hospitalFooter")}</span>
              <span>
                {t("billing.printed")}{" "}
                {new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
