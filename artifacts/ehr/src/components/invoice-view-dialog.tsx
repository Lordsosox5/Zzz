import { useState } from "react";
import { type Invoice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Receipt, User, DollarSign, FileText } from "lucide-react";

export function InvoiceViewDialog({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);

  const statusColor =
    invoice.status === "paid"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
      : invoice.status === "partial"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
      : "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800";

  const balance = invoice.totalAmount - (invoice.paidAmount ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Invoice{" "}
                {invoice.invoiceNumber
                  ? `#${invoice.invoiceNumber}`
                  : `#${String(invoice.id).padStart(4, "0")}`}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(invoice.createdAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <Badge
            className={`text-xs font-semibold uppercase tracking-wider border px-3 py-1 ${statusColor}`}
            variant="outline"
          >
            {invoice.status}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {/* Patient + Payment info */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: User,
                  label: "Patient",
                  value: invoice.patientName ?? `Patient #${invoice.patientId}`,
                },
                {
                  icon: DollarSign,
                  label: "Payment Method",
                  value:
                    invoice.paymentMethod.charAt(0).toUpperCase() +
                    invoice.paymentMethod.slice(1),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-muted/40 border px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                  </div>
                  <p className="text-sm font-semibold truncate">{value}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Line items */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Line Items
              </p>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold text-xs uppercase tracking-wide">Description</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-center w-20">Qty</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-end w-28">Unit Price</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-end w-28">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{item.description}</TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-end text-sm tabular-nums">${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-end font-semibold text-sm tabular-nums">${item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground text-sm">
                          No items recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals summary */}
            <div className="flex flex-col items-end gap-1.5 text-sm">
              <div className="flex items-center gap-16">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums w-24 text-end">${invoice.totalAmount.toFixed(2)}</span>
              </div>
              {(invoice.discount ?? 0) > 0 && (
                <div className="flex items-center gap-16 text-emerald-600">
                  <span>Discount</span>
                  <span className="font-medium tabular-nums w-24 text-end">−${(invoice.discount ?? 0).toFixed(2)}</span>
                </div>
              )}
              <Separator className="w-60 my-1" />
              <div className="flex items-center gap-16 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums w-24 text-end">${invoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-16 text-emerald-600">
                <span className="text-sm font-medium">Paid</span>
                <span className="font-semibold tabular-nums w-24 text-end">${(invoice.paidAmount ?? 0).toFixed(2)}</span>
              </div>
              {balance > 0.001 && (
                <div className="flex items-center gap-16 text-orange-600">
                  <span className="text-sm font-medium">Balance Due</span>
                  <span className="font-bold tabular-nums w-24 text-end">${balance.toFixed(2)}</span>
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
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes</p>
                  </div>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg px-4 py-3 border">{invoice.notes}</p>
                </div>
              </>
            )}

            {/* Footer */}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Almuzini Children Hospital · Billing Department</span>
              <span>
                Printed{" "}
                {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
