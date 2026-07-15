import { useState } from "react";
import {
  useListStaff, useCreateStaff, useUpdateStaff, useDeleteStaff,
  useListUnits, getListStaffQueryKey,
} from "@workspace/api-client-react";
import { getUser } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { ROLE_DEFINITIONS, canFullyManageStaff } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Plus, Loader2, Save, CheckCircle2, ShieldCheck, CalendarClock,
  Infinity, AlertTriangle, RefreshCw, Copy, Eye, EyeOff, UserX, UserCheck, KeyRound, Pencil, Trash2,
  Search, Phone, Mail, Building2, X, Users, ChevronRight,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────
const DOCTOR_ROLES = ["house_officer", "medical_officer", "registrar", "consultant", "specialist", "pediatric_consultant", "pediatric_specialist", "emergency_physician"];

const ROLE_CATEGORIES: Record<string, string[]> = {
  doctors: ["house_officer", "medical_officer", "registrar", "consultant", "specialist", "pediatric_consultant", "pediatric_specialist", "emergency_physician"],
  clinical: ["nurse", "lab_technician", "lab_specialist"],
  support: ["pharmacist"],
  finance: ["billing_officer"],
  admin: ["admin", "administrative", "accounts_manager", "data_analyser", "super_admin"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string, language: string): string {
  return new Date(dateStr).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getDaysLeft(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function staffInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";
}

function avatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

type ExpiryStatus = "expired" | "soon" | "ok" | "permanent" | "none";

function getExpiryStatus(role: string, expiryDate?: string | null): ExpiryStatus {
  if (role === "medical_officer") return "permanent";
  if (role !== "house_officer") return "none";
  if (!expiryDate) return "none";
  const days = getDaysLeft(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "ok";
}

// ── Expiry Badge ──────────────────────────────────────────────────────────────

function ExpiryBadge({ role, expiryDate, t, language }: {
  role: string; expiryDate?: string | null; t: (k: string) => string; language: string;
}) {
  const status = getExpiryStatus(role, expiryDate);
  if (status === "permanent") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
        <Infinity className="h-3 w-3" />
        {t("staff.permanent")}
      </span>
    );
  }
  if (status === "none") return <span className="text-muted-foreground text-xs">—</span>;

  const days = expiryDate ? getDaysLeft(expiryDate) : 0;
  const dateStr = expiryDate ? formatDate(expiryDate, language) : "";

  if (status === "expired") {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <AlertTriangle className="h-3 w-3" />
          {t("staff.expired")}
        </span>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
    );
  }
  if (status === "soon") {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          <CalendarClock className="h-3 w-3" />
          {days} {t("staff.daysLeft")}
        </span>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <CalendarClock className="h-3 w-3" />
        {days} {t("staff.daysLeft")}
      </span>
      <p className="text-xs text-muted-foreground">{dateStr}</p>
    </div>
  );
}

// ── Credentials panel shown after successful creation ─────────────────────────

function CredentialsPanel({
  username, password, onClose,
}: { username: string; password: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);
  const [showPass, setShowPass] = useState(false);

  const copy = (text: string, field: "user" | "pass") => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          {t("staff.credentialsCreated")}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs w-20 shrink-0 text-muted-foreground">{t("staff.username")}</Label>
          <code className="flex-1 text-xs bg-white dark:bg-black/20 border rounded px-2 py-1 font-mono">
            {username}
          </code>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0"
            onClick={() => copy(username, "user")}>
            {copied === "user" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-20 shrink-0 text-muted-foreground">{t("login.password")}</Label>
          <code className="flex-1 text-xs bg-white dark:bg-black/20 border rounded px-2 py-1 font-mono tracking-widest">
            {showPass ? password : "•".repeat(password.length)}
          </code>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0"
            onClick={() => setShowPass(v => !v)}>
            {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0"
            onClick={() => copy(password, "pass")}>
            {copied === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <Button type="button" size="sm" className="w-full mt-1" onClick={onClose}>
        {t("staff.done")}
      </Button>
    </div>
  );
}

// ── Staff Profile Dialog ───────────────────────────────────────────────────────

type StaffMemberAny = Record<string, any>;

function ProfileDialog({
  member, open, onOpenChange, onEdit, onReset, onSuspend, onReactivate, onDelete,
  isFullAdmin, currentUserId, units, t, isRtl, language, updatePending,
}: {
  member: StaffMemberAny | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
  onReset: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  isFullAdmin: boolean;
  currentUserId?: number;
  units: any[];
  t: (k: string) => string;
  isRtl: boolean;
  language: string;
  updatePending: boolean;
}) {
  if (!member) return null;
  const roleDef = ROLE_DEFINITIONS[member.role];
  const isActive = member.status === "active";
  const isExpired = getExpiryStatus(member.role, member.accountExpiryDate) === "expired";
  const isSelf = currentUserId === member.id;
  const isSuperAdmin = member.role === "super_admin";
  const displayName = isRtl && member.nameAr ? member.nameAr : member.nameEn;
  const unitName = member.unitId
    ? (units.find((u: any) => u.id === member.unitId)?.[isRtl ? "nameAr" : "nameEn"] ?? null)
    : null;

  const detailRows = [
    { icon: Users, label: t("generic.role"), value: roleDef ? roleDef.label[language as "en" | "ar"] : member.role, badge: true },
    { icon: Building2, label: t("generic.department"), value: member.department || "—" },
    unitName ? { icon: Building2, label: t("patient.unit"), value: unitName } : null,
    { icon: Mail, label: t("generic.email"), value: member.email || "—" },
    { icon: Phone, label: t("generic.phone"), value: member.phone || "—" },
  ].filter(Boolean) as { icon: any; label: string; value: string; badge?: boolean }[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Profile header */}
        <div className="relative p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <div className={`h-16 w-16 rounded-2xl ${avatarColor(member.nameEn)} text-white text-xl font-bold flex items-center justify-center shrink-0 shadow-md`}>
              {staffInitials(member.nameEn)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold tracking-tight leading-tight truncate">{displayName}</h2>
              {isRtl && member.nameEn && member.nameAr && (
                <p className="text-sm text-muted-foreground truncate">{member.nameEn}</p>
              )}
              {member.username && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">@{member.username}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {roleDef && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleDef.badgeClass}`}>
                    {roleDef.label[language as "en" | "ar"]}
                  </span>
                )}
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                  {isActive ? t("staff.active") : t("staff.suspended")}
                </Badge>
                {isExpired && <Badge variant="destructive" className="text-xs">{t("staff.expired")}</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          {detailRows.map((row, i) => {
            const Icon = row.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{row.label}</p>
                  <p className="text-sm font-medium truncate">{row.value}</p>
                </div>
              </div>
            );
          })}

          {/* Contract status */}
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{t("staff.contract")}</p>
              <ExpiryBadge role={member.role} expiryDate={member.accountExpiryDate} t={t} language={language} />
            </div>
          </div>

          {/* Permissions */}
          {roleDef && roleDef.authorities.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("staff.permissions")}</p>
                <ul className="space-y-1.5">
                  {roleDef.authorities.map((a: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      {language === "ar" ? a.ar : a.en}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="grid grid-cols-2 gap-2 pt-1">
            {isFullAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { onOpenChange(false); onEdit(); }}>
                <Pencil className="h-3.5 w-3.5" /> {t("staff.edit")}
              </Button>
            )}
            {isFullAdmin && !isSelf && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { onOpenChange(false); onReset(); }}>
                <KeyRound className="h-3.5 w-3.5" /> {t("staff.resetAction")}
              </Button>
            )}
            {isFullAdmin && isActive && !isSuperAdmin && !isSelf && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                disabled={updatePending} onClick={onSuspend}>
                <UserX className="h-3.5 w-3.5" /> {t("staff.suspend")}
              </Button>
            )}
            {isFullAdmin && !isActive && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                disabled={updatePending} onClick={onReactivate}>
                <UserCheck className="h-3.5 w-3.5" /> {t("staff.reactivate")}
              </Button>
            )}
            {!isSelf && !isSuperAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => { onOpenChange(false); onDelete(); }}>
                <Trash2 className="h-3.5 w-3.5" /> {t("staff.deleteAction")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Staff() {
  const { t, isRtl, language } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthorities, setShowAuthorities] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [newCreds, setNewCreds] = useState<{ username: string; password: string } | null>(null);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<{ id: number; nameEn: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetShowPass, setResetShowPass] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  // Delete staff dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nameEn: string } | null>(null);

  // Edit staff dialog
  const [editTarget, setEditTarget] = useState<{ id: number } | null>(null);
  const [editForm, setEditForm] = useState({
    nameEn: "", nameAr: "", role: "", department: "", unitId: "", email: "", phone: "",
  });

  // Search + filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "doctors" | "clinical" | "support" | "finance" | "admin">("all");

  // Profile view
  const [profileMember, setProfileMember] = useState<StaffMemberAny | null>(null);

  const openEdit = (member: NonNullable<typeof staff>[number]) => {
    setEditForm({
      nameEn: member.nameEn ?? "",
      nameAr: member.nameAr ?? "",
      role: member.role ?? "",
      department: member.department ?? "",
      unitId: member.unitId != null ? String(member.unitId) : "",
      email: member.email ?? "",
      phone: member.phone ?? "",
    });
    setEditTarget({ id: member.id });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const isDoc = DOCTOR_ROLES.includes(editForm.role);
    const selectedUnit = units.find(u => String(u.id) === editForm.unitId);
    updateMutation.mutate(
      {
        id: editTarget.id,
        data: {
          nameEn: editForm.nameEn || undefined,
          nameAr: editForm.nameAr || undefined,
          role: editForm.role || undefined,
          department: isDoc
            ? (selectedUnit?.nameEn ?? editForm.department ?? undefined)
            : (editForm.department || undefined),
          email: editForm.email || undefined,
          phone: editForm.phone || undefined,
          unitId: editForm.unitId ? Number(editForm.unitId) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t("staff.updated"), description: `${editForm.nameEn} ${t("staff.updatedDesc")}` });
          setEditTarget(null);
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("staff.updateFailed") }),
      }
    );
  };

  const currentUser = getUser();
  const isFullAdmin = canFullyManageStaff(currentUser?.role ?? "");

  const { data: staff, isLoading } = useListStaff({});
  const { data: units = [] } = useListUnits();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();

  // ── Computed stats ──────────────────────────────────────────────────────────
  const allStaff = (staff ?? []) as StaffMemberAny[];
  const activeCount   = allStaff.filter(m => m.status === "active").length;
  const inactiveCount = allStaff.filter(m => m.status !== "active").length;
  const expiringMembers = allStaff.filter(m => {
    const s = getExpiryStatus(m.role, m.accountExpiryDate);
    return s === "expired" || s === "soon";
  });

  // ── Filtered staff ──────────────────────────────────────────────────────────
  const filteredStaff = allStaff.filter(m => {
    if (search) {
      const q = search.toLowerCase();
      const hit = (m.nameEn ?? "").toLowerCase().includes(q)
        || (m.nameAr ?? "").toLowerCase().includes(q)
        || (m.username ?? "").toLowerCase().includes(q)
        || (m.email ?? "").toLowerCase().includes(q)
        || (m.department ?? "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (roleFilter !== "all") {
      const set = ROLE_CATEGORIES[roleFilter] ?? [];
      if (!set.includes(m.role)) return false;
    }
    return true;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t("staff.deleted"), description: `${deleteTarget.nameEn} ${t("staff.deletedDesc")}` });
          setDeleteTarget(null);
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("staff.deleteFailed") }),
      }
    );
  };

  const [form, setForm] = useState({
    nameEn: "", nameAr: "", username: "", role: "nurse", department: "", unitId: "",
    email: "", phone: "", password: generatePassword(),
  });
  const [usernameTouched, setUsernameTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(p => {
      const next = { ...p, [name]: value };
      // Auto-suggest username from English name unless admin already typed one
      if (name === "nameEn" && !usernameTouched) {
        next.username = value.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
      }
      return next;
    });
    if (name === "username") setUsernameTouched(true);
  };

  const isDoctor = DOCTOR_ROLES.includes(form.role);
  const isHouseOfficer = form.role === "house_officer";
  const isMedicalOfficer = form.role === "medical_officer";
  const previewExpiry = isHouseOfficer ? addDays(90) : null;

  const resetForm = () => {
    setForm({ nameEn: "", nameAr: "", username: "", role: "nurse", department: "", unitId: "", email: "", phone: "", password: generatePassword() });
    setUsernameTouched(false);
    setNewCreds(null);
    setShowPass(false);
  };

  const handleClose = () => { setIsOpen(false); resetForm(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUnit = units.find(u => String(u.id) === form.unitId);
    createMutation.mutate(
      {
        data: {
          nameEn: form.nameEn,
          nameAr: form.nameAr || undefined,
          username: form.username || undefined,
          role: form.role,
          department: isDoctor
            ? (selectedUnit?.nameEn ?? form.department ?? "Medical")
            : (form.department || undefined),
          unitId: form.unitId ? Number(form.unitId) : undefined,
          password: form.password || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          const creds = {
            username: (data as Record<string, unknown>).username as string ?? form.nameEn,
            password: (data as Record<string, unknown>).password as string ?? form.password,
          };
          setNewCreds(creds);
        },
        onError: () =>
          toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const openReset = (id: number, nameEn: string) => {
    setResetTarget({ id, nameEn });
    setResetPassword(generatePassword());
    setResetShowPass(false);
    setResetCopied(false);
  };

  const handleResetPassword = () => {
    if (!resetTarget || !resetPassword.trim()) return;
    updateMutation.mutate(
      { id: resetTarget.id, data: { password: resetPassword.trim() } },
      {
        onSuccess: () => {
          toast({ title: t("staff.passwordReset"), description: `${t("staff.passwordResetDesc")} ${resetTarget.nameEn}.` });
          setResetTarget(null);
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("staff.passwordResetFailed") }),
      }
    );
  };

  const handleCancelAccount = (id: number, nameEn: string) => {
    updateMutation.mutate(
      { id, data: { status: "inactive" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t("staff.accountCancelled"), description: `${nameEn}${t("staff.accountCancelledDesc")}` });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("staff.cancelFailed") }),
      }
    );
  };

  const handleReactivateAccount = (id: number, nameEn: string) => {
    updateMutation.mutate(
      { id, data: { status: "active" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t("staff.reactivated"), description: `${nameEn}${t("staff.reactivatedDesc")}` });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("staff.reactivateFailed") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.staff")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAuthorities(v => !v)}>
            <ShieldCheck className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
            {t("staff.roleAuthorities")}
          </Button>

          <Dialog open={isOpen} onOpenChange={v => { if (!v) handleClose(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsOpen(true); }}>
                <Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
                {t("staff.newMember")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("staff.newMember")}</DialogTitle>
              </DialogHeader>

              {/* Show credentials panel after creation */}
              {newCreds ? (
                <div className="py-2">
                  <CredentialsPanel
                    username={newCreds.username}
                    password={newCreds.password}
                    onClose={handleClose}
                  />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                  {/* Names */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("staff.nameEn")} *</Label>
                      <Input name="nameEn" required value={form.nameEn} onChange={handleChange} placeholder={t("staff.nameEnPlaceholder")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("staff.nameAr")}</Label>
                      <Input name="nameAr" dir="rtl" value={form.nameAr} onChange={handleChange}
                        className="font-tajawal" placeholder="مثال: د. أحمد علي" />
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <Label>{t("login.username")} *</Label>
                    <div className="relative">
                      <Input
                        name="username"
                        required
                        value={form.username}
                        onChange={handleChange}
                        placeholder={t("staff.usernamePlaceholder")}
                        className="font-mono pr-24"
                      />
                      {!usernameTouched && form.username && (
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground pointer-events-none">
                          {t("staff.autoSuggested")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("staff.usernameHelp")}
                    </p>
                  </div>

                  {/* Role + Department/Unit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("generic.role")} *</Label>
                      <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v, unitId: "", department: "" }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("staff.selectRole")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-1.5 text-primary font-semibold">
                              🩺 {t("staff.doctorCategory")}
                            </SelectLabel>
                            <SelectItem value="house_officer">
                              <div>
                                <span className="font-medium">{t("staff.houseOfficer")}</span>
                                <span className="text-xs text-muted-foreground block">{t("staff.houseOfficerBadge")}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="medical_officer">
                              <div>
                                <span className="font-medium">{t("staff.medicalOfficer")}</span>
                                <span className="text-xs text-muted-foreground block">{t("staff.medicalOfficerBadge")}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="registrar">
                              <div>
                                <span className="font-medium">{t("staff.registrar")}</span>
                                <span className="text-xs text-muted-foreground block">{t("staff.registrarInfo")}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="consultant">{t("staff.consultant")}</SelectItem>
                            <SelectItem value="specialist">{t("staff.specialist")}</SelectItem>
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-muted-foreground font-semibold">
                              {t("staff.clinicalCategory")}
                            </SelectLabel>
                            <SelectItem value="nurse">{t("staff.nurse")}</SelectItem>
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-muted-foreground font-semibold">
                              {t("staff.supportCategory")}
                            </SelectLabel>
                            <SelectItem value="pharmacist">{t("staff.pharmacist")}</SelectItem>
                            <SelectItem value="lab_specialist">{t("staff.labSpecialist")}</SelectItem>
                            <SelectItem value="admin">{t("staff.admin")}</SelectItem>
                            <SelectItem value="data_analyser">{t("staff.dataAnalyser")}</SelectItem>
                            <SelectItem value="accounts_manager">{t("staff.accountsManager")}</SelectItem>
                            <SelectItem value="administrative">{t("staff.administrative")}</SelectItem>
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                              💰 {t("staff.financeCategory")}
                            </SelectLabel>
                            <SelectItem value="billing_officer">
                              <div>
                                <span className="font-medium">{t("staff.billingOfficer")}</span>
                                <span className="text-xs text-muted-foreground block">Invoice management &amp; financial reporting</span>
                              </div>
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Unit selector for doctors, department text for others */}
                    <div className="space-y-1.5">
                      {isDoctor ? (
                        <>
                          <Label>{t("patient.unit")}</Label>
                          <Select value={form.unitId} onValueChange={v => setForm(p => ({ ...p, unitId: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("units.selectUnit")} />
                            </SelectTrigger>
                            <SelectContent>
                              {units
                                .filter(u => u.status === "active")
                                .map(u => (
                                  <SelectItem key={u.id} value={String(u.id)}>
                                    <div>
                                      <span className="font-medium">{u.nameEn}</span>
                                      {u.nameAr && (
                                        <span className="text-xs text-muted-foreground block font-tajawal" dir="rtl">
                                          {u.nameAr}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <>
                          <Label>{t("generic.department")} *</Label>
                          <Input name="department" required={!isDoctor} value={form.department}
                            onChange={handleChange} placeholder={t("staff.departmentPlaceholder")} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contract info boxes */}
                  {isHouseOfficer && previewExpiry && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">{t("staff.houseOfficerContractLabel")}</p>
                      </div>
                      <p className="text-xs text-orange-700 dark:text-orange-400">
                        {t("staff.autoExpiryNote")} <strong>{formatDate(previewExpiry, language)}</strong>
                      </p>
                      <p className="text-xs text-orange-600/80 dark:text-orange-500">{t("staff.houseOfficerInfo")}</p>
                    </div>
                  )}
                  {isMedicalOfficer && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Infinity className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">{t("staff.permanentContractLabel")}</p>
                      </div>
                      <p className="text-xs text-teal-700 dark:text-teal-400">{t("staff.medicalOfficerInfo")}</p>
                    </div>
                  )}

                  {/* Email + Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("generic.email")}</Label>
                      <Input name="email" type="email" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("generic.phone")}</Label>
                      <Input name="phone" type="tel" value={form.phone} onChange={handleChange} />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <Label>{t("login.password")}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          name="password"
                          type={showPass ? "text" : "password"}
                          value={form.password}
                          onChange={handleChange}
                          placeholder={t("staff.setPasswordPlaceholder")}
                          className="pr-9 font-mono"
                        />
                        <button type="button"
                          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPass(v => !v)}>
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button type="button" variant="outline" size="icon"
                        title={t("staff.generatePassword")}
                        onClick={() => setForm(p => ({ ...p, password: generatePassword() }))}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <RefreshCw className="inline h-3 w-3" /> {t("staff.generatePasswordHint")}
                    </p>
                  </div>

                  {/* Permissions preview */}
                  {form.role && ROLE_DEFINITIONS[form.role] && (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t("staff.permissions")}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_DEFINITIONS[form.role].badgeClass}`}>
                          {ROLE_DEFINITIONS[form.role].label[language as "en" | "ar"]}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {ROLE_DEFINITIONS[form.role].authorities.map((a, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5 text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                            {language === "ar" ? a.ar : a.en}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      {t("generic.cancel")}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
                      {t("generic.save")}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={v => { if (!v) setResetTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              {t("staff.resetPasswordTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("staff.resetPasswordFor")} <span className="font-semibold text-foreground">{resetTarget?.nameEn}</span>.{" "}
              {t("staff.resetPasswordNote")}
            </p>

            <div className="space-y-1.5">
              <Label>{t("login.password")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={resetShowPass ? "text" : "password"}
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    className="pr-9 font-mono"
                    placeholder={t("staff.newPasswordPlaceholder")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setResetShowPass(v => !v)}
                  >
                    {resetShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button" variant="outline" size="icon"
                  title={t("staff.generateNewPassword")}
                  onClick={() => { setResetPassword(generatePassword()); setResetCopied(false); }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button" variant="outline" size="icon"
                  title={t("staff.copyPassword")}
                  onClick={() => {
                    navigator.clipboard.writeText(resetPassword);
                    setResetCopied(true);
                    setTimeout(() => setResetCopied(false), 2000);
                  }}
                >
                  {resetCopied
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("staff.copyPasswordHint")}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setResetTarget(null)}>
                {t("generic.cancel")}
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={updateMutation.isPending || !resetPassword.trim()}
                className="gap-2"
              >
                {updateMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <KeyRound className="h-4 w-4" />}
                {t("staff.resetPasswordButton")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("staff.deleteAccountTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t("staff.deleteAccountConfirm")}{" "}
                <span className="text-destructive">{deleteTarget?.nameEn}</span>{t("staff.deleteAccountConfirmSuffix")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("staff.deleteAccountNote")}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                {t("generic.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="gap-2"
              >
                {deleteMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
                {t("staff.deleteAccountButton")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editTarget} onOpenChange={v => { if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              {t("staff.editProfileTitle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("staff.nameEn")} *</Label>
                <Input required value={editForm.nameEn}
                  onChange={e => setEditForm(p => ({ ...p, nameEn: e.target.value }))}
                  placeholder={t("staff.nameEnPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("staff.nameAr")}</Label>
                <Input dir="rtl" value={editForm.nameAr}
                  onChange={e => setEditForm(p => ({ ...p, nameAr: e.target.value }))}
                  className="font-tajawal" placeholder="مثال: د. أحمد علي" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("generic.role")} *</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v, unitId: "", department: "" }))}>
                  <SelectTrigger><SelectValue placeholder={t("staff.selectRole")} /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-1.5 text-primary font-semibold">🩺 {t("staff.doctorCategory")}</SelectLabel>
                      <SelectItem value="house_officer">{t("staff.houseOfficer")}</SelectItem>
                      <SelectItem value="medical_officer">{t("staff.medicalOfficer")}</SelectItem>
                      <SelectItem value="registrar">{t("staff.registrar")}</SelectItem>
                      <SelectItem value="consultant">{t("staff.consultant")}</SelectItem>
                      <SelectItem value="specialist">{t("staff.specialist")}</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="text-muted-foreground font-semibold">{t("staff.clinicalCategory")}</SelectLabel>
                      <SelectItem value="nurse">{t("staff.nurse")}</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="text-muted-foreground font-semibold">{t("staff.supportCategory")}</SelectLabel>
                      <SelectItem value="pharmacist">{t("staff.pharmacist")}</SelectItem>
                      <SelectItem value="lab_specialist">{t("staff.labSpecialist")}</SelectItem>
                      <SelectItem value="admin">{t("staff.admin")}</SelectItem>
                      <SelectItem value="data_analyser">{t("staff.dataAnalyser")}</SelectItem>
                      <SelectItem value="accounts_manager">{t("staff.accountsManager")}</SelectItem>
                      <SelectItem value="administrative">{t("staff.administrative")}</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        💰 {t("staff.financeCategory")}
                      </SelectLabel>
                      <SelectItem value="billing_officer">{t("staff.billingOfficer")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                {DOCTOR_ROLES.includes(editForm.role) ? (
                  <>
                    <Label>{t("patient.unit")}</Label>
                    <Select value={editForm.unitId} onValueChange={v => setEditForm(p => ({ ...p, unitId: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("units.selectUnit")} /></SelectTrigger>
                      <SelectContent>
                        {units.filter(u => u.status === "active").map(u => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            <span className="font-medium">{u.nameEn}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label>{t("generic.department")} *</Label>
                    <Input required={!DOCTOR_ROLES.includes(editForm.role)} value={editForm.department}
                      onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                      placeholder={t("staff.departmentPlaceholder")} />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("generic.email")}</Label>
                <Input type="email" value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("generic.phone")}</Label>
                <Input type="tel" value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                {t("generic.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
                {t("generic.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <ProfileDialog
        member={profileMember}
        open={!!profileMember}
        onOpenChange={v => { if (!v) setProfileMember(null); }}
        onEdit={() => profileMember && openEdit(profileMember as any)}
        onReset={() => profileMember && openReset(profileMember.id, profileMember.nameEn)}
        onSuspend={() => profileMember && handleCancelAccount(profileMember.id, profileMember.nameEn)}
        onReactivate={() => profileMember && handleReactivateAccount(profileMember.id, profileMember.nameEn)}
        onDelete={() => profileMember && setDeleteTarget({ id: profileMember.id, nameEn: profileMember.nameEn })}
        isFullAdmin={isFullAdmin}
        currentUserId={currentUser?.id}
        units={units as any[]}
        t={t}
        isRtl={isRtl}
        language={language}
        updatePending={updateMutation.isPending}
      />

      {/* KPI Summary Bar */}
      {!isLoading && allStaff.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("staff.totalStaff"), value: allStaff.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: t("staff.active"), value: activeCount, icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/20" },
            { label: t("staff.suspended"), value: inactiveCount, icon: UserX, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/20" },
            { label: t("staff.expiringContracts"), value: expiringMembers.length, icon: CalendarClock, color: expiringMembers.length > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground", bg: expiringMembers.length > 0 ? "bg-red-100 dark:bg-red-900/20" : "bg-muted/50" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Card key={i} className="flex flex-row items-center gap-4 px-4 py-3 shadow-none">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expiring contracts banner */}
      {expiringMembers.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 shadow-none">
          <CardContent className="px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">{t("staff.contractAlertTitle")}</p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                {expiringMembers.map(m => m.nameEn).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Authorities Panel */}
      {showAuthorities && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("staff.roleAuthorities")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("staff.roleCapabilities")}</p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(ROLE_DEFINITIONS).map(([roleKey, def]) => (
                <AccordionItem key={roleKey} value={roleKey}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${def.badgeClass}`}>
                        {def.label[language as "en" | "ar"]}
                      </span>
                      {DOCTOR_ROLES.includes(roleKey) && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                          {t("staff.doctor")}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground font-normal hidden sm:block">
                        {def.description[language as "en" | "ar"]}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 gap-6 pt-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          {t("staff.permissions")}
                        </p>
                        <ul className="space-y-1.5">
                          {def.authorities.map((auth, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{language === "ar" ? auth.ar : auth.en}</span>
                            </li>
                          ))}
                        </ul>
                        {roleKey === "house_officer" && (
                          <div className="mt-3 flex items-start gap-2 text-sm text-orange-700 dark:text-orange-400">
                            <CalendarClock className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{t("staff.houseOfficerInfo")}</span>
                          </div>
                        )}
                        {roleKey === "medical_officer" && (
                          <div className="mt-3 flex items-start gap-2 text-sm text-teal-700 dark:text-teal-400">
                            <Infinity className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{t("staff.medicalOfficerInfo")}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          {t("staff.allowedModules")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {def.allowedNav === "all" ? (
                            <Badge className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {t("staff.allModules")}
                            </Badge>
                          ) : (
                            def.allowedNav.map(nav => (
                              <Badge key={nav} variant="outline">
                                {nav.replace("/", "").charAt(0).toUpperCase() + nav.slice(2)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Staff Directory */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="shrink-0">{t("staff.directory")}</CardTitle>
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("staff.searchPlaceholder")}
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Role-category filter pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(["all", "doctors", "clinical", "support", "finance", "admin"] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setRoleFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  roleFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                }`}
              >
                {t(`staff.cat_${cat}`)}
                {cat !== "all" && ` (${(ROLE_CATEGORIES[cat] ?? []).reduce((n, r) => n + allStaff.filter(m => m.role === r).length, 0)})`}
                {cat === "all" && ` (${allStaff.length})`}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t("generic.name")}</TableHead>
                <TableHead>{t("generic.role")}</TableHead>
                <TableHead>{t("generic.department")}</TableHead>
                <TableHead>{t("staff.contact")}</TableHead>
                <TableHead>{t("staff.contract")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className="text-right">{t("staff.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((member) => {
                  const roleDef = ROLE_DEFINITIONS[member.role];
                  const expiryStatus = getExpiryStatus(member.role, member.accountExpiryDate);
                  const isExpired = expiryStatus === "expired";
                  const isActive = member.status === "active";
                  const displayName = isRtl && member.nameAr ? member.nameAr : member.nameEn;
                  return (
                    <TableRow
                      key={member.id}
                      className={`cursor-pointer hover:bg-muted/40 ${(!isActive || isExpired) ? "opacity-60" : ""}`}
                      onClick={() => setProfileMember(member)}
                    >
                      {/* Avatar */}
                      <TableCell onClick={e => e.stopPropagation()} className="pr-0">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(member.nameEn)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                          {staffInitials(member.nameEn)}
                        </div>
                      </TableCell>
                      {/* Name */}
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{displayName}</span>
                            {isExpired && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t("staff.expired")}</Badge>
                            )}
                            {!isActive && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200">
                                {t("staff.suspended")}
                              </Badge>
                            )}
                          </div>
                          {member.username && (
                            <p className="text-[11px] font-mono text-muted-foreground">@{member.username}</p>
                          )}
                        </div>
                      </TableCell>
                      {/* Role */}
                      <TableCell>
                        {roleDef ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleDef.badgeClass}`}>
                            {roleDef.label[language as "en" | "ar"]}
                          </span>
                        ) : (
                          <span className="capitalize text-xs">{member.role}</span>
                        )}
                      </TableCell>
                      {/* Department */}
                      <TableCell className="text-sm text-muted-foreground">{member.department || "—"}</TableCell>
                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-0.5">
                          {member.email ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[130px]">{member.email}</span>
                            </div>
                          ) : null}
                          {member.phone ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{member.phone}</span>
                            </div>
                          ) : null}
                          {!member.email && !member.phone && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      {/* Contract */}
                      <TableCell>
                        <ExpiryBadge role={member.role} expiryDate={member.accountExpiryDate} t={t} language={language} />
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? t("staff.active") : t("staff.inactive")}
                        </Badge>
                      </TableCell>
                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground"
                            onClick={() => setProfileMember(member)}>
                            <ChevronRight className="h-3.5 w-3.5" />
                            {t("staff.view")}
                          </Button>
                          {isFullAdmin && (
                            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => openEdit(member as any)}>
                              <Pencil className="h-3.5 w-3.5" />
                              {t("staff.edit")}
                            </Button>
                          )}
                          {currentUser?.id !== member.id && member.role !== "super_admin" && (
                            <Button size="sm" variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
                              onClick={() => setDeleteTarget({ id: member.id, nameEn: member.nameEn })}>
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("staff.deleteAction")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {search || roleFilter !== "all" ? t("staff.noResults") : t("staff.noStaff")}
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
