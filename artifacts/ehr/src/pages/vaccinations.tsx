import { useState } from "react";
import { useListVaccinations, useRecordVaccination, getListVaccinationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Vaccinations() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: vaccinations, isLoading } = useListVaccinations({});
  const createMutation = useRecordVaccination();

  const [form, setForm] = useState({ patientId: "", vaccineName: "", doseNumber: "", administeredDate: "", nextDueDate: "", batchNumber: "", notes: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), vaccineName: form.vaccineName, doseNumber: form.doseNumber ? Number(form.doseNumber) : undefined, administeredDate: form.administeredDate, nextDueDate: form.nextDueDate || undefined, batchNumber: form.batchNumber || undefined, notes: form.notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVaccinationsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", vaccineName: "", doseNumber: "", administeredDate: "", nextDueDate: "", batchNumber: "", notes: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.vaccinations")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("vacc.newRecord")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("vacc.newRecord")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("generic.patientId")} *</Label>
                <Input name="patientId" type="number" required value={form.patientId} onChange={handleChange} placeholder="e.g. 1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("vacc.vaccineName")} *</Label>
                  <Input name="vaccineName" required value={form.vaccineName} onChange={handleChange} placeholder="e.g. MMR" />
                </div>
                <div className="space-y-2">
                  <Label>{t("vacc.doseNumber")}</Label>
                  <Input name="doseNumber" type="number" min="1" value={form.doseNumber} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("vacc.administeredDate")} *</Label>
                  <Input name="administeredDate" type="date" required value={form.administeredDate} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t("vacc.nextDueDate")}</Label>
                  <Input name="nextDueDate" type="date" value={form.nextDueDate} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("vacc.batchNumber")}</Label>
                <Input name="batchNumber" value={form.batchNumber} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>{t("generic.notes")}</Label>
                <Textarea name="notes" value={form.notes} onChange={handleChange} className="min-h-[60px]" />
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
        <CardHeader><CardTitle>{t("vacc.registry")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.patientId")}</TableHead>
                <TableHead>{t("vacc.vaccine")}</TableHead>
                <TableHead>{t("vacc.dose")}</TableHead>
                <TableHead>{t("vacc.given")}</TableHead>
                <TableHead>{t("vacc.nextDue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : vaccinations && vaccinations.length > 0 ? (
                vaccinations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.patientId}</TableCell>
                    <TableCell className="font-medium">{v.vaccineName}</TableCell>
                    <TableCell>{v.doseNumber ?? '-'}</TableCell>
                    <TableCell>{v.administeredDate}</TableCell>
                    <TableCell className="text-muted-foreground">{v.nextDueDate ?? '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("vacc.noRecords")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
