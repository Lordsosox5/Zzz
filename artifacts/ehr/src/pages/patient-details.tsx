import { useState } from "react";
import {
  useGetPatientSummary, getGetPatientSummaryQueryKey,
  useListLabOrders, useListRadiologyOrders,
  useUpdateLabOrder, getListLabOrdersQueryKey,
  useListPrescriptions, useCreatePrescription, useUpdatePrescription, getListPrescriptionsQueryKey,
  useListClinicalNotes, useCreateClinicalNote, getListClinicalNotesQueryKey,
  useCreateAdmissionAssessment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import {
  canEnterLabResults, getAllowedPatientTabs,
  canWriteClinicalNotes, canPrescribe,
  canDispensePrescription, canRecordVitals,
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
  Loader2, Save, Plus, PackageCheck, Stethoscope, FileText,
} from "lucide-react";
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
          <div className="space-y-2">
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
            <div className="space-y-2"><Label>{t("lab.resultValue")}</Label><Input value={form.resultValue} onChange={e => setForm(p => ({ ...p, resultValue: e.target.value }))} placeholder="e.g. 7.4" /></div>
            <div className="space-y-2"><Label>{t("lab.unit")}</Label><Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. mmol/L" /></div>
          </div>
          <div className="space-y-2"><Label>{t("lab.referenceRange")}</Label><Input value={form.referenceRange} onChange={e => setForm(p => ({ ...p, referenceRange: e.target.value }))} placeholder="e.g. 3.5 - 5.5" /></div>
          <div className="space-y-2"><Label>{t("lab.resultedAt")}</Label><Input type="datetime-local" value={form.resultedAt} onChange={e => setForm(p => ({ ...p, resultedAt: e.target.value }))} /></div>
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
            <div className="space-y-2"><Label>{t("admit.bp")}</Label><Input name="vitalBp" value={form.vitalBp} onChange={handleChange} placeholder="e.g. 110/70" /></div>
            <div className="space-y-2"><Label>{t("admit.pr")}</Label><Input name="vitalPr" value={form.vitalPr} onChange={handleChange} placeholder="e.g. 88 bpm" /></div>
            <div className="space-y-2"><Label>{t("admit.rr")}</Label><Input name="vitalRr" value={form.vitalRr} onChange={handleChange} placeholder="e.g. 20/min" /></div>
            <div className="space-y-2"><Label>{t("admit.gcs")}</Label><Input name="vitalGcs" value={form.vitalGcs} onChange={handleChange} placeholder="e.g. 15/15" /></div>
            <div className="space-y-2"><Label>{t("admit.rbg")}</Label><Input name="vitalRbg" value={form.vitalRbg} onChange={handleChange} placeholder="e.g. 5.2 mmol/L" /></div>
            <div className="space-y-2"><Label>{t("patient.weight")}</Label><Input name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 12.5 kg" /></div>
          </div>
          <div className="space-y-2"><Label>{t("patient.height")}</Label><Input name="height" value={form.height} onChange={handleChange} placeholder="e.g. 95 cm" /></div>
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2"><Label>{t("rx.drugName")} *</Label><Input name="drugName" required value={form.drugName} onChange={handleChange} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{t("rx.dosage")} *</Label><Input name="dosage" required value={form.dosage} onChange={handleChange} placeholder="e.g. 250mg" /></div>
            <div className="space-y-2"><Label>{t("rx.frequency")} *</Label><Input name="frequency" required value={form.frequency} onChange={handleChange} placeholder="e.g. 3x daily" /></div>
            <div className="space-y-2"><Label>{t("rx.duration")}</Label><Input name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 7 days" /></div>
            <div className="space-y-2"><Label>{t("rx.route")}</Label><Input name="route" value={form.route} onChange={handleChange} placeholder="e.g. oral" /></div>
          </div>
          <div className="space-y-2"><Label>{t("rx.instructions")}</Label><Textarea name="instructions" value={form.instructions} onChange={handleChange} className="min-h-[80px]" /></div>
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
  const allowedTabs      = getAllowedPatientTabs(role);

  const updateRxMutation = useUpdatePrescription();

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
        <Card><CardContent className="p-6"><div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div></CardContent></Card>
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
            </div>
          </div>
          {/* Role-gated action buttons */}
          <div className="flex flex-wrap gap-2">
            {canVitals && <RecordVitalsDialog patientId={patientId} onSuccess={() => {}} />}
            {canWrite && <AddNoteDialog patientId={patientId} onSuccess={handleNoteSuccess} />}
            {canRx && <AddPrescriptionDialog patientId={patientId} onSuccess={handleRxSuccess} />}
            <Button asChild variant="secondary"><Link href="/appointments"><Calendar className="mr-2 h-4 w-4" />{t("patient.newAppointment")}</Link></Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={allowedTabs[0]} className="w-full" dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
          {allowedTabs.map(tab => (
            <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              {tab === "overview" ? t("patient.overview") :
               tab === "notes" ? t("patient.clinicalNotes") :
               tab === "prescriptions" ? t("nav.prescriptions") :
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
              <CardContent className="p-0">
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
              <CardContent className="p-0">
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
              <CardContent className="p-0">
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
                      {canEnterResults && <TableHead className="text-end">{t("generic.actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLab ? (
                      <TableRow><TableCell colSpan={canEnterResults ? 8 : 7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
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
                              ? <span className="font-mono">{order.resultValue}{order.unit ? ` ${order.unit}` : ''}</span>
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.referenceRange ?? '-'}</TableCell>
                          {canEnterResults && (
                            <TableCell className="text-end">
                              {order.status !== 'resulted' && (
                                <EnterResultDialog orderId={order.id} testName={order.testName} onSuccess={handleResultSuccess} />
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={canEnterResults ? 8 : 7} className="h-24 text-center text-muted-foreground">{t("lab.noLabOrders")}</TableCell></TableRow>
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
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("radiology.modality")}</TableHead>
                      <TableHead>{t("radiology.studyDesc")}</TableHead>
                      <TableHead>{t("generic.priority")}</TableHead>
                      <TableHead>{t("generic.status")}</TableHead>
                      <TableHead>{t("lab.report")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRad ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : radOrders && radOrders.length > 0 ? (
                      radOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="uppercase font-mono text-xs font-semibold">{order.modality}</TableCell>
                          <TableCell>{order.studyDescription}</TableCell>
                          <TableCell>
                            <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'outline'} className="capitalize">{order.priority}</Badge>
                          </TableCell>
                          <TableCell><StatusBadge status={order.status} /></TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{order.report ?? '-'}</TableCell>
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
      </Tabs>
    </div>
  );
}
