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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Loader2, Save, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { value: "consultant", labelKey: "staff.consultant" },
  { value: "specialist", labelKey: "staff.specialist" },
  { value: "nurse", labelKey: "staff.nurse" },
  { value: "pharmacist", labelKey: "staff.pharmacist" },
  { value: "lab_specialist", labelKey: "staff.labSpecialist" },
  { value: "admin", labelKey: "staff.admin" },
];

export default function Staff() {
  const { t, isRtl, language } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthorities, setShowAuthorities] = useState(false);
  const { data: staff, isLoading } = useListStaff({});
  const createMutation = useCreateStaff();

  const [form, setForm] = useState({ nameEn: "", nameAr: "", role: "nurse", department: "", email: "", phone: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { nameEn: form.nameEn, nameAr: form.nameAr || undefined, role: form.role, department: form.department, email: form.email || undefined, phone: form.phone || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ nameEn: "", nameAr: "", role: "nurse", department: "", email: "", phone: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.staff")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAuthorities(v => !v)}>
            <ShieldCheck className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
            {t("staff.roleAuthorities")}
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("staff.newMember")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t("staff.newMember")}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label>{t("staff.nameEn")} *</Label>
                    <Input name="nameEn" required value={form.nameEn} onChange={handleChange} />
                  </div>
                  <div className="space-y-3">
                    <Label>{t("staff.nameAr")}</Label>
                    <Input name="nameAr" dir="rtl" value={form.nameAr} onChange={handleChange} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label>{t("generic.role")} *</Label>
                    <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("staff.selectRole")} /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label>{t("generic.department")} *</Label>
                    <Input name="department" required value={form.department} onChange={handleChange} placeholder="e.g. Pediatrics" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label>{t("generic.email")}</Label>
                    <Input name="email" type="email" value={form.email} onChange={handleChange} />
                  </div>
                  <div className="space-y-3">
                    <Label>{t("generic.phone")}</Label>
                    <Input name="phone" type="tel" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                {/* Show authorities preview for selected role */}
                {form.role && ROLE_DEFINITIONS[form.role] && (
                  <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("staff.permissions")}</p>
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
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
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
            <Accordion type="single" collapsible className="w-full" defaultValue="lab_specialist">
              {Object.entries(ROLE_DEFINITIONS).map(([roleKey, def]) => (
                <AccordionItem key={roleKey} value={roleKey}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${def.badgeClass}`}>
                        {def.label[language as "en" | "ar"]}
                      </span>
                      <span className="text-sm text-muted-foreground font-normal hidden sm:block">
                        {def.description[language as "en" | "ar"]}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 gap-6 pt-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("staff.permissions")}</p>
                        <ul className="space-y-1.5">
                          {def.authorities.map((auth, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{language === "ar" ? auth.ar : auth.en}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("staff.allowedModules")}</p>
                        <div className="flex flex-wrap gap-2">
                          {def.allowedNav === "all" ? (
                            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> All Modules</Badge>
                          ) : (
                            def.allowedNav.map(nav => (
                              <Badge key={nav} variant="outline">{nav.replace('/', '').charAt(0).toUpperCase() + nav.slice(2)}</Badge>
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
        <CardHeader><CardTitle>{t("staff.directory")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.name")}</TableHead>
                <TableHead>{t("generic.role")}</TableHead>
                <TableHead>{t("generic.department")}</TableHead>
                <TableHead>{t("generic.email")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : staff && staff.length > 0 ? (
                staff.map((member) => {
                  const roleDef = ROLE_DEFINITIONS[member.role];
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {isRtl && member.nameAr ? member.nameAr : member.nameEn}
                      </TableCell>
                      <TableCell>
                        {roleDef ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleDef.badgeClass}`}>
                            {roleDef.label[language as "en" | "ar"]}
                          </span>
                        ) : (
                          <span className="capitalize">{member.role}</span>
                        )}
                      </TableCell>
                      <TableCell>{member.department}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{member.email ?? '-'}</TableCell>
                      <TableCell><Badge variant={member.status === 'active' ? 'default' : 'secondary'}>{member.status}</Badge></TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("staff.noStaff")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
