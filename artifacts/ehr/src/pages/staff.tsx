import { useState } from "react";
import { useListStaff, useCreateStaff, getListStaffQueryKey } from "@workspace/api-client-react";
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
import { Plus, Loader2, Save, CheckCircle2, ShieldCheck, CalendarClock, Infinity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Staff() {
  const { t, isRtl, language } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthorities, setShowAuthorities] = useState(false);
  const { data: staff, isLoading } = useListStaff({});
  const createMutation = useCreateStaff();

  const [form, setForm] = useState({
    nameEn: "", nameAr: "", role: "nurse", department: "", email: "", phone: "",
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const isHouseOfficer = form.role === "house_officer";
  const isMedicalOfficer = form.role === "medical_officer";
  const previewExpiry = isHouseOfficer ? addDays(90) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        data: {
          nameEn: form.nameEn,
          nameAr: form.nameAr || undefined,
          role: form.role,
          department: form.department,
          email: form.email || undefined,
          phone: form.phone || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ nameEn: "", nameAr: "", role: "nurse", department: "", email: "", phone: "" });
        },
        onError: () =>
          toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
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

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
                {t("staff.newMember")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("staff.newMember")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t("staff.nameEn")} *</Label>
                    <Input name="nameEn" required value={form.nameEn} onChange={handleChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("staff.nameAr")}</Label>
                    <Input name="nameAr" dir="rtl" value={form.nameAr} onChange={handleChange}
                      className="font-tajawal" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t("generic.role")} *</Label>
                    <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("staff.selectRole")} />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Doctor group */}
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
                        </SelectGroup>
                        <SelectSeparator />
                        {/* Clinical group */}
                        <SelectGroup>
                          <SelectLabel className="text-muted-foreground font-semibold">
                            {t("staff.clinicalCategory")}
                          </SelectLabel>
                          <SelectItem value="consultant">{t("staff.consultant")}</SelectItem>
                          <SelectItem value="specialist">{t("staff.specialist")}</SelectItem>
                          <SelectItem value="nurse">{t("staff.nurse")}</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        {/* Support group */}
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
                  <div className="space-y-1.5">
                    <Label>{t("generic.department")} *</Label>
                    <Input name="department" required value={form.department} onChange={handleChange}
                      placeholder="e.g. Pediatrics" />
                  </div>
                </div>

                {/* Contract info box */}
                {isHouseOfficer && previewExpiry && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                      <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                        3-Month Contract
                      </p>
                    </div>
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      {t("staff.autoExpiryNote")} <strong>{formatDate(previewExpiry, language)}</strong>
                    </p>
                    <p className="text-xs text-orange-600/80 dark:text-orange-500">
                      {t("staff.houseOfficerInfo")}
                    </p>
                  </div>
                )}
                {isMedicalOfficer && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Infinity className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                        Permanent Contract
                      </p>
                    </div>
                    <p className="text-xs text-teal-700 dark:text-teal-400">
                      {t("staff.medicalOfficerInfo")}
                    </p>
                  </div>
                )}

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

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                      {(roleKey === "house_officer" || roleKey === "medical_officer") && (
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
                        {/* Contract info for doctor sub-roles */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : staff && staff.length > 0 ? (
                staff.map((member) => {
                  const roleDef = ROLE_DEFINITIONS[member.role];
                  const expiryStatus = getExpiryStatus(member.role, member.accountExpiryDate);
                  const isExpired = expiryStatus === "expired";
                  return (
                    <TableRow key={member.id} className={isExpired ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{isRtl && member.nameAr ? member.nameAr : member.nameEn}</span>
                          {isExpired && (
                            <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                              {t("staff.expired")}
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
                          {(member.role === "house_officer" || member.role === "medical_officer") && (
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
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
