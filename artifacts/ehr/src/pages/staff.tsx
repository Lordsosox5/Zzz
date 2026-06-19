import { useState } from "react";
import {
  useListStaff, useCreateStaff, useUpdateStaff,
  useListUnits, getListStaffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { ROLE_DEFINITIONS } from "@/lib/permissions";
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
  Infinity, AlertTriangle, RefreshCw, Copy, Eye, EyeOff, UserX, KeyRound, Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────
const DOCTOR_ROLES = ["house_officer", "medical_officer", "registrar", "consultant", "specialist"];

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
          Account created — save these credentials
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs w-20 shrink-0 text-muted-foreground">Username</Label>
          <code className="flex-1 text-xs bg-white dark:bg-black/20 border rounded px-2 py-1 font-mono">
            {username}
          </code>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0"
            onClick={() => copy(username, "user")}>
            {copied === "user" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-20 shrink-0 text-muted-foreground">Password</Label>
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
        Done
      </Button>
    </div>
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

  // Edit staff dialog
  const [editTarget, setEditTarget] = useState<{ id: number } | null>(null);
  const [editForm, setEditForm] = useState({
    nameEn: "", nameAr: "", role: "", department: "", unitId: "", email: "", phone: "",
  });

  const openEdit = (member: NonNullable<typeof staff>[number]) => {
    setEditForm({
      nameEn: member.nameEn ?? "",
      nameAr: member.nameAr ?? "",
      role: member.role ?? "",
      department: member.department ?? "",
      unitId: "",
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
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: "Staff updated", description: `${editForm.nameEn} has been updated.` });
          setEditTarget(null);
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: "Failed to update staff member." }),
      }
    );
  };

  const { data: staff, isLoading } = useListStaff({});
  const { data: units = [] } = useListUnits();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

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
          toast({ title: "Password reset", description: `New password set for ${resetTarget.nameEn}.` });
          setResetTarget(null);
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: "Failed to reset password." }),
      }
    );
  };

  const handleCancelAccount = (id: number, nameEn: string) => {
    updateMutation.mutate(
      { id, data: { status: "inactive" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: "Account cancelled", description: `${nameEn}'s account has been deactivated.` });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: "Failed to cancel account." }),
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
                      <Input name="nameEn" required value={form.nameEn} onChange={handleChange} placeholder="e.g. Dr. Ahmed Ali" />
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
                        placeholder="e.g. dr.ahmed"
                        className="font-mono pr-24"
                      />
                      {!usernameTouched && form.username && (
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground pointer-events-none">
                          auto-suggested
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used to sign in. Auto-filled from the name — edit freely.
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
                                <span className="text-xs text-muted-foreground block">3-month contract</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="medical_officer">
                              <div>
                                <span className="font-medium">{t("staff.medicalOfficer")}</span>
                                <span className="text-xs text-muted-foreground block">Until departure</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="registrar">
                              <div>
                                <span className="font-medium">Registrar</span>
                                <span className="text-xs text-muted-foreground block">Specialist in training</span>
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
                            onChange={handleChange} placeholder="e.g. Pediatrics" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contract info boxes */}
                  {isHouseOfficer && previewExpiry && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">3-Month Contract</p>
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
                        <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Permanent Contract</p>
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
                          placeholder="Set account password"
                          className="pr-9 font-mono"
                        />
                        <button type="button"
                          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPass(v => !v)}>
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button type="button" variant="outline" size="icon"
                        title="Generate password"
                        onClick={() => setForm(p => ({ ...p, password: generatePassword() }))}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click <RefreshCw className="inline h-3 w-3" /> to auto-generate a secure password.
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
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Setting a new password for <span className="font-semibold text-foreground">{resetTarget?.nameEn}</span>.
              The current password will be replaced immediately.
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
                    placeholder="New password"
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
                  title="Generate new password"
                  onClick={() => { setResetPassword(generatePassword()); setResetCopied(false); }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button" variant="outline" size="icon"
                  title="Copy password"
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
                Copy the password before saving — it won't be shown again.
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
                Reset Password
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
              Edit Staff Profile
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("staff.nameEn")} *</Label>
                <Input required value={editForm.nameEn}
                  onChange={e => setEditForm(p => ({ ...p, nameEn: e.target.value }))}
                  placeholder="e.g. Dr. Ahmed Ali" />
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
                      <SelectItem value="registrar">Registrar</SelectItem>
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
                      placeholder="e.g. Pediatrics" />
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
                              <CheckCircle2 className="h-3 w-3" /> All Modules
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
        <CardHeader>
          <CardTitle>{t("staff.directory")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.name")}</TableHead>
                <TableHead>{t("generic.role")}</TableHead>
                <TableHead>{t("generic.department")}</TableHead>
                <TableHead>{t("generic.email")}</TableHead>
                <TableHead>{t("staff.contract")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : staff && staff.length > 0 ? (
                staff.map((member) => {
                  const roleDef = ROLE_DEFINITIONS[member.role];
                  const expiryStatus = getExpiryStatus(member.role, member.accountExpiryDate);
                  const isExpired = expiryStatus === "expired";
                  const isActive = member.status === "active";
                  return (
                    <TableRow key={member.id} className={(!isActive || isExpired) ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{isRtl && member.nameAr ? member.nameAr : member.nameEn}</span>
                          {isExpired && (
                            <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                              {t("staff.expired")}
                            </Badge>
                          )}
                          {!isActive && !isExpired && (
                            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                              Cancelled
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {roleDef ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleDef.badgeClass}`}>
                              {roleDef.label[language as "en" | "ar"]}
                            </span>
                          ) : (
                            <span className="capitalize text-xs">{member.role}</span>
                          )}
                          {DOCTOR_ROLES.includes(member.role) && (
                            <div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                                {t("staff.doctor")}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{member.department}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ExpiryBadge
                          role={member.role}
                          expiryDate={member.accountExpiryDate}
                          t={t}
                          language={language}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-xs"
                            onClick={() => openEdit(member)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
                              disabled={updateMutation.isPending}
                              onClick={() => handleCancelAccount(member.id, member.nameEn)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Cancel Account
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t("staff.noStaff")}
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
