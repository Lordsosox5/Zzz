import { useState, useCallback, useMemo } from "react";
import {
  useListLabOrders, useCreateLabOrder, useUpdateLabOrder,
  getListLabOrdersQueryKey, useListPatients,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canEnterLabResults, isLabRole } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Loader2, Save, FlaskConical, AlertCircle, ChevronsUpDown, Check, User, ChevronRight,
  Eye, Printer, HeartPulse, TrendingUp, TrendingDown, Minus, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LAB_TESTS, LAB_CATEGORIES, findTest, assessResult, fieldStatus,
  type LabTest, type ResultField,
} from "@/lib/lab-tests";

// ─── Patient Search Combobox ─────────────────────────────────────────────────

function PatientSearchCombobox({
  value, onChange,
}: {
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const { data, isLoading } = useListPatients(
    search.trim() ? { search: search.trim(), limit: 20 } : { limit: 30 },
    { query: { enabled: open } }
  );

  const patients = (data?.patients ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as number,
    nameEn: (p.nameEn ?? p.name_en ?? "") as string,
    mrn: (p.mrn ?? "") as string,
  }));

  const handleSelect = useCallback((patient: typeof patients[0]) => {
    onChange(String(patient.id), patient.nameEn);
    setSelectedName(patient.nameEn);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value && selectedName ? (
            <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{selectedName}</span>
          ) : (
            <span className="text-muted-foreground">{t("generic.selectPatient")}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={t("generic.searchPatient")} value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : patients.length === 0 ? (
              <CommandEmpty>{t("generic.noPatientFound")}</CommandEmpty>
            ) : (
              <CommandGroup>
                {patients.map((p) => (
                  <CommandItem key={p.id} value={String(p.id)} onSelect={() => handleSelect(p)} className="cursor-pointer">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {p.nameEn.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.nameEn}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.mrn}</p>
                      </div>
                    </div>
                    {value === String(p.id) && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Test Catalog Combobox ───────────────────────────────────────────────────

function TestCatalogCombobox({
  value, onChange,
}: {
  value: LabTest | null;
  onChange: (test: LabTest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return LAB_TESTS;
    return LAB_TESTS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.nameAr.includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, LabTest[]>();
    for (const test of filtered) {
      const arr = map.get(test.category) ?? [];
      arr.push(test);
      map.set(test.category, arr);
    }
    return map;
  }, [filtered]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value ? (
            <span className="flex items-center gap-2 min-w-0">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{value.name}</span>
              <span className="text-xs text-muted-foreground font-mono shrink-0">{value.code}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Search test name or code...</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name, code, or category..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[360px]">
            {byCategory.size === 0 ? (
              <CommandEmpty>No test found.</CommandEmpty>
            ) : (
              Array.from(byCategory.entries()).map(([catId, tests]) => {
                const cat = LAB_CATEGORIES.find((c) => c.id === catId);
                return (
                  <CommandGroup key={catId} heading={cat?.en ?? catId}>
                    {tests.map((test) => (
                      <CommandItem
                        key={test.id}
                        value={test.id}
                        onSelect={() => { onChange(test); setOpen(false); setSearch(""); }}
                        className="cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{test.code}</span>
                          <span className="text-sm truncate">{test.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-muted-foreground">{test.fields.length} field{test.fields.length !== 1 ? "s" : ""}</span>
                          {value?.id === test.id && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Field Status Indicator ──────────────────────────────────────────────────

function FieldStatusBadge({ status }: { status: "normal" | "abnormal" | "critical" | null }) {
  if (!status || status === "normal") return null;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${status === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
      {status === "critical" ? "⚠ Critical" : "↑↓ Abnormal"}
    </span>
  );
}

// ─── Dynamic Result Field ─────────────────────────────────────────────────────

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: ResultField;
  value: string;
  onChange: (val: string) => void;
}) {
  const status = fieldStatus(field, value);
  const borderColor =
    status === "critical" ? "border-red-400 focus:ring-red-300" :
    status === "abnormal" ? "border-amber-400" : "";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
          {field.unit && <span className="text-xs text-muted-foreground font-normal ml-1">({field.unit})</span>}
        </Label>
        <FieldStatusBadge status={status} />
      </div>

      {field.type === "select" ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "text" ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className="h-9"
        />
      ) : (
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.refRange ?? "Enter value"}
          className={`h-9 ${borderColor}`}
        />
      )}

      {field.refRange && (
        <p className="text-xs text-muted-foreground">Ref: {field.refRange}</p>
      )}
    </div>
  );
}

// ─── Enter Result Dialog ──────────────────────────────────────────────────────

function EnterResultDialog({
  orderId, testName, onSuccess,
}: {
  orderId: number; testName: string; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const updateMutation = useUpdateLabOrder();

  const testDef = useMemo(() => findTest(testName), [testName]);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isCritical, setIsCritical] = useState(false);
  const [resultedAt, setResultedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");

  // Simple form for unknown tests
  const [simpleResult, setSimpleResult] = useState("normal");
  const [simpleValue, setSimpleValue] = useState("");
  const [simpleUnit, setSimpleUnit] = useState("");
  const [simpleRange, setSimpleRange] = useState("");

  const handleReset = () => {
    setFieldValues({});
    setIsCritical(false);
    setResultedAt(new Date().toISOString().slice(0, 16));
    setNotes("");
    setSimpleResult("normal");
    setSimpleValue("");
    setSimpleUnit("");
    setSimpleRange("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let resultValue: string;
    let unit: string | undefined;
    let referenceRange: string | undefined;
    let result: string;
    let critical = isCritical;

    if (testDef && testDef.fields.length > 0) {
      // Multi-field or single-field from catalog
      const autoResult = assessResult(testDef.fields, fieldValues);
      result = autoResult;
      if (autoResult === "critical") critical = true;

      if (testDef.fields.length === 1) {
        // Single-field: store cleanly
        const f = testDef.fields[0];
        resultValue = fieldValues[f.key] ?? "";
        unit = f.unit;
        referenceRange = f.refRange;
      } else {
        // Multi-field: serialize as JSON summary
        const summary: Record<string, string> = {};
        for (const f of testDef.fields) {
          if (fieldValues[f.key]) summary[f.key] = fieldValues[f.key];
        }
        resultValue = JSON.stringify(summary);
        unit = undefined;
        referenceRange = undefined;
      }
    } else {
      // Unknown test: simple form
      result = simpleResult;
      resultValue = simpleValue;
      unit = simpleUnit || undefined;
      referenceRange = simpleRange || undefined;
    }

    updateMutation.mutate(
      {
        id: orderId,
        data: {
          status: "resulted",
          result,
          resultValue: resultValue || undefined,
          unit,
          referenceRange,
          isCritical: critical,
          resultedAt: resultedAt ? new Date(resultedAt).toISOString() : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setOpen(false);
          handleReset();
          onSuccess();
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const autoResult = testDef ? assessResult(testDef.fields, fieldValues) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleReset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap">
          <FlaskConical className="h-3 w-3" /> {t("lab.enterResult")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-blue-500" />
            {t("lab.enterResult")}: {testName}
          </DialogTitle>
          {testDef && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{testDef.code}</span>
              <span className="text-xs text-muted-foreground">{testDef.categoryAr} · {testDef.fields.length} fields</span>
              {autoResult && autoResult !== "normal" && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${autoResult === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  Auto-detected: {autoResult}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 px-1">
            <div className="py-4 space-y-4">
              {testDef ? (
                <>
                  {/* Dynamic fields from catalog */}
                  {testDef.fields.length <= 4 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {testDef.fields.map((field) => (
                        <DynamicField
                          key={field.key}
                          field={field}
                          value={fieldValues[field.key] ?? ""}
                          onChange={(v) => setFieldValues((prev) => ({ ...prev, [field.key]: v }))}
                        />
                      ))}
                    </div>
                  ) : testDef.fields.length <= 8 ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {testDef.fields.map((field) => (
                        <DynamicField
                          key={field.key}
                          field={field}
                          value={fieldValues[field.key] ?? ""}
                          onChange={(v) => setFieldValues((prev) => ({ ...prev, [field.key]: v }))}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {testDef.fields.map((field) => (
                        <DynamicField
                          key={field.key}
                          field={field}
                          value={fieldValues[field.key] ?? ""}
                          onChange={(v) => setFieldValues((prev) => ({ ...prev, [field.key]: v }))}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Fallback simple form for unknown tests */
                <>
                  <div className="space-y-3">
                    <Label>{t("generic.result")} *</Label>
                    <Select value={simpleResult} onValueChange={setSimpleResult}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">{t("lab.normal")}</SelectItem>
                        <SelectItem value="abnormal">{t("lab.abnormal")}</SelectItem>
                        <SelectItem value="critical">{t("lab.critical")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>{t("lab.resultValue")}</Label>
                      <Input value={simpleValue} onChange={(e) => setSimpleValue(e.target.value)} placeholder="e.g. 7.4" />
                    </div>
                    <div className="space-y-3">
                      <Label>{t("lab.unit")}</Label>
                      <Input value={simpleUnit} onChange={(e) => setSimpleUnit(e.target.value)} placeholder="e.g. mmol/L" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>{t("lab.referenceRange")}</Label>
                    <Input value={simpleRange} onChange={(e) => setSimpleRange(e.target.value)} placeholder="e.g. 3.5 – 5.5 mmol/L" />
                  </div>
                </>
              )}

              {/* Common footer fields */}
              <div className="border-t pt-4 space-y-3">
                <div className="space-y-3">
                  <Label>{t("lab.resultedAt")}</Label>
                  <Input type="datetime-local" value={resultedAt} onChange={(e) => setResultedAt(e.target.value)} />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                  <Checkbox
                    id="critical-result"
                    checked={isCritical || autoResult === "critical"}
                    onCheckedChange={(v) => setIsCritical(!!v)}
                  />
                  <label htmlFor="critical-result" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    {t("lab.isCritical")}
                    {autoResult === "critical" && (
                      <span className="text-xs text-red-500">(auto-detected from values)</span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
              {t("lab.updateResult")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark Collected ───────────────────────────────────────────────────────────

function MarkCollectedButton({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateMutation = useUpdateLabOrder();

  const handle = () => {
    updateMutation.mutate(
      { id: orderId, data: { status: "collected", collectedAt: new Date().toISOString() } },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("lab.markCollected") }); onSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <Button size="sm" variant="secondary" onClick={handle} disabled={updateMutation.isPending} className="whitespace-nowrap">
      {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t("lab.markCollected")}
    </Button>
  );
}

// ─── Result Value Display ─────────────────────────────────────────────────────

function ResultDisplay({ order }: { order: { result?: string | null; resultValue?: string | null; unit?: string | null; testName: string } }) {
  if (!order.result) return <span className="text-muted-foreground text-sm">–</span>;

  const testDef = findTest(order.testName);
  const resultColor = order.result === "critical" ? "text-destructive" : order.result === "abnormal" ? "text-orange-600" : "text-green-600";

  // Try to parse multi-field JSON
  if (order.resultValue && order.resultValue.startsWith("{")) {
    try {
      const parsed: Record<string, string> = JSON.parse(order.resultValue);
      const entries = Object.entries(parsed).slice(0, 3);
      return (
        <div>
          <span className={`font-medium capitalize text-sm ${resultColor}`}>{order.result}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {entries.map(([key, val]) => {
              const fieldDef = testDef?.fields.find((f) => f.key === key);
              const label = fieldDef?.label ?? key.toUpperCase();
              const unit = fieldDef?.unit ?? "";
              return (
                <span key={key} className="text-xs text-muted-foreground font-mono">
                  {label}: <span className="font-medium text-foreground">{val}</span>{unit && ` ${unit}`}
                </span>
              );
            })}
            {Object.keys(parsed).length > 3 && (
              <span className="text-xs text-muted-foreground">+{Object.keys(parsed).length - 3} more</span>
            )}
          </div>
        </div>
      );
    } catch {
      // Fall through
    }
  }

  return (
    <span className={`font-medium capitalize text-sm ${resultColor}`}>
      {order.result}
      {order.resultValue && (
        <span className="font-mono ms-1">
          ({order.resultValue}{order.unit ? ` ${order.unit}` : ""})
        </span>
      )}
    </span>
  );
}

// ─── Lab Result Report Dialog ─────────────────────────────────────────────────

type OrderForReport = {
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
      // fall through
    }
  }

  // Single-field
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
  if (!status || status === "normal") return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs"><Minus className="h-3 w-3" />Normal</span>;
  if (status === "critical") return <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs"><ShieldAlert className="h-3 w-3" />Critical</span>;
  return <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-xs"><TrendingUp className="h-3 w-3" />Abnormal</span>;
}

function LabResultViewDialog({ order }: { order: OrderForReport }) {
  const [open, setOpen] = useState(false);
  const testDef = useMemo(() => findTest(order.testName), [order.testName]);
  const fieldRows = useMemo(() => parseFieldRows(order, testDef), [order, testDef]);

  const resultColor =
    order.result === "critical" ? "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800" :
    order.result === "abnormal" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800" :
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800";

  const resultText =
    order.result === "critical" ? { label: "CRITICAL", cls: "text-red-600 dark:text-red-400" } :
    order.result === "abnormal" ? { label: "ABNORMAL", cls: "text-amber-600 dark:text-amber-400" } :
    { label: "NORMAL", cls: "text-emerald-600 dark:text-emerald-400" };

  const handlePrint = () => {
    const printContent = document.getElementById(`lab-report-${order.id}`);
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Lab Report – ${order.testName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
            body { background: #fff; color: #111; padding: 32px; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
            .hospital-name { font-size: 18px; font-weight: 800; color: #1d4ed8; }
            .hospital-sub { font-size: 11px; color: #6b7280; }
            .report-id { font-size: 11px; color: #6b7280; text-align: right; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
            .info-item label { font-size: 10px; color: #9ca3af; display: block; margin-bottom: 2px; }
            .info-item p { font-size: 13px; font-weight: 600; }
            .status-banner { border-radius: 8px; padding: 12px 16px; margin: 16px 0; border: 1px solid; }
            .status-normal { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
            .status-abnormal { background: #fffbeb; border-color: #fde68a; color: #b45309; }
            .status-critical { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
            .status-label { font-size: 22px; font-weight: 900; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #f8fafc; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
            .flag-critical { color: #b91c1c; font-weight: 700; }
            .flag-abnormal { color: #b45309; font-weight: 700; }
            .flag-normal { color: #15803d; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
            .critical-warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; margin: 12px 0; color: #b91c1c; font-weight: 700; font-size: 12px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const resultedDate = order.resultedAt
    ? new Date(order.resultedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const orderedDate = new Date(order.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap border-primary/30 text-primary hover:bg-primary/5">
          <Eye className="h-3.5 w-3.5" /> View Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">{order.testName}</DialogTitle>
              {order.testCode && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.testCode} · {testDef?.categoryAr ?? testDef?.category ?? "Laboratory"}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div id={`lab-report-${order.id}`} className="p-6 space-y-5">

            {/* Critical alert banner */}
            {order.isCritical && (
              <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-700 px-4 py-3">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">⚠ Critical Result — Immediate Physician Notification Required</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">This result falls outside critical limits. Please contact the ordering physician immediately.</p>
                </div>
              </div>
            )}

            {/* Patient & Order Info */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Patient", value: order.patientName ?? `Patient #${order.patientId}` },
                { label: "Ordered By", value: order.orderedByName ?? "—" },
                { label: "Priority", value: order.priority ? order.priority.charAt(0).toUpperCase() + order.priority.slice(1) : "Routine" },
                { label: "Order Date", value: orderedDate },
                { label: "Result Date", value: resultedDate },
                { label: "Order ID", value: `LAB-${String(order.id).padStart(4, "0")}` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 border px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-sm font-semibold truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Overall result status */}
            {order.result && (
              <div className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 ${resultColor}`}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Overall Result</p>
                  <p className={`text-3xl font-black tracking-wide ${resultText.cls}`}>{resultText.label}</p>
                </div>
                <div className="h-16 w-16 rounded-full border-4 flex items-center justify-center
                  ${order.result === 'critical' ? 'border-red-300 bg-red-100 dark:bg-red-900/40' : order.result === 'abnormal' ? 'border-amber-300 bg-amber-100 dark:bg-amber-900/40' : 'border-emerald-300 bg-emerald-100 dark:bg-emerald-900/40'}">
                  {order.result === "critical" ? (
                    <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" />
                  ) : order.result === "abnormal" ? (
                    <TrendingUp className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <HeartPulse className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Result Detail */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Test Results</p>

              {fieldRows.length > 0 ? (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-bold text-xs uppercase tracking-wide w-[35%]">Analyte</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">Value</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">Unit</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">Reference Range</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wide text-center">Flag</TableHead>
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
                          <TableCell className="text-center">
                            <FieldFlag status={row.status} />
                          </TableCell>
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
                    <p className="text-sm text-muted-foreground mt-2">Reference range: <span className="font-mono font-medium">{order.referenceRange}</span></p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No result values recorded.</p>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Clinical Notes</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg px-4 py-3 border">{order.notes}</p>
                </div>
              </>
            )}

            {/* Footer */}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="font-semibold">Almuzini Children Hospital</span>
                <span>· Pediatric Laboratory</span>
              </div>
              <span>Generated {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Lab Page ────────────────────────────────────────────────────────────

export default function Lab() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const isLabTech = isLabRole(user?.role ?? "");
  const canEnter = canEnterLabResults(user?.role ?? "");

  const [statusFilter, setStatusFilter] = useState<string>(isLabTech ? "pending" : "all");
  const [isOpen, setIsOpen] = useState(false);
  const { data: orders, isLoading } = useListLabOrders(statusFilter !== "all" ? { status: statusFilter } : {});
  const createMutation = useCreateLabOrder();

  const [form, setForm] = useState({
    patientId: "", patientName: "",
    selectedTest: null as LabTest | null,
    priority: "routine", notes: "",
  });

  const handlePatientSelect = useCallback((id: string, name: string) => {
    setForm((p) => ({ ...p, patientId: id, patientName: name }));
  }, []);

  const handleTestSelect = useCallback((test: LabTest) => {
    setForm((p) => ({ ...p, selectedTest: test }));
  }, []);

  const resetForm = () =>
    setForm({ patientId: "", patientName: "", selectedTest: null, priority: "routine", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.selectedTest) return;
    createMutation.mutate(
      {
        data: {
          patientId: Number(form.patientId),
          testName: form.selectedTest.name,
          testCode: form.selectedTest.code,
          priority: form.priority || undefined,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLabOrdersQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          resetForm();
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: getListLabOrdersQueryKey() });
  const pendingCount = orders?.filter((o) => o.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.lab")}</h1>
          {isLabTech && <p className="text-muted-foreground mt-1">{t("lab.queueDesc")}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("lab.allOrders")}</SelectItem>
              <SelectItem value="pending">{t("lab.pendingOnly")}</SelectItem>
              <SelectItem value="collected">{t("lab.collected")}</SelectItem>
              <SelectItem value="resulted">{t("lab.resulted")}</SelectItem>
            </SelectContent>
          </Select>

          {!isLabTech && (
            <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className={`${isRtl ? "ms-2" : "me-2"} h-4 w-4`} />{t("lab.newOrder")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{t("lab.newOrder")}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">

                  {/* Patient */}
                  <div className="space-y-3">
                    <Label>{t("nav.patients")} *</Label>
                    <PatientSearchCombobox value={form.patientId} onChange={handlePatientSelect} />
                    {form.patientId && (
                      <p className="text-xs text-muted-foreground">ID: <span className="font-mono font-medium">{form.patientId}</span></p>
                    )}
                  </div>

                  {/* Test */}
                  <div className="space-y-3">
                    <Label>{t("lab.testName")} *</Label>
                    <TestCatalogCombobox value={form.selectedTest} onChange={handleTestSelect} />
                    {form.selectedTest && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{form.selectedTest.code}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>{form.selectedTest.fields.length} result field{form.selectedTest.fields.length !== 1 ? "s" : ""} when entering results</span>
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="space-y-3">
                    <Label>{t("generic.priority")}</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("generic.selectPriority")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">{t("generic.routine")}</SelectItem>
                        <SelectItem value="urgent">{t("generic.urgent")}</SelectItem>
                        <SelectItem value="stat">{t("generic.stat")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <Label>{t("generic.notes")}</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
                    <Button type="submit" disabled={createMutation.isPending || !form.patientId || !form.selectedTest}>
                      {createMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                      {t("generic.save")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLabTech && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: t("lab.pendingOnly"), value: pendingCount, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: t("lab.resulted"), value: orders?.filter((o) => o.status === "resulted").length ?? 0, color: "text-green-600", bg: "bg-green-500/10" },
            { label: t("lab.collected"), value: orders?.filter((o) => o.status === "collected").length ?? 0, color: "text-blue-600", bg: "bg-blue-500/10" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-full ${s.bg} ${s.color}`}><FlaskConical className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isLabTech ? t("lab.queue") : t("lab.pendingOrders")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("lab.patientName")}</TableHead>
                <TableHead>{t("lab.testName")}</TableHead>
                <TableHead>{t("lab.orderedBy")}</TableHead>
                <TableHead>{t("generic.priority")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead>{t("generic.result")}</TableHead>
                <TableHead className="text-end">{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id} className={order.isCritical ? "bg-destructive/5" : undefined}>
                    <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{order.patientName ?? `#${order.patientId}`}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.testName}</span>
                        {order.isCritical && <Badge variant="destructive" className="text-xs">⚠ {t("lab.critical")}</Badge>}
                      </div>
                      {order.testCode && (
                        <div className="text-xs text-muted-foreground font-mono">{order.testCode}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(order as any).orderedByName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.priority === "stat" ? "destructive" : order.priority === "urgent" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === "resulted" ? "default" : order.status === "collected" ? "secondary" : "outline"}>
                        {order.status === "resulted" ? t("lab.resulted") : order.status === "collected" ? t("lab.collected") : t("lab.pending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <ResultDisplay order={order} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === "resulted" && (
                          <LabResultViewDialog order={order as OrderForReport} />
                        )}
                        {order.status === "pending" && isLabTech && (
                          <MarkCollectedButton orderId={order.id} onSuccess={refreshOrders} />
                        )}
                        {order.status !== "resulted" && canEnter && (
                          <EnterResultDialog orderId={order.id} testName={order.testName} onSuccess={refreshOrders} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t("lab.noOrders")}
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
