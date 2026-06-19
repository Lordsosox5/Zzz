import { useState } from "react";
import { useListUnits, useCreateUnit, useUpdateUnit, getListUnitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canManageUnits } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Plus, Pencil, BedDouble, Layers, Users, PowerOff, Power, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type UnitType = "ward" | "icu" | "nicu" | "emergency" | "surgical" | "outpatient";
type UnitStatus = "active" | "inactive";

interface UnitForm {
  nameEn: string;
  nameAr: string;
  type: UnitType;
  description: string;
  floor: string;
  capacity: string;
  status: UnitStatus;
}

const UNIT_TYPES: { value: UnitType; labelKey: string; color: string }[] = [
  { value: "ward",       labelKey: "units.ward",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "icu",        labelKey: "units.icu",        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "nicu",       labelKey: "units.nicu",       color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "emergency",  labelKey: "units.emergency",  color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "surgical",   labelKey: "units.surgical",   color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { value: "outpatient", labelKey: "units.outpatient", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
];

const EMPTY_FORM: UnitForm = {
  nameEn: "", nameAr: "", type: "ward", description: "", floor: "", capacity: "", status: "active",
};

// ── Unit card ─────────────────────────────────────────────────────────────────
function UnitCard({
  unit, typeInfo, canEdit, onEdit, onToggleStatus, t,
}: {
  unit: { id: number; nameEn: string; nameAr?: string | null; type: string; floor?: string | null; capacity: number; headDoctorName?: string | null; status: string; description?: string | null };
  typeInfo: typeof UNIT_TYPES[0] | undefined;
  canEdit: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  t: (key: string) => string;
}) {
  const isActive = unit.status === "active";
  return (
    <Card className={`transition-opacity ${!isActive ? "opacity-60" : ""}`}>
      <CardContent className="px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${typeInfo?.color ?? "bg-muted"}`}>
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{unit.nameEn}</h3>
              {unit.nameAr && (
                <p className="text-sm text-muted-foreground font-tajawal truncate" dir="rtl">{unit.nameAr}</p>
              )}
              {unit.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{unit.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge variant="outline" className={`text-xs ${typeInfo?.color ?? ""}`}>
              {t(typeInfo?.labelKey ?? "units.ward")}
            </Badge>
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? t("units.active") : t("units.inactive")}
            </Badge>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t pt-3">
          {unit.floor && (
            <div className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              <span>{t("units.floor_label")} {unit.floor}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            <span>{unit.capacity} {t("units.beds")}</span>
          </div>
          {unit.headDoctorName && (
            <div className="flex items-center gap-1 col-span-full">
              <Users className="h-3.5 w-3.5" />
              <span>{unit.headDoctorName}</span>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="mt-3 flex gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              {t("generic.edit")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleStatus} className="gap-1.5 text-muted-foreground">
              {isActive
                ? <><PowerOff className="h-3.5 w-3.5" />{t("units.deactivate")}</>
                : <><Power className="h-3.5 w-3.5" />{t("units.activate")}</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Units() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const isAdmin = canManageUnits(user?.role ?? "");

  const { data: units = [], isLoading } = useListUnits();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);
  const [filterType, setFilterType] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  const setField = (k: keyof UnitForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
  const openEdit = (unit: typeof units[0]) => {
    setForm({
      nameEn: unit.nameEn,
      nameAr: unit.nameAr ?? "",
      type: (unit.type as UnitType) ?? "ward",
      description: (unit as { description?: string | null }).description ?? "",
      floor: (unit as { floor?: string | null }).floor ?? "",
      capacity: String(unit.capacity),
      status: (unit.status as UnitStatus) ?? "active",
    });
    setEditingId(unit.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nameEn.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Unit name (English) is required." });
      return;
    }
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr || undefined,
      type: form.type,
      description: form.description || undefined,
      floor: form.floor || undefined,
      capacity: form.capacity ? parseInt(form.capacity, 10) : 0,
      status: form.status,
    };

    if (editingId) {
      updateUnit.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey() });
          setDialogOpen(false);
          toast({ title: t("generic.save"), description: `${form.nameEn} updated.` });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update unit." }),
      });
    } else {
      createUnit.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey() });
          setDialogOpen(false);
          toast({ title: t("units.add"), description: `${form.nameEn} created.` });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to create unit." }),
      });
    }
  };

  const handleToggleStatus = (unit: typeof units[0]) => {
    const newStatus = unit.status === "active" ? "inactive" : "active";
    updateUnit.mutate({ id: unit.id, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey() }),
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update status." }),
    });
  };

  const filtered = units.filter(u => {
    if (!showInactive && u.status === "inactive") return false;
    if (filterType !== "all" && u.type !== filterType) return false;
    return true;
  });

  const typeInfo = (type: string) => UNIT_TYPES.find(x => x.value === type);

  const isSaving = createUnit.isPending || updateUnit.isPending;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("units.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("units.subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2 self-start">
            <Plus className="h-4 w-4" />
            {t("units.add")}
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {UNIT_TYPES.map(ut => {
          const count = units.filter(u => u.type === ut.value && u.status === "active").length;
          return (
            <Card key={ut.value} className={`cursor-pointer transition-all ${filterType === ut.value ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilterType(p => p === ut.value ? "all" : ut.value)}>
              <CardContent className="px-3 py-3 flex items-center gap-2">
                <div className={`rounded-md p-1.5 ${ut.color}`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(ut.labelKey)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>
          All
        </Button>
        <div className="flex items-center gap-2 ms-auto">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
              className="rounded" />
            Show Inactive
          </label>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="px-4 py-16 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("units.noUnits")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(unit => (
            <UnitCard
              key={unit.id}
              unit={unit as typeof unit & { description?: string | null; floor?: string | null }}
              typeInfo={typeInfo(unit.type)}
              canEdit={isAdmin}
              onEdit={() => openEdit(unit)}
              onToggleStatus={() => handleToggleStatus(unit)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t("units.edit") : t("units.add")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("units.nameEn")} *</Label>
                <Input value={form.nameEn} onChange={e => setField("nameEn", e.target.value)}
                  placeholder="e.g. General Pediatrics" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("units.nameAr")}</Label>
                <Input value={form.nameAr} onChange={e => setField("nameAr", e.target.value)}
                  placeholder="مثال: طب الأطفال العام" dir="rtl" className="font-tajawal" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("units.type")}</Label>
                <Select value={form.type} onValueChange={v => setField("type", v as UnitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map(ut => (
                      <SelectItem key={ut.value} value={ut.value}>{t(ut.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("generic.status")}</Label>
                <Select value={form.status} onValueChange={v => setField("status", v as UnitStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("units.active")}</SelectItem>
                    <SelectItem value="inactive">{t("units.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("units.floor")}</Label>
                <Input value={form.floor} onChange={e => setField("floor", e.target.value)}
                  placeholder="e.g. 2" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("units.capacity")}</Label>
                <Input type="number" min="0" value={form.capacity} onChange={e => setField("capacity", e.target.value)}
                  placeholder="e.g. 30" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("units.description")}</Label>
              <Textarea value={form.description} onChange={e => setField("description", e.target.value)}
                placeholder="Optional description…" className="min-h-[70px]" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {t("generic.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("generic.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
