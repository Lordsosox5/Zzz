import { useState } from "react";
import { useLocation } from "wouter";
import { useListPrescriptions, useCreatePrescription, useUpdatePrescription, getListPrescriptionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canPrescribe, canDispensePrescription } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientSearchCombobox } from "@/components/patient-search-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save, PackageCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Prescriptions() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const user = getUser();
  const canWrite = canPrescribe(user?.role ?? "");
  const canDispense = canDispensePrescription(user?.role ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const { data: prescriptions, isLoading } = useListPrescriptions({});
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription();

  const [form, setForm] = useState({ patientId: "", patientName: "", drugName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.selectPatient") });
      return;
    }
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), drugName: form.drugName, dosage: form.dosage, frequency: form.frequency, duration: form.duration || undefined, route: form.route || undefined, instructions: form.instructions || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", patientName: "", drugName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.prescriptions")}</h1>
        {canWrite && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("rx.newPrescription")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("rx.newPrescription")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-3">
                <Label>{t("generic.patient")} *</Label>
                <PatientSearchCombobox
                  value={form.patientId}
                  onChange={(id, name) => setForm(p => ({ ...p, patientId: id, patientName: name }))}
                />
              </div>
              <div className="space-y-3">
                <Label>{t("rx.drugName")} *</Label>
                <Input name="drugName" required value={form.drugName} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("rx.dosage")} *</Label>
                  <Input name="dosage" required value={form.dosage} onChange={handleChange} placeholder="e.g. 250mg" />
                </div>
                <div className="space-y-3">
                  <Label>{t("rx.frequency")} *</Label>
                  <Input name="frequency" required value={form.frequency} onChange={handleChange} placeholder="e.g. 3x daily" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("rx.duration")}</Label>
                  <Input name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 7 days" />
                </div>
                <div className="space-y-3">
                  <Label>{t("rx.route")}</Label>
                  <Input name="route" value={form.route} onChange={handleChange} placeholder="e.g. oral" />
                </div>
              </div>
              <div className="space-y-3">
                <Label>{t("rx.instructions")}</Label>
                <Textarea name="instructions" value={form.instructions} onChange={handleChange} className="min-h-[80px]" />
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
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>{t("rx.activePrescriptions")}</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("generic.patient")}</TableHead>
                <TableHead>{t("rx.drug")}</TableHead>
                <TableHead>{t("rx.dosage")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : prescriptions && prescriptions.length > 0 ? (
                prescriptions.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/patients/${rx.patientId}`)}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {rx.patientName ?? rx.patientId}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{rx.drugName}</TableCell>
                    <TableCell>{rx.dosage} - {rx.frequency}</TableCell>
                    <TableCell>
                      <Badge variant={rx.status === 'active' ? 'default' : rx.status === 'dispensed' ? 'secondary' : 'outline'} className="capitalize">
                        {rx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`${isRtl ? "text-left" : "text-right"} space-x-1`}>
                      {canDispense && rx.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate(
                              { id: rx.id, data: { status: "dispensed" } },
                              {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
                                  toast({ title: t("generic.success"), description: t("rx.dispensed") });
                                },
                                onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
                              }
                            )
                          }
                        >
                          <PackageCheck className="h-3 w-3" /> {t("rx.dispense")}
                        </Button>
                      )}
                      {canWrite && <Button variant="ghost" size="sm">{t("generic.edit")}</Button>}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("rx.noActive")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
