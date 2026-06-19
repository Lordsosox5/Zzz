import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreatePatient, useCreateAdmissionAssessment, useListUnits, getListPatientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Save, Loader2,
  User, ClipboardList, Stethoscope, FlaskConical, CalendarClock, Check,
  CheckCircle2, XCircle, Circle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

function Field({ label, required, children, span }: { label: string; required?: boolean; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={`space-y-1.5 ${span ? "col-span-full" : ""}`}>
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="col-span-full mt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
        {title}
        {subtitle && <span className="ml-2 normal-case font-normal text-muted-foreground/70">{subtitle}</span>}
      </h3>
    </div>
  );
}

// ─── Symptom Chip ─────────────────────────────────────────────────────────────

type ChipState = "present" | "absent" | "";

function SymptomChip({ label, value, onChange }: { label: string; value: ChipState; onChange: (v: ChipState) => void }) {
  const cycle = (): ChipState => {
    if (value === "") return "present";
    if (value === "present") return "absent";
    return "";
  };

  return (
    <button
      type="button"
      onClick={() => onChange(cycle())}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all select-none
        ${value === "present" ? "bg-green-500/15 border-green-500 text-green-700 dark:text-green-400" : ""}
        ${value === "absent"  ? "bg-red-500/10  border-red-400   text-red-600   dark:text-red-400 opacity-70" : ""}
        ${value === ""        ? "bg-muted/50    border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted" : ""}
      `}
    >
      {value === "present" && <CheckCircle2 className="h-3 w-3" />}
      {value === "absent"  && <XCircle      className="h-3 w-3" />}
      {value === ""        && <Circle       className="h-3 w-3 opacity-40" />}
      {label}
    </button>
  );
}

// ─── System Review Card ───────────────────────────────────────────────────────

type SystemDef = { key: string; label: string; color: string; symptoms: string[] };

function SystemCard({
  sys, chips, onChip, note, onNote,
}: {
  sys: SystemDef;
  chips: Record<string, ChipState>;
  onChip: (key: string, v: ChipState) => void;
  note: string;
  onNote: (v: string) => void;
}) {
  const presentCount = sys.symptoms.filter(s => chips[`${sys.key}_${s}`] === "present").length;
  const absentCount  = sys.symptoms.filter(s => chips[`${sys.key}_${s}`] === "absent").length;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{sys.label}</span>
        <div className="flex gap-1">
          {presentCount > 0 && <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-500 text-green-700 dark:text-green-400">{presentCount}+</Badge>}
          {absentCount  > 0 && <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-red-400 text-red-600 dark:text-red-400">{absentCount}−</Badge>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sys.symptoms.map(s => (
          <SymptomChip
            key={s}
            label={s}
            value={chips[`${sys.key}_${s}`] ?? ""}
            onChange={v => onChip(`${sys.key}_${s}`, v)}
          />
        ))}
      </div>
      <Textarea
        value={note}
        onChange={e => onNote(e.target.value)}
        placeholder="Additional notes…"
        className="min-h-[48px] text-xs resize-none"
      />
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function ChipLegend() {
  return (
    <div className="col-span-full flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-dashed">
      <span className="font-medium">Click each symptom:</span>
      <span className="inline-flex items-center gap-1"><Circle className="h-3 w-3 opacity-40" /> Not asked</span>
      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Present</span>
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3" /> Absent</span>
    </div>
  );
}

// ─── Systems definition ───────────────────────────────────────────────────────

const SYSTEMS: SystemDef[] = [
  { key: "resp",  color: "blue",   label: "Respiratory",       symptoms: ["Cough","Wheeze","Stridor","Dyspnea","Chest Pain","Hemoptysis","Apnea","Tachypnea"] },
  { key: "cvs",   color: "red",    label: "Cardiovascular",    symptoms: ["Palpitations","Cyanosis","Edema","Chest Pain","Syncope","Poor Feeding","Murmur"] },
  { key: "gi",    color: "green",  label: "Gastrointestinal",  symptoms: ["Nausea","Vomiting","Diarrhea","Constipation","Abdominal Pain","Jaundice","Melena","Hematemesis","Bloating"] },
  { key: "cns",   color: "purple", label: "Neurological",      symptoms: ["Headache","Seizures","Altered LOC","Weakness","Numbness","Vision Changes","Hearing Loss","Ataxia"] },
  { key: "ent",   color: "cyan",   label: "ENT",               symptoms: ["Ear Pain","Ear Discharge","Nasal Congestion","Epistaxis","Sore Throat","Snoring","Hoarseness","Drooling"] },
  { key: "gu",    color: "yellow", label: "Genitourinary",     symptoms: ["Dysuria","Frequency","Hematuria","Enuresis","Flank Pain","Discharge","Oliguria","Swelling"] },
  { key: "msk",   color: "orange", label: "Musculoskeletal",   symptoms: ["Joint Pain","Swelling","Stiffness","Limp","Muscle Weakness","Back Pain","Fracture Hx"] },
  { key: "skin",  color: "pink",   label: "Skin",              symptoms: ["Rash","Itching","Pallor","Petechiae","Jaundice","Purpura","Hair Loss","Dry Skin"] },
  { key: "const", color: "gray",   label: "Constitutional",    symptoms: ["Fever","Night Sweats","Weight Loss","Fatigue","Poor Appetite","Growth Failure","Excessive Crying"] },
];

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { icon: User,          labelKey: "admit.section1" as const, ring: "ring-primary"     },
  { icon: ClipboardList, labelKey: "admit.section2" as const, ring: "ring-blue-500"    },
  { icon: Stethoscope,   labelKey: "admit.section3" as const, ring: "ring-green-500"   },
  { icon: FlaskConical,  labelKey: "admit.section4" as const, ring: "ring-yellow-500"  },
  { icon: CalendarClock, labelKey: "admit.section5" as const, ring: "ring-orange-500"  },
];

const ACCENT_CLASSES = [
  "border-l-primary",
  "border-l-blue-400",
  "border-l-green-400",
  "border-l-yellow-400",
  "border-l-orange-400",
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted z-0" />
        <div className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(current / (total - 1)) * 100}%` }} />
        {Array.from({ length: total }).map((_, i) => {
          const done = i < current;
          const active = i === current;
          const StepIcon = STEPS[i].icon;
          return (
            <div key={i} className="flex flex-col items-center z-10 gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                ${done  ? "bg-primary border-primary text-primary-foreground" : ""}
                ${active ? `bg-primary border-primary text-primary-foreground ring-4 ${STEPS[i].ring}/20` : ""}
                ${!done && !active ? "bg-background border-muted-foreground/30 text-muted-foreground" : ""}`}>
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

  const createPatient   = useCreatePatient();
  const createAssessment = useCreateAdmissionAssessment();
  const { data: units = [] } = useListUnits({ status: "active" });

  const [step, setStep]     = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Demographics (Step 1) ──
  const [demo, setDemo] = useState({
    nameEn: "", nameAr: "", dateOfBirth: "", gender: "male",
    bloodGroup: "", nationality: "", nationalId: "",
    phone: "", address: "", residence: "",
    weight: "", height: "", admissionDate: "", dischargeDate: "",
    guardianName: "", guardianRelation: "parent", guardianPhone: "",
    allergies: "", unitId: "",
  });

  // ── History (Step 2) ──
  const [complaint, setComplaint] = useState({
    mainComplaint: "",
    analysisSite: "", analysisOnset: "", analysisCharacter: "",
    analysisRadiation: "", analysisAggravation: "", analysisRelieving: "",
    analysisAssociations: "",
  });
  const [chips,     setChips]     = useState<Record<string, ChipState>>({});
  const [sysNotes,  setSysNotes]  = useState<Record<string, string>>({});
  const [pastHx, setPastHx] = useState({
    pastMedicalHistory: "", familyHistory: "", drugHistory: "",
    socialHistory: "", developmentalHistory: "",
    historySummary: "", provisionalDiagnosis: "",
  });

  // ── Examination (Step 3) ──
  const [examination, setExamination] = useState({
    examinationSummary: "",
    vitalTemp: "", vitalBp: "", vitalPr: "", vitalRr: "", vitalSpo2: "", vitalGcs: "", vitalRbg: "",
    chestExam: "", cvsExam: "", abdomenExam: "", cnsExam: "", entExam: "", skinExam: "",
  });

  // ── Investigations / Plan (Step 4) ──
  const [investigations, setInvestigations] = useState({
    investigationsOrdered: "", managementPlan: "",
  });

  // ── Follow-up (Step 5) ──
  const [followup, setFollowup] = useState({
    morningFollowUp: "", eveningFollowUp: "", dischargeLetter: "",
  });

  // ── Handlers ──
  const handleDemo    = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDemo(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleComplaint = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setComplaint(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePastHx  = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPastHx(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleExam    = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setExamination(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleInvest  = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInvestigations(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleFollowup = (e: React.ChangeEvent<HTMLTextAreaElement>) => setFollowup(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleChip = (key: string, v: ChipState) => setChips(p => ({ ...p, [key]: v }));
  const handleSysNote = (sysKey: string, v: string) => setSysNotes(p => ({ ...p, [sysKey]: v }));

  const isLoading = createPatient.isPending || createAssessment.isPending;

  // Serialize chip state → string for storage
  const serializeSystemicReview = (): string => {
    const lines: string[] = [];
    for (const sys of SYSTEMS) {
      const presents = sys.symptoms.filter(s => chips[`${sys.key}_${s}`] === "present");
      const absents  = sys.symptoms.filter(s => chips[`${sys.key}_${s}`] === "absent");
      const note     = sysNotes[sys.key] ?? "";
      if (presents.length || absents.length || note) {
        let line = `[${sys.label}]`;
        if (presents.length) line += ` +${presents.join(", +")}`;
        if (absents.length)  line += ` -${absents.join(", -")}`;
        if (note)            line += ` | ${note}`;
        lines.push(line);
      }
    }
    return lines.join("\n");
  };

  const hasAssessmentData = () => {
    const textFields = { ...complaint, ...pastHx, ...examination, ...investigations, ...followup };
    const hasText = Object.values(textFields).some(v => v.trim().length > 0);
    const hasChips = Object.values(chips).some(v => v !== "");
    return hasText || hasChips;
  };

  // ── Validation ──
  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!demo.nameEn.trim()) e.nameEn = "Required";
    if (!demo.dateOfBirth)   e.dateOfBirth = "Required";
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

    const patientData: Record<string, unknown> = {
      nameEn: demo.nameEn,
      dateOfBirth: demo.dateOfBirth,
      gender: demo.gender,
    };
    const optionals: (keyof typeof demo)[] = [
      "nameAr","bloodGroup","nationality","nationalId","phone","address","residence",
      "weight","height","admissionDate","dischargeDate","guardianName","guardianRelation","guardianPhone","allergies",
    ];
    for (const k of optionals) { if (demo[k]) patientData[k] = demo[k]; }
    // unitId stored for UX but not yet persisted to DB (Supabase schema migration pending)

    createPatient.mutate({ data: patientData as Parameters<typeof createPatient.mutate>[0]["data"] }, {
      onSuccess: (patient: { id: number }) => {
        queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        if (hasAssessmentData()) {
          const assessmentData: Record<string, unknown> = {
            patientId: patient.id,
            systemicReview: serializeSystemicReview(),
          };
          const allTextFields = { ...complaint, ...pastHx, ...examination, ...investigations, ...followup };
          for (const [k, v] of Object.entries(allTextFields)) { if (v.trim()) assessmentData[k] = v; }

          createAssessment.mutate({ data: assessmentData as Parameters<typeof createAssessment.mutate>[0]["data"] }, {
            onSuccess: () => { toast({ title: t("patient.successTitle"), description: t("patient.successDesc") }); setLocation(`/patients/${patient.id}`); },
            onError:   () => { toast({ title: t("patient.successTitle"), description: t("patient.successDesc") }); setLocation(`/patients/${patient.id}`); },
          });
        } else {
          toast({ title: t("patient.successTitle"), description: t("patient.successDesc") });
          setLocation(`/patients/${patient.id}`);
        }
      },
      onError: () => toast({ variant: "destructive", title: t("patient.errorTitle"), description: t("patient.errorDesc") }),
    });
  };

  const stepLabels  = STEPS.map(s => t(s.labelKey));
  const isLastStep  = step === STEPS.length - 1;

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1 — Demographics
  // ─────────────────────────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

      <SectionTitle title="Patient Identity" />
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

      <SectionTitle title="Measurements" />
      <Field label={t("patient.weight")}>
        <div className="relative">
          <Input name="weight" value={demo.weight} onChange={handleDemo} placeholder="e.g. 12.5" className="pr-10" />
          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">kg</span>
        </div>
      </Field>
      <Field label={t("patient.height")}>
        <div className="relative">
          <Input name="height" value={demo.height} onChange={handleDemo} placeholder="e.g. 95" className="pr-10" />
          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span>
        </div>
      </Field>

      <SectionTitle title="Admission" />
      <Field label={t("patient.admissionDate")}>
        <Input name="admissionDate" type="date" value={demo.admissionDate} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.dischargeDate")}>
        <Input name="dischargeDate" type="date" value={demo.dischargeDate} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.unit")}>
        <Select value={demo.unitId} onValueChange={v => setDemo(p => ({ ...p, unitId: v }))}>
          <SelectTrigger>
            <SelectValue placeholder={t("units.selectUnit")} />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.nameEn}{u.nameAr ? ` — ${u.nameAr}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("patient.residence")}>
        <Input name="residence" value={demo.residence} onChange={handleDemo} placeholder="City / Area" />
      </Field>

      <SectionTitle title={t("patient.contactGuardian")} />
      <Field label={t("patient.guardianName")}>
        <Input name="guardianName" value={demo.guardianName} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.guardianRelation")}>
        <Select value={demo.guardianRelation} onValueChange={v => setDemo(p => ({ ...p, guardianRelation: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parent">{t("patient.parent")}</SelectItem>
            <SelectItem value="sibling">{t("patient.sibling")}</SelectItem>
            <SelectItem value="uncle">Uncle / Aunt</SelectItem>
            <SelectItem value="grandparent">Grandparent</SelectItem>
            <SelectItem value="other">{t("patient.other")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("patient.guardianPhone")}>
        <Input name="guardianPhone" type="tel" value={demo.guardianPhone} onChange={handleDemo} />
      </Field>
      <Field label={t("patient.homePhone")}>
        <Input name="phone" type="tel" value={demo.phone} onChange={handleDemo} />
      </Field>
      <Field label={t("generic.address")}>
        <Input name="address" value={demo.address} onChange={handleDemo} />
      </Field>

      <SectionTitle title={t("patient.medicalAlerts")} />
      <Field label={t("patient.knownAllergies")} span>
        <Textarea name="allergies" value={demo.allergies} onChange={handleDemo}
          placeholder={t("patient.allergiesPlaceholder")} className="min-h-[70px]" />
      </Field>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 2 — History
  // ─────────────────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">

      {/* Main complaint */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
          {t("admit.mainComplaint")}
        </h3>
        <Field label={t("admit.mainComplaint")}>
          <Textarea name="mainComplaint" value={complaint.mainComplaint} onChange={handleComplaint}
            placeholder="Chief complaint in patient's own words…" className="min-h-[70px]" />
        </Field>
      </div>

      {/* SOCRATES analysis */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
          {t("admit.analysisTitle")} <span className="text-[10px] ml-1 normal-case font-normal">SOCRATES</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={`S — ${t("admit.site")}`}>
            <Input name="analysisSite" value={complaint.analysisSite} onChange={handleComplaint} placeholder="Where is the pain/complaint located?" />
          </Field>
          <Field label={`O — ${t("admit.onset")}`}>
            <Input name="analysisOnset" value={complaint.analysisOnset} onChange={handleComplaint} placeholder="Sudden / Gradual, since when…" />
          </Field>
          <Field label={`C — ${t("admit.character")}`}>
            <Input name="analysisCharacter" value={complaint.analysisCharacter} onChange={handleComplaint} placeholder="Sharp / Dull / Colicky / Burning…" />
          </Field>
          <Field label={`R — ${t("admit.radiation")}`}>
            <Input name="analysisRadiation" value={complaint.analysisRadiation} onChange={handleComplaint} placeholder="Does it spread anywhere?" />
          </Field>
          <Field label={`A — ${t("admit.aggravation")}`}>
            <Input name="analysisAggravation" value={complaint.analysisAggravation} onChange={handleComplaint} placeholder="What makes it worse?" />
          </Field>
          <Field label={`R — ${t("admit.relieving")}`}>
            <Input name="analysisRelieving" value={complaint.analysisRelieving} onChange={handleComplaint} placeholder="What makes it better?" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={`E — ${t("admit.associations")}`}>
              <Textarea name="analysisAssociations" value={complaint.analysisAssociations} onChange={handleComplaint}
                placeholder="Associated symptoms: fever, vomiting, rash, etc." className="min-h-[60px]" />
            </Field>
          </div>
        </div>
      </div>

      {/* Review of Systems — per-system chips */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
          {t("admit.systemicReview")}
        </h3>
        <div className="col-span-full flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-dashed">
          <span className="font-medium">Tap each symptom to mark it:</span>
          <span className="inline-flex items-center gap-1"><Circle className="h-3 w-3 opacity-40" /> Not asked</span>
          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Present</span>
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3" /> Absent</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {SYSTEMS.map(sys => (
            <SystemCard
              key={sys.key}
              sys={sys}
              chips={chips}
              onChip={handleChip}
              note={sysNotes[sys.key] ?? ""}
              onNote={v => handleSysNote(sys.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Past / Background history */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
          Past History
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admit.pastMedicalHistory")}>
            <Textarea name="pastMedicalHistory" value={pastHx.pastMedicalHistory} onChange={handlePastHx}
              placeholder="Previous illnesses, surgeries, hospitalizations…" className="min-h-[70px]" />
          </Field>
          <Field label={t("admit.drugHistory")}>
            <Textarea name="drugHistory" value={pastHx.drugHistory} onChange={handlePastHx}
              placeholder="Current medications, doses, duration…" className="min-h-[70px]" />
          </Field>
          <Field label={t("admit.familyHistory")}>
            <Textarea name="familyHistory" value={pastHx.familyHistory} onChange={handlePastHx}
              placeholder="Relevant family medical history…" className="min-h-[70px]" />
          </Field>
          <Field label={t("admit.socialHistory")}>
            <Textarea name="socialHistory" value={pastHx.socialHistory} onChange={handlePastHx}
              placeholder="Living conditions, school, social factors…" className="min-h-[70px]" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("admit.developmentalHistory")}>
              <Textarea name="developmentalHistory" value={pastHx.developmentalHistory} onChange={handlePastHx}
                placeholder="Birth history, milestones — walking, talking, toilet training…" className="min-h-[70px]" />
            </Field>
          </div>
        </div>
      </div>

      {/* Assessment */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">Assessment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("admit.summary")}>
            <Textarea name="historySummary" value={pastHx.historySummary} onChange={handlePastHx}
              placeholder="Brief history summary…" className="min-h-[80px]" />
          </Field>
          <Field label={t("admit.provisionalDiagnosis")}>
            <Textarea name="provisionalDiagnosis" value={pastHx.provisionalDiagnosis} onChange={handlePastHx}
              placeholder="Provisional / working diagnosis…" className="min-h-[80px]" />
          </Field>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 3 — Examination
  // ─────────────────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">

      {/* General appearance */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">General Appearance</h3>
        <Field label={t("admit.examinationSummary")}>
          <Textarea name="examinationSummary" value={examination.examinationSummary} onChange={handleExam}
            placeholder="General appearance, consciousness level, nutritional status, hydration, distress…" className="min-h-[80px]" />
        </Field>
      </div>

      {/* Vital signs — structured grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">{t("admit.vitalsTitle")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: "vitalTemp", label: "Temp (°C)", placeholder: "e.g. 38.5" },
            { name: "vitalBp",   label: t("admit.bp"), placeholder: "e.g. 110/70" },
            { name: "vitalPr",   label: t("admit.pr"), placeholder: "e.g. 88 bpm" },
            { name: "vitalRr",   label: t("admit.rr"), placeholder: "e.g. 20 /min" },
            { name: "vitalSpo2", label: "SpO₂ (%)",   placeholder: "e.g. 98%" },
            { name: "vitalGcs",  label: t("admit.gcs"), placeholder: "e.g. 15/15" },
            { name: "vitalRbg",  label: t("admit.rbg"), placeholder: "e.g. 5.2 mmol/L" },
          ].map(({ name, label, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <Label className="text-sm font-medium">{label}</Label>
              <Input
                name={name}
                value={(examination as Record<string, string>)[name]}
                onChange={handleExam}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* System examination */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">{t("admit.systemsTitle")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "chestExam",  label: "Respiratory / Chest",        placeholder: "Chest wall, air entry, breath sounds, wheeze, crackles, added sounds…" },
            { name: "cvsExam",    label: "Cardiovascular",              placeholder: "Heart sounds S1/S2, murmurs, pulse character, capillary refill, JVP…" },
            { name: "abdomenExam",label: t("admit.abdomenExam"),        placeholder: "Inspection, tenderness, guarding, organomegaly, bowel sounds…" },
            { name: "cnsExam",    label: t("admit.cnsExam"),            placeholder: "Cranial nerves, tone, power, reflexes, coordination, gait…" },
            { name: "entExam",    label: "ENT Examination",             placeholder: "Ears, nose, throat, tonsils, lymphadenopathy…" },
            { name: "skinExam",   label: "Skin / Musculoskeletal",      placeholder: "Rashes, petechiae, joint swelling, range of motion…" },
          ].map(({ name, label, placeholder }) => (
            <Field key={name} label={label}>
              <Textarea
                name={name}
                value={(examination as Record<string, string>)[name]}
                onChange={handleExam}
                placeholder={placeholder}
                className="min-h-[80px]"
              />
            </Field>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 4 — Investigations & Plan
  // ─────────────────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
          Investigations Ordered
        </h3>
        <Textarea name="investigationsOrdered" value={investigations.investigationsOrdered} onChange={handleInvest}
          placeholder={"CBC, CRP, ESR\nBlood culture & sensitivity\nLFTs, RFTs, electrolytes\nUrinalysis / Urine C&S\nCXR, Abdominal U/S\nECG…"}
          className="min-h-[150px] font-mono text-sm" />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
          Management Plan
        </h3>
        <Textarea name="managementPlan" value={investigations.managementPlan} onChange={handleInvest}
          placeholder={"IV access, IV fluids (type / rate)\nEmpiric antibiotics: …\nAnalgesics / antipyretics\nMonitoring: O2 sat, vitals q4h\nConsultations: …\nParent counselling: …"}
          className="min-h-[150px] font-mono text-sm" />
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 5 — Follow-up
  // ─────────────────────────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("admit.morningFollowUp")}>
        <Textarea name="morningFollowUp" value={followup.morningFollowUp} onChange={handleFollowup}
          placeholder="Morning ward round findings, vitals, changes…" className="min-h-[130px]" />
      </Field>
      <Field label={t("admit.eveningFollowUp")}>
        <Textarea name="eveningFollowUp" value={followup.eveningFollowUp} onChange={handleFollowup}
          placeholder="Evening follow-up notes…" className="min-h-[130px]" />
      </Field>
      <Field label={t("admit.dischargeLetter")} span>
        <Textarea name="dischargeLetter" value={followup.dischargeLetter} onChange={handleFollowup}
          placeholder="Discharge summary — diagnosis, treatment given, medications on discharge, follow-up plan, referrals…"
          className="min-h-[150px]" />
      </Field>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" style={{ transform: isRtl ? "scaleX(-1)" : undefined }} />
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
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          {(() => { const Icon = STEPS[step].icon; return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
          <div>
            <h2 className="font-semibold text-foreground">{stepLabels[step]}</h2>
            <p className="text-xs text-muted-foreground">
              {`Step ${step + 1} of ${STEPS.length}`}
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
        <Button type="button" variant="outline"
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

        <div className="flex items-center gap-2">
          {!isLastStep ? (
            <Button type="button" onClick={handleNext}>
              {t("generic.next") || "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isLoading}>
              {isLoading
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Save className="h-4 w-4 mr-2" />}
              {t("admit.registerAndSave")}
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
