import { useEffect, useRef } from "react";
import { useGetPatientSummary, useGetPatientAssessment } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth";

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

function fmt(d: any) { return d ? new Date(d).toLocaleDateString("en-GB") : "—"; }
function fmtDt(d: any) { return d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[200px_1fr] gap-1 py-1 border-b border-gray-100 text-sm">
      <span className="font-semibold text-gray-600">{label}</span>
      <span className="whitespace-pre-wrap text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 break-inside-avoid-page">
      <div className="bg-gray-800 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 mb-2">
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

function DataTable({ columns, rows, empty = "No records" }: {
  columns: { key: string; label: string; render?: (v: any, row: any) => string }[];
  rows: any[];
  empty?: string;
}) {
  if (!rows.length) {
    return <p className="text-xs text-gray-400 italic py-2">{empty}</p>;
  }
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-gray-100">
          {columns.map(c => (
            <th key={c.key} className="text-left font-semibold text-gray-600 px-2 py-1.5 border border-gray-200">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
            {columns.map(c => (
              <td key={c.key} className="px-2 py-1 border border-gray-200 text-gray-800 whitespace-pre-wrap">
                {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── fetch helper ── */
async function fetchApi(path: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items ?? data.records ?? []);
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

  /* ── additional clinical data ── */
  const { data: diagnoses = [], isLoading: loadingDx } = useQuery({
    queryKey: ["print-diagnoses", patientId],
    queryFn: () => fetchApi(`/api/diagnoses?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: labOrders = [], isLoading: loadingLab } = useQuery({
    queryKey: ["print-lab", patientId],
    queryFn: () => fetchApi(`/api/lab-orders?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: radOrders = [], isLoading: loadingRad } = useQuery({
    queryKey: ["print-rad", patientId],
    queryFn: () => fetchApi(`/api/radiology-orders?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: prescriptions = [], isLoading: loadingRx } = useQuery({
    queryKey: ["print-rx", patientId],
    queryFn: () => fetchApi(`/api/prescriptions?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: clinicalNotes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ["print-notes", patientId],
    queryFn: () => fetchApi(`/api/clinical-notes?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: vaccinations = [], isLoading: loadingVacc } = useQuery({
    queryKey: ["print-vacc", patientId],
    queryFn: () => fetchApi(`/api/vaccinations?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: growthRecords = [], isLoading: loadingGrowth } = useQuery({
    queryKey: ["print-growth", patientId],
    queryFn: () => fetchApi(`/api/growth-records?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const { data: dischargeSummaries = [], isLoading: loadingDischarge } = useQuery({
    queryKey: ["print-discharge", patientId],
    queryFn: () => fetchApi(`/api/discharge-summaries?patientId=${patientId}`),
    enabled: !!patientId,
  });

  const isLoading = loadingSum || loadingAss || loadingDx || loadingLab || loadingRad ||
    loadingRx || loadingNotes || loadingVacc || loadingGrowth || loadingDischarge;

  const patient = summary?.patient;

  /* auto-print once all data arrives */
  useEffect(() => {
    if (!isLoading && patient && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isLoading, patient]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="text-sm text-gray-400">Loading complete patient record…</p>
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">Patient not found.</div>;
  }

  const a = assessment as Record<string, string | null | undefined> | undefined;
  const hasSocrates = a && (a.analysisSite || a.analysisOnset || a.analysisCharacter);
  const hasVitals   = a && (a.vitalTemp || a.vitalBp || a.vitalPr || a.vitalRr || a.vitalSpo2 || a.vitalGcs || a.vitalRbg);
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

      <div className="max-w-[210mm] mx-auto px-8 py-10 print:max-w-none print:w-full print:mx-0 print:px-6 print:py-4">

        {/* ── Hospital header ── */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
          <div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              مستشفى المزيني للأطفال
            </div>
            <div className="text-lg font-bold text-gray-700">
              Almuzini Children Hospital
            </div>
            <div className="text-xs text-gray-500 mt-1">Pediatric EHR System · Confidential Medical Record</div>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">Full Patient Record</div>
            <div>MRN: <span className="font-mono font-bold text-gray-900">{patient.mrn}</span></div>
            <div>Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
            {patient.admissionDate && <div>Admitted: {fmt(patient.admissionDate)}</div>}
            {patient.dischargeDate && <div>Discharged: {fmt(patient.dischargeDate)}</div>}
          </div>
        </div>

        {/* ══ SECTION 1: PATIENT DEMOGRAPHICS ══ */}
        <Section title="Patient Demographics">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-0">
            <Row label="Full Name (EN)"       value={patient.nameEn} />
            <Row label="Full Name (AR)"       value={patient.nameAr} />
            <Row label="Date of Birth"        value={`${fmt(patient.dateOfBirth)} (${age(patient.dateOfBirth)})`} />
            <Row label="Gender"               value={patient.gender === "male" ? "Male / ذكر" : "Female / أنثى"} />
            <Row label="Nationality"          value={patient.nationality} />
            <Row label="National ID"          value={patient.nationalId} />
            <Row label="Blood Group"          value={patient.bloodGroup ?? (patient as any).bloodType} />
            <Row label="Mother Blood Group"   value={(patient as any).motherBloodGroup} />
            <Row label="Allergies / NKDA"     value={patient.allergies || "NKDA — No Known Drug Allergies"} />
            <Row label="Address"              value={(patient as any).address} />
            <Row label="Residence"            value={(patient as any).residence} />
            <Row label="Phone"                value={(patient as any).phone} />
            <Row label="Guardian Name"        value={patient.guardianName ? `${patient.guardianName}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ""}` : undefined} />
            <Row label="Guardian Phone"       value={patient.guardianPhone} />
            <Row label="Weight / Height"      value={[(patient as any).weight ? `${(patient as any).weight} kg` : null, (patient as any).height ? `${(patient as any).height} cm` : null].filter(Boolean).join(" · ") || undefined} />
            <Row label="Admission Status"     value={(patient as any).status} />
            <Row label="Admission Date"       value={fmt(patient.admissionDate)} />
            <Row label="Discharge Date"       value={(patient as any).dischargeDate ? fmt((patient as any).dischargeDate) : undefined} />
            <Row label="Registered"           value={fmtDt((patient as any).createdAt)} />
          </div>
        </Section>

        {/* ══ SECTION 2: ADMISSION ASSESSMENT ══ */}
        {a && (
          <>
            {a.mainComplaint && (
              <Section title="Chief Complaint">
                <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap">{a.mainComplaint}</p>
              </Section>
            )}

            {hasSocrates && (
              <Section title="Analysis of Complaint — SOCRATES">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <Row label="S — Site"           value={a.analysisSite} />
                  <Row label="O — Onset"          value={a.analysisOnset} />
                  <Row label="C — Character"      value={a.analysisCharacter} />
                  <Row label="R — Radiation"      value={a.analysisRadiation} />
                  <Row label="A — Aggravation"    value={a.analysisAggravation} />
                  <Row label="R — Relieving"      value={a.analysisRelieving} />
                  <div className="col-span-full">
                    <Row label="E — Associations" value={a.analysisAssociations} />
                  </div>
                </div>
              </Section>
            )}

            {a.systemicReview && (
              <Section title="Review of Systems">
                <pre className="text-[11px] text-gray-800 whitespace-pre-wrap font-sans leading-relaxed py-1">{a.systemicReview}</pre>
              </Section>
            )}

            {(a.pastMedicalHistory || a.drugHistory || a.familyHistory || a.socialHistory || a.developmentalHistory) && (
              <Section title="Past History">
                <Row label="Past Medical History" value={a.pastMedicalHistory} />
                <Row label="Drug History"         value={a.drugHistory} />
                <Row label="Family History"       value={a.familyHistory} />
                <Row label="Social History"       value={a.socialHistory} />
                <Row label="Developmental Hx"     value={a.developmentalHistory} />
              </Section>
            )}

            {(a.historySummary || a.provisionalDiagnosis) && (
              <Section title="Provisional Diagnosis">
                <Row label="History Summary"  value={a.historySummary} />
                <Row label="Provisional Dx"   value={a.provisionalDiagnosis} />
              </Section>
            )}

            {hasVitals && (
              <Section title="Vital Signs on Admission">
                <div className="flex flex-wrap gap-2 py-1">
                  <VitalBox label="Temp (°C)"  value={a.vitalTemp} />
                  <VitalBox label="BP (mmHg)"  value={a.vitalBp} />
                  <VitalBox label="HR (bpm)"   value={a.vitalPr} />
                  <VitalBox label="RR (/min)"  value={a.vitalRr} />
                  <VitalBox label="SpO₂ (%)"   value={a.vitalSpo2} />
                  <VitalBox label="GCS"        value={a.vitalGcs} />
                  <VitalBox label="RBG"        value={a.vitalRbg} />
                </div>
              </Section>
            )}

            {a.examinationSummary && (
              <Section title="General Examination">
                <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap">{a.examinationSummary}</p>
              </Section>
            )}

            {hasSystems && (
              <Section title="Systemic Examination">
                <Row label="Respiratory / Chest" value={a.chestExam} />
                <Row label="Cardiovascular"       value={a.cvsExam} />
                <Row label="Abdomen"              value={a.abdomenExam} />
                <Row label="CNS / Neurological"   value={a.cnsExam} />
                <Row label="ENT"                  value={a.entExam} />
                <Row label="Skin / MSK"           value={a.skinExam} />
              </Section>
            )}

            {a.investigationsOrdered && (
              <Section title="Investigations Ordered (Admission)">
                <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap py-1 leading-relaxed">{a.investigationsOrdered}</pre>
              </Section>
            )}

            {a.managementPlan && (
              <Section title="Management Plan">
                <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap py-1 leading-relaxed">{a.managementPlan}</pre>
              </Section>
            )}

            {(a.morningFollowUp || a.eveningFollowUp) && (
              <Section title="Follow-up Notes">
                <Row label="Morning Round" value={a.morningFollowUp} />
                <Row label="Evening Round" value={a.eveningFollowUp} />
              </Section>
            )}

            {a.dischargeLetter && (
              <Section title="Discharge Summary / Referral Letter">
                <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap">{a.dischargeLetter}</p>
              </Section>
            )}
          </>
        )}

        {/* ══ SECTION 3: DIAGNOSES ══ */}
        <Section title={`Diagnoses (${(diagnoses as any[]).length})`}>
          <DataTable
            empty="No diagnoses recorded"
            columns={[
              { key: "code",        label: "ICD Code" },
              { key: "description", label: "Description", render: (v, r) => v ?? r.name ?? "—" },
              { key: "status",      label: "Status" },
              { key: "type",        label: "Type" },
              { key: "createdAt",   label: "Date", render: v => fmt(v) },
            ]}
            rows={diagnoses as any[]}
          />
        </Section>

        {/* ══ SECTION 4: PRESCRIPTIONS ══ */}
        <Section title={`Prescriptions (${(prescriptions as any[]).length})`}>
          <DataTable
            empty="No prescriptions recorded"
            columns={[
              { key: "medicationName", label: "Medication",  render: (v, r) => v ?? r.medication ?? "—" },
              { key: "dose",           label: "Dose" },
              { key: "route",          label: "Route" },
              { key: "frequency",      label: "Frequency" },
              { key: "duration",       label: "Duration" },
              { key: "status",         label: "Status" },
              { key: "prescriberName", label: "Prescribed By" },
              { key: "notes",          label: "Notes" },
              { key: "createdAt",      label: "Date", render: v => fmt(v) },
            ]}
            rows={prescriptions as any[]}
          />
        </Section>

        {/* ══ SECTION 5: LAB ORDERS ══ */}
        <Section title={`Laboratory Orders (${(labOrders as any[]).length})`}>
          <DataTable
            empty="No lab orders recorded"
            columns={[
              { key: "testName",      label: "Test",     render: (v, r) => v ?? r.test_name ?? "—" },
              { key: "priority",      label: "Priority" },
              { key: "status",        label: "Status" },
              { key: "isCritical",    label: "Critical", render: v => v ? "⚠ YES" : "No" },
              { key: "result",        label: "Result",   render: (v, r) => v ?? r.resultValue ?? "—" },
              { key: "unit",          label: "Unit",     render: (v, r) => v ?? r.resultUnit ?? "—" },
              { key: "referenceRange",label: "Ref. Range" },
              { key: "orderedByName", label: "Ordered By" },
              { key: "notes",         label: "Notes" },
              { key: "createdAt",     label: "Date", render: v => fmt(v) },
            ]}
            rows={labOrders as any[]}
          />
        </Section>

        {/* ══ SECTION 6: RADIOLOGY ORDERS ══ */}
        <Section title={`Radiology Orders (${(radOrders as any[]).length})`}>
          <DataTable
            empty="No radiology orders recorded"
            columns={[
              { key: "modality",     label: "Modality" },
              { key: "orderType",    label: "Type",   render: (v, r) => v ?? r.examType ?? "—" },
              { key: "clinicalInfo", label: "Clinical Info" },
              { key: "status",       label: "Status" },
              { key: "findings",     label: "Findings",  render: (v, r) => v ?? r.report ?? "—" },
              { key: "impression",   label: "Impression" },
              { key: "radiologistName", label: "Radiologist" },
              { key: "reportedAt",   label: "Reported", render: v => fmt(v) },
              { key: "createdAt",    label: "Ordered",  render: v => fmt(v) },
            ]}
            rows={radOrders as any[]}
          />
        </Section>

        {/* ══ SECTION 7: CLINICAL NOTES ══ */}
        <Section title={`Clinical Notes (${(clinicalNotes as any[]).length})`}>
          {(clinicalNotes as any[]).length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No clinical notes recorded</p>
          ) : (
            (clinicalNotes as any[]).map((note: any, i: number) => (
              <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-gray-700">
                    {note.type ?? note.noteType ?? "Note"}{note.authorName ? ` — ${note.authorName}` : ""}
                  </div>
                  <div className="text-[10px] text-gray-400">{fmtDt(note.createdAt)}</div>
                </div>
                {note.subjective && (
                  <div className="text-xs mb-0.5"><span className="font-semibold text-gray-600">S: </span><span className="text-gray-800">{note.subjective}</span></div>
                )}
                {note.objective && (
                  <div className="text-xs mb-0.5"><span className="font-semibold text-gray-600">O: </span><span className="text-gray-800">{note.objective}</span></div>
                )}
                {note.assessment && (
                  <div className="text-xs mb-0.5"><span className="font-semibold text-gray-600">A: </span><span className="text-gray-800">{note.assessment}</span></div>
                )}
                {note.plan && (
                  <div className="text-xs mb-0.5"><span className="font-semibold text-gray-600">P: </span><span className="text-gray-800">{note.plan}</span></div>
                )}
                {note.content && (
                  <div className="text-xs text-gray-800 whitespace-pre-wrap">{note.content}</div>
                )}
              </div>
            ))
          )}
        </Section>

        {/* ══ SECTION 8: VACCINATIONS ══ */}
        <Section title={`Vaccinations (${(vaccinations as any[]).length})`}>
          <DataTable
            empty="No vaccinations recorded"
            columns={[
              { key: "vaccineName",  label: "Vaccine",    render: (v, r) => v ?? r.vaccine ?? r.name ?? "—" },
              { key: "dose",         label: "Dose" },
              { key: "batchNumber",  label: "Batch #" },
              { key: "site",         label: "Site" },
              { key: "administeredBy", label: "Given By" },
              { key: "notes",        label: "Notes" },
              { key: "givenAt",      label: "Date",  render: (v, r) => fmt(v ?? r.createdAt) },
            ]}
            rows={vaccinations as any[]}
          />
        </Section>

        {/* ══ SECTION 9: GROWTH RECORDS ══ */}
        <Section title={`Growth Records (${(growthRecords as any[]).length})`}>
          <DataTable
            empty="No growth records recorded"
            columns={[
              { key: "recordedAt",       label: "Date",          render: (v, r) => fmt(v ?? r.createdAt) },
              { key: "weight",           label: "Weight (kg)" },
              { key: "height",           label: "Height (cm)" },
              { key: "bmi",              label: "BMI" },
              { key: "headCircumference",label: "Head Circ. (cm)" },
              { key: "weightPercentile", label: "Wt %ile" },
              { key: "heightPercentile", label: "Ht %ile" },
              { key: "notes",            label: "Notes" },
            ]}
            rows={growthRecords as any[]}
          />
        </Section>

        {/* ══ SECTION 10: DISCHARGE SUMMARIES ══ */}
        {(dischargeSummaries as any[]).length > 0 && (
          <Section title={`Discharge Summaries (${(dischargeSummaries as any[]).length})`}>
            {(dischargeSummaries as any[]).map((ds: any, i: number) => (
              <div key={i} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase">Discharge Summary #{i + 1}</span>
                  <span className="text-[10px] text-gray-400">{fmtDt(ds.createdAt)}</span>
                </div>
                {ds.finalDiagnosis  && <Row label="Final Diagnosis"    value={ds.finalDiagnosis} />}
                {ds.conditionOnDischarge && <Row label="Condition on Discharge" value={ds.conditionOnDischarge} />}
                {ds.treatmentGiven  && <Row label="Treatment Given"    value={ds.treatmentGiven} />}
                {ds.dischargeInstructions && <Row label="Instructions" value={ds.dischargeInstructions} />}
                {ds.followUpPlan   && <Row label="Follow-up Plan"      value={ds.followUpPlan} />}
                {ds.medicationsOnDischarge && <Row label="Medications at Discharge" value={ds.medicationsOnDischarge} />}
              </div>
            ))}
          </Section>
        )}

        {/* ── Signature block ── */}
        <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-3 gap-8 text-xs text-gray-600">
          {["Treating Doctor", "Nurse on Duty", "Supervisor / Consultant"].map(role => (
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
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; font-size: 10pt; }
          .bg-gray-800 { background-color: #1f2937 !important; color: white !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-gray-50  { background-color: #f9fafb !important; }
          .bg-white    { background-color: #ffffff !important; }
          .print\\:hidden { display: none !important; }
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          .break-inside-avoid-page { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
