import { useState } from "react";
import {
  useGetPatientSummary, getGetPatientSummaryQueryKey,
  useListLabOrders, useListRadiologyOrders,
  useUpdateLabOrder, getListLabOrdersQueryKey,
  useListPrescriptions, useCreatePrescription, useUpdatePrescription, getListPrescriptionsQueryKey,
  useListClinicalNotes, useCreateClinicalNote, getListClinicalNotesQueryKey,
  useListInvoices,
  useCreateAdmissionAssessment,
  useListUnits,
  useUpdatePatient,
  getGetPatientSummaryQueryKey as _getPatientSummaryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser, getToken } from "@/lib/auth";
import {
  canEnterLabResults, getAllowedPatientTabs,
  canWriteClinicalNotes, canPrescribe,
  canDispensePrescription, canRecordVitals,
  canTransferPatient, canEditPatient, canCreateDischargeSummary,
} from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  User, Calendar, Activity, FlaskConical, AlertTriangle,
  Loader2, Save, Plus, PackageCheck, Stethoscope, FileText, Printer,
  Building2, Pencil, ClipboardList, Receipt,
} from "lucide-react";
import { LabResultViewDialog, type OrderForReport } from "@/components/lab-result-view-dialog";
import { RadiologyReportViewDialog, type RadiologyOrderForReport } from "@/components/radiology-report-view-dialog";
import { InvoiceViewDialog } from "@/components/invoice-view-dialog";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Helpers ── */
function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "resulted" ? "default" :
    status === "collected" ? "secondary" :
    status === "dispensed" ? "secondary" : "outline";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

function CriticalBadge({ isCritical }: { isCritical: boolean }) {
  if (!isCritical) return null;
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" /> Critical
    </Badge>
  );
}

/* ── Lab result dialog (Lab Specialist / Lab Tech / Admin) ── */
function EnterResultDialog({ orderId, testName, onSuccess }: { orderId: number; testName: string; onSuccess: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const updateMutation = useUpdateLabOrder();
  const [form, setForm] = useState({
    result: "normal", resultValue: "", unit: "", referenceRange: "",
    isCritical: false, resultedAt: new Date().toISOString().slice(0, 16), notes: "",
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { id: orderId, data: { status: "resulted", result: form.result, resultValue: form.resultValue || undefined, unit: form.unit || undefined, referenceRange: form.referenceRange || undefined, isCritical: form.isCritical, resultedAt: form.resultedAt ? new Date(form.resultedAt).toISOString() : undefined } },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("generic.addSuccess") }); setOpen(false); onSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1"><FlaskConical className="h-3 w-3" /> {t("lab.enterResult")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("lab.enterResult")}: {testName}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-3">
            <Label>{t("generic.result")} *</Label>
            <Select value={form.result} onValueChange={v => setForm(p => ({ ...p, result: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">{t("lab.normal")}</SelectItem>
                <SelectItem value="abnormal">{t("lab.abnormal")}</SelectItem>
                <SelectItem value="critical">{t("lab.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3"><Label>{t("lab.resultValue")}</Label><Input value={form.resultValue} onChange={e => setForm(p => ({ ...p, resultValue: e.target.value }))} placeholder="e.g. 7.4" /></div>
            <div className="space-y-3"><Label>{t("lab.unit")}</Label><Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. mmol/L" /></div>
          </div>
          <div className="space-y-3"><Label>{t("lab.referenceRange")}</Label><Input value={form.referenceRange} onChange={e => setForm(p => ({ ...p, referenceRange: e.target.value }))} placeholder="e.g. 3.5 - 5.5" /></div>
          <div className="space-y-3"><Label>{t("lab.resultedAt")}</Label><Input type="datetime-local" value={form.resultedAt} onChange={e => setForm(p => ({ ...p, resultedAt: e.target.value }))} /></div>
          <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
            <Checkbox id="critical" checked={form.isCritical} onCheckedChange={v => setForm(p => ({ ...p, isCritical: !!v }))} />
            <label htmlFor="critical" className="text-sm font-medium cursor-pointer flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />{t("lab.isCritical")}</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
              {t("lab.updateResult")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Record Vitals dialog (Nurse / Doctors / Admin) ── */
function RecordVitalsDialog({ patientId, onSuccess }: { patientId: number; onSuccess: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const createAssessment = useCreateAdmissionAssessment();
  const [form, setForm] = useState({ vitalBp: "", vitalPr: "", vitalRr: "", vitalGcs: "", vitalRbg: "", weight: "", height: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { patientId };
    if (form.vitalBp) data.vitalBp = form.vitalBp;
    if (form.vitalPr) data.vitalPr = form.vitalPr;
    if (form.vitalRr) data.vitalRr = form.vitalRr;
    if (form.vitalGcs) data.vitalGcs = form.vitalGcs;
    if (form.vitalRbg) data.vitalRbg = form.vitalRbg;
    if (form.weight) data.weight = form.weight;
    if (form.height) data.height = form.height;
    createAssessment.mutate(
      { data },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("nurse.vitalsRecorded") }); setOpen(false); onSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Activity className="h-4 w-4" />{t("nurse.recordVitals")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("nurse.vitalsTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3"><Label>{t("admit.bp")}</Label><Input name="vitalBp" value={form.vitalBp} onChange={handleChange} placeholder="e.g. 110/70" /></div>
            <div className="space-y-3"><Label>{t("admit.pr")}</Label><Input name="vitalPr" value={form.vitalPr} onChange={handleChange} placeholder="e.g. 88 bpm" /></div>
            <div className="space-y-3"><Label>{t("admit.rr")}</Label><Input name="vitalRr" value={form.vitalRr} onChange={handleChange} placeholder="e.g. 20/min" /></div>
            <div className="space-y-3"><Label>{t("admit.gcs")}</Label><Input name="vitalGcs" value={form.vitalGcs} onChange={handleChange} placeholder="e.g. 15/15" /></div>
            <div className="space-y-3"><Label>{t("admit.rbg")}</Label><Input name="vitalRbg" value={form.vitalRbg} onChange={handleChange} placeholder="e.g. 5.2 mmol/L" /></div>
            <div className="space-y-3"><Label>{t("patient.weight")}</Label><Input name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 12.5 kg" /></div>
          </div>
          <div className="space-y-3"><Label>{t("patient.height")}</Label><Input name="height" value={form.height} onChange={handleChange} placeholder="e.g. 95 cm" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={createAssessment.isPending}>
              {createAssessment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
              {t("generic.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Add Clinical Note dialog (Consultant / Specialist / Admin) ── */
function AddNoteDialog({ patientId, onSuccess }: { patientId: number; onSuccess: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const createNote = useCreateClinicalNote();
  const [form, setForm] = useState({ type: "soap", content: "" });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNote.mutate(
      { data: { patientId, type: form.type, content: form.content } },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("generic.addSuccess") }); setOpen(false); setForm({ type: "soap", content: "" }); onSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />{t("patient.addNote")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("notes.addClinicalNote")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-3">
            <Label>{t("notes.noteType")} *</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="soap">SOAP</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="discharge">Discharge</SelectItem>
                <SelectItem value="admission">Admission</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>{t("notes.content")} *</Label>
            <Textarea required value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="min-h-[160px]" placeholder={t("notes.contentPlaceholder")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={createNote.isPending}>
              {createNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
              {t("generic.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── New Prescription dialog (Consultant / Specialist / Admin) ── */
function AddPrescriptionDialog({ patientId, onSuccess }: { patientId: number; onSuccess: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const createRx = useCreatePrescription();
  const [form, setForm] = useState({ drugName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRx.mutate(
      { data: { patientId, drugName: form.drugName, dosage: form.dosage, frequency: form.frequency, duration: form.duration || undefined, route: form.route || undefined, instructions: form.instructions || undefined } },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("generic.addSuccess") }); setOpen(false); setForm({ drugName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" }); onSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />{t("rx.newPrescription")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("rx.newPrescription")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-3"><Label>{t("rx.drugName")} *</Label><Input name="drugName" required value={form.drugName} onChange={handleChange} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3"><Label>{t("rx.dosage")} *</Label><Input name="dosage" required value={form.dosage} onChange={handleChange} placeholder="e.g. 250mg" /></div>
            <div className="space-y-3"><Label>{t("rx.frequency")} *</Label><Input name="frequency" required value={form.frequency} onChange={handleChange} placeholder="e.g. 3x daily" /></div>
            <div className="space-y-3"><Label>{t("rx.duration")}</Label><Input name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 7 days" /></div>
            <div className="space-y-3"><Label>{t("rx.route")}</Label><Input name="route" value={form.route} onChange={handleChange} placeholder="e.g. oral" /></div>
          </div>
          <div className="space-y-3"><Label>{t("rx.instructions")}</Label><Textarea name="instructions" value={form.instructions} onChange={handleChange} className="min-h-[80px]" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={createRx.isPending}>
              {createRx.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
              {t("generic.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit Patient dialog ── */
function EditPatientDialog({
  patient,
  onSuccess,
}: {
  patient: any;
  onSuccess: () => void;
}) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const updatePatient = useUpdatePatient();

  const [form, setForm] = useState({
    nameEn: patient.nameEn ?? "",
    nameAr: patient.nameAr ?? "",
    bloodGroup: patient.bloodGroup ?? "",
    phone: patient.phone ?? "",
    address: patient.address ?? "",
    residence: patient.residence ?? "",
    guardianName: patient.guardianName ?? "",
    guardianRelation: patient.guardianRelation ?? "parent",
    guardianPhone: patient.guardianPhone ?? "",
    allergies: patient.allergies ?? "",
    weight: patient.weight ?? "",
    height: patient.height ?? "",
    admissionDate: patient.admissionDate ? patient.admissionDate.slice(0, 10) : "",
    dischargeDate: patient.dischargeDate ? patient.dischargeDate.slice(0, 10) : "",
    status: patient.status ?? "admitted",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {};
    if (form.nameEn)         data.nameEn         = form.nameEn;
    if (form.nameAr)         data.nameAr         = form.nameAr;
    if (form.bloodGroup)     data.bloodGroup     = form.bloodGroup;
    if (form.phone)          data.phone          = form.phone;
    if (form.address)        data.address        = form.address;
    if (form.residence)      data.residence      = form.residence;
    if (form.guardianName)   data.guardianName   = form.guardianName;
    if (form.guardianRelation) data.guardianRelation = form.guardianRelation;
    if (form.guardianPhone)  data.guardianPhone  = form.guardianPhone;
    if (form.allergies)      data.allergies      = form.allergies;
    if (form.weight)         data.weight         = form.weight;
    if (form.height)         data.height         = form.height;
    if (form.admissionDate)  data.admissionDate  = new Date(form.admissionDate).toISOString();
    if (form.dischargeDate)  data.dischargeDate  = new Date(form.dischargeDate).toISOString();
    if (form.status)         data.status         = form.status;

    updatePatient.mutate(
      { id: patient.id, data },
      {
        onSuccess: () => {
          toast({ title: t("generic.success"), description: t("patient.editSuccess") });
          setOpen(false);
          onSuccess();
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          {t("generic.edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            {t("patient.editPatient")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Identity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3">{t("patient.personalInfo")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("patient.fullNameEn")}</Label>
                <Input value={form.nameEn} onChange={set("nameEn")} placeholder="Full name in English" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.fullNameAr")}</Label>
                <Input value={form.nameAr} onChange={set("nameAr")} placeholder="الاسم بالعربي" dir="rtl" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.bloodGroup")}</Label>
                <Select value={form.bloodGroup} onValueChange={v => setForm(p => ({ ...p, bloodGroup: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("patient.selectBloodGroup")} /></SelectTrigger>
                  <SelectContent>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.patientStatus")}</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admitted">{t("patient.statusAdmitted")}</SelectItem>
                    <SelectItem value="outpatient">{t("patient.statusOutpatient")}</SelectItem>
                    <SelectItem value="discharged">{t("patient.statusDischarged")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3">{t("patient.contactGuardian")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("patient.homePhone")}</Label>
                <Input value={form.phone} onChange={set("phone")} placeholder="+966 5x xxx xxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.residence")}</Label>
                <Input value={form.residence} onChange={set("residence")} placeholder="e.g. Riyadh" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>{t("generic.address")}</Label>
                <Input value={form.address} onChange={set("address")} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.guardianName")}</Label>
                <Input value={form.guardianName} onChange={set("guardianName")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.guardianPhone")}</Label>
                <Input value={form.guardianPhone} onChange={set("guardianPhone")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.guardianRelation")}</Label>
                <Select value={form.guardianRelation} onValueChange={v => setForm(p => ({ ...p, guardianRelation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">{t("patient.parent")}</SelectItem>
                    <SelectItem value="sibling">{t("patient.sibling")}</SelectItem>
                    <SelectItem value="other">{t("patient.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Medical */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3">{t("patient.medicalAlerts")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("patient.weight")} (kg)</Label>
                <Input value={form.weight} onChange={set("weight")} placeholder="e.g. 14.5" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.height")} (cm)</Label>
                <Input value={form.height} onChange={set("height")} placeholder="e.g. 98" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>{t("patient.knownAllergies")}</Label>
                <Input value={form.allergies} onChange={set("allergies")} placeholder={t("patient.allergiesPlaceholder")} />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3">{t("patient.admissionDate")} / {t("patient.dischargeDate")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("patient.admissionDate")}</Label>
                <Input type="date" value={form.admissionDate} onChange={set("admissionDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("patient.dischargeDate")}</Label>
                <Input type="date" value={form.dischargeDate} onChange={set("dischargeDate")} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updatePatient.isPending}>
              {updatePatient.isPending
                ? <Loader2 className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
              {t("generic.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Inline unit assign dropdown ── */
function AssignUnitDropdown({
  patientId,
  currentUnitId,
  onSuccess,
}: {
  patientId: number;
  currentUnitId: number | null;
  onSuccess: () => void;
}) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { data: unitList } = useListUnits();
  const activeUnits = (unitList ?? []).filter((u: any) => u.status === "active");

  const handleChange = async (value: string) => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/patients/${patientId}/unit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ unitId: value === "none" ? null : parseInt(value, 10) }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: t("generic.success"), description: t("patient.transferSuccess") });
      onSuccess();
    } catch {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Select value={currentUnitId?.toString() ?? "none"} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-7 text-xs border-dashed w-[170px] gap-1">
          {saving
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <SelectValue placeholder={t("patient.noUnit")} />}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground italic">{t("patient.noUnit")}</span>
          </SelectItem>
          {activeUnits.map((u: any) => (
            <SelectItem key={u.id} value={u.id.toString()}>
              {isRtl && u.nameAr ? u.nameAr : u.nameEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ── Discharge Summary dialog ── */
function DischargeSummaryDialog({ patientId, patientName, onSuccess }: { patientId: number; patientName: string; onSuccess: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    admissionDate: "",
    dischargeDate: new Date().toISOString().slice(0, 10),
    primaryDiagnosis: "",
    secondaryDiagnoses: "",
    hospitalCourse: "",
    conditionAtDischarge: "good",
    dischargeMedications: "",
    followUpInstructions: "",
    dietInstructions: "",
    activityRestrictions: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = getToken();
      const user = getUser();
      const res = await fetch("/api/discharge-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          patientId,
          createdBy: user?.id ?? null,
          createdByName: user?.nameEn ?? user?.username ?? null,
          ...form,
          admissionDate: form.admissionDate || null,
          secondaryDiagnoses: form.secondaryDiagnoses || null,
          dischargeMedications: form.dischargeMedications || null,
          followUpInstructions: form.followUpInstructions || null,
          dietInstructions: form.dietInstructions || null,
          activityRestrictions: form.activityRestrictions || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: t("generic.success"), description: t("generic.addSuccess") });
      setOpen(false);
      setForm({ admissionDate: "", dischargeDate: new Date().toISOString().slice(0, 10), primaryDiagnosis: "", secondaryDiagnoses: "", hospitalCourse: "", conditionAtDischarge: "good", dischargeMedications: "", followUpInstructions: "", dietInstructions: "", activityRestrictions: "" });
      onSuccess();
    } catch {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><ClipboardList className="h-4 w-4" />{t("discharge.createSummary")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("discharge.createSummary")} — {patientName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("discharge.admissionDate")}</Label>
              <Input type="date" name="admissionDate" value={form.admissionDate} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("discharge.dischargeDate")}</Label>
              <Input type="date" name="dischargeDate" required value={form.dischargeDate} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("discharge.primaryDiagnosis")} *</Label>
            <Input name="primaryDiagnosis" required value={form.primaryDiagnosis} onChange={handleChange} placeholder="e.g. Community-acquired pneumonia" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("discharge.secondaryDiagnoses")}</Label>
            <Input name="secondaryDiagnoses" value={form.secondaryDiagnoses} onChange={handleChange} placeholder="e.g. Mild dehydration, Iron deficiency anaemia" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("discharge.hospitalCourse")} *</Label>
            <Textarea name="hospitalCourse" required value={form.hospitalCourse} onChange={handleChange} className="min-h-[100px]" placeholder="Summary of treatment, investigations, and response..." />
          </div>
          <div className="space-y-1.5">
            <Label>{t("discharge.condition")}</Label>
            <Select value={form.conditionAtDischarge} onValueChange={v => setForm(p => ({ ...p, conditionAtDischarge: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">{t("discharge.condition.good")}</SelectItem>
                <SelectItem value="improved">{t("discharge.condition.improved")}</SelectItem>
                <SelectItem value="fair">{t("discharge.condition.fair")}</SelectItem>
                <SelectItem value="poor">{t("discharge.condition.poor")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("discharge.medications")}</Label>
            <Textarea name="dischargeMedications" value={form.dischargeMedications} onChange={handleChange} className="min-h-[80px]" placeholder="List discharge medications, doses, and durations..." />
          </div>
          <div className="space-y-1.5">
            <Label>{t("discharge.followUp")}</Label>
            <Textarea name="followUpInstructions" value={form.followUpInstructions} onChange={handleChange} className="min-h-[60px]" placeholder="Follow-up clinic, review dates, specialist referrals..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("discharge.diet")}</Label>
              <Input name="dietInstructions" value={form.dietInstructions} onChange={handleChange} placeholder="e.g. Regular diet, high fluid intake" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("discharge.activity")}</Label>
              <Input name="activityRestrictions" value={form.activityRestrictions} onChange={handleChange} placeholder="e.g. Bed rest for 3 days" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} /> : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
              {t("generic.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main page ── */
export default function PatientDetails({ params }: { params: { id: string } }) {
  const patientId = parseInt(params.id, 10);
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const role = user?.role ?? "";

  const canEnterResults  = canEnterLabResults(role);
  const canWrite         = canWriteClinicalNotes(role);
  const canRx            = canPrescribe(role);
  const canDispense      = canDispensePrescription(role);
  const canVitals        = canRecordVitals(role);
  const canTransfer      = canTransferPatient(role);
  const canEdit          = canEditPatient(role);
  const canDischarge     = canCreateDischargeSummary(role);
  const allowedTabs      = getAllowedPatientTabs(role);

  const updateRxMutation = useUpdatePrescription();

  /* ── Patient unit query ── */
  const patientUnitQueryKey = ["patient-unit", patientId];
  const { data: patientUnitData, refetch: refetchUnit } = useQuery({
    queryKey: patientUnitQueryKey,
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`/api/patients/${patientId}/unit`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { unitId: null, unitNameEn: null, unitNameAr: null };
      return res.json() as Promise<{ unitId: number | null; unitNameEn: string | null; unitNameAr: string | null }>;
    },
    enabled: !!patientId,
  });

  const { data: summary, isLoading } = useGetPatientSummary(patientId, {
    query: { enabled: !!patientId, queryKey: getGetPatientSummaryQueryKey(patientId) }
  });
  const { data: labOrders, isLoading: loadingLab } = useListLabOrders(
    { patientId }, { query: { enabled: !!patientId } }
  );
  const { data: radOrders, isLoading: loadingRad } = useListRadiologyOrders(
    { patientId }, { query: { enabled: !!patientId } }
  );
  const { data: rxList, isLoading: loadingRx } = useListPrescriptions(
    { patientId }, { query: { enabled: !!patientId && allowedTabs.includes("prescriptions") } }
  );
  const { data: notesList, isLoading: loadingNotes } = useListClinicalNotes(
    { patientId }, { query: { enabled: !!patientId && allowedTabs.includes("notes") } }
  );
  const { data: invoicesList, isLoading: loadingInvoices } = useListInvoices(
    { patientId }, { query: { enabled: !!patientId && allowedTabs.includes("billing") } } as any
  );

  /* ── Discharge summaries query ── */
  const dischargeSummaryQueryKey = ["discharge-summaries", patientId];
  const { data: dischargeSummaries = [] } = useQuery({
    queryKey: dischargeSummaryQueryKey,
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`/api/discharge-summaries?patientId=${patientId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json() as Promise<any[]>;
    },
    enabled: !!patientId && allowedTabs.includes("discharge"),
  });

  const handleResultSuccess = () => queryClient.invalidateQueries({ queryKey: getListLabOrdersQueryKey({ patientId }) });
  const handleRxSuccess     = () => queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey({ patientId }) });
  const handleNoteSuccess   = () => queryClient.invalidateQueries({ queryKey: getListClinicalNotesQueryKey({ patientId }) });

  const handleDispense = (rxId: number) => {
    updateRxMutation.mutate(
      { id: rxId, data: { status: "dispensed" } },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("rx.dispensed") }); handleRxSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="p-6"><div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-3"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div></CardContent></Card>
      </div>
    );
  }

  if (!summary?.patient) return <div>{t("patient.notFoundMsg")}</div>;

  const { patient } = summary;
  const name = isRtl && patient.nameAr ? patient.nameAr : patient.nameEn;

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients"><ArrowLeft className="h-4 w-4" style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} /></Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t("patient.profile")}</h1>
      </div>

      {/* Patient header card */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{t("patient.mrn")}: {patient.mrn}</span>
                <span>•</span>
                <span>{patient.gender === 'male' ? t("patient.male") : patient.gender === 'female' ? t("patient.female") : patient.gender}</span>
                <span>•</span>
                <span>{t("patient.dob")}: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                {patient.bloodGroup && (
                  <><span>•</span><Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{patient.bloodGroup}</Badge></>
                )}
              </div>
              {/* Unit indicator */}
              <div className="flex items-center gap-2 mt-2">
                {canTransfer ? (
                  <AssignUnitDropdown
                    patientId={patientId}
                    currentUnitId={patientUnitData?.unitId ?? null}
                    onSuccess={() => refetchUnit()}
                  />
                ) : patientUnitData?.unitId ? (
                  <Badge variant="secondary" className="gap-1.5 text-xs font-medium">
                    <Building2 className="h-3 w-3" />
                    {isRtl && patientUnitData.unitNameAr ? patientUnitData.unitNameAr : patientUnitData.unitNameEn}
                  </Badge>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground italic">
                    <Building2 className="h-3 w-3" />
                    {t("patient.noUnit")}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Role-gated action buttons */}
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <EditPatientDialog
                patient={patient}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetPatientSummaryQueryKey(patientId) })}
              />
            )}
            {canVitals && <RecordVitalsDialog patientId={patientId} onSuccess={() => {}} />}
            {canWrite && <AddNoteDialog patientId={patientId} onSuccess={handleNoteSuccess} />}
            {canRx && <AddPrescriptionDialog patientId={patientId} onSuccess={handleRxSuccess} />}
            <Button asChild variant="secondary"><Link href="/appointments"><Calendar className="mr-2 h-4 w-4" />{t("patient.newAppointment")}</Link></Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/patients/${patientId}/print`, "_blank")}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={allowedTabs[0]} className="w-full" dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
          {allowedTabs.map(tab => (
            <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              {tab === "overview"      ? t("patient.overview") :
               tab === "notes"         ? t("patient.clinicalNotes") :
               tab === "prescriptions" ? t("nav.prescriptions") :
               tab === "discharge"     ? t("discharge.tab") :
               tab === "billing"       ? t("nav.billing") :
               t("patient.labsRadiology")}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview tab ── */}
        {allowedTabs.includes("overview") && (
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> {t("patient.demographicsVitals")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">{t("patient.guardian")}</span>
                      <span className="font-medium">{patient.guardianName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">{t("generic.phone")}</span>
                      <span className="font-medium">{patient.phone || patient.guardianPhone || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block mb-1">{t("patient.allergies")}</span>
                      {patient.allergies
                        ? <Badge variant="destructive" className="mt-1">{patient.allergies}</Badge>
                        : <span className="text-muted-foreground italic">{t("patient.noAllergies")}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> {t("patient.upcomingAppointments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.upcomingAppointments && summary.upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {summary.upcomingAppointments.map((appt) => (
                        <div key={appt.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium">{new Date(appt.scheduledAt).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{appt.type} {t("patient.withDoctor")} {appt.doctorName}</p>
                          </div>
                          <Badge>{appt.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">{t("patient.noUpcomingAppts")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ── Clinical Notes tab ── */}
        {allowedTabs.includes("notes") && (
          <TabsContent value="notes" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{t("patient.clinicalNotes")}</h2>
              {canWrite && <AddNoteDialog patientId={patientId} onSuccess={handleNoteSuccess} />}
            </div>
            <Card>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("generic.date")}</TableHead>
                      <TableHead>{t("generic.type")}</TableHead>
                      <TableHead>{t("notes.author")}</TableHead>
                      <TableHead>{t("notes.preview")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingNotes ? (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : notesList && notesList.length > 0 ? (
                      notesList.map(note => (
                        <TableRow key={note.id}>
                          <TableCell className="text-sm">{new Date(note.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{note.type}</Badge></TableCell>
                          <TableCell>{note.authorName ?? '-'}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">{note.content}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t("notes.noNotes")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Prescriptions tab ── */}
        {allowedTabs.includes("prescriptions") && (
          <TabsContent value="prescriptions" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" />{t("nav.prescriptions")}</h2>
              {canRx && <AddPrescriptionDialog patientId={patientId} onSuccess={handleRxSuccess} />}
            </div>
            <Card>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("generic.date")}</TableHead>
                      <TableHead>{t("rx.drug")}</TableHead>
                      <TableHead>{t("rx.dosage")}</TableHead>
                      <TableHead>{t("rx.duration")}</TableHead>
                      <TableHead>{t("generic.status")}</TableHead>
                      <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRx ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : rxList && rxList.length > 0 ? (
                      rxList.map(rx => (
                        <TableRow key={rx.id}>
                          <TableCell className="text-sm">{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{rx.drugName}</TableCell>
                          <TableCell>{rx.dosage} — {rx.frequency}</TableCell>
                          <TableCell className="text-muted-foreground">{rx.duration ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant={rx.status === 'active' ? 'default' : 'secondary'} className="capitalize">{rx.status}</Badge>
                          </TableCell>
                          <TableCell className={isRtl ? "text-left" : "text-right"}>
                            {canDispense && rx.status === 'active' && (
                              <Button
                                size="sm" variant="outline"
                                className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                disabled={updateRxMutation.isPending}
                                onClick={() => handleDispense(rx.id)}
                              >
                                <PackageCheck className="h-3 w-3" /> {t("rx.dispense")}
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
          </TabsContent>
        )}

        {/* ── Labs & Radiology tab ── */}
        {allowedTabs.includes("labs") && (
          <TabsContent value="labs" className="mt-6 space-y-6">
            {/* Lab Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FlaskConical className="h-5 w-5 text-primary" />{t("patient.labResults")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("lab.testName")}</TableHead>
                      <TableHead>{t("lab.orderedOn")}</TableHead>
                      <TableHead>{t("generic.priority")}</TableHead>
                      <TableHead>{t("generic.status")}</TableHead>
                      <TableHead>{t("generic.result")}</TableHead>
                      <TableHead>{t("lab.resultValue")}</TableHead>
                      <TableHead>{t("lab.referenceRange")}</TableHead>
                      <TableHead className="text-end">{t("generic.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLab ? (
                      <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : labOrders && labOrders.length > 0 ? (
                      labOrders.map(order => (
                        <TableRow key={order.id} className={order.isCritical ? "bg-destructive/5" : undefined}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">{order.testName}<CriticalBadge isCritical={order.isCritical} /></div>
                            {order.testCode && <div className="text-xs text-muted-foreground font-mono">{order.testCode}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'outline'} className="capitalize">{order.priority}</Badge>
                          </TableCell>
                          <TableCell><StatusBadge status={order.status} /></TableCell>
                          <TableCell>
                            {order.result
                              ? <span className={`font-medium capitalize ${order.result === 'critical' ? 'text-destructive' : order.result === 'abnormal' ? 'text-orange-600' : 'text-green-600'}`}>{order.result}</span>
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {order.resultValue
                              ? <span className="font-mono text-xs">{order.resultValue}{order.unit ? ` ${order.unit}` : ''}</span>
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.referenceRange ?? '-'}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-2">
                              {order.status === 'resulted' && (
                                <LabResultViewDialog order={order as OrderForReport} />
                              )}
                              {order.status !== 'resulted' && canEnterResults && (
                                <EnterResultDialog orderId={order.id} testName={order.testName} onSuccess={handleResultSuccess} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">{t("lab.noLabOrders")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Radiology Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />{t("patient.radiologyOrders")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("radiology.modality")}</TableHead>
                      <TableHead>{t("radiology.studyDesc")}</TableHead>
                      <TableHead>{t("generic.priority")}</TableHead>
                      <TableHead>{t("generic.status")}</TableHead>
                      <TableHead className="text-end">{t("generic.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRad ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : radOrders && radOrders.length > 0 ? (
                      radOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Badge variant="outline" className="uppercase font-mono text-xs">{order.modality}</Badge>
                          </TableCell>
                          <TableCell>{order.studyDescription}</TableCell>
                          <TableCell>
                            <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'outline'} className="capitalize">{order.priority}</Badge>
                          </TableCell>
                          <TableCell><StatusBadge status={order.status} /></TableCell>
                          <TableCell className="text-end">
                            {order.status === 'reported' && (
                              <RadiologyReportViewDialog order={order as RadiologyOrderForReport} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("lab.noRadOrders")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* ── Discharge Summary tab ── */}
        {allowedTabs.includes("discharge") && (
          <TabsContent value="discharge" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {t("discharge.tab")}
              </h2>
              {canDischarge && (
                <DischargeSummaryDialog
                  patientId={patientId}
                  patientName={name}
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: dischargeSummaryQueryKey })}
                />
              )}
            </div>
            <Card>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("generic.date")}</TableHead>
                      <TableHead>{t("discharge.primaryDiagnosis")}</TableHead>
                      <TableHead>{t("discharge.condition")}</TableHead>
                      <TableHead>{t("notes.author")}</TableHead>
                      <TableHead className="text-end">{t("generic.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dischargeSummaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {t("discharge.noneYet")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      dischargeSummaries.map((ds: any) => (
                        <TableRow key={ds.id}>
                          <TableCell className="text-sm">{new Date(ds.dischargeDate).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{ds.primaryDiagnosis}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {t(`discharge.condition.${ds.conditionAtDischarge}`) || ds.conditionAtDischarge}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{ds.createdByName ?? "—"}</TableCell>
                          <TableCell className="text-end">
                            <Button
                              size="sm" variant="outline" className="gap-1"
                              onClick={() => window.open(`/patients/${patientId}/discharge-print/${ds.id}`, "_blank")}
                            >
                              <Printer className="h-3 w-3" /> {t("discharge.printLetter")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Billing tab ── */}
        {allowedTabs.includes("billing") && (
          <TabsContent value="billing" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-primary" />
                  {t("billing.invoices")}
                  {Array.isArray(invoicesList) && invoicesList.length > 0 && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      ({invoicesList.length})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>{t("generic.date")}</TableHead>
                      <TableHead>{t("billing.method")}</TableHead>
                      <TableHead>{t("billing.amount")}</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>{t("generic.status")}</TableHead>
                      <TableHead className="text-end">{t("generic.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingInvoices ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : Array.isArray(invoicesList) && invoicesList.length > 0 ? (
                      invoicesList.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">
                            {inv.invoiceNumber ? `#${inv.invoiceNumber}` : `#${String(inv.id).padStart(4, "0")}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="capitalize">{inv.paymentMethod}</TableCell>
                          <TableCell className="font-semibold tabular-nums">${inv.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="tabular-nums text-emerald-600 dark:text-emerald-400">
                            ${(inv.paidAmount ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              inv.status === "paid"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : inv.status === "partial"
                                ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                            }`}>
                              {inv.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-end">
                            <InvoiceViewDialog invoice={inv} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No invoices found for this patient.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
