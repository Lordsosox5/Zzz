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
    <div className="grid grid-cols-[180px_1fr] gap-1 py-1 border-b border-gray-100 text-sm" dir="rtl">
      <span className="font-semibold text-gray-600">{label}</span>
      <span className="whitespace-pre-wrap text-gray-900">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 break-inside-avoid-page">
      <div className="bg-gray-800 text-white text-xs font-bold tracking-widest px-3 py-1.5 mb-2 text-right" dir="rtl">
        {title}
      </div>
      <div className="px-2">{children}</div>
    </div>
  );
}

function VitalBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border rounded p-2 text-center min-w-[80px]">
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-800">{value || "—"}</div>
    </div>
  );
}

function DataTable({ columns, rows, empty = "لا سجلات" }: {
  columns: { key: string; label: string; render?: (v: any, row: any) => string }[];
  rows: any[];
  empty?: string;
}) {
  if (!rows.length) {
    return <p className="text-xs text-gray-400 italic py-2 text-right">{empty}</p>;
  }
  return (
    <table className="w-full text-xs border-collapse" dir="rtl">
      <thead>
        <tr className="bg-gray-100">
          {columns.map(c => (
            <th key={c.key} className="text-right font-semibold text-gray-600 px-2 py-1.5 border border-gray-200">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
            {columns.map(c => (
              <td key={c.key} className="px-2 py-1 border border-gray-200 text-gray-800 whitespace-pre-wrap text-right">
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
    <div className="min-h-screen bg-white text-gray-900 font-sans" dir="rtl" lang="ar">

      {/* ── Print button (hidden when printing) ── */}
      <div className="print:hidden fixed top-4 left-4 z-50 flex gap-2">
        <Button onClick={() => window.print()} className="gap-2 shadow-lg">
          <Printer className="h-4 w-4" /> طباعة / حفظ PDF
        </Button>
        <Button variant="outline" onClick={() => window.close()}>إغلاق</Button>
      </div>

      <div className="max-w-[210mm] mx-auto px-8 py-10 print:max-w-none print:w-full print:mx-0 print:px-6 print:py-4">

        {/* ── Hospital header ── */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
          <div className="text-left" dir="ltr">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">Full Patient Record</div>
            <div>MRN: <span className="font-mono font-bold text-gray-900">{patient.mrn}</span></div>
            <div className="text-xs text-gray-500">
              التاريخ: {new Date().toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            {patient.admissionDate && <div className="text-xs text-gray-500">تاريخ الدخول: {fmt(patient.admissionDate)}</div>}
            {patient.dischargeDate && <div className="text-xs text-gray-500">تاريخ الخروج: {fmt(patient.dischargeDate)}</div>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              مستشفى المزيني للأطفال
            </div>
            <div className="text-lg font-bold text-gray-700">
              Almuzini Children Hospital
            </div>
            <div className="text-xs text-gray-500 mt-1">نظام السجلات الطبية الإلكترونية للأطفال · سري وسجل طبي</div>
          </div>
        </div>

        {/* ══ القسم 1: البيانات الديموغرافية ══ */}
        <Section title="البيانات الديموغرافية للمريض">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-0">
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
                <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap text-right">{a.mainComplaint}</p>
              </Section>
            )}

            {hasSocrates && (
              <Section title="تحليل الشكوى — SOCRATES">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <Row label="S — الموقع"              value={a.analysisSite} />
                  <Row label="O — البداية"             value={a.analysisOnset} />
                  <Row label="C — الطابع"              value={a.analysisCharacter} />
                  <Row label="R — الانتشار"            value={a.analysisRadiation} />
                  <Row label="A — المحرِّضات"          value={a.analysisAggravation} />
                  <Row label="R — المُسكِّنات"         value={a.analysisRelieving} />
                  <div className="col-span-full">
                    <Row label="E — الأعراض المصاحبة"  value={a.analysisAssociations} />
                  </div>
                </div>
              </Section>
            )}

            {a.systemicReview && (
              <Section title="مراجعة الأجهزة">
                <pre className="text-[11px] text-gray-800 whitespace-pre-wrap font-sans leading-relaxed py-1 text-right">{a.systemicReview}</pre>
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
                <div className="flex flex-wrap gap-2 py-1 justify-end">
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
                <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap text-right">{a.examinationSummary}</p>
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
                <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap py-1 leading-relaxed text-right">{a.investigationsOrdered}</pre>
              </Section>
            )}

            {a.managementPlan && (
              <Section title="خطة العلاج">
                <pre className="text-[11px] font-mono text-gray-800 whitespace-pre-wrap py-1 leading-relaxed text-right">{a.managementPlan}</pre>
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
                <p className="text-sm text-gray-900 py-1 whitespace-pre-wrap text-right">{a.dischargeLetter}</p>
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
            <p className="text-xs text-gray-400 italic py-2 text-right">لا ملاحظات سريرية مسجلة</p>
          ) : (
            (clinicalNotes as any[]).map((note: any, i: number) => (
              <div key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-gray-400">{fmtDt(note.createdAt)}</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {note.type ?? note.noteType ?? "ملاحظة"}{note.authorName ? ` — ${note.authorName}` : ""}
                  </div>
                </div>
                {note.subjective && (
                  <div className="text-xs mb-0.5 text-right"><span className="font-semibold text-gray-600">ذاتي (S): </span><span className="text-gray-800">{note.subjective}</span></div>
                )}
                {note.objective && (
                  <div className="text-xs mb-0.5 text-right"><span className="font-semibold text-gray-600">موضوعي (O): </span><span className="text-gray-800">{note.objective}</span></div>
                )}
                {note.assessment && (
                  <div className="text-xs mb-0.5 text-right"><span className="font-semibold text-gray-600">التقييم (A): </span><span className="text-gray-800">{note.assessment}</span></div>
                )}
                {note.plan && (
                  <div className="text-xs mb-0.5 text-right"><span className="font-semibold text-gray-600">الخطة (P): </span><span className="text-gray-800">{note.plan}</span></div>
                )}
                {note.content && (
                  <div className="text-xs text-gray-800 whitespace-pre-wrap text-right">{note.content}</div>
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
              <div key={i} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-400">{fmtDt(ds.createdAt)}</span>
                  <span className="text-xs font-bold text-gray-700">ملخص الخروج #{i + 1}</span>
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
        <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-3 gap-8 text-xs text-gray-600">
          {["الطبيب المعالج", "الممرض/ة المناوب/ة", "المشرف / الاستشاري"].map(role => (
            <div key={role} className="text-center">
              <div className="border-b border-gray-400 mb-6" />
              <div className="font-medium">{role}</div>
              <div className="text-gray-400 mt-0.5">الاسم / التوقيع / التاريخ</div>
            </div>
          ))}
        </div>

        {/* ── تذييل الصفحة ── */}
        <div className="mt-6 text-center text-[9px] text-gray-400 border-t pt-2">
          مستشفى المزيني للأطفال · نظام السجلات الطبية الإلكترونية · صدر بتاريخ {new Date().toLocaleString("ar-SA")} · سري — للكوادر الطبية المخوّلة فقط
        </div>

      </div>

      {/* ── Print-only global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap');
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; font-size: 10pt; font-family: 'Tajawal', sans-serif; }
          .bg-gray-800 { background-color: #1f2937 !important; color: white !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-gray-50  { background-color: #f9fafb !important; }
          .bg-white    { background-color: #ffffff !important; }
          .print\\:hidden { display: none !important; }
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          .break-inside-avoid-page { break-inside: avoid; }
        }
        body { font-family: 'Tajawal', sans-serif; }
      `}</style>
    </div>
  );
}
