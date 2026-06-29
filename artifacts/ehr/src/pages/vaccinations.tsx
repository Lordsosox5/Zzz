import { useState } from "react";
import {
  useListVaccinations,
  useRecordVaccination,
  getListVaccinationsQueryKey,
  useListUnits,
  useListPatients,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Vaccinations() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { data: vaccinations, isLoading } = useListVaccinations({});
  const createMutation = useRecordVaccination();

  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const { data: units } = useListUnits();
  const { data: patientsData } = useListPatients({ limit: 500 });
  const allPatients = patientsData?.patients ?? [];
  const unitPatients = selectedUnitId
    ? allPatients.filter((p) => p.unitId === Number(selectedUnitId))
    : [];

  const [form, setForm] = useState({
    patientId: "",
    vaccineName: "",
    doseNumber: "",
    administeredDate: "",
    nextDueDate: "",
    batchNumber: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setSelectedUnitId("");
    setForm({
      patientId: "",
      vaccineName: "",
      doseNumber: "",
      administeredDate: "",
      nextDueDate: "",
      batchNumber: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("appt.selectPatient") });
      return;
    }
    createMutation.mutate(
      {
        data: {
          patientId: Number(form.patientId),
          vaccineName: form.vaccineName,
          doseNumber: form.doseNumber ? Number(form.doseNumber) : undefined,
          administeredDate: form.administeredDate,
          nextDueDate: form.nextDueDate || undefined,
          batchNumber: form.batchNumber || undefined,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVaccinationsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          resetForm();
        },
        onError: () =>
          toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const selectedPatient = allPatients.find((p) => String(p.id) === form.patientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.vaccinations")}</h1>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
              {t("vacc.newRecord")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("vacc.newRecord")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Step 1: Unit */}
              <div className="space-y-3">
                <Label>{t("appt.filterByUnit")} *</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={(v) => {
                    setSelectedUnitId(v);
                    setForm((p) => ({ ...p, patientId: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("appt.selectUnit")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-52 overflow-y-auto">
                    {(units ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {isRtl && u.nameAr ? u.nameAr : u.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Patient */}
              <div className="space-y-3">
                <Label>{t("generic.patient")} *</Label>
                <Select
                  value={form.patientId}
                  onValueChange={(v) => setForm((p) => ({ ...p, patientId: v }))}
                  disabled={!selectedUnitId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedUnitId ? t("appt.selectPatient") : t("appt.selectUnit")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {unitPatients.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {t("appt.noPatients")}
                      </div>
                    ) : (
                      unitPatients.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {p.mrn}
                          </span>
                          {isRtl && p.nameAr ? p.nameAr : p.nameEn}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected patient info chip */}
              {selectedPatient && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selectedPatient.mrn}</span>
                  <span className="font-medium">
                    {isRtl && selectedPatient.nameAr ? selectedPatient.nameAr : selectedPatient.nameEn}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("vacc.vaccineName")} *</Label>
                  <Input
                    name="vaccineName"
                    required
                    value={form.vaccineName}
                    onChange={handleChange}
                    placeholder="e.g. MMR"
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t("vacc.doseNumber")}</Label>
                  <Input
                    name="doseNumber"
                    type="number"
                    min="1"
                    value={form.doseNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("vacc.administeredDate")} *</Label>
                  <Input
                    name="administeredDate"
                    type="date"
                    required
                    value={form.administeredDate}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t("vacc.nextDueDate")}</Label>
                  <Input
                    name="nextDueDate"
                    type="date"
                    value={form.nextDueDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>{t("vacc.batchNumber")}</Label>
                <Input name="batchNumber" value={form.batchNumber} onChange={handleChange} />
              </div>
              <div className="space-y-3">
                <Label>{t("generic.notes")}</Label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  {t("generic.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
                  )}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("vacc.registry")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
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
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : vaccinations && vaccinations.length > 0 ? (
                vaccinations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <button
                        className="font-mono text-primary hover:underline transition-colors"
                        onClick={() => navigate(`/patients/${v.patientId}`)}
                      >
                        {v.patientId}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{v.vaccineName}</TableCell>
                    <TableCell>{v.doseNumber ?? "-"}</TableCell>
                    <TableCell>{v.administeredDate}</TableCell>
                    <TableCell className="text-muted-foreground">{v.nextDueDate ?? "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t("vacc.noRecords")}
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
