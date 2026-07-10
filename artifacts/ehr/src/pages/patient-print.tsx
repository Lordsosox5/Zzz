import { useEffect, useRef } from "react";
import { useGetPatientSummary, useGetPatientAssessment } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth";

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
function age(dob: string): string {
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  if (years >= 2) return `${years} سنة`;
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
  if (months >= 1) return `${months} شهر`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} يوم`;
}
function fmt(d: unknown) {
  return d ? new Date(d as string).toLocaleDateString("ar-SA") : "—";
}
function fmtDt(d: unknown) {
  return d
    ? new Date(d as string).toLocaleString("ar-SA", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";
}

/* ──────────────────────────────────────────────
   Print-layout primitives
────────────────────────────────────────────── */
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "160px 1fr", gap: "4px 8px",
      padding: "5px 0", borderBottom: "1px solid #e5e7eb",
      fontSize: "10pt", lineHeight: 1.5,
    }}>
      <span style={{ fontWeight: 600, color: "#374151" }}>{label}</span>
      <span style={{ color: "#111827", whiteSpace: "pre-wrap" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div dir="rtl" style={{
      display: "flex", alignItems: "center", gap: "8px",
      borderRight: "4px solid #111827", paddingRight: "10px",
      marginBottom: "6px", marginTop: "2px",
    }}>
      <span style={{
        fontSize: "9pt", fontWeight: 700, letterSpacing: "0.07em",
        color: "#111827", textTransform: "uppercase",
      }}>{title}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: "18px",
      pageBreakInside: "avoid", breakInside: "avoid",
    }}>
      <SectionHeader title={title} />
      <div style={{
        border: "1px solid #d1d5db", borderRadius: "3px",
        padding: "8px 10px", background: "#fff",
      }}>
        {children}
      </div>
    </div>
  );
}

function VitalBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{
      border: "1px solid #9ca3af", borderRadius: "3px",
      padding: "6px 10px", textAlign: "center", minWidth: "88px",
      background: "#fff",
    }}>
      <div style={{ fontSize: "8pt", color: "#6b7280", marginBottom: "3px", lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: "12pt", fontWeight: 700, color: "#111827", letterSpacing: "0.02em" }}>
        {value || "—"}
      </div>
    </div>
  );
}

function DataTable({ columns, rows, empty = "لا سجلات" }: {
  columns: { key: string; label: string; width?: string; render?: (v: unknown, row: unknown) => string }[];
  rows: Record<string, unknown>[];
  empty?: string;
}) {
  if (!rows.length) {
    return (
      <p style={{
        fontSize: "10pt", color: "#9ca3af", fontStyle: "italic",
        padding: "4px 0", textAlign: "right",
      }}>{empty}</p>
    );
  }
  return (
    <table dir="rtl" style={{
      width: "100%", fontSize: "9pt", borderCollapse: "collapse",
      tableLayout: "fixed",
    }}>
      <colgroup>
        {columns.map((c, i) => (
          <col key={i} style={{ width: c.width ?? "auto" }} />
        ))}
      </colgroup>
      <thead>
        <tr style={{ background: "#f3f4f6" }}>
          {columns.map(c => (
            <th key={c.key} style={{
              textAlign: "right", fontWeight: 700, color: "#1f2937",
              padding: "5px 7px", border: "1px solid #9ca3af",
              fontSize: "8.5pt", lineHeight: 1.3,
            }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f9fafb", pageBreakInside: "avoid", breakInside: "avoid" }}>
            {columns.map(c => (
              <td key={c.key} style={{
                padding: "4px 7px", border: "1px solid #d1d5db",
                color: "#111827", whiteSpace: "pre-wrap",
                textAlign: "right", verticalAlign: "top",
                wordBreak: "break-word", lineHeight: 1.4,
              }}>
                {c.render
                  ? c.render(row[c.key], row)
                  : (row[c.key] as string) ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ──────────────────────────────────────────────
   Fetch helper
────────────────────────────────────────────── */
async function fetchApi(path: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items ?? data.records ?? []);
}

/* ──────────────────────────────────────────────
   Page
────────────────────────────────────────────── */
export default function PatientPrint({ params }: { params: { id: string } }) {
  const patientId = parseInt(params.id, 10);
  const printedRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – orval generated hook; enabled-only options are valid
  const { data: summary, isLoading: loadingSum }   = useGetPatientSummary(patientId, { query: { enabled: !!patientId } });
  // @ts-ignore
  const { data: assessment, isLoading: loadingAss } = useGetPatientAssessment(patientId, { query: { enabled: !!patientId } });

  const { data: diagnoses = [],        isLoading: loadingDx }       = useQuery({ queryKey: ["print-dx",       patientId], queryFn: () => fetchApi(`/api/diagnoses?patientId=${patientId}`),        enabled: !!patientId });
  const { data: labOrders = [],        isLoading: loadingLab }      = useQuery({ queryKey: ["print-lab",      patientId], queryFn: () => fetchApi(`/api/lab-orders?patientId=${patientId}`),       enabled: !!patientId });
  const { data: radOrders = [],        isLoading: loadingRad }      = useQuery({ queryKey: ["print-rad",      patientId], queryFn: () => fetchApi(`/api/radiology-orders?patientId=${patientId}`), enabled: !!patientId });
  const { data: prescriptions = [],    isLoading: loadingRx }       = useQuery({ queryKey: ["print-rx",       patientId], queryFn: () => fetchApi(`/api/prescriptions?patientId=${patientId}`),    enabled: !!patientId });
  const { data: clinicalNotes = [],    isLoading: loadingNotes }    = useQuery({ queryKey: ["print-notes",    patientId], queryFn: () => fetchApi(`/api/clinical-notes?patientId=${patientId}`),   enabled: !!patientId });
  const { data: vaccinations = [],     isLoading: loadingVacc }     = useQuery({ queryKey: ["print-vacc",     patientId], queryFn: () => fetchApi(`/api/vaccinations?patientId=${patientId}`),     enabled: !!patientId });
  const { data: growthRecords = [],    isLoading: loadingGrowth }   = useQuery({ queryKey: ["print-growth",   patientId], queryFn: () => fetchApi(`/api/growth-records?patientId=${patientId}`),   enabled: !!patientId });
  const { data: dischargeSummaries=[], isLoading: loadingDischarge }= useQuery({ queryKey: ["print-discharge",patientId], queryFn: () => fetchApi(`/api/discharge-summaries?patientId=${patientId}`), enabled: !!patientId });

  const isLoading = loadingSum || loadingAss || loadingDx || loadingLab || loadingRad ||
    loadingRx || loadingNotes || loadingVacc || loadingGrowth || loadingDischarge;
  const patient = summary?.patient;
  // typed alias so extra DB columns (not in the generated type) are accessible
  const p = patient as unknown as Record<string, string | null | undefined>;

  useEffect(() => {
    if (!isLoading && patient && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 900);
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
  const today = new Date().toLocaleDateString("ar-SA", { day: "2-digit", month: "long", year: "numeric" });
  const todayEn = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div dir="rtl" lang="ar" style={{
      minHeight: "100vh", background: "#fff", color: "#111827",
      fontFamily: "'Tajawal', 'Arial Unicode MS', Arial, sans-serif",
    }}>

      {/* ── Screen-only: print bar ── */}
      <div id="no-print" style={{
        position: "fixed", top: 0, insetInlineStart: 0, insetInlineEnd: 0,
        zIndex: 100, background: "#111827", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.35)",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>
          معاينة السجل الطبي · مستشفى المزيني للأطفال
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={() => window.print()} size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> طباعة / حفظ PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.close()}
            style={{ background: "transparent", borderColor: "#6b7280", color: "#d1d5db" }}>
            إغلاق
          </Button>
        </div>
      </div>

      {/* ── A4 page body ── */}
      <div id="print-body" style={{ maxWidth: "210mm", margin: "0 auto", padding: "24px 28px 36px" }}>

        {/* ══════════════════ HOSPITAL HEADER ══════════════════ */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          paddingBottom: "12px", marginBottom: "16px",
          borderBottom: "3px double #111827",
        }}>
          {/* Right side — Arabic hospital identity */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20pt", fontWeight: 800, color: "#111827", lineHeight: 1.15 }}>
              مستشفى المزيني للأطفال
            </div>
            <div style={{ fontSize: "11pt", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
              Almuzini Children Hospital
            </div>
            <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "4px", letterSpacing: "0.03em" }}>
              نظام السجلات الطبية الإلكترونية للأطفال · السجل الطبي الكامل
            </div>
          </div>

          {/* Left side — Record meta */}
          <div dir="ltr" style={{
            textAlign: "left", background: "#f9fafb",
            border: "1px solid #d1d5db", borderRadius: "4px",
            padding: "8px 12px", minWidth: "175px",
          }}>
            <div style={{ fontSize: "8pt", fontWeight: 700, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
              Full Patient Record
            </div>
            <div style={{ fontSize: "11pt", fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>
              {patient.mrn}
            </div>
            <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "4px" }}>
              Date: {todayEn}
            </div>
            {patient.admissionDate && (
              <div style={{ fontSize: "8pt", color: "#6b7280" }}>Admitted: {new Date(patient.admissionDate).toLocaleDateString("en-GB")}</div>
            )}
            {p.dischargeDate && (
              <div style={{ fontSize: "8pt", color: "#6b7280" }}>Discharged: {new Date(p.dischargeDate).toLocaleDateString("en-GB")}</div>
            )}
          </div>
        </div>

        {/* ══════════════════ PATIENT IDENTITY BANNER ══════════════════ */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0",
          border: "1px solid #9ca3af", borderRadius: "3px",
          marginBottom: "20px", overflow: "hidden",
          pageBreakInside: "avoid", breakInside: "avoid",
        }}>
          {[
            { l: "الاسم (عربي)",        v: patient.nameAr ?? "—" },
            { l: "Name (English)",       v: patient.nameEn },
            { l: "تاريخ الميلاد / العمر", v: `${fmt(patient.dateOfBirth)} · ${age(patient.dateOfBirth)}` },
            { l: "الجنس",              v: patient.gender === "male" ? "ذكر  Male" : "أنثى  Female" },
            { l: "فصيلة الدم",         v: patient.bloodGroup ?? "—" },
            { l: "الجنسية",            v: p.nationality ?? "—" },
            { l: "الحساسية",           v: patient.allergies || "NKDA — لا حساسية دوائية معروفة" },
            { l: "ولي الأمر",          v: patient.guardianName ? `${patient.guardianName}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ""}` : "—" },
          ].map(({ l, v }, i) => (
            <div key={i} style={{
              padding: "7px 10px",
              background: i % 2 === 0 ? "#fff" : "#f9fafb",
              borderLeft: i % 4 !== 0 ? "1px solid #d1d5db" : undefined,
              borderTop: i >= 4 ? "1px solid #d1d5db" : undefined,
            }}>
              <div style={{ fontSize: "7.5pt", color: "#6b7280", fontWeight: 600, marginBottom: "2px", textAlign: "right" }}>{l}</div>
              <div style={{ fontSize: "10pt", fontWeight: 700, color: "#111827", textAlign: "right" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* ══════════════════ SEC 1: DEMOGRAPHICS ══════════════════ */}
        <Section title="البيانات الديموغرافية الكاملة">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
            <div>
              <Field label="الاسم الكامل (عربي)"     value={patient.nameAr} />
              <Field label="الاسم الكامل (إنجليزي)"  value={patient.nameEn} />
              <Field label="تاريخ الميلاد / العمر"   value={`${fmt(patient.dateOfBirth)} (${age(patient.dateOfBirth)})`} />
              <Field label="الجنس"                   value={patient.gender === "male" ? "ذكر (Male)" : "أنثى (Female)"} />
              <Field label="الجنسية"                 value={p.nationality} />
              <Field label="رقم الهوية الوطنية"      value={patient.nationalId} />
              <Field label="فصيلة الدم"              value={patient.bloodGroup} />
              <Field label="فصيلة دم الأم"           value={p.motherBloodGroup} />
              <Field label="الحساسية"                value={patient.allergies || "لا حساسية معروفة للأدوية"} />
            </div>
            <div>
              <Field label="العنوان"                  value={p.address} />
              <Field label="محل الإقامة"             value={p.residence} />
              <Field label="الهاتف"                  value={p.phone} />
              <Field label="ولي الأمر"               value={patient.guardianName ? `${patient.guardianName}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ""}` : undefined} />
              <Field label="هاتف ولي الأمر"          value={patient.guardianPhone} />
              <Field label="الوزن"                   value={p.weight ? `${p.weight} كجم` : undefined} />
              <Field label="الطول"                   value={p.height ? `${p.height} سم` : undefined} />
              <Field label="تاريخ الدخول"            value={fmt(patient.admissionDate)} />
              <Field label="تاريخ الخروج"            value={p.dischargeDate ? fmt(p.dischargeDate) : undefined} />
            </div>
          </div>
        </Section>

        {/* ══════════════════ SEC 2: ADMISSION ASSESSMENT ══════════════════ */}
        {a && (
          <>
            {a.mainComplaint && (
              <Section title="الشكوى الرئيسية">
                <p style={{ fontSize: "10.5pt", color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.7, textAlign: "right" }}>
                  {a.mainComplaint}
                </p>
              </Section>
            )}

            {hasSocrates && (
              <Section title="تحليل الشكوى — SOCRATES">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
                  <div>
                    <Field label="S — الموقع"           value={a.analysisSite} />
                    <Field label="O — البداية"          value={a.analysisOnset} />
                    <Field label="C — الطابع"           value={a.analysisCharacter} />
                    <Field label="R — الانتشار"         value={a.analysisRadiation} />
                  </div>
                  <div>
                    <Field label="A — المحرِّضات"       value={a.analysisAggravation} />
                    <Field label="R — المُسكِّنات"      value={a.analysisRelieving} />
                    <Field label="E — الأعراض المصاحبة" value={a.analysisAssociations} />
                  </div>
                </div>
              </Section>
            )}

            {a.systemicReview && (
              <Section title="مراجعة الأجهزة">
                <pre style={{ fontSize: "10pt", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, textAlign: "right" }}>
                  {a.systemicReview}
                </pre>
              </Section>
            )}

            {(a.pastMedicalHistory || a.drugHistory || a.familyHistory || a.socialHistory || a.developmentalHistory) && (
              <Section title="التاريخ المرضي السابق">
                <Field label="التاريخ الطبي السابق"  value={a.pastMedicalHistory} />
                <Field label="تاريخ الأدوية"          value={a.drugHistory} />
                <Field label="التاريخ العائلي"        value={a.familyHistory} />
                <Field label="التاريخ الاجتماعي"     value={a.socialHistory} />
                <Field label="التاريخ التطوري"        value={a.developmentalHistory} />
              </Section>
            )}

            {(a.historySummary || a.provisionalDiagnosis) && (
              <Section title="التشخيص الأولي">
                <Field label="ملخص التاريخ المرضي"  value={a.historySummary} />
                <Field label="التشخيص الأولي"        value={a.provisionalDiagnosis} />
              </Section>
            )}

            {hasVitals && (
              <Section title="العلامات الحيوية عند الدخول">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "4px 0", justifyContent: "flex-end" }}>
                  <VitalBox label="الحرارة (°م)"   value={a.vitalTemp} />
                  <VitalBox label="ض. الدم (ملم)"  value={a.vitalBp} />
                  <VitalBox label="النبض (ن/د)"    value={a.vitalPr} />
                  <VitalBox label="التنفس (/د)"    value={a.vitalRr} />
                  <VitalBox label="SpO₂ (%)"       value={a.vitalSpo2} />
                  <VitalBox label="GCS"            value={a.vitalGcs} />
                  <VitalBox label="RBG (mmol/L)"   value={a.vitalRbg} />
                </div>
              </Section>
            )}

            {a.examinationSummary && (
              <Section title="الفحص العام">
                <p style={{ fontSize: "10.5pt", whiteSpace: "pre-wrap", lineHeight: 1.7, textAlign: "right" }}>
                  {a.examinationSummary}
                </p>
              </Section>
            )}

            {hasSystems && (
              <Section title="الفحص الجهازي">
                <Field label="التنفسي / الصدر"                value={a.chestExam} />
                <Field label="القلب والأوعية الدموية"         value={a.cvsExam} />
                <Field label="البطن"                          value={a.abdomenExam} />
                <Field label="الجهاز العصبي"                 value={a.cnsExam} />
                <Field label="الأذن والأنف والحنجرة (ENT)"  value={a.entExam} />
                <Field label="الجلد / الجهاز العضلي الهيكلي" value={a.skinExam} />
              </Section>
            )}

            {a.investigationsOrdered && (
              <Section title="الفحوصات المطلوبة (عند الدخول)">
                <pre style={{ fontSize: "10pt", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, textAlign: "right" }}>
                  {a.investigationsOrdered}
                </pre>
              </Section>
            )}

            {a.managementPlan && (
              <Section title="خطة العلاج الأولية">
                <pre style={{ fontSize: "10pt", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.65, textAlign: "right" }}>
                  {a.managementPlan}
                </pre>
              </Section>
            )}

            {(a.morningFollowUp || a.eveningFollowUp) && (
              <Section title="ملاحظات المتابعة">
                <Field label="جولة الصباح" value={a.morningFollowUp} />
                <Field label="جولة المساء" value={a.eveningFollowUp} />
              </Section>
            )}

            {a.dischargeLetter && (
              <Section title="ملخص الخروج / خطاب الإحالة">
                <p style={{ fontSize: "10.5pt", whiteSpace: "pre-wrap", lineHeight: 1.7, textAlign: "right" }}>
                  {a.dischargeLetter}
                </p>
              </Section>
            )}
          </>
        )}

        {/* ══════════════════ SEC 3: DIAGNOSES ══════════════════ */}
        <Section title={`التشخيصات (${(diagnoses as unknown[]).length})`}>
          <DataTable
            empty="لا تشخيصات مسجلة"
            columns={[
              { key: "code",        label: "رمز ICD",    width: "90px" },
              { key: "description", label: "الوصف",      render: (v, r) => (v ?? (r as Record<string,unknown>).name ?? "—") as string },
              { key: "type",        label: "النوع",      width: "90px" },
              { key: "status",      label: "الحالة",     width: "80px" },
              { key: "createdAt",   label: "التاريخ",    width: "90px", render: v => fmt(v) },
            ]}
            rows={diagnoses as Record<string, unknown>[]}
          />
        </Section>

        {/* ══════════════════ SEC 4: PRESCRIPTIONS ══════════════════ */}
        <Section title={`الوصفات الطبية (${(prescriptions as unknown[]).length})`}>
          <DataTable
            empty="لا وصفات طبية مسجلة"
            columns={[
              { key: "medicationName", label: "الدواء",          render: (v, r) => (v ?? (r as Record<string,unknown>).medication ?? "—") as string },
              { key: "dose",           label: "الجرعة",          width: "90px" },
              { key: "route",          label: "الطريق",          width: "70px" },
              { key: "frequency",      label: "التكرار",         width: "110px" },
              { key: "status",         label: "الحالة",          width: "70px" },
              { key: "prescriberName", label: "الطبيب",          width: "100px" },
              { key: "createdAt",      label: "التاريخ",         width: "80px", render: v => fmt(v) },
            ]}
            rows={prescriptions as Record<string, unknown>[]}
          />
        </Section>

        {/* ══════════════════ SEC 5: LAB ORDERS ══════════════════ */}
        <Section title={`طلبات المختبر (${(labOrders as unknown[]).length})`}>
          <DataTable
            empty="لا طلبات مختبر مسجلة"
            columns={[
              { key: "testName",       label: "الفحص",           render: (v, r) => (v ?? (r as Record<string,unknown>).test_name ?? "—") as string },
              { key: "priority",       label: "الأولوية",        width: "70px" },
              { key: "status",         label: "الحالة",          width: "70px" },
              { key: "isCritical",     label: "حرج",             width: "50px", render: v => v ? "⚠ نعم" : "لا" },
              { key: "resultValue",    label: "النتيجة",         width: "80px", render: (v, r) => (v ?? (r as Record<string,unknown>).result ?? "—") as string },
              { key: "unit",           label: "الوحدة",          width: "70px" },
              { key: "referenceRange", label: "النطاق الطبيعي",  width: "110px" },
              { key: "createdAt",      label: "التاريخ",         width: "80px", render: v => fmt(v) },
            ]}
            rows={labOrders as Record<string, unknown>[]}
          />
        </Section>

        {/* ══════════════════ SEC 6: RADIOLOGY ══════════════════ */}
        <Section title={`طلبات الأشعة (${(radOrders as unknown[]).length})`}>
          <DataTable
            empty="لا طلبات أشعة مسجلة"
            columns={[
              { key: "modality",        label: "النوع",              width: "80px" },
              { key: "studyDescription",label: "الدراسة",            render: (v, r) => (v ?? (r as Record<string,unknown>).study_description ?? "—") as string },
              { key: "status",          label: "الحالة",             width: "75px" },
              { key: "report",          label: "التقرير / النتائج",  render: (v, r) => (v ?? (r as Record<string,unknown>).findings ?? "—") as string },
              { key: "createdAt",       label: "تاريخ الطلب",        width: "80px", render: v => fmt(v) },
            ]}
            rows={radOrders as Record<string, unknown>[]}
          />
        </Section>

        {/* ══════════════════ SEC 7: CLINICAL NOTES ══════════════════ */}
        <Section title={`الملاحظات السريرية (${(clinicalNotes as unknown[]).length})`}>
          {(clinicalNotes as Record<string,unknown>[]).length === 0 ? (
            <p style={{ fontSize: "10pt", color: "#9ca3af", fontStyle: "italic", padding: "4px 0", textAlign: "right" }}>لا ملاحظات سريرية مسجلة</p>
          ) : (
            (clinicalNotes as Record<string,unknown>[]).map((note, i) => (
              <div key={i} style={{
                marginBottom: "10px", paddingBottom: "10px",
                borderBottom: i < (clinicalNotes as unknown[]).length - 1 ? "1px dashed #d1d5db" : "none",
                pageBreakInside: "avoid", breakInside: "avoid",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <span style={{ fontSize: "8.5pt", color: "#9ca3af" }}>{fmtDt(note.createdAt)}</span>
                  <span style={{ fontSize: "9.5pt", fontWeight: 700, color: "#1f2937" }}>
                    {note.type as string ?? "ملاحظة"}{note.authorName ? ` — ${note.authorName}` : ""}
                  </span>
                </div>
                {!!note.subjective && (
                  <p style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}>
                    <strong style={{ color: "#374151" }}>ذاتي (S): </strong>{String(note.subjective)}
                  </p>
                )}
                {!!note.objective && (
                  <p style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}>
                    <strong style={{ color: "#374151" }}>موضوعي (O): </strong>{String(note.objective)}
                  </p>
                )}
                {!!note.assessment && (
                  <p style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}>
                    <strong style={{ color: "#374151" }}>التقييم (A): </strong>{String(note.assessment)}
                  </p>
                )}
                {!!note.plan && (
                  <p style={{ fontSize: "10pt", marginBottom: "2px", textAlign: "right" }}>
                    <strong style={{ color: "#374151" }}>الخطة (P): </strong>{String(note.plan)}
                  </p>
                )}
                {!!note.content && (
                  <p style={{ fontSize: "10pt", color: "#1f2937", whiteSpace: "pre-wrap", textAlign: "right" }}>
                    {String(note.content)}
                  </p>
                )}
              </div>
            ))
          )}
        </Section>

        {/* ══════════════════ SEC 8: VACCINATIONS ══════════════════ */}
        <Section title={`التطعيمات (${(vaccinations as unknown[]).length})`}>
          <DataTable
            empty="لا تطعيمات مسجلة"
            columns={[
              { key: "vaccineName",    label: "اللقاح",        render: (v, r) => (v ?? (r as Record<string,unknown>).vaccine ?? (r as Record<string,unknown>).name ?? "—") as string },
              { key: "dose",           label: "الجرعة",        width: "90px" },
              { key: "site",           label: "موضع الحقن",    width: "110px" },
              { key: "batchNumber",    label: "رقم الدفعة",    width: "90px" },
              { key: "administeredBy", label: "أُعطي من قِبل", width: "120px" },
              { key: "givenAt",        label: "التاريخ",       width: "85px", render: (v, r) => fmt(v ?? (r as Record<string,unknown>).createdAt) },
            ]}
            rows={vaccinations as Record<string, unknown>[]}
          />
        </Section>

        {/* ══════════════════ SEC 9: GROWTH RECORDS ══════════════════ */}
        <Section title={`سجلات النمو (${(growthRecords as unknown[]).length})`}>
          <DataTable
            empty="لا سجلات نمو مسجلة"
            columns={[
              { key: "recordedAt",        label: "التاريخ",                width: "85px", render: (v, r) => fmt(v ?? (r as Record<string,unknown>).createdAt) },
              { key: "weight",            label: "الوزن (كجم)",            width: "80px" },
              { key: "height",            label: "الطول (سم)",             width: "80px" },
              { key: "bmi",               label: "مؤشر الجسم",             width: "75px" },
              { key: "headCircumference", label: "محيط الرأس (سم)",        width: "90px" },
              { key: "weightPercentile",  label: "نسبة الوزن المئوية",     width: "85px" },
              { key: "heightPercentile",  label: "نسبة الطول المئوية",     width: "85px" },
            ]}
            rows={growthRecords as Record<string, unknown>[]}
          />
        </Section>

        {/* ══════════════════ SEC 10: DISCHARGE SUMMARIES ══════════════════ */}
        {(dischargeSummaries as unknown[]).length > 0 && (
          <Section title={`ملخصات الخروج (${(dischargeSummaries as unknown[]).length})`}>
            {(dischargeSummaries as Record<string,unknown>[]).map((ds, i) => (
              <div key={i} style={{
                marginBottom: "12px", paddingBottom: "12px",
                borderBottom: i < (dischargeSummaries as unknown[]).length - 1 ? "1px dashed #d1d5db" : "none",
                pageBreakInside: "avoid", breakInside: "avoid",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "8.5pt", color: "#9ca3af" }}>{fmtDt(ds.createdAt)}</span>
                  <span style={{ fontSize: "9.5pt", fontWeight: 700 }}>ملخص الخروج #{i + 1}</span>
                </div>
                {!!ds.finalDiagnosis        && <Field label="التشخيص النهائي"      value={String(ds.finalDiagnosis)} />}
                {!!ds.primaryDiagnosis      && <Field label="التشخيص الرئيسي"      value={String(ds.primaryDiagnosis)} />}
                {!!ds.secondaryDiagnoses    && <Field label="التشخيصات الثانوية"   value={String(ds.secondaryDiagnoses)} />}
                {!!ds.conditionAtDischarge  && <Field label="الحالة عند الخروج"    value={String(ds.conditionAtDischarge)} />}
                {!!ds.hospitalCourse        && <Field label="المسار الاستشفائي"    value={String(ds.hospitalCourse)} />}
                {!!ds.dischargeMedications  && <Field label="أدوية الخروج"         value={String(ds.dischargeMedications)} />}
                {!!ds.followUpInstructions  && <Field label="تعليمات المتابعة"     value={String(ds.followUpInstructions)} />}
                {!!ds.treatmentGiven        && <Field label="العلاج المُعطى"        value={String(ds.treatmentGiven)} />}
              </div>
            ))}
          </Section>
        )}

        {/* ══════════════════ SIGNATURE BLOCK ══════════════════ */}
        <div style={{
          marginTop: "32px", paddingTop: "20px",
          borderTop: "2px solid #374151",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "28px",
          pageBreakInside: "avoid", breakInside: "avoid",
        }}>
          {["الطبيب المعالج", "الممرض / ة المناوب/ة", "المشرف / الاستشاري"].map(role => (
            <div key={role} style={{ textAlign: "center" }}>
              <div style={{ height: "40px", borderBottom: "1px solid #6b7280", marginBottom: "6px" }} />
              <div style={{ fontSize: "9.5pt", fontWeight: 700, color: "#111827" }}>{role}</div>
              <div style={{ fontSize: "8pt", color: "#9ca3af", marginTop: "3px" }}>الاسم / التوقيع / التاريخ</div>
            </div>
          ))}
        </div>

        {/* ══════════════════ FOOTER ══════════════════ */}
        <div style={{
          marginTop: "18px", paddingTop: "8px",
          borderTop: "1px solid #d1d5db",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div dir="ltr" style={{ fontSize: "7.5pt", color: "#9ca3af", letterSpacing: "0.02em" }}>
            CONFIDENTIAL · For authorised medical staff only · {todayEn}
          </div>
          <div style={{ fontSize: "7.5pt", color: "#9ca3af", textAlign: "right" }}>
            مستشفى المزيني للأطفال · نظام السجلات الطبية الإلكترونية · سري
          </div>
        </div>

      </div>{/* /print-body */}

      {/* ══════════════════ PRINT CSS ══════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');

        html, body {
          font-family: 'Tajawal', 'Arial Unicode MS', Arial, sans-serif;
          background: #f3f4f6;
        }

        @media screen {
          #print-body {
            margin-top: 52px;
            box-shadow: 0 4px 24px rgba(0,0,0,.14);
            background: #fff;
            border-radius: 4px;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm 18mm;
          }

          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #no-print  { display: none !important; }

          #print-body {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          /* section keeps together */
          section, .section-block { break-inside: avoid; page-break-inside: avoid; }

          /* table keeps rows together */
          table  { border-collapse: collapse !important; width: 100% !important; }
          thead  { display: table-header-group; }
          tr     { break-inside: avoid; page-break-inside: avoid; }

          /* B&W: ensure fills render */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
