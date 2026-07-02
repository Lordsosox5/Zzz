import { useEffect, useRef } from "react";
import { useGetPatientSummary, useGetPatientAssessment } from "@workspace/api-client-react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── helpers ── */
function age(dob: string): string {
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  if (years >= 2) return `${years} yrs`;
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
  if (months >= 1) return `${months} mo`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} d`;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-1 py-1 border-b border-gray-100 text-sm print:text-[11pt]">
      <span className="font-semibold text-gray-600">{label}</span>
      <span className="whitespace-pre-wrap text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 print:mb-4">
      <div className="bg-gray-800 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 mb-2 print:bg-gray-800 print:text-white">
        {title}
      </div>
      <div className="px-2">{children}</div>
    </div>
  );
}

function VitalBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border rounded p-2 text-center min-w-[80px]">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-800">{value || "—"}</div>
    </div>
  );
}

/* ── main ── */
export default function PatientPrint({ params }: { params: { id: string } }) {
  const patientId = parseInt(params.id, 10);
  const printedRef = useRef(false);

  const { data: summary, isLoading: loadingSum } = useGetPatientSummary(patientId, {
    query: { enabled: !!patientId },
  });
  const { data: assessment, isLoading: loadingAss } = useGetPatientAssessment(patientId, {
    query: { enabled: !!patientId },
  });

  const isLoading = loadingSum || loadingAss;
  const patient = summary?.patient;

  /* auto-print once data arrives */
  useEffect(() => {
    if (!isLoading && patient && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isLoading, patient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">Patient not found.</div>;
  }

  const a = assessment as Record<string, string | null | undefined> | undefined;
  const hasSocrates = a && (a.analysisSite || a.analysisOnset || a.analysisCharacter);
  const hasVitals   = a && (a.vitalBp || a.vitalPr || a.vitalRr || a.vitalGcs || a.vitalRbg);
  const hasSystems  = a && (a.chestExam || a.cvsExam || a.abdomenExam || a.cnsExam || a.entExam || a.skinExam);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Print button (hidden when printing) ── */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => window.print()} className="gap-2 shadow-lg">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
        <Button variant="outline" onClick={() => window.close()}>Close</Button>
      </div>

      <div className="max-w-[210mm] mx-auto px-8 py-10 print:max-w-none print:w-full print:mx-0 print:px-0 print:py-0">

        {/* ── Hospital header ── */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight print:text-[18pt]">
              مستشفى المزيني للأطفال
            </div>
            <div className="text-lg font-bold text-gray-700 print:text-[13pt]">
              Almuzini Children Hospital
            </div>
            <div className="text-xs text-gray-500 mt-1">Pediatric EHR System · Confidential Medical Record</div>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">Admission Summary</div>
            <div>MRN: <span className="font-mono font-bold text-gray-900">{patient.mrn}</span></div>
            <div>Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
            {patient.admissionDate && <div>Admitted: {new Date(patient.admissionDate).toLocaleDateString("en-GB")}</div>}
          </div>
        </div>

        {/* ── Patient banner ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-gray-50 border rounded p-3">
          {[
            { label: "Name (EN)", value: patient.nameEn },
            { label: "Name (AR)", value: patient.nameAr ?? "—" },
            { label: "Date of Birth", value: new Date(patient.dateOfBirth).toLocaleDateString("en-GB") + ` (${age(patient.dateOfBirth)})` },
            { label: "Gender", value: patient.gender === "male" ? "Male / ذكر" : "Female / أنثى" },
            { label: "Blood Group", value: patient.bloodGroup ?? "—" },
            { label: "Nationality", value: patient.nationality ?? "—" },
            { label: "National ID", value: patient.nationalId ?? "—" },
            { label: "Allergies", value: patient.allergies || "NKDA" },
            { label: "Guardian", value: patient.guardianName ? `${patient.guardianName} (${patient.guardianRelation ?? ""})` : "—" },
            { label: "Guardian Phone", value: patient.guardianPhone ?? patient.phone ?? "—" },
            { label: "Residence", value: patient.residence ?? "—" },
            { label: "Weight / Height", value: [patient.weight ? `${patient.weight} kg` : null, patient.height ? `${patient.height} cm` : null].filter(Boolean).join(" · ") || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="text-xs">
              <div className="text-gray-500 font-medium mb-0.5">{label}</div>
              <div className="font-semibold text-gray-900 text-[11px]">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Main Complaint ── */}
        {a?.mainComplaint && (
          <Section title="Chief Complaint">
            <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap">{a.mainComplaint}</p>
          </Section>
        )}

        {/* ── SOCRATES ── */}
        {hasSocrates && (
          <Section title="Analysis of Complaint — SOCRATES">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Row label="S — Site"           value={a?.analysisSite} />
              <Row label="O — Onset"          value={a?.analysisOnset} />
              <Row label="C — Character"      value={a?.analysisCharacter} />
              <Row label="R — Radiation"      value={a?.analysisRadiation} />
              <Row label="A — Aggravation"    value={a?.analysisAggravation} />
              <Row label="R — Relieving"      value={a?.analysisRelieving} />
              <div className="col-span-full">
                <Row label="E — Associations" value={a?.analysisAssociations} />
              </div>
            </div>
          </Section>
        )}

        {/* ── Systemic Review ── */}
        {a?.systemicReview && (
          <Section title="Review of Systems">
            <pre className="text-[11px] text-gray-800 whitespace-pre-wrap font-sans leading-relaxed py-1">{a.systemicReview}</pre>
          </Section>
        )}

        {/* ── Past History ── */}
        {(a?.pastMedicalHistory || a?.drugHistory || a?.familyHistory || a?.socialHistory || a?.developmentalHistory) && (
          <Section title="Past History">
            <Row label="Past Medical History" value={a?.pastMedicalHistory} />
            <Row label="Drug History"         value={a?.drugHistory} />
            <Row label="Family History"       value={a?.familyHistory} />
            <Row label="Social History"       value={a?.socialHistory} />
            <Row label="Developmental Hx"     value={a?.developmentalHistory} />
          </Section>
        )}

        {/* ── Provisional Diagnosis ── */}
        {(a?.historySummary || a?.provisionalDiagnosis) && (
          <Section title="Provisional Diagnosis">
            <Row label="History Summary"     value={a?.historySummary} />
            <Row label="Provisional Dx"      value={a?.provisionalDiagnosis} />
          </Section>
        )}

        {/* ── Vital Signs ── */}
        {hasVitals && (
          <Section title="Vital Signs on Admission">
            <div className="flex flex-wrap gap-2 py-1">
              <VitalBox label="Temp (°C)"  value={(a as Record<string, string | null | undefined>)?.vitalTemp} />
              <VitalBox label="BP (mmHg)"  value={a?.vitalBp} />
              <VitalBox label="HR (bpm)"   value={a?.vitalPr} />
              <VitalBox label="RR (/min)"  value={a?.vitalRr} />
              <VitalBox label="SpO₂ (%)"   value={(a as Record<string, string | null | undefined>)?.vitalSpo2} />
              <VitalBox label="GCS"        value={a?.vitalGcs} />
              <VitalBox label="RBG"        value={a?.vitalRbg} />
            </div>
          </Section>
        )}

        {/* ── General Examination ── */}
        {a?.examinationSummary && (
          <Section title="General Examination">
            <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap">{a.examinationSummary}</p>
          </Section>
        )}

        {/* ── Systems Examination ── */}
        {hasSystems && (
          <Section title="Systemic Examination">
            <Row label="Respiratory / Chest"      value={a?.chestExam} />
            <Row label="Cardiovascular"           value={(a as Record<string, string | null | undefined>)?.cvsExam} />
            <Row label="Abdomen"                  value={a?.abdomenExam} />
            <Row label="CNS / Neurological"       value={a?.cnsExam} />
            <Row label="ENT"                      value={(a as Record<string, string | null | undefined>)?.entExam} />
            <Row label="Skin / MSK"               value={(a as Record<string, string | null | undefined>)?.skinExam} />
          </Section>
        )}

        {/* ── Investigations ── */}
        {a?.investigationsOrdered && (
          <Section title="Investigations Ordered">
            <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap py-1 leading-relaxed">{a.investigationsOrdered}</pre>
          </Section>
        )}

        {/* ── Management Plan ── */}
        {a?.managementPlan && (
          <Section title="Management Plan">
            <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap py-1 leading-relaxed">{a.managementPlan}</pre>
          </Section>
        )}

        {/* ── Follow-up ── */}
        {(a?.morningFollowUp || a?.eveningFollowUp) && (
          <Section title="Follow-up Notes">
            <Row label="Morning Round"  value={a?.morningFollowUp} />
            <Row label="Evening Round"  value={a?.eveningFollowUp} />
          </Section>
        )}

        {/* ── Discharge ── */}
        {a?.dischargeLetter && (
          <Section title="Discharge Summary / Referral Letter">
            <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap">{a.dischargeLetter}</p>
          </Section>
        )}

        {/* ── Signature block ── */}
        <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-3 gap-8 text-xs text-gray-600 print:mt-8">
          {["Admitting Doctor", "Nurse on Duty", "Supervisor / Consultant"].map(role => (
            <div key={role} className="text-center">
              <div className="border-b border-gray-400 mb-6" />
              <div className="font-medium">{role}</div>
              <div className="text-gray-400 mt-0.5">Name / Signature / Date</div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 text-center text-[9px] text-gray-400 border-t pt-2">
          Almuzini Children Hospital EHR · Generated {new Date().toLocaleString()} · CONFIDENTIAL — For authorised medical staff only
        </div>

      </div>

      {/* ── Print-only global styles ── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm 16mm; }
          body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .bg-gray-800 { background-color: #1f2937 !important; color: white !important; }
          .bg-gray-50  { background-color: #f9fafb !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
