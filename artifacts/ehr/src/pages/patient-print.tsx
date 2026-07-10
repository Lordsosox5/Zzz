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
  if (years >= 2) return `${years} سنة`;
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
  if (months >= 1) return `${months} شهر`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} يوم`;
}

function fmt(d: any) { return d ? new Date(d).toLocaleDateString("ar-SA") : "—"; }
function fmtDt(d: any) {
  return d
    ? new Date(d).toLocaleString("ar-SA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: "4px", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: "11pt" }}>
      <span style={{ fontWeight: 600, color: "#4b5563" }}>{label}</span>
      <span style={{ color: "#111827", whiteSpace: "pre-wrap" }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px", breakInside: "avoid" }}>
      <div dir="rtl" style={{ backgroundColor: "#1f2937", color: "#ffffff", fontSize: "10pt", fontWeight: 700, letterSpacing: "0.05em", padding: "5px 10px", marginBottom: "6px", textAlign: "right" }}>
        {title}
      </div>
      <div style={{ paddingInline: "6px" }}>{children}</div>
    </div>
  );
}

function VitalBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "6px 8px", textAlign: "center", minWidth: "78px" }}>
      <div style={{ fontSize: "9pt", color: "#6b7280", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "11pt", fontWeight: 700, color: "#1f2937" }}>{value || "—"}</div>
    </div>
  );
}

function DataTable({ columns, rows, empty = "لا سجلات" }: {
  columns: { key: string; label: string; render?: (v: any, row: any) => string }[];
  rows: any[];
  empty?: string;
}) {
  if (!rows.length) {
    return <p style={{ fontSize: "10pt", color: "#9ca3af", fontStyle: "italic", padding: "6px 0", textAlign: "right" }}>{empty}</p>;
  }
  return (
    <table dir="rtl" style={{ width: "100%", fontSize: "9.5pt", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ backgroundColor: "#e5e7eb" }}>
          {columns.map(c => (
            <th key={c.key} style={{ textAlign: "right", fontWeight: 600, color: "#374151", padding: "5px 7px", border: "1px solid #d1d5db" }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
            {columns.map(c => (
              <td key={c.key} style={{ padding: "4px 7px", border: "1px solid #d1d5db", color: "#1f2937", whiteSpace: "pre-wrap", textAlign: "right", verticalAlign: "top" }}>
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
        <p className="text-sm text-gray-400">جاري تحميل السجل الطبي الكامل…</p>
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">المريض غير موجود.</div>;
  }

  const a = assessment as Record<string, string | null | undefined> | undefined;
  const hasSocrates = a && (a.analysisSite || a.analysisOnset || a.analysisCharacter);
  const hasVitals   = a && (a.vitalTemp || a.vitalBp || a.vitalPr || a.vitalRr || a.vitalSpo2 || a.vitalGcs || a.vitalRbg);
  const hasSystems  = a && (a.chestExam || a.cvsExam || a.abdomenExam || a.cnsExam || a.entExam || a.skinExam);

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", backgroundColor: "#ffffff", color: "#111827", fontFamily: "'Tajawal', 'Arial', sans-serif" }}>

      {/* ── Print button (hidden when printing) ── */}
      <div id="no-print" style={{ position: "fixed", top: "16px", left: "16px", zIndex: 50, display: "flex", gap: "8px" }}>
        <Button onClick={() => window.print()} className="gap-2 shadow-lg">
          <Printer className="h-4 w-4" /> طباعة / حفظ PDF
        </Button>
        <Button variant="outline" onClick={() => window.close()}>إغلاق</Button>
      </div>

      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "32px 28px 40px" }}>

        {/* ── Hospital header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "14px", borderBottom: "2.5px solid #1f2937" }}>
          <div dir="ltr" style={{ textAlign: "left" }}>
            <div style={{ fontSize: "9pt", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>Full Patient Record</div>
            <div style={{ fontSize: "10pt", marginTop: "3px" }}>MRN: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>{patient.mrn}</span></div>
            <div style={{ fontSize: "9pt", color: "#6b7280", marginTop: "2px" }}>
              التاريخ: {new Date().toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            {patient.admissionDate && <div style={{ fontSize: "9pt", color: "#6b7280" }}>تاريخ الدخول: {fmt(patient.admissionDate)}</div>}
            {patient.dischargeDate && <div style={{ fontSize: "9pt", color: "#6b7280" }}>تاريخ الخروج: {fmt(patient.dischargeDate)}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "22pt", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
              مستشفى المزيني للأطفال
            </div>
            <div style={{ fontSize: "13pt", fontWeight: 700, color: "#374151", marginTop: "2px" }}>
              Almuzini Children Hospital
            </div>
            <div style={{ fontSize: "8.5pt", color: "#6b7280", marginTop: "3px" }}>نظام السجلات الطبية الإلكترونية للأطفال · سري وسجل طبي</div>
          </div>
        </div>

        {/* ══ القسم 1: البيانات الديموغرافية ══ */}
        <Section title="البيانات الديموغرافية للمريض">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 24px" }}>
            <Row label="الاسم الكامل (إنجليزي)"  value={patient.nameEn} />
            <Row label="الاسم الكامل (عربي)"      value={patient.nameAr} />
            <Row label="تاريخ الميلاد"             value={`${fmt(patient.dateOfBirth)} (${age(patient.dateOfBirth)})`} />
            <Row label="الجنس"                    value={patient.gender === "male" ? "ذكر" : "أنثى"} />
            <Row label="الجنسية"                  value={patient.nationality} />
            <Row label="رقم الهوية الوطنية"       value={patient.nationalId} />
            <Row label="فصيلة الدم"               value={patient.bloodGroup ?? (patient as any).bloodType} />
            <Row label="فصيلة دم الأم"            value={(patient as any).motherBloodGroup} />
            <Row label="الحساسية"                 value={patient.allergies || "لا حساسية معروفة للأدوية"} />
            <Row label="العنوان"                  value={(patient as any).address} />
            <Row label="محل الإقامة"              value={(patient as any).residence} />
            <Row label="الهاتف"                   value={(patient as any).phone} />
            <Row label="ولي الأمر"                value={patient.guardianName ? `${patient.guardianName}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ""}` : undefined} />
            <Row label="هاتف ولي الأمر"           value={patient.guardianPhone} />
            <Row label="الوزن / الطول"            value={[(patient as any).weight ? `${(patient as any).weight} كجم` : null, (patient as any).height ? `${(patient as any).height} سم` : null].filter(Boolean).join(" · ") || undefined} />
            <Row label="حالة الدخول"              value={(patient as any).status} />
            <Row label="تاريخ الدخول"             value={fmt(patient.admissionDate)} />
            <Row label="تاريخ الخروج"             value={(patient as any).dischargeDate ? fmt((patient as any).dischargeDate) : undefined} />
            <Row label="تاريخ التسجيل"            value={fmtDt((patient as any).createdAt)} />
          </div>
        </Section>

        {/* ══ القسم 2: تقييم الدخول ══ */}
        {a && (
          <>
            {a.mainComplaint && (
              <Section title="الشكوى الرئيسية">
                <p style={{ fontSize: "11pt", color: "#111827", padding: "4px 0", whiteSpace: "pre-wrap", textAlign: "right" }}>{a.mainComplaint}</p>
              </Section>
            )}

            {hasSocrates && (
              <Section title="تحليل الشكوى — SOCRATES">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <Row label="S — الموقع"              value={a.analysisSite} />
                  <Row label="O — البداية"             value={a.analysisOnset} />
                  <Row label="C — الطابع"              value={a.analysisCharacter} />
                  <Row label="R — الانتشار"            value={a.analysisRadiation} />
                  <Row label="A — المحرِّضات"          value={a.analysisAggravation} />
                  <Row label="R — المُسكِّنات"         value={a.analysisRelieving} />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Row label="E — الأعراض المصاحبة"  value={a.analysisAssociations} />
                  </div>
                </div>
              </Section>
            )}

            {a.systemicReview && (
              <Section title="مراجعة الأجهزة">
                <pre style={{ fontSize: "10pt", color: "#1f2937", whiteSpace: "pre-wrap", fontFamily: "'Tajawal','Arial',sans-serif", lineHeight: 1.6, padding: "4px 0", textAlign: "right" }}>{a.systemicReview}</pre>
              </Section>
            )}

            {(a.pastMedicalHistory || a.drugHistory || a.familyHistory || a.socialHistory || a.developmentalHistory) && (
              <Section title="التاريخ المرضي السابق">
                <Row label="التاريخ الطبي السابق"  value={a.pastMedicalHistory} />
                <Row label="تاريخ الأدوية"          value={a.drugHistory} />
                <Row label="التاريخ العائلي"        value={a.familyHistory} />
                <Row label="التاريخ الاجتماعي"     value={a.socialHistory} />
                <Row label="التاريخ التطوري"        value={a.developmentalHistory} />
              </Section>
            )}

            {(a.historySummary || a.provisionalDiagnosis) && (
              <Section title="التشخيص الأولي">
                <Row label="ملخص التاريخ المرضي"  value={a.historySummary} />
                <Row label="التشخيص الأولي"        value={a.provisionalDiagnosis} />
              </Section>
            )}

            {hasVitals && (
              <Section title="العلامات الحيوية عند الدخول">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "4px 0", justifyContent: "flex-end" }}>
                  <VitalBox label="الحرارة (°م)"       value={a.vitalTemp} />
                  <VitalBox label="ض. الدم (ملم)"      value={a.vitalBp} />
                  <VitalBox label="النبض (ن/د)"         value={a.vitalPr} />
                  <VitalBox label="التنفس (/د)"         value={a.vitalRr} />
                  <VitalBox label="SpO₂ (%)"            value={a.vitalSpo2} />
                  <VitalBox label="GCS"                 value={a.vitalGcs} />
                  <VitalBox label="سكر الدم (RBG)"     value={a.vitalRbg} />
                </div>
              </Section>
            )}

            {a.examinationSummary && (
              <Section title="الفحص العام">
                <p style={{ fontSize: "11pt", color: "#111827", padding: "4px 0", whiteSpace: "pre-wrap", textAlign: "right" }}>{a.examinationSummary}</p>
              </Section>
            )}

            {hasSystems && (
              <Section title="الفحص الجهازي">
                <Row label="التنفسي / الصدر"              value={a.chestExam} />
                <Row label="القلب والأوعية الدموية"       value={a.cvsExam} />
                <Row label="البطن"                        value={a.abdomenExam} />
                <Row label="الجهاز العصبي"               value={a.cnsExam} />
                <Row label="الأذن والأنف والحنجرة (ENT)" value={a.entExam} />
                <Row label="الجلد / الجهاز العضلي الهيكلي" value={a.skinExam} />
              </Section>
            )}

            {a.investigationsOrdered && (
              <Section title="الفحوصات المطلوبة (عند الدخول)">
                <pre style={{ fontSize: "10pt", color: "#1f2937", whiteSpace: "pre-wrap", fontFamily: "'Tajawal','Arial',sans-serif", lineHeight: 1.6, padding: "4px 0", textAlign: "right" }}>{a.investigationsOrdered}</pre>
              </Section>
            )}

            {a.managementPlan && (
              <Section title="خطة العلاج">
                <pre style={{ fontSize: "10pt", color: "#1f2937", whiteSpace: "pre-wrap", fontFamily: "'Tajawal','Arial',sans-serif", lineHeight: 1.6, padding: "4px 0", textAlign: "right" }}>{a.managementPlan}</pre>
              </Section>
            )}

            {(a.morningFollowUp || a.eveningFollowUp) && (
              <Section title="ملاحظات المتابعة">
                <Row label="جولة الصباح" value={a.morningFollowUp} />
                <Row label="جولة المساء" value={a.eveningFollowUp} />
              </Section>
            )}

            {a.dischargeLetter && (
              <Section title="ملخص الخروج / خطاب الإحالة">
                <p style={{ fontSize: "11pt", color: "#111827", padding: "4px 0", whiteSpace: "pre-wrap", textAlign: "right" }}>{a.dischargeLetter}</p>
              </Section>
            )}
          </>
        )}

        {/* ══ القسم 3: التشخيصات ══ */}
        <Section title={`التشخيصات (${(diagnoses as any[]).length})`}>
          <DataTable
            empty="لا تشخيصات مسجلة"
            columns={[
              { key: "code",        label: "رمز ICD" },
              { key: "description", label: "الوصف",   render: (v, r) => v ?? r.name ?? "—" },
              { key: "status",      label: "الحالة" },
              { key: "type",        label: "النوع" },
              { key: "createdAt",   label: "التاريخ", render: v => fmt(v) },
            ]}
            rows={diagnoses as any[]}
          />
        </Section>

        {/* ══ القسم 4: الوصفات الطبية ══ */}
        <Section title={`الوصفات الطبية (${(prescriptions as any[]).length})`}>
          <DataTable
            empty="لا وصفات طبية مسجلة"
            columns={[
              { key: "medicationName", label: "الدواء",          render: (v, r) => v ?? r.medication ?? "—" },
              { key: "dose",           label: "الجرعة" },
              { key: "route",          label: "طريقة الإعطاء" },
              { key: "frequency",      label: "التكرار" },
              { key: "duration",       label: "المدة" },
              { key: "status",         label: "الحالة" },
              { key: "prescriberName", label: "وُصف من قِبل" },
              { key: "notes",          label: "ملاحظات" },
              { key: "createdAt",      label: "التاريخ",         render: v => fmt(v) },
            ]}
            rows={prescriptions as any[]}
          />
        </Section>

        {/* ══ القسم 5: طلبات المختبر ══ */}
        <Section title={`طلبات المختبر (${(labOrders as any[]).length})`}>
          <DataTable
            empty="لا طلبات مختبر مسجلة"
            columns={[
              { key: "testName",       label: "الفحص",            render: (v, r) => v ?? r.test_name ?? "—" },
              { key: "priority",       label: "الأولوية" },
              { key: "status",         label: "الحالة" },
              { key: "isCritical",     label: "حرج",              render: v => v ? "⚠ نعم" : "لا" },
              { key: "result",         label: "النتيجة",          render: (v, r) => v ?? r.resultValue ?? "—" },
              { key: "unit",           label: "الوحدة",           render: (v, r) => v ?? r.resultUnit ?? "—" },
              { key: "referenceRange", label: "النطاق الطبيعي" },
              { key: "orderedByName",  label: "طُلب من قِبل" },
              { key: "notes",          label: "ملاحظات" },
              { key: "createdAt",      label: "التاريخ",          render: v => fmt(v) },
            ]}
            rows={labOrders as any[]}
          />
        </Section>

        {/* ══ القسم 6: طلبات الأشعة ══ */}
        <Section title={`طلبات الأشعة (${(radOrders as any[]).length})`}>
          <DataTable
            empty="لا طلبات أشعة مسجلة"
            columns={[
              { key: "modality",        label: "طريقة التصوير" },
              { key: "orderType",       label: "النوع",              render: (v, r) => v ?? r.examType ?? "—" },
              { key: "clinicalInfo",    label: "المعلومات السريرية" },
              { key: "status",          label: "الحالة" },
              { key: "findings",        label: "النتائج",            render: (v, r) => v ?? r.report ?? "—" },
              { key: "impression",      label: "الانطباع" },
              { key: "radiologistName", label: "أخصائي الأشعة" },
              { key: "reportedAt",      label: "تاريخ التقرير",      render: v => fmt(v) },
              { key: "createdAt",       label: "تاريخ الطلب",        render: v => fmt(v) },
            ]}
            rows={radOrders as any[]}
          />
        </Section>

        {/* ══ القسم 7: الملاحظات السريرية ══ */}
        <Section title={`الملاحظات السريرية (${(clinicalNotes as any[]).length})`}>
          {(clinicalNotes as any[]).length === 0 ? (
            <p style={{ fontSize: "10pt", color: "#9ca3af", fontStyle: "italic", padding: "6px 0", textAlign: "right" }}>لا ملاحظات سريرية مسجلة</p>
          ) : (
            (clinicalNotes as any[]).map((note: any, i: number) => (
              <div key={i} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: i < (clinicalNotes as any[]).length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ fontSize: "9pt", color: "#9ca3af" }}>{fmtDt(note.createdAt)}</div>
                  <div style={{ fontSize: "10pt", fontWeight: 600, color: "#374151" }}>
                    {note.type ?? note.noteType ?? "ملاحظة"}{note.authorName ? ` — ${note.authorName}` : ""}
                  </div>
                </div>
                {note.subjective && (
                  <div style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}><span style={{ fontWeight: 600, color: "#4b5563" }}>ذاتي (S): </span><span style={{ color: "#1f2937" }}>{note.subjective}</span></div>
                )}
                {note.objective && (
                  <div style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}><span style={{ fontWeight: 600, color: "#4b5563" }}>موضوعي (O): </span><span style={{ color: "#1f2937" }}>{note.objective}</span></div>
                )}
                {note.assessment && (
                  <div style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}><span style={{ fontWeight: 600, color: "#4b5563" }}>التقييم (A): </span><span style={{ color: "#1f2937" }}>{note.assessment}</span></div>
                )}
                {note.plan && (
                  <div style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}><span style={{ fontWeight: 600, color: "#4b5563" }}>الخطة (P): </span><span style={{ color: "#1f2937" }}>{note.plan}</span></div>
                )}
                {note.content && (
                  <div style={{ fontSize: "10pt", color: "#1f2937", whiteSpace: "pre-wrap", textAlign: "right" }}>{note.content}</div>
                )}
              </div>
            ))
          )}
        </Section>

        {/* ══ القسم 8: التطعيمات ══ */}
        <Section title={`التطعيمات (${(vaccinations as any[]).length})`}>
          <DataTable
            empty="لا تطعيمات مسجلة"
            columns={[
              { key: "vaccineName",    label: "اللقاح",       render: (v, r) => v ?? r.vaccine ?? r.name ?? "—" },
              { key: "dose",           label: "الجرعة" },
              { key: "batchNumber",    label: "رقم الدفعة" },
              { key: "site",           label: "موضع الحقن" },
              { key: "administeredBy", label: "أُعطي من قِبل" },
              { key: "notes",          label: "ملاحظات" },
              { key: "givenAt",        label: "التاريخ",      render: (v, r) => fmt(v ?? r.createdAt) },
            ]}
            rows={vaccinations as any[]}
          />
        </Section>

        {/* ══ القسم 9: سجلات النمو ══ */}
        <Section title={`سجلات النمو (${(growthRecords as any[]).length})`}>
          <DataTable
            empty="لا سجلات نمو مسجلة"
            columns={[
              { key: "recordedAt",        label: "التاريخ",               render: (v, r) => fmt(v ?? r.createdAt) },
              { key: "weight",            label: "الوزن (كجم)" },
              { key: "height",            label: "الطول (سم)" },
              { key: "bmi",               label: "مؤشر كتلة الجسم" },
              { key: "headCircumference", label: "محيط الرأس (سم)" },
              { key: "weightPercentile",  label: "نسبة الوزن المئوية" },
              { key: "heightPercentile",  label: "نسبة الطول المئوية" },
              { key: "notes",             label: "ملاحظات" },
            ]}
            rows={growthRecords as any[]}
          />
        </Section>

        {/* ══ القسم 10: ملخصات الخروج ══ */}
        {(dischargeSummaries as any[]).length > 0 && (
          <Section title={`ملخصات الخروج (${(dischargeSummaries as any[]).length})`}>
            {(dischargeSummaries as any[]).map((ds: any, i: number) => (
              <div key={i} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: i < (dischargeSummaries as any[]).length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "9pt", color: "#9ca3af" }}>{fmtDt(ds.createdAt)}</span>
                  <span style={{ fontSize: "10pt", fontWeight: 700, color: "#374151" }}>ملخص الخروج #{i + 1}</span>
                </div>
                {ds.finalDiagnosis       && <Row label="التشخيص النهائي"       value={ds.finalDiagnosis} />}
                {ds.conditionOnDischarge && <Row label="الحالة عند الخروج"     value={ds.conditionOnDischarge} />}
                {ds.treatmentGiven       && <Row label="العلاج المُعطى"         value={ds.treatmentGiven} />}
                {ds.dischargeInstructions && <Row label="التعليمات"            value={ds.dischargeInstructions} />}
                {ds.followUpPlan         && <Row label="خطة المتابعة"          value={ds.followUpPlan} />}
                {ds.medicationsOnDischarge && <Row label="الأدوية عند الخروج" value={ds.medicationsOnDischarge} />}
              </div>
            ))}
          </Section>
        )}

        {/* ── كتلة التوقيع ── */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #d1d5db", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "32px", fontSize: "10pt", color: "#4b5563" }}>
          {["الطبيب المعالج", "الممرض/ة المناوب/ة", "المشرف / الاستشاري"].map(role => (
            <div key={role} style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #9ca3af", marginBottom: "24px" }} />
              <div style={{ fontWeight: 600 }}>{role}</div>
              <div style={{ color: "#9ca3af", marginTop: "3px", fontSize: "9pt" }}>الاسم / التوقيع / التاريخ</div>
            </div>
          ))}
        </div>

        {/* ── تذييل الصفحة ── */}
        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "8pt", color: "#9ca3af", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
          مستشفى المزيني للأطفال · نظام السجلات الطبية الإلكترونية · صدر بتاريخ {new Date().toLocaleString("ar-SA")} · سري — للكوادر الطبية المخوّلة فقط
        </div>

      </div>

      {/* ── Print-only global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');

        html, body {
          font-family: 'Tajawal', 'Arial', sans-serif;
          background: #ffffff;
        }

        #no-print { display: flex; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }

          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: 'Tajawal', 'Arial', sans-serif !important;
            font-size: 10pt !important;
            color: #111827 !important;
          }

          /* hide the print button */
          #no-print { display: none !important; }

          /* ensure all backgrounds are forced */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* page break control */
          table { page-break-inside: auto; border-collapse: collapse; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          /* avoid breaking section titles from their content */
          div[style*="breakInside: avoid"],
          div[style*="break-inside: avoid"] {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* make sure the outer wrapper fills the page */
          div[style*="maxWidth: 210mm"],
          div[style*="max-width: 210mm"] {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
