import { useState } from "react";
import { useLocation } from "wouter";
import { useListUnits, useCreateUnit, useUpdateUnit, getListUnitsQueryKey, useListStaff, useListPatients } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canManageUnits, ROLE_DEFINITIONS } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Plus, Pencil, BedDouble, Layers, Users, PowerOff, Power, Loader2,
  ChevronDown, ChevronRight, ShieldCheck, UserRound, Stethoscope,
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
  allowedRoles: Record<string, boolean>;
}

const UNIT_TYPES: { value: UnitType; labelKey: string; color: string }[] = [
  { value: "ward",       labelKey: "units.ward",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "icu",        labelKey: "units.icu",        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "nicu",       labelKey: "units.nicu",       color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "emergency",  labelKey: "units.emergency",  color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "surgical",   labelKey: "units.surgical",   color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { value: "outpatient", labelKey: "units.outpatient", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
];

// The three junior medical roles configurable per unit
const UNIT_STAFF_ROLES = ["house_officer", "medical_officer", "registrar"] as const;

const DEFAULT_ALLOWED_ROLES: Record<string, boolean> = {
  house_officer: true,
  medical_officer: true,
  registrar: true,
};

const EMPTY_FORM: UnitForm = {
  nameEn: "", nameAr: "", type: "ward", description: "", floor: "", capacity: "", status: "active",
  allowedRoles: { ...DEFAULT_ALLOWED_ROLES },
};

// ── Role permission panel ──────────────────────────────────────────────────────
function RolePermissionPanel({
  roleKey,
  enabled,
  onToggle,
}: {
  roleKey: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = ROLE_DEFINITIONS[roleKey];
  if (!def) return null;

  return (
    <div className={`rounded-lg border transition-colors ${enabled ? "border-border bg-card" : "border-dashed border-muted-foreground/30 bg-muted/20 opacity-60"}`}>
      {/* Role header row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Checkbox
          id={`role-${roleKey}`}
          checked={enabled}
          onCheckedChange={(v) => onToggle(Boolean(v))}
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`role-${roleKey}`}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Badge variant="outline" className={`text-xs font-medium shrink-0 ${def.badgeClass}`}>
              {def.label.en}
            </Badge>
            <span className="text-xs text-muted-foreground font-tajawal truncate" dir="rtl">
              {def.label.ar}
            </span>
          </label>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Permissions
          {expanded
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
        </button>
      </div>

      {/* Expandable permissions list */}
      {expanded && (
        <div className="px-3 pb-3 border-t pt-2.5 space-y-1">
          <p className="text-xs text-muted-foreground mb-2 italic">{def.description.en}</p>
          <ul className="space-y-1">
            {def.authorities.map((auth, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
                <div>
                  <span className={enabled ? "text-foreground" : "text-muted-foreground"}>
                    {auth.en}
                  </span>
                  <span className="block text-muted-foreground font-tajawal text-[11px]" dir="rtl">
                    {auth.ar}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Unit detail dialog ─────────────────────────────────────────────────────────
function UnitDetailDialog({
  unit, typeInfo, open, onClose, t,
}: {
  unit: { id: number; nameEn: string; nameAr?: string | null; type: string; floor?: string | null; capacity: number; headDoctorName?: string | null; status: string; description?: string | null };
  typeInfo: typeof UNIT_TYPES[0] | undefined;
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [, navigate] = useLocation();
  const { data: allStaff = [], isLoading: staffLoading } = useListStaff();
  const { data: patientResp, isLoading: patientsLoading } = useListPatients({ limit: 500 });

  const doctors = allStaff.filter(s => (s as any).unitId === unit.id);
  const patients = (patientResp?.patients ?? []).filter(p => (p as any).unitId === unit.id);

  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    pediatric_consultant: "Consultant",
    pediatric_specialist: "Specialist",
    nurse: "Nurse",
    emergency_physician: "Emergency Physician",
    pharmacist: "Pharmacist",
    lab_technician: "Lab Technician",
    billing_officer: "Billing Officer",
    house_officer: "House Officer",
    medical_officer: "Medical Officer",
    registrar: "Registrar",
  };

  function calcAge(dob?: string | null) {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    if (years > 0) return `${years}y`;
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    return months > 0 ? `${months}m` : "<1m";
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Unit header */}
        <div className={`px-5 py-4 border-b ${typeInfo?.color ?? "bg-muted"}`}>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/30 p-2 shrink-0 mt-0.5">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-lg leading-tight">{unit.nameEn}</h2>
              {unit.nameAr && (
                <p className="text-sm font-tajawal opacity-80" dir="rtl">{unit.nameAr}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs opacity-75">
                {unit.floor && (
                  <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{t("units.floor_label")} {unit.floor}</span>
                )}
                <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{unit.capacity} {t("units.beds")}</span>
                {unit.headDoctorName && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{unit.headDoctorName}</span>
                )}
              </div>
            </div>
            <Badge variant={unit.status === "active" ? "default" : "secondary"} className="shrink-0 text-xs">
              {unit.status === "active" ? t("units.active") : t("units.inactive")}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="doctors" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-5 mt-4 mb-0 w-fit">
            <TabsTrigger value="doctors" className="gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" />
              Doctors &amp; Staff
              {!staffLoading && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-4">{doctors.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              Patients
              {!patientsLoading && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-4">{patients.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Doctors tab */}
          <TabsContent value="doctors" className="flex-1 overflow-y-auto px-5 pb-5 mt-3">
            {staffLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Stethoscope className="h-10 w-10 mb-2 opacity-25" />
                <p className="text-sm">No staff assigned to this unit</p>
              </div>
            ) : (
              <div className="space-y-2">
                {doctors.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card hover:bg-muted/40 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.nameEn}</p>
                      {doc.nameAr && (
                        <p className="text-xs text-muted-foreground font-tajawal truncate" dir="rtl">{doc.nameAr}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[doc.role] ?? doc.role}
                      </Badge>
                      {doc.department && doc.department !== "General" && (
                        <span className="text-[11px] text-muted-foreground">{doc.department}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Patients tab */}
          <TabsContent value="patients" className="flex-1 overflow-y-auto px-5 pb-5 mt-3">
            {patientsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserRound className="h-10 w-10 mb-2 opacity-25" />
                <p className="text-sm">No patients assigned to this unit</p>
              </div>
            ) : (
              <div className="space-y-2">
                {patients.map(pat => (
                  <div
                    key={(pat as any).id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card hover:bg-primary/5 hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => { onClose(); navigate(`/patients/${(pat as any).id}`); }}
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <UserRound className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{(pat as any).nameEn ?? (pat as any).name}</p>
                      {(pat as any).nameAr && (
                        <p className="text-xs text-muted-foreground font-tajawal truncate" dir="rtl">{(pat as any).nameAr}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs font-mono">{(pat as any).mrn ?? "—"}</Badge>
                      {(pat as any).dateOfBirth && (
                        <span className="text-[11px] text-muted-foreground">{calcAge((pat as any).dateOfBirth)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Unit card ─────────────────────────────────────────────────────────────────
function UnitCard({
  unit, typeInfo, canEdit, onEdit, onToggleStatus, onViewDetail, t,
}: {
  unit: { id: number; nameEn: string; nameAr?: string | null; type: string; floor?: string | null; capacity: number; headDoctorName?: string | null; status: string; description?: string | null };
  typeInfo: typeof UNIT_TYPES[0] | undefined;
  canEdit: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onViewDetail: () => void;
  t: (key: string) => string;
}) {
  const isActive = unit.status === "active";
  return (
    <Card
      className={`transition-all cursor-pointer hover:shadow-md hover:border-primary/40 ${!isActive ? "opacity-60" : ""}`}
      onClick={onViewDetail}
    >
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
          <div className="mt-3 flex gap-2 border-t pt-3" onClick={e => e.stopPropagation()}>
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
  const [detailUnit, setDetailUnit] = useState<typeof units[0] | null>(null);

  const setField = (k: keyof UnitForm, v: string) => setForm(p => ({ ...p, [k]: v }));
  const toggleRole = (roleKey: string, enabled: boolean) =>
    setForm(p => ({ ...p, allowedRoles: { ...p.allowedRoles, [roleKey]: enabled } }));

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
      allowedRoles: { ...DEFAULT_ALLOWED_ROLES },
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
              onViewDetail={() => setDetailUnit(unit as typeof unit & { description?: string | null; floor?: string | null })}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("units.edit") : t("units.add")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
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

            {/* Staff Roles & Permissions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Staff Roles &amp; Permissions</h3>
                <span className="text-xs text-muted-foreground">— configure access for this unit</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enable or disable each role for this unit. Click <strong>Permissions</strong> to view what each role can do.
              </p>
              <div className="space-y-2">
                {UNIT_STAFF_ROLES.map(roleKey => (
                  <RolePermissionPanel
                    key={roleKey}
                    roleKey={roleKey}
                    enabled={form.allowedRoles[roleKey] ?? true}
                    onToggle={v => toggleRole(roleKey, v)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {t("generic.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("generic.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Detail Dialog */}
      {detailUnit && (
        <UnitDetailDialog
          unit={detailUnit}
          typeInfo={typeInfo(detailUnit.type)}
          open={!!detailUnit}
          onClose={() => setDetailUnit(null)}
          t={t}
        />
      )}
    </div>
  );
}
