import { useState } from "react";
import {
  useListInvoices, useCreateInvoice,
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Loader2, Save, ChevronsUpDown, Check, User,
  Receipt, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvoiceViewDialog } from "@/components/invoice-view-dialog";

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
          <CommandInput
            placeholder="Search by name or MRN…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No patients found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="max-h-52">
                {patients.map(p => (
                  <CommandItem
                    key={p.id}
                    value={String(p.id)}
                    onSelect={() => {
                      onChange(p.id, p.nameEn);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
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

// ─── Main Billing Page ────────────────────────────────────────────────────────

export default function Billing() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const isBillingOfficer = user?.role === "billing_officer";

  // Dialogs
  const [isOpen, setIsOpen] = useState(false);

  // Patient filter (for invoice table)
  const [filterPatientId, setFilterPatientId] = useState<number | null>(null);
  const [filterPatientName, setFilterPatientName] = useState<string>("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const { data: filterPatientsResp } = useListPatients({ search: filterQuery || undefined });
  const filterPatients: Patient[] = (filterPatientsResp as any)?.patients ?? (Array.isArray(filterPatientsResp) ? (filterPatientsResp as Patient[]) : []);

  // Invoice query — filtered by patient if one is selected
  const invoiceParams = filterPatientId ? { patientId: filterPatientId } : {};
  const { data: invoices, isLoading } = useListInvoices(invoiceParams);

  // Create invoice form
  const createMutation = useCreateInvoice();
  const [form, setForm] = useState({
    patientId: null as number | null,
    patientName: "",
    paymentMethod: "cash",
    notes: "",
    itemDescription: "",
    itemQty: "1",
    itemUnitPrice: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) return;
    const qty   = Number(form.itemQty) || 1;
    const price = Number(form.itemUnitPrice) || 0;
    createMutation.mutate(
      {
        data: {
          patientId:     form.patientId,
          paymentMethod: form.paymentMethod,
          notes:         form.notes || undefined,
          items:         [{ description: form.itemDescription, quantity: qty, unitPrice: price, total: qty * price }],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: null, patientName: "", paymentMethod: "cash", notes: "", itemDescription: "", itemQty: "1", itemUnitPrice: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const displayInvoices: Invoice[] = Array.isArray(invoices) ? invoices : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.billing")}</h1>

        {/* New Invoice dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />{t("billing.newInvoice")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("billing.newInvoice")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Patient selector */}
              <div className="space-y-2">
                <Label>{t("billing.patient")} *</Label>
                <PatientSearchCombobox
                  value={form.patientId}
                  onChange={(id, name) => setForm(p => ({ ...p, patientId: id, patientName: name }))}
                />
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <Label>{t("billing.paymentMethod")} *</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(p => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("billing.selectPayment")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("billing.cash")}</SelectItem>
                    <SelectItem value="card">{t("billing.card")}</SelectItem>
                    <SelectItem value="insurance">{t("billing.insurance")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Item */}
              <div className="space-y-2 border rounded-md p-3">
                <p className="text-sm font-medium">{t("billing.itemDescription")}</p>
                <Input name="itemDescription" required value={form.itemDescription} onChange={handleChange} placeholder="e.g. Consultation fee" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("generic.quantity")}</Label>
                    <Input name="itemQty" type="number" min="1" value={form.itemQty} onChange={handleChange} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("billing.unitPrice")}</Label>
                    <Input name="itemUnitPrice" type="number" step="0.01" required value={form.itemUnitPrice} onChange={handleChange} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t("generic.notes")}</Label>
                <Textarea name="notes" value={form.notes} onChange={handleChange} className="min-h-[60px]" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending || !form.patientId}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Patient filter bar */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filter by patient:</span>
            </div>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 max-w-sm justify-between font-normal h-9 text-sm">
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
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by name or MRN…"
                      value={filterQuery}
                      onValueChange={setFilterQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No patients found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="max-h-52">
                          {filterPatients.map(p => (
                            <CommandItem
                              key={p.id}
                              value={String(p.id)}
                              onSelect={() => {
                                setFilterPatientId(p.id);
                                setFilterPatientName(p.nameEn);
                                setFilterPopoverOpen(false);
                                setFilterQuery("");
                              }}
                            >
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
                <Button
                  variant="ghost" size="sm"
                  className="h-9 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setFilterPatientId(null); setFilterPatientName(""); }}
                >
                  <X className="h-4 w-4" />
                  <span className="ml-1 text-xs">Clear</span>
                </Button>
              )}
            </div>
            {filterPatientId && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Showing bills for <strong>{filterPatientName}</strong>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {t("billing.invoices")}
            {displayInvoices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{displayInvoices.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("billing.patient")}</TableHead>
                <TableHead>{t("billing.method")}</TableHead>
                <TableHead>{t("billing.amount")}</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : displayInvoices.length > 0 ? (
                displayInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">
                      {inv.invoiceNumber ? `#${inv.invoiceNumber}` : `#${String(inv.id).padStart(4, "0")}`}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{inv.patientName ?? `Patient #${inv.patientId}`}</TableCell>
                    <TableCell className="capitalize">{inv.paymentMethod}</TableCell>
                    <TableCell className="font-semibold tabular-nums">${inv.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      ${(inv.paidAmount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={inv.status === "paid" ? "default" : "secondary"}
                        className={
                          inv.status === "paid"    ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" :
                          inv.status === "partial" ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300" :
                                                     "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}>
                      <InvoiceViewDialog invoice={inv} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {filterPatientId ? `No invoices found for ${filterPatientName}.` : t("billing.noInvoices")}
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
