import { useState } from "react";
import { useListStaff, useCreateStaff, getListStaffQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Staff() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("staff.newMember")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("staff.newMember")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("staff.nameEn")} *</Label>
                  <Input name="nameEn" required value={form.nameEn} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("staff.nameAr")}</Label>
                  <Input name="nameAr" dir="rtl" value={form.nameAr} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("generic.role")} *</Label>
                  <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("staff.selectRole")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">{t("staff.consultant")}</SelectItem>
                      <SelectItem value="specialist">{t("staff.specialist")}</SelectItem>
                      <SelectItem value="nurse">{t("staff.nurse")}</SelectItem>
                      <SelectItem value="pharmacist">{t("staff.pharmacist")}</SelectItem>
                      <SelectItem value="admin">{t("staff.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("generic.department")} *</Label>
                  <Input name="department" required value={form.department} onChange={handleChange} placeholder="e.g. Pediatrics" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("generic.email")}</Label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("generic.phone")}</Label>
                  <Input name="phone" type="tel" value={form.phone} onChange={handleChange} />
                </div>
              </div>
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
                staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div>{isRtl && member.nameAr ? member.nameAr : member.nameEn}</div>
                    </TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell>{member.department}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{member.email ?? '-'}</TableCell>
                    <TableCell><Badge variant={member.status === 'active' ? 'default' : 'secondary'}>{member.status}</Badge></TableCell>
                  </TableRow>
                ))
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
