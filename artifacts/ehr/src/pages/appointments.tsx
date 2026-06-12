import { useState } from "react";
import { useListAppointments, useCreateAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Appointments() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isOpen, setIsOpen] = useState(false);

  const { data: appointments, isLoading } = useListAppointments({ date });
  const createMutation = useCreateAppointment();

  const [form, setForm] = useState({
    patientId: "",
    doctorId: String(user?.id ?? "1"),
    scheduledAt: "",
    type: "consultation",
    chiefComplaint: "",
    notes: "",
    duration: "30",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), doctorId: Number(form.doctorId), scheduledAt: form.scheduledAt, type: form.type, chiefComplaint: form.chiefComplaint || undefined, notes: form.notes || undefined, duration: Number(form.duration) || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", doctorId: String(user?.id ?? "1"), scheduledAt: "", type: "consultation", chiefComplaint: "", notes: "", duration: "30" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.appointments")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("appt.newAppointment")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("appt.newAppointment")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("generic.patientId")} *</Label>
                  <Input name="patientId" type="number" required value={form.patientId} onChange={handleChange} placeholder="e.g. 1" />
                </div>
                <div className="space-y-2">
                  <Label>{t("appt.doctorId")} *</Label>
                  <Input name="doctorId" type="number" required value={form.doctorId} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("appt.dateTime")} *</Label>
                  <Input name="scheduledAt" type="datetime-local" required value={form.scheduledAt} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("appt.duration")}</Label>
                  <Input name="duration" type="number" value={form.duration} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("generic.type")} *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("appt.selectType")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">{t("appt.consultation")}</SelectItem>
                    <SelectItem value="follow-up">{t("appt.followUp")}</SelectItem>
                    <SelectItem value="emergency">{t("appt.emergency")}</SelectItem>
                    <SelectItem value="check-up">{t("appt.checkup")}</SelectItem>
                    <SelectItem value="procedure">{t("appt.procedure")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("appt.chiefComplaint")}</Label>
                <Input name="chiefComplaint" value={form.chiefComplaint} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>{t("generic.notes")}</Label>
                <Textarea name="notes" value={form.notes} onChange={handleChange} className="min-h-[80px]" />
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
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg">{t("appt.schedule")}</CardTitle>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1 bg-transparent" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("appt.time")}</TableHead>
                <TableHead>{t("generic.patient")}</TableHead>
                <TableHead>{t("generic.doctor")}</TableHead>
                <TableHead>{t("generic.type")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : appointments && appointments.length > 0 ? (
                appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">{new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{appt.patientName}</TableCell>
                    <TableCell>Dr. {appt.doctorName}</TableCell>
                    <TableCell>{appt.type}</TableCell>
                    <TableCell><Badge variant="outline">{appt.status}</Badge></TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}><Button variant="ghost" size="sm">{t("generic.edit")}</Button></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("appt.noAppts")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
