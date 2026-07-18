import { useState, useCallback } from "react";
import {
  useListInvoices, useCreateInvoice, useUpdateInvoice,
  getListInvoicesQueryKey, useListPatients,
  type Invoice, type Patient,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
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
  Receipt, X, Trash2, DollarSign, BookmarkPlus, Settings2, RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InvoiceViewDialog } from "@/components/invoice-view-dialog";
import { useLocation } from "wouter";

// ─── Service Catalog ──────────────────────────────────────────────────────────

const CATALOG_STORAGE_KEY = "ehr_service_catalog_v1";

const DEFAULT_SERVICES = [
  "فتح ملف مريض جديد",
  "استخراج ملف مريض",
  "رسوم عنبر",
  "رسوم عناية مكثفة",
  "رسوم متابعة مستمرة",
  "شراء دواء",
  "رسوم فحص",
];

function loadCatalog(): string[] {
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_SERVICES];
}

function saveCatalog(catalog: string[]) {
  try { localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog)); } catch { /* ignore */ }
}

function useServiceCatalog() {
  const [catalog, setCatalog] = useState<string[]>(loadCatalog);

  const addService = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCatalog(prev => {
      if (prev.some(s => s === trimmed)) return prev;
      const next = [...prev, trimmed];
      saveCatalog(next);
      return next;
    });
  }, []);

  const removeService = useCallback((name: string) => {
    setCatalog(prev => {
      const next = prev.filter(s => s !== name);
      saveCatalog(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    saveCatalog([...DEFAULT_SERVICES]);
    setCatalog([...DEFAULT_SERVICES]);
  }, []);

  return { catalog, addService, removeService, resetToDefaults };
}

// ─── Service Combobox ─────────────────────────────────────────────────────────

function ServiceCombobox({
  value, onChange, catalog, onSaveService,
}: {
  value: string;
  onChange: (v: string) => void;
  catalog: string[];
  onSaveService: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? catalog.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : catalog;

  const isNew = query.trim() !== "" && !catalog.some(s => s.toLowerCase() === query.trim().toLowerCase());

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  const saveNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onSaveService(trimmed);
    onChange(trimmed);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal h-9 text-sm px-3"
        >
          <span className={`truncate ${!value ? "text-muted-foreground" : ""}`}>
            {value || t("billing.itemDescription")}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("billing.searchOrTypeService")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !isNew && (
              <CommandEmpty>{t("billing.noServices")}</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                <ScrollArea className="max-h-52">
                  {filtered.map(s => (
                    <CommandItem key={s} value={s} onSelect={() => select(s)}>
                      <Check className={`mr-2 h-4 w-4 ${value === s ? "opacity-100" : "opacity-0"}`} />
                      {s}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}
            {isNew && (
              <CommandGroup>
                <CommandItem
                  value={`__new__${query}`}
                  onSelect={saveNew}
                  className="gap-2 text-primary"
                >
                  <BookmarkPlus className="h-4 w-4 shrink-0" />
                  <span className="flex flex-col">
                    <span className="font-medium text-xs">{t("billing.saveService")}</span>
                    <span className="text-muted-foreground font-normal">{query.trim()}</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
  const { t } = useTranslation();
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
            <span className="text-muted-foreground">{t("generic.searchPatient")}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={t("billing.searchPatient")} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{t("billing.noPatients")}</CommandEmpty>
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

// ─── Manage Services Dialog ───────────────────────────────────────────────────

function ManageServicesDialog() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { catalog, addService, removeService, resetToDefaults } = useServiceCatalog();
  const [newName, setNewName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (catalog.some(s => s === trimmed)) {
      toast({ variant: "destructive", title: t("billing.serviceDuplicate") });
      return;
    }
    addService(trimmed);
    setNewName("");
    toast({ title: t("billing.serviceAdded") });
  };

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    resetToDefaults();
    setConfirmReset(false);
    toast({ title: t("billing.servicesReset") });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmReset(false); setNewName(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title={t("billing.manageServices")}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
        <DialogHeader className={isRtl ? "text-right" : "text-left"}>
          <DialogTitle className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
            <Settings2 className="h-5 w-5 text-primary" />
            {t("billing.manageServices")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Add new service */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("billing.addNewService")}</p>
            <div className={`flex gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
              <Input
                placeholder={t("billing.serviceNamePlaceholder")}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                className="h-9 text-sm"
              />
              <Button type="button" size="sm" className="h-9 shrink-0 gap-1.5" onClick={handleAdd} disabled={!newName.trim()}>
                <Plus className="h-3.5 w-3.5" />{t("generic.add")}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Services list */}
          <div className="space-y-1.5">
            <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
              <p className="text-sm font-medium text-muted-foreground">
                {t("billing.savedServices")} <span className="font-bold text-foreground">({catalog.length})</span>
              </p>
              <Button
                type="button" variant={confirmReset ? "destructive" : "ghost"} size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleReset}
                onBlur={() => setConfirmReset(false)}
              >
                <RotateCcw className="h-3 w-3" />
                {confirmReset ? t("billing.confirmReset") : t("billing.resetToDefaults")}
              </Button>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <div className="p-2 space-y-1">
                {catalog.map((service) => (
                  <div
                    key={service}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted/50 group ${isRtl ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-sm flex-1 truncate">{service}</span>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity"
                      onClick={() => removeService(service)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {catalog.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">{t("billing.noCatalogServices")}</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const { catalog, addService } = useServiceCatalog();

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

  const reset = () => { setPatientId(null); setPaymentMethod("cash"); setNotes(""); setItems([newItem()]); };

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
          toast({ title: t("billing.invoiceCreated"), description: t("billing.invoiceCreatedDesc") });
          setOpen(false);
          reset();
          onCreated();
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />{t("billing.newInvoice")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className={`px-6 py-4 border-b shrink-0 ${isRtl ? "text-right" : "text-left"}`}>
          <DialogTitle className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
            <Receipt className="h-5 w-5 text-primary" />
            {t("billing.newInvoice")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <form id="invoice-form" onSubmit={handleSubmit} className={`p-6 space-y-5 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("billing.patient")} <span className="text-destructive">*</span></Label>
                <PatientSearchCombobox value={patientId} onChange={(id) => setPatientId(id)} />
              </div>
              <div className="space-y-2">
                <Label>{t("billing.paymentMethod")} <span className="text-destructive">*</span></Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("billing.cash")}</SelectItem>
                    <SelectItem value="card">{t("billing.card")}</SelectItem>
                    <SelectItem value="insurance">{t("billing.insurance")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
                <Label className="text-sm font-semibold">{t("billing.lineItems")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> {t("billing.addItem")}
                </Button>
              </div>

              {/* Column headers — same order always; dir="rtl" on the form flips grid columns automatically */}
              <div className="grid grid-cols-[1fr_80px_110px_90px_36px] gap-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("billing.itemDescription")}</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">{t("billing.qty")}</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-end">{t("billing.unitPrice")}</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-end">{t("billing.total")}</span>
                <span />
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_110px_90px_36px] gap-2 items-center">
                    <ServiceCombobox
                      value={item.description}
                      onChange={v => updateItem(item.id, "description", v)}
                      catalog={catalog}
                      onSaveService={addService}
                    />
                    <Input
                      type="number" min="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, "quantity", e.target.value)}
                      className="h-9 text-sm text-center"
                    />
                    <div className="relative">
                      <span className={`absolute ${isRtl ? "right-2.5" : "left-2.5"} top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none`}>SDG</span>
                      <Input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, "unitPrice", e.target.value)}
                        className={`h-9 text-sm ${isRtl ? "pr-12 text-left" : "pl-12 text-right"}`}
                      />
                    </div>
                    <div className="h-9 flex items-center justify-end">
                      <span className="text-sm font-semibold tabular-nums">SDG {lineTotal(item).toFixed(2)}</span>
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className={`flex pt-2 ${isRtl ? "justify-start" : "justify-end"}`}>
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{t("billing.totalAmount")}</span>
                  <span className="text-xl font-bold text-primary tabular-nums">SDG {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("generic.notes")} <span className="text-xs text-muted-foreground">{t("billing.optional")}</span></Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t("generic.notes")}
                className="min-h-[72px] resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        <div className={`px-6 py-4 border-t bg-card flex gap-2 shrink-0 ${isRtl ? "justify-start flex-row-reverse" : "justify-end"}`}>
          <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
            {t("generic.cancel")}
          </Button>
          <Button
            type="submit" form="invoice-form"
            disabled={createMutation.isPending || !patientId || items.every(i => !i.description.trim())}
          >
            {createMutation.isPending
              ? <Loader2 className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
              : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
            }
            {t("billing.saveInvoice")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation();
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
          toast({ title: t("billing.paymentRecorded"), description: `SDG ${paid.toFixed(2)} — ${invoice.invoiceNumber ?? "INV-" + invoice.id}` });
          setOpen(false);
          setAmount("");
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("billing.paymentError") }),
      }
    );
  };

  if (invoice.status === "paid") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <DollarSign className="h-3.5 w-3.5" /> {t("billing.pay")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("billing.recordPayment")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("billing.invoice")}</span>
              <span className="font-mono font-medium">{invoice.invoiceNumber ?? `#${invoice.id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("billing.totalAmount")}</span>
              <span className="font-semibold">SDG {invoice.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("billing.alreadyPaid")}</span>
              <span className="text-emerald-600 font-medium">SDG {Number(invoice.paidAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 mt-0.5">
              <span className="font-semibold">{t("billing.balanceDue")}</span>
              <span className="font-bold text-primary">SDG {balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("billing.paymentAmount")} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">SDG</span>
              <Input
                type="number" min="0.01" max={balance} step="0.01" placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-12"
                autoFocus
              />
            </div>
            <Button
              type="button" variant="ghost" size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setAmount(balance.toFixed(2))}
            >
              {t("billing.payFullBalance")} (SDG {balance.toFixed(2)})
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending || !amount || Number(amount) <= 0}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("billing.recordPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Billing Page ────────────────────────────────────────────────────────

export default function Billing() {
  const { t, isRtl, language } = useTranslation();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [filterPatientId, setFilterPatientId] = useState<number | null>(null);
  const [filterPatientName, setFilterPatientName] = useState<string>("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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

  const statusLabel = (status: string) =>
    status === "paid"    ? t("billing.status.paid") :
    status === "partial" ? t("billing.status.partial") :
                           t("billing.status.pending");

  const paymentLabel = (method: string) =>
    method === "cash"      ? t("billing.cash") :
    method === "card"      ? t("billing.card") :
    method === "insurance" ? t("billing.insurance") :
    method;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.billing")}</h1>
        <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
          <ManageServicesDialog />
          <CreateInvoiceDialog onCreated={() => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() })} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("billing.totalRevenue"), value: `SDG ${totalRevenue.toFixed(2)}`, color: "text-primary" },
          { label: t("billing.collected"),    value: `SDG ${totalPaid.toFixed(2)}`,    color: "text-emerald-600 dark:text-emerald-400" },
          { label: t("billing.pendingCount"), value: totalPending,                  color: "text-orange-600 dark:text-orange-400" },
          { label: t("billing.partialCount"), value: totalPartial,                  color: "text-amber-600 dark:text-amber-400" },
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
              <span className="text-sm font-medium text-muted-foreground">{t("billing.filterBy")}</span>
            </div>

            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 max-w-xs justify-between font-normal h-9 text-sm">
                  {filterPatientId ? (
                    <span className="flex items-center gap-2 truncate">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      {filterPatientName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("billing.allPatients")}</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder={t("billing.searchPatient")} value={filterQuery} onValueChange={setFilterQuery} />
                  <CommandList>
                    <CommandEmpty>{t("billing.noPatients")}</CommandEmpty>
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
                <X className="h-4 w-4" /><span className="ml-1 text-xs">{t("generic.cancel")}</span>
              </Button>
            )}

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("billing.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("billing.status.pending")}</SelectItem>
                <SelectItem value="partial">{t("billing.status.partial")}</SelectItem>
                <SelectItem value="paid">{t("billing.status.paid")}</SelectItem>
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
            {t("billing.invoices")}
            {displayInvoices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{displayInvoices.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("billing.invoiceHash")}</TableHead>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("billing.patient")}</TableHead>
                <TableHead>{t("billing.method")}</TableHead>
                <TableHead className="text-right">{t("billing.amount")}</TableHead>
                <TableHead className="text-right">{t("billing.paid")}</TableHead>
                <TableHead className="text-right">{t("billing.balance")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={`pr-6 ${isRtl ? "text-left" : "text-right"}`}>{t("generic.actions")}</TableHead>
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
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <TableCell className="pl-6 font-mono text-sm font-medium">
                        {inv.invoiceNumber ? `#${inv.invoiceNumber}` : `#${String(inv.id).padStart(4, "0")}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                      <TableCell>
                        <button
                          className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
                          onClick={(e) => { e.stopPropagation(); navigate(`/patients/${inv.patientId}`); }}
                        >
                          {inv.patientName ?? `${t("billing.patient")} #${inv.patientId}`}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{paymentLabel(inv.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">SDG {inv.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        SDG {Number(inv.paidAmount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        SDG {balance.toFixed(2)}
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
                          {statusLabel(inv.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`pr-6 ${isRtl ? "text-left" : "text-right"}`}>
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                    {filterPatientId ? `${t("billing.noInvoicesFound")} (${filterPatientName})` : t("billing.noInvoices")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedInvoice && (
        <InvoiceViewDialog
          invoice={selectedInvoice}
          open={true}
          onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}
        />
      )}
    </div>
  );
}
