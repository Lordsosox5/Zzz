import { useState } from "react";
import {
  useListInvoices, useCreateInvoice, useUpdateInvoice,
  getListInvoicesQueryKey, useListPatients,
  type Invoice, type Patient,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Loader2, Save, ChevronsUpDown, Check, User,
  Receipt, X, Trash2, DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvoiceViewDialog } from "@/components/invoice-view-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LineItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

// ─── Patient search combobox ──────────────────────────────────────────────────

function PatientSearchCombobox({
  value, onChange,
}: { value: number | null; onChange: (id: number | null, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: patientsResp } = useListPatients({ search: query || undefined });
  const patients: Patient[] = (patientsResp as any)?.patients ?? (Array.isArray(patientsResp) ? (patientsResp as Patient[]) : []);
  const selected = patients.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {selected.nameEn}
              <span className="text-muted-foreground font-mono text-xs">({selected.mrn})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Search patient…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name or MRN…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No patients found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="max-h-52">
                {patients.map(p => (
                  <CommandItem key={p.id} value={String(p.id)} onSelect={() => { onChange(p.id, p.nameEn); setOpen(false); setQuery(""); }}>
                    <Check className={`mr-2 h-4 w-4 ${value === p.id ? "opacity-100" : "opacity-0"}`} />
                    <div className="flex flex-col">
                      <span className="font-medium">{p.nameEn}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.mrn}</span>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Create Invoice Dialog ────────────────────────────────────────────────────

let _itemId = 0;
const newItem = (): LineItem => ({ id: ++_itemId, description: "", quantity: "1", unitPrice: "" });

function CreateInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const createMutation = useCreateInvoice();

  const [patientId, setPatientId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  const updateItem = (id: number, field: keyof LineItem, value: string) =>
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

  const removeItem = (id: number) => setItems(prev => prev.filter(item => item.id !== id));

  const addItem = () => setItems(prev => [...prev, newItem()]);

  const lineTotal = (item: LineItem) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const reset = () => {
    setPatientId(null);
    setPaymentMethod("cash");
    setNotes("");
    setItems([newItem()]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    const validItems = items.filter(i => i.description.trim());
    if (validItems.length === 0) return;

    createMutation.mutate(
      {
        data: {
          patientId,
          paymentMethod,
          notes: notes || undefined,
          items: validItems.map(i => ({
            description: i.description.trim(),
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            total: lineTotal(i),
          })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Invoice created", description: "New invoice has been saved." });
          setOpen(false);
          reset();
          onCreated();
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to create invoice." }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />New Invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            New Invoice
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <form id="invoice-form" onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Patient + Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient <span className="text-destructive">*</span></Label>
                <PatientSearchCombobox value={patientId} onChange={(id) => setPatientId(id)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method <span className="text-destructive">*</span></Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_110px_90px_36px] gap-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Qty</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Unit Price</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Total</span>
                <span />
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_110px_90px_36px] gap-2 items-center">
                    <Input
                      placeholder="e.g. Consultation fee"
                      value={item.description}
                      onChange={e => updateItem(item.id, "description", e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, "quantity", e.target.value)}
                      className="h-9 text-sm text-center"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, "unitPrice", e.target.value)}
                        className="h-9 text-sm text-right pl-6"
                      />
                    </div>
                    <div className="h-9 flex items-center justify-end pr-1">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        ${lineTotal(item).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Grand total */}
              <div className="flex justify-end pt-2">
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                  <span className="text-xl font-bold text-primary tabular-nums">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes…"
                className="min-h-[72px] resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-card flex justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="invoice-form"
            disabled={createMutation.isPending || !patientId || items.every(i => !i.description.trim())}
          >
            {createMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
            }
            Save Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({ invoice }: { invoice: Invoice }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateInvoice();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const balance = invoice.totalAmount - (invoice.paidAmount ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paid = Number(amount);
    if (!paid || paid <= 0) return;
    const newPaid = Math.min((invoice.paidAmount ?? 0) + paid, invoice.totalAmount);
    const newStatus = newPaid >= invoice.totalAmount ? "paid" : newPaid > 0 ? "partial" : "pending";

    updateMutation.mutate(
      { id: invoice.id, data: { paidAmount: newPaid, status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "Payment recorded", description: `$${paid.toFixed(2)} recorded on ${invoice.invoiceNumber ?? `INV-${invoice.id}`}.` });
          setOpen(false);
          setAmount("");
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to record payment." }),
      }
    );
  };

  if (invoice.status === "paid") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <DollarSign className="h-3.5 w-3.5" /> Pay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-medium">{invoice.invoiceNumber ?? `#${invoice.id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">${invoice.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already paid</span>
              <span className="text-emerald-600">${(invoice.paidAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="font-semibold">Balance due</span>
              <span className="font-bold text-primary">${balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Amount <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0.01"
                max={balance}
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-7"
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setAmount(balance.toFixed(2))}
            >
              Pay full balance (${balance.toFixed(2)})
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending || !amount || Number(amount) <= 0}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Billing Page ────────────────────────────────────────────────────────

export default function Billing() {
  const { t, isRtl } = useTranslation();
  const queryClient = useQueryClient();

  const [filterPatientId, setFilterPatientId] = useState<number | null>(null);
  const [filterPatientName, setFilterPatientName] = useState<string>("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: filterPatientsResp } = useListPatients({ search: filterQuery || undefined });
  const filterPatients: Patient[] = (filterPatientsResp as any)?.patients ?? (Array.isArray(filterPatientsResp) ? (filterPatientsResp as Patient[]) : []);

  const invoiceParams = filterPatientId ? { patientId: filterPatientId } : {};
  const { data: invoices, isLoading } = useListInvoices(invoiceParams);

  const allInvoices: Invoice[] = Array.isArray(invoices) ? invoices : [];
  const displayInvoices = statusFilter === "all" ? allInvoices : allInvoices.filter(i => i.status === statusFilter);

  const totalRevenue = allInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid    = allInvoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const totalPending = allInvoices.filter(i => i.status === "pending").length;
  const totalPartial = allInvoices.filter(i => i.status === "partial").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.billing")}</h1>
        <CreateInvoiceDialog onCreated={() => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() })} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, color: "text-primary" },
          { label: "Collected",     value: `$${totalPaid.toFixed(2)}`,    color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending",       value: totalPending,                   color: "text-orange-600 dark:text-orange-400" },
          { label: "Partial",       value: totalPartial,                   color: "text-amber-600 dark:text-amber-400" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            </div>

            {/* Patient filter */}
            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 max-w-xs justify-between font-normal h-9 text-sm">
                  {filterPatientId ? (
                    <span className="flex items-center gap-2 truncate">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      {filterPatientName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All patients</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search patient…" value={filterQuery} onValueChange={setFilterQuery} />
                  <CommandList>
                    <CommandEmpty>No patients found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="max-h-52">
                        {filterPatients.map(p => (
                          <CommandItem key={p.id} value={String(p.id)} onSelect={() => { setFilterPatientId(p.id); setFilterPatientName(p.nameEn); setFilterPopoverOpen(false); setFilterQuery(""); }}>
                            <Check className={`mr-2 h-4 w-4 ${filterPatientId === p.id ? "opacity-100" : "opacity-0"}`} />
                            <div className="flex flex-col">
                              <span className="font-medium">{p.nameEn}</span>
                              <span className="text-xs text-muted-foreground font-mono">{p.mrn}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {filterPatientId && (
              <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={() => { setFilterPatientId(null); setFilterPatientName(""); }}>
                <X className="h-4 w-4" /><span className="ml-1 text-xs">Clear</span>
              </Button>
            )}

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-primary" />
            Invoices
            {displayInvoices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{displayInvoices.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Invoice #</TableHead>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={`pr-6 ${isRtl ? "text-left" : "text-right"}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : displayInvoices.length > 0 ? (
                displayInvoices.map((inv) => {
                  const balance = inv.totalAmount - (inv.paidAmount ?? 0);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-6 font-mono text-sm font-medium">
                        {inv.invoiceNumber ? `#${inv.invoiceNumber}` : `#${String(inv.id).padStart(4, "0")}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="font-medium">{inv.patientName ?? `Patient #${inv.patientId}`}</TableCell>
                      <TableCell className="capitalize text-sm">{inv.paymentMethod}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${inv.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        ${(inv.paidAmount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        ${balance.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            inv.status === "paid"    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" :
                            inv.status === "partial" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" :
                                                       "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`pr-6 ${isRtl ? "text-left" : "text-right"}`}>
                        <div className="flex items-center justify-end gap-1">
                          <RecordPaymentDialog invoice={inv} />
                          <InvoiceViewDialog invoice={inv} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {filterPatientId ? `No invoices found for ${filterPatientName}.` : "No invoices found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
