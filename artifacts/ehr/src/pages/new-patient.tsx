import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreatePatient, useCreateAdmissionAssessment, getListPatientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, Save, Loader2,
  User, ClipboardList, Stethoscope, FlaskConical, CalendarClock, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SubSectionTitle({ title }: { title: string }) {
  return (
    <div className="col-span-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mt-2">{title}</h3>
    </div>
  );
}

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { icon: User,          labelKey: "admit.section1" as const, color: "bg-primary",     ring: "ring-primary"     },
  { icon: ClipboardList, labelKey: "admit.section2" as const, color: "bg-blue-500",    ring: "ring-blue-500"    },
  { icon: Stethoscope,   labelKey: "admit.section3" as const, color: "bg-green-500",   ring: "ring-green-500"   },
  { icon: FlaskConical,  labelKey: "admit.section4" as const, color: "bg-yellow-500",  ring: "ring-yellow-500"  },
  { icon: CalendarClock, labelKey: "admit.section5" as const, color: "bg-orange-500",  ring: "ring-orange-500"  },
];

const ACCENT_CLASSES = [
  "border-l-primary",
  "border-l-blue-400",
  "border-l-green-400",
  "border-l-yellow-400",
  "border-l-orange-400",
];

// ─── Wizard step indicator ────────────────────────────────────────────────────

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(current / (total - 1)) * 100}%` }}
        />

        {Array.from({ length: total }).map((_, i) => {
          const done = i < current;
          const active = i === current;
          const StepIcon = STEPS[i].icon;
          return (
            <div key={i} className="flex flex-col items-center z-10 gap-1.5">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  border-2 transition-all duration-300
                  ${done  ? "bg-primary border-primary text-primary-foreground" : ""}
                  ${active ? `bg-primary border-primary text-primary-foreground ring-4 ${STEPS[i].ring}/20` : ""}
                  ${!done && !active ? "bg-background border-muted-foreground/30 text-muted-foreground" : ""}
                `}
              >
                {done ? <Check className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block max-w-[80px] text-center leading-tight
                ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewPatient() {
  const { t, isRtl } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPatient = useCreatePatient();
  const createAssessment = useCreateAdmissionAssessment();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── State per section ──
  const [demo, setDemo] = useState({
    nameEn: "", nameAr: "", dateOfBirth: "", gender: "male",
    bloodGroup: "", nationality: "", nationalId: "",
    phone: "", address: "", residence: "",
    weight: "", height: "", admissionDate: "", dischargeDate: "",
    guardianName: "", guardianRelation: "parent", guardianPhone: "",
    allergies: "",
  });

  const [history, setHistory] = useState({
    mainComplaint: "", analysisSite: "", analysisOnset: "", analysisCharacter: "",
    analysisRadiation: "", analysisAggravation: "", analysisRelieving: "",
    analysisAssociations: "", systemicReview: "", pastMedicalHistory: "",
    familyHistory: "", drugHistory: "", socialHistory: "", developmentalHistory: "",
    historySummary: "", provisionalDiagnosis: "",
  });

  const [examination, setExamination] = useState({
    examinationSummary: "", chestExam: "", cnsExam: "", abdomenExam: "",
    vitalBp: "", vitalPr: "", vitalRr: "", vitalGcs: "", vitalRbg: "",
  });

  const [investigations, setInvestigations] = useState({
    investigationsOrdered: "", managementPlan: "",
  });

  const [followup, setFollowup] = useState({
    morningFollowUp: "", eveningFollowUp: "", dischargeLetter: "",
  });

  const handleDemo = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDemo(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleHistory = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setHistory(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleExam = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setExamination(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleInvest = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setInvestigations(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleFollowup = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setFollowup(p => ({ ...p, [e.target.name]: e.target.value }));

  const isLoading = createPatient.isPending || createAssessment.isPending;

  const hasAssessmentData = Object.values({ ...history, ...examination, ...investigations, ...followup })
    .some(v => v.trim().length > 0);

  // ── Validation for step 1 ──
  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!demo.nameEn.trim()) e.nameEn = "Required";
    if (!demo.dateOfBirth) e.dateOfBirth = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (step === 0 && !validateStep0()) return;

    const patientData: any = {
      nameEn: demo.nameEn,
      dateOfBirth: demo.dateOfBirth,
      gender: demo.gender,
    };
    if (demo.nameAr) patientData.nameAr = demo.nameAr;
    if (demo.bloodGroup) patientData.bloodGroup = demo.bloodGroup;
    if (demo.nationality) patientData.nationality = demo.nationality;
    if (demo.nationalId) patientData.nationalId = demo.nationalId;
    if (demo.phone) patientData.phone = demo.phone;
    if (demo.address) patientData.address = demo.address;
    if (demo.residence) patientData.residence = demo.residence;
    if (demo.weight) patientData.weight = demo.weight;
    if (demo.height) patientData.height = demo.height;
    if (demo.admissionDate) patientData.admissionDate = demo.admissionDate;
    if (demo.dischargeDate) patientData.dischargeDate = demo.dischargeDate;
    if (demo.guardianName) patientData.guardianName = demo.guardianName;
    if (demo.guardianRelation) patientData.guardianRelation = demo.guardianRelation;
    if (demo.guardianPhone) patientData.guardianPhone = demo.guardianPhone;
    if (demo.allergies) patientData.allergies = demo.allergies;

    createPatient.mutate(
      { data: patientData },
      {
        onSuccess: (patient) => {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          if (hasAssessmentData) {
            const assessmentData: any = { patientId: patient.id };
            const allFields = { ...history, ...examination, ...investigations, ...followup };
            for (const [key, val] of Object.entries(allFields)) {
              if (val.trim()) assessmentData[key] = val;
            }
            createAssessment.mutate(
              { data: assessmentData },
              {
                onSuccess: () => {
                  toast({ title: t("patient.successTitle"), description: t("patient.successDesc") });
                  setLocation(`/patients/${patient.id}`);
                },
                onError: () => {
                  toast({ title: t("patient.successTitle"), description: t("patient.successDesc") });
                  setLocation(`/patients/${patient.id}`);
                },
              }
            );
          } else {
            toast({ title: t("patient.successTitle"), description: t("patient.successDesc") });
            setLocation(`/patients/${patient.id}`);
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: t("patient.errorTitle"), description: t("patient.errorDesc") });
        },
      }
    );
  };

  const stepLabels = STEPS.map(s => t(s.labelKey));
  const isLastStep = step === STEPS.length - 1;

  // ── Step content renderers ──
  const renderStep0 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t("patient.fullNameEn")} required>
        <Input name="nameEn" value={demo.nameEn} onChange={handleDemo} placeholder="Full name in English"
          className={errors.nameEn ? "border-destructive" : ""} />
        {errors.nameEn && <p className="text-xs text-destructive mt-0.5">{errors.nameEn}</p>}
      </Field>
      <Field label={t("patient.fullNameAr")}>
        <Input name="nameAr" dir="rtl" value={demo.nameAr} onChange={handleDemo} placeholder="الاسم الكامل بالعربي" />
      </Field>
      <Field label={t("patient.dateOfBirth")} required>
        <Input name="dateOfBirth" type="date" value={demo.dateOfBirth} onChange={handleDemo}
          className={errors.dateOfBirth ? "border-destructive" : ""} />
        {errors.dateOfBirth && <p className="text-xs text-destructive mt-0.5">{errors.dateOfBirth}</p>}
      </Field>
      <Field label={t("patient.genderLabel")} required>
        <Select value={demo.gender} onValueChange={v => setDemo(p => ({ ...p, gender: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">{t("patient.male")}</SelectItem>
            <SelectItem value="female">{t("patient.female")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("patient.weight")}>
        <Input name="weight" value={demo.weight} onChange={handleDemo} placeholder="e.g. 12.5 kg" />
      </Field>
      <Field label={t("patient.height")}>
        <Input name="height" value={demo.height} onChange={handleDemo} placeholder="e.g. 95 cm" />
      </Field>
      <Field label={t("patient.residence")}>
        <Input name="residence" value={demo.residence} onChange={handleDemo} placeholder="City / Area" />
      </Field>
      <Field label={t("patient.admissionDate")}>
        <Input name="admissionDate" type="date" value={demo.admissionDate} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.dischargeDate")}>
        <Input name="dischargeDate" type="date" value={demo.dischargeDate} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.bloodGroup")}>
        <Select value={demo.bloodGroup} onValueChange={v => setDemo(p => ({ ...p, bloodGroup: v }))}>
          <SelectTrigger><SelectValue placeholder={t("patient.selectBloodGroup")} /></SelectTrigger>
          <SelectContent>
            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("patient.nationalId")}>
        <Input name="nationalId" value={demo.nationalId} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.nationality")}>
        <Input name="nationality" value={demo.nationality} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.homePhone")}>
        <Input name="phone" type="tel" value={demo.phone} onChange={handleDemo} />
      </Field>
      <Field label={t("generic.address")}>
        <Input name="address" value={demo.address} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.guardianName")}>
        <Input name="guardianName" value={demo.guardianName} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.guardianRelation")}>
        <Select value={demo.guardianRelation} onValueChange={v => setDemo(p => ({ ...p, guardianRelation: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parent">{t("patient.parent")}</SelectItem>
            <SelectItem value="sibling">{t("patient.sibling")}</SelectItem>
            <SelectItem value="other">{t("patient.other")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("patient.guardianPhone")}>
        <Input name="guardianPhone" type="tel" value={demo.guardianPhone} onChange={handleDemo} />
      </Field>
      <div className="col-span-full">
        <Field label={t("patient.knownAllergies")}>
          <Textarea name="allergies" value={demo.allergies} onChange={handleDemo}
            placeholder={t("patient.allergiesPlaceholder")} className="min-h-[70px]" />
        </Field>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="col-span-full">
        <Field label={t("admit.mainComplaint")}>
          <Textarea name="mainComplaint" value={history.mainComplaint} onChange={handleHistory}
            placeholder="Chief complaint in patient's own words..." className="min-h-[80px]" />
        </Field>
      </div>

      <SubSectionTitle title={t("admit.analysisTitle")} />
      <Field label={t("admit.site")}>
        <Input name="analysisSite" value={history.analysisSite} onChange={handleHistory} placeholder="Where is the pain/complaint located?" />
      </Field>
      <Field label={t("admit.onset")}>
        <Input name="analysisOnset" value={history.analysisOnset} onChange={handleHistory} placeholder="Sudden / Gradual, since when..." />
      </Field>
      <Field label={t("admit.character")}>
        <Input name="analysisCharacter" value={history.analysisCharacter} onChange={handleHistory} placeholder="Sharp / Dull / Colicky..." />
      </Field>
      <Field label={t("admit.radiation")}>
        <Input name="analysisRadiation" value={history.analysisRadiation} onChange={handleHistory} placeholder="Does it radiate anywhere?" />
      </Field>
      <Field label={t("admit.aggravation")}>
        <Input name="analysisAggravation" value={history.analysisAggravation} onChange={handleHistory} placeholder="What makes it worse?" />
      </Field>
      <Field label={t("admit.relieving")}>
        <Input name="analysisRelieving" value={history.analysisRelieving} onChange={handleHistory} placeholder="What makes it better?" />
      </Field>
      <div className="col-span-full">
        <Field label={t("admit.associations")}>
          <Textarea name="analysisAssociations" value={history.analysisAssociations} onChange={handleHistory}
            placeholder="Associated symptoms (fever, vomiting, etc.)" className="min-h-[70px]" />
        </Field>
      </div>

      <SubSectionTitle title={t("admit.systemicReview")} />
      <div className="col-span-full">
        <Field label={t("admit.systemicReview")}>
          <Textarea name="systemicReview" value={history.systemicReview} onChange={handleHistory}
            placeholder="Review of all body systems..." className="min-h-[80px]" />
        </Field>
      </div>

      <SubSectionTitle title="Past History" />
      <div className="col-span-full">
        <Field label={t("admit.pastMedicalHistory")}>
          <Textarea name="pastMedicalHistory" value={history.pastMedicalHistory} onChange={handleHistory}
            placeholder="Previous illnesses, surgeries, hospitalizations..." className="min-h-[70px]" />
        </Field>
      </div>
      <Field label={t("admit.familyHistory")}>
        <Textarea name="familyHistory" value={history.familyHistory} onChange={handleHistory}
          placeholder="Relevant family medical history..." className="min-h-[70px]" />
      </Field>
      <Field label={t("admit.drugHistory")}>
        <Textarea name="drugHistory" value={history.drugHistory} onChange={handleHistory}
          placeholder="Current medications, doses, duration..." className="min-h-[70px]" />
      </Field>
      <Field label={t("admit.socialHistory")}>
        <Textarea name="socialHistory" value={history.socialHistory} onChange={handleHistory}
          placeholder="Living conditions, school, social factors..." className="min-h-[70px]" />
      </Field>
      <div className="col-span-full">
        <Field label={t("admit.developmentalHistory")}>
          <Textarea name="developmentalHistory" value={history.developmentalHistory} onChange={handleHistory}
            placeholder="Birth history, developmental milestones..." className="min-h-[70px]" />
        </Field>
      </div>

      <SubSectionTitle title="Assessment" />
      <div className="col-span-full">
        <Field label={t("admit.summary")}>
          <Textarea name="historySummary" value={history.historySummary} onChange={handleHistory}
            placeholder="Brief summary of the history..." className="min-h-[80px]" />
        </Field>
      </div>
      <div className="col-span-full">
        <Field label={t("admit.provisionalDiagnosis")}>
          <Textarea name="provisionalDiagnosis" value={history.provisionalDiagnosis} onChange={handleHistory}
            placeholder="Provisional / working diagnosis..." className="min-h-[70px]" />
        </Field>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="col-span-full">
        <Field label={t("admit.examinationSummary")}>
          <Textarea name="examinationSummary" value={examination.examinationSummary} onChange={handleExam}
            placeholder="General appearance, consciousness, nutritional status..." className="min-h-[80px]" />
        </Field>
      </div>

      <SubSectionTitle title={t("admit.vitalsTitle")} />
      <Field label={t("admit.bp")}>
        <Input name="vitalBp" value={examination.vitalBp} onChange={handleExam} placeholder="e.g. 110/70 mmHg" />
      </Field>
      <Field label={t("admit.pr")}>
        <Input name="vitalPr" value={examination.vitalPr} onChange={handleExam} placeholder="e.g. 88 bpm" />
      </Field>
      <Field label={t("admit.rr")}>
        <Input name="vitalRr" value={examination.vitalRr} onChange={handleExam} placeholder="e.g. 20 /min" />
      </Field>
      <Field label={t("admit.gcs")}>
        <Input name="vitalGcs" value={examination.vitalGcs} onChange={handleExam} placeholder="e.g. 15/15" />
      </Field>
      <Field label={t("admit.rbg")}>
        <Input name="vitalRbg" value={examination.vitalRbg} onChange={handleExam} placeholder="e.g. 5.2 mmol/L" />
      </Field>

      <SubSectionTitle title={t("admit.systemsTitle")} />
      <div className="col-span-full">
        <Field label={t("admit.chestExam")}>
          <Textarea name="chestExam" value={examination.chestExam} onChange={handleExam}
            placeholder="Chest wall, air entry, breath sounds, added sounds..." className="min-h-[80px]" />
        </Field>
      </div>
      <div className="col-span-full">
        <Field label={t("admit.cnsExam")}>
          <Textarea name="cnsExam" value={examination.cnsExam} onChange={handleExam}
            placeholder="Cranial nerves, tone, reflexes, coordination..." className="min-h-[80px]" />
        </Field>
      </div>
      <div className="col-span-full">
        <Field label={t("admit.abdomenExam")}>
          <Textarea name="abdomenExam" value={examination.abdomenExam} onChange={handleExam}
            placeholder="Inspection, palpation, percussion, auscultation..." className="min-h-[80px]" />
        </Field>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="grid grid-cols-1 gap-4">
      <Field label={t("admit.investigationsOrdered")}>
        <Textarea name="investigationsOrdered" value={investigations.investigationsOrdered} onChange={handleInvest}
          placeholder="CBC, CRP, Blood culture, CXR, Urine R/E..." className="min-h-[120px]" />
      </Field>
      <Field label={t("admit.managementPlan")}>
        <Textarea name="managementPlan" value={investigations.managementPlan} onChange={handleInvest}
          placeholder="IV fluids, medications, monitoring, consultations..." className="min-h-[120px]" />
      </Field>
    </div>
  );

  const renderStep4 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("admit.morningFollowUp")}>
        <Textarea name="morningFollowUp" value={followup.morningFollowUp} onChange={handleFollowup}
          placeholder="Morning ward round notes..." className="min-h-[120px]" />
      </Field>
      <Field label={t("admit.eveningFollowUp")}>
        <Textarea name="eveningFollowUp" value={followup.eveningFollowUp} onChange={handleFollowup}
          placeholder="Evening follow-up notes..." className="min-h-[120px]" />
      </Field>
      <div className="col-span-full">
        <Field label={t("admit.dischargeLetter")}>
          <Textarea name="dischargeLetter" value={followup.dischargeLetter} onChange={handleFollowup}
            placeholder="Discharge summary or referral letter content..." className="min-h-[140px]" />
        </Field>
      </div>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admit.newPatientTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("patient.registerNew")}</p>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="px-2 py-4">
        <StepIndicator current={step} total={STEPS.length} labels={stepLabels} />
      </div>

      {/* ── Step card ── */}
      <Card className={`border-l-4 ${ACCENT_CLASSES[step]}`}>
        {/* Step title bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          {(() => { const Icon = STEPS[step].icon; return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
          <div>
            <h2 className="font-semibold text-foreground">{stepLabels[step]}</h2>
            <p className="text-xs text-muted-foreground">
              {t("generic.step", { n: step + 1, total: STEPS.length }) || `Step ${step + 1} of ${STEPS.length}`}
              {step > 0 && <span className="ml-2 italic">{t("admit.sectionOptional")}</span>}
            </p>
          </div>
        </div>

        <CardContent className="pt-6 pb-4">
          {stepRenderers[step]()}
        </CardContent>
      </Card>

      {/* ── Navigation bar ── */}
      <div className="flex items-center justify-between gap-4 sticky bottom-4 bg-background/90 backdrop-blur border rounded-xl px-6 py-3 shadow-md">
        <Button
          type="button"
          variant="outline"
          onClick={step === 0 ? undefined : handleBack}
          disabled={step === 0}
          asChild={step === 0}
        >
          {step === 0 ? (
            <Link href="/patients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("generic.cancel")}
            </Link>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("generic.back") || "Back"}
            </>
          )}
        </Button>

        <span className="text-xs text-muted-foreground">
          {step + 1} / {STEPS.length}
        </span>

        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={isLoading} size="lg">
            {isLoading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />
            }
            {t("admit.registerAndSave")}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} size="lg">
            {t("generic.next") || "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
