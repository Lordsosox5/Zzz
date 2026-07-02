import { useEffect, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth";

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
    <div className="grid grid-cols-[200px_1fr] gap-2 py-1.5 border-b border-gray-100 text-sm print:text-[11pt]">
      <span className="font-semibold text-gray-600">{label}</span>
      <span className="whitespace-pre-wrap text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 print:mb-4">
      <div className="bg-gray-800 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 mb-2">
        {title}
      </div>
      <div className="px-2">{children}</div>
    </div>
  );
}

const CONDITION_LABELS: Record<string, string> = {
  good: "Good / جيدة",
  improved: "Improved / تحسنت",
  fair: "Fair / مقبولة",
  poor: "Poor / ضعيفة",
};

export default function DischargePrint({ params }: { params: { id: string; summaryId: string } }) {
  const patientId = parseInt(params.id, 10);
  const summaryId = parseInt(params.summaryId, 10);
  const printedRef = useRef(false);

  const [patient, setPatient] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`/api/patients/${patientId}/summary`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/discharge-summaries/${summaryId}`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([patData, dsData]) => {
      if (!patData?.patient || !dsData) { setError("Data not found."); return; }
      setPatient(patData.patient);
      setSummary(dsData);
    }).catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [patientId, summaryId]);

  useEffect(() => {
    if (!loading && patient && summary && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, patient, summary]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );

  if (error || !patient || !summary) return (
    <div className="p-8 text-center text-gray-500">{error ?? "Not found."}</div>
  );

  const dob = patient.dateOfBirth;
  const admDate = summary.admissionDate
    ? new Date(summary.admissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const disDate = new Date(summary.dischargeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => window.print()} className="gap-2 shadow-lg">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
        <Button variant="outline" onClick={() => window.close()}>Close</Button>
      </div>

      <div className="max-w-[210mm] mx-auto px-8 py-10 print:max-w-none print:w-full print:mx-0 print:px-0 print:py-0">

        {/* Hospital header */}
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
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">Discharge Summary</div>
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">ملخص الخروج</div>
            <div className="mt-1">MRN: <span className="font-mono font-bold text-gray-900">{patient.mrn}</span></div>
            <div>Admitted: <span className="font-semibold text-gray-800">{admDate}</span></div>
            <div>Discharged: <span className="font-semibold text-gray-800">{disDate}</span></div>
            <div>Prepared: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
          </div>
        </div>

        {/* Patient banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-gray-50 border rounded p-3">
          {[
            { label: "Name (EN)", value: patient.nameEn },
            { label: "الاسم (عربي)", value: patient.nameAr ?? "—" },
            { label: "Date of Birth", value: new Date(dob).toLocaleDateString("en-GB") + ` (${age(dob)})` },
            { label: "Gender", value: patient.gender === "male" ? "Male / ذكر" : "Female / أنثى" },
            { label: "Blood Group", value: patient.bloodGroup ?? "—" },
            { label: "Nationality", value: patient.nationality ?? "—" },
            { label: "Allergies", value: patient.allergies || "NKDA" },
            { label: "Guardian", value: patient.guardianName ? `${patient.guardianName} (${patient.guardianRelation ?? ""})` : "—" },
            { label: "Guardian Phone", value: patient.guardianPhone ?? patient.phone ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="text-xs">
              <div className="text-gray-500 font-medium mb-0.5">{label}</div>
              <div className="font-semibold text-gray-900 text-[11px]">{value}</div>
            </div>
          ))}
        </div>

        {/* Diagnoses */}
        <Section title="Diagnoses / التشخيص">
          <Row label="Primary Diagnosis" value={summary.primaryDiagnosis} />
          <Row label="Secondary Diagnoses" value={summary.secondaryDiagnoses} />
          <Row label="Condition at Discharge" value={CONDITION_LABELS[summary.conditionAtDischarge] ?? summary.conditionAtDischarge} />
        </Section>

        {/* Hospital Course */}
        <Section title="Hospital Course / المسار الاستشفائي">
          <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap leading-relaxed">{summary.hospitalCourse}</p>
        </Section>

        {/* Discharge Medications */}
        {summary.dischargeMedications && (
          <Section title="Discharge Medications / أدوية الخروج">
            <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap leading-relaxed">{summary.dischargeMedications}</p>
          </Section>
        )}

        {/* Follow-up */}
        {summary.followUpInstructions && (
          <Section title="Follow-up Instructions / تعليمات المتابعة">
            <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap leading-relaxed">{summary.followUpInstructions}</p>
          </Section>
        )}

        {/* Diet & Activity */}
        {(summary.dietInstructions || summary.activityRestrictions) && (
          <Section title="Diet & Activity / الغذاء والنشاط">
            <Row label="Diet Instructions" value={summary.dietInstructions} />
            <Row label="Activity Restrictions" value={summary.activityRestrictions} />
          </Section>
        )}

        {/* Signature block */}
        <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-2 gap-10 text-xs text-gray-600 print:mt-8">
          <div className="text-center">
            <div className="border-b border-gray-400 mb-8" />
            <div className="font-medium">Discharging Doctor / الطبيب المسؤول</div>
            {summary.createdByName && <div className="text-gray-500 mt-0.5">{summary.createdByName}</div>}
            <div className="text-gray-400 mt-0.5">Name / Signature / Date</div>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 mb-8" />
            <div className="font-medium">Consultant / الاستشاري</div>
            <div className="text-gray-400 mt-0.5">Name / Signature / Date</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[9px] text-gray-400 border-t pt-2">
          Almuzini Children Hospital EHR · Discharge Summary · Generated {new Date().toLocaleString()} · CONFIDENTIAL
        </div>

      </div>

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
