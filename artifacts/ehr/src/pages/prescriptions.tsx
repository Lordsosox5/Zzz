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
import { DrugPicker } from "@/components/drug-picker";
import { DrugNameCombobox } from "@/components/drug-name-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Save, PackageCheck, Pencil, Baby, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type DrugReference, DRUG_REFERENCE } from "@/lib/drug-reference";
import type { HospitalDrug } from "@/lib/drug-reference";

type Prescription = {
  id: number;
  patientId: number;
  patientName?: string | null;
  drugName: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  route?: string | null;
  instructions?: string | null;
  status: string;
  createdAt: string;
};

const emptyForm = { patientId: "", patientName: "", drugName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" };

export default function Prescriptions() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const user = getUser();
  const canWrite = canPrescribe(user?.role ?? "");
  const canDispense = canDispensePrescription(user?.role ?? "");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRx, setEditRx] = useState<Prescription | null>(null);
  const [editForm, setEditForm] = useState({ drugName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "", status: "" });
  const [selectedDrugRef, setSelectedDrugRef] = useState<DrugReference | null>(null);

  const { data: prescriptions, isLoading } = useListPrescriptions({});
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription();

  const [form, setForm] = useState(emptyForm);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleDrugSelect = (drug: DrugReference) => {
    setSelectedDrugRef(drug);
    setForm(p => ({
      ...p,
      drugName: drug.name,
      dosage: drug.pediatricDose,
      frequency: drug.frequency,
      route: drug.route,
    }));
  };

  const handleComboboxSelect = (name: string, hospitalDrug?: HospitalDrug) => {
    setForm(p => ({ ...p, drugName: name }));
    if (hospitalDrug?.refKey) {
      const ref = DRUG_REFERENCE.find(d => d.name === hospitalDrug.refKey);
      if (ref) {
        setSelectedDrugRef(ref);
        setForm(p => ({
          ...p,
          drugName: name,
          dosage: ref.pediatricDose,
          frequency: ref.frequency,
          route: ref.route,
        }));
      } else {
        setSelectedDrugRef(null);
      }
    } else {
      setSelectedDrugRef(null);
    }
  };

  const applyNeonatalDose = () => {
    if (!selectedDrugRef) return;
    setForm(p => ({ ...p, dosage: selectedDrugRef.neonatalDose }));
  };

  const applyPediatricDose = () => {
    if (!selectedDrugRef) return;
    setForm(p => ({ ...p, dosage: selectedDrugRef.pediatricDose }));
  };

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
          setIsCreateOpen(false);
          setForm(emptyForm);
          setSelectedDrugRef(null);
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const openEdit = (rx: Prescription) => {
    setEditRx(rx);
    setEditForm({
      drugName: rx.drugName,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration ?? "",
      route: rx.route ?? "",
      instructions: rx.instructions ?? "",
      status: rx.status,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRx) return;
    updateMutation.mutate(
      {
        id: editRx.id,
        data: {
          drugName: editForm.drugName,
          dosage: editForm.dosage,
          frequency: editForm.frequency,
          duration: editForm.duration || undefined,
          route: editForm.route || undefined,
          instructions: editForm.instructions || undefined,
          status: editForm.status as "active" | "dispensed" | "cancelled",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.updateSuccess") ?? "Updated successfully" });
          setEditRx(null);
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
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setForm(emptyForm); setSelectedDrugRef(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("rx.newPrescription")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t("rx.newPrescription")}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Patient */}
                <div className="space-y-2">
                  <Label>{t("generic.patient")} *</Label>
                  <PatientSearchCombobox value={form.patientId} onChange={(id, name) => setForm(p => ({ ...p, patientId: id, patientName: name }))} />
                </div>

                {/* Drug Picker */}
                <div className="space-y-2">
                  <Label>{isRtl ? "مرجع الأدوية" : "Drug Reference"}</Label>
                  <DrugPicker onSelect={handleDrugSelect} />
                </div>

                {/* Selected drug dose reference card */}
                {selectedDrugRef && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{selectedDrugRef.name}</span>
                      <span className="text-muted-foreground">{selectedDrugRef.nameAr}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={applyPediatricDose}
                        className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700 p-2 text-left hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                      >
                        <div className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300 mb-0.5">
                          <Stethoscope className="h-3 w-3" />
                          <span>{isRtl ? "جرعة الأطفال" : "Pediatric Dose"}</span>
                        </div>
                        <p className="text-blue-900 dark:text-blue-200 leading-relaxed line-clamp-3">{selectedDrugRef.pediatricDose}</p>
                        <p className="mt-1 text-[10px] text-blue-600 dark:text-blue-400">{isRtl ? "اضغط لتطبيق" : "Click to apply"}</p>
                      </button>
                      <button
                        type="button"
                        onClick={applyNeonatalDose}
                        className="rounded-md border border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-700 p-2 text-left hover:bg-violet-100 dark:hover:bg-violet-950/70 transition-colors"
                      >
                        <div className="flex items-center gap-1 font-semibold text-violet-800 dark:text-violet-300 mb-0.5">
                          <Baby className="h-3 w-3" />
                          <span>{isRtl ? "جرعة حديثي الولادة" : "Neonatal Dose"}</span>
                        </div>
                        <p className="text-violet-900 dark:text-violet-200 leading-relaxed line-clamp-3">{selectedDrugRef.neonatalDose}</p>
                        <p className="mt-1 text-[10px] text-violet-600 dark:text-violet-400">{isRtl ? "اضغط لتطبيق" : "Click to apply"}</p>
                      </button>
                    </div>
                    {selectedDrugRef.notes && (
                      <p className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded px-2 py-1.5">
                        ⚠️ {selectedDrugRef.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Drug Name — searchable combobox */}
                <div className="space-y-2">
                  <Label>{t("rx.drugName")} *</Label>
                  <DrugNameCombobox
                    value={form.drugName}
                    onChange={handleComboboxSelect}
                    required
                    placeholder={isRtl ? "ابحث باسم الدواء…" : "Search drug name…"}
                  />
                </div>

                {/* Dosage + Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("rx.dosage")} *</Label>
                    <Textarea name="dosage" required value={form.dosage} onChange={handleChange} placeholder="e.g. 250mg" className="min-h-[72px] text-xs resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("rx.frequency")} *</Label>
                    <Input name="frequency" required value={form.frequency} onChange={handleChange} placeholder="e.g. q8h" />
                  </div>
                </div>

                {/* Duration + Route */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("rx.duration")}</Label>
                    <Input name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 7 days" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("rx.route")}</Label>
                    <Input name="route" value={form.route} onChange={handleChange} placeholder="e.g. IV / PO" />
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <Label>{t("rx.instructions")}</Label>
                  <Textarea name="instructions" value={form.instructions} onChange={handleChange} className="min-h-[80px]" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setForm(emptyForm); setSelectedDrugRef(null); }}>{t("generic.cancel")}</Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editRx} onOpenChange={(open) => { if (!open) setEditRx(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("generic.edit")} — {editRx?.drugName}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>{t("rx.drugName")} *</Label>
              <DrugNameCombobox
                value={editForm.drugName}
                onChange={(name) => setEditForm(p => ({ ...p, drugName: name }))}
                required
                placeholder={isRtl ? "ابحث باسم الدواء…" : "Search drug name…"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>{t("rx.dosage")} *</Label>
                <Textarea name="dosage" required value={editForm.dosage} onChange={handleEditChange} className="min-h-[72px] text-xs resize-none" />
              </div>
              <div className="space-y-3">
                <Label>{t("rx.frequency")} *</Label>
                <Input name="frequency" required value={editForm.frequency} onChange={handleEditChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>{t("rx.duration")}</Label>
                <Input name="duration" value={editForm.duration} onChange={handleEditChange} />
              </div>
              <div className="space-y-3">
                <Label>{t("rx.route")}</Label>
                <Input name="route" value={editForm.route} onChange={handleEditChange} />
              </div>
            </div>
            <div className="space-y-3">
              <Label>{t("rx.instructions")}</Label>
              <Textarea name="instructions" value={editForm.instructions} onChange={handleEditChange} className="min-h-[80px]" />
            </div>
            <div className="space-y-3">
              <Label>{t("generic.status")}</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dispensed">Dispensed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditRx(null)}>{t("generic.cancel")}</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
                {t("generic.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                  <TableRow
                    key={rx.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => canWrite && openEdit(rx as Prescription)}
                  >
                    <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/patients/${rx.patientId}`); }}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {rx.patientName ?? rx.patientId}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{rx.drugName}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate" title={`${rx.dosage} — ${rx.frequency}`}>{rx.dosage} — {rx.frequency}</TableCell>
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
                          onClick={(e) => { e.stopPropagation(); updateMutation.mutate(
                              { id: rx.id, data: { status: "dispensed" } },
                              {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
                                  toast({ title: t("generic.success"), description: t("rx.dispensed") });
                                },
                                onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
                              }
                            );
                          }}
                        >
                          <PackageCheck className="h-3 w-3" /> {t("rx.dispense")}
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(rx as Prescription); }}>
                          <Pencil className="h-3 w-3 mr-1" />{t("generic.edit")}
                        </Button>
                      )}
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
