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

function fmtEn(d: unknown) {
  return d
    ? new Date(d as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}
function fmtAr(d: unknown) {
  return d
    ? new Date(d as string).toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

/* ── Layout primitives ── */
function Field({ label, value, labelAr }: { label: string; labelAr?: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "210px 1fr", gap: "4px 10px",
      padding: "5px 0", borderBottom: "1px solid #e5e7eb",
      fontSize: "10pt", lineHeight: 1.55,
    }}>
      <span style={{ fontWeight: 600, color: "#374151" }}>
        {label}{labelAr ? <span style={{ color: "#9ca3af", fontWeight: 400, marginInlineStart: "6px", fontSize: "9pt" }}>/ {labelAr}</span> : null}
      </span>
      <span style={{ color: "#111827", whiteSpace: "pre-wrap" }}>{value}</span>
    </div>
  );
}

function Section({ title, titleAr, children }: { title: string; titleAr?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      {/* Keep header glued to first line of content — never orphan it */}
      <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <div style={{
          borderLeft: "4px solid #111827", paddingLeft: "10px",
          display: "flex", alignItems: "baseline", gap: "8px",
          marginBottom: "6px",
        }}>
          <span style={{
            fontSize: "9pt", fontWeight: 700, letterSpacing: "0.07em",
            color: "#111827", textTransform: "uppercase",
          }}>{title}</span>
          {titleAr && (
            <span style={{ fontSize: "9pt", color: "#6b7280", fontWeight: 500 }}>/ {titleAr}</span>
          )}
        </div>
      </div>
      <div style={{
        border: "1px solid #d1d5db", borderRadius: "3px",
        padding: "8px 12px", background: "#fff",
      }}>
        {children}
      </div>
    </div>
  );
}

const CONDITION_LABELS: Record<string, string> = {
  good:     "Good — جيدة",
  improved: "Improved — تحسنت",
  fair:     "Fair — مقبولة",
  poor:     "Poor — ضعيفة",
};

export default function DischargePrint({ params }: { params: { id: string; summaryId: string } }) {
  const patientId = parseInt(params.id, 10);
  const summaryId = parseInt(params.summaryId, 10);
  const printedRef = useRef(false);

  const [patient, setPatient] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch(`/api/patients/${patientId}/summary`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/discharge-summaries/${summaryId}`, { headers }).then(r => r.ok ? r.json() : null),
    ])
      .then(([patData, dsData]) => {
        if (!patData?.patient || !dsData) { setError("Data not found."); return; }
        setPatient(patData.patient);
        setSummary(dsData);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [patientId, summaryId]);

  useEffect(() => {
    if (!loading && patient && summary && !printedRef.current) {
      printedRef.current = true;
      document.fonts.ready.then(() => {
        setTimeout(() => window.print(), 400);
      });
    }
  }, [loading, patient, summary]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
  if (error || !patient || !summary) return (
    <div className="p-8 text-center text-gray-500">{error ?? "Not found."}</div>
  );

  const dob       = patient.dateOfBirth as string;
  const todayEn   = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const todayAr   = new Date().toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" });
  // typed alias so unknown fields from REST response are usable as strings
  const ds = summary as Record<string, string | null | undefined>;

  return (
    <div style={{
      minHeight: "100vh", background: "#fff", color: "#111827",
      fontFamily: "'Inter', 'Helvetica Neue', Arial, 'Arial Unicode MS', sans-serif",
    }}>

      {/* ── Screen-only print bar ── */}
      <div id="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#111827", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.35)",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>
          Discharge Summary Preview — Almuzini Children Hospital
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={() => window.print()} size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.close()}
            style={{ background: "transparent", borderColor: "#6b7280", color: "#d1d5db" }}>
            Close
          </Button>
        </div>
      </div>

      {/* ── A4 page body ── */}
      <div id="print-body" style={{ maxWidth: "210mm", margin: "0 auto", padding: "24px 28px 40px" }}>

        {/* ══════ HOSPITAL HEADER ══════ */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          paddingBottom: "12px", marginBottom: "16px",
          borderBottom: "3px double #111827",
        }}>
          {/* Left — Hospital identity */}
          <div>
            <div style={{ fontSize: "20pt", fontWeight: 800, color: "#111827", lineHeight: 1.15 }}>
              Almuzini Children Hospital
            </div>
            <div style={{ fontSize: "12pt", fontWeight: 700, color: "#374151", marginTop: "2px" }}>
              مستشفى المزيني للأطفال
            </div>
            <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "4px", letterSpacing: "0.03em" }}>
              Pediatric Electronic Health Record System · Confidential Medical Record
            </div>
          </div>

          {/* Right — Document meta */}
          <div style={{
            textAlign: "right", background: "#f9fafb",
            border: "1px solid #d1d5db", borderRadius: "4px",
            padding: "8px 12px", minWidth: "190px",
          }}>
            <div style={{ fontSize: "9pt", fontWeight: 700, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Discharge Summary
            </div>
            <div style={{ fontSize: "8.5pt", color: "#6b7280", marginTop: "1px" }}>
              ملخص الخروج
            </div>
            <div style={{ fontSize: "11pt", fontWeight: 800, fontFamily: "monospace", color: "#111827", marginTop: "6px" }}>
              {patient.mrn as string}
            </div>
            <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "4px" }}>
              Admitted: <strong style={{ color: "#374151" }}>{fmtEn(summary.admissionDate)}</strong>
            </div>
            <div style={{ fontSize: "8pt", color: "#6b7280" }}>
              Discharged: <strong style={{ color: "#374151" }}>{fmtEn(summary.dischargeDate)}</strong>
            </div>
            <div style={{ fontSize: "8pt", color: "#6b7280" }}>
              Prepared: {todayEn}
            </div>
          </div>
        </div>

        {/* ══════ PATIENT IDENTITY BANNER ══════ */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0",
          border: "1px solid #9ca3af", borderRadius: "3px",
          marginBottom: "20px", overflow: "hidden",
          pageBreakInside: "avoid", breakInside: "avoid",
        }}>
          {[
            { l: "Patient Name (EN)",    v: patient.nameEn as string },
            { l: "اسم المريض (عربي)",    v: patient.nameAr as string ?? "—" },
            { l: "MRN",                  v: patient.mrn as string },
            { l: "Date of Birth",        v: `${fmtEn(dob)} (${age(dob)})` },
            { l: "Gender / الجنس",       v: patient.gender === "male" ? "Male / ذكر" : "Female / أنثى" },
            { l: "Blood Group",          v: (patient.bloodGroup as string) ?? "—" },
            { l: "Nationality",          v: (patient.nationality as string) ?? "—" },
            { l: "Allergies / الحساسية", v: (patient.allergies as string) || "NKDA" },
            { l: "Guardian / ولي الأمر", v: patient.guardianName ? `${patient.guardianName}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ""}` : "—" },
          ].map(({ l, v }, i) => (
            <div key={i} style={{
              padding: "7px 10px",
              background: i % 2 === 0 ? "#fff" : "#f9fafb",
              borderLeft: i % 3 !== 0 ? "1px solid #d1d5db" : undefined,
              borderTop: i >= 3 ? "1px solid #d1d5db" : undefined,
            }}>
              <div style={{ fontSize: "7.5pt", color: "#6b7280", fontWeight: 600, marginBottom: "2px" }}>{l}</div>
              <div style={{ fontSize: "10pt", fontWeight: 700, color: "#111827" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* ══════ DIAGNOSES ══════ */}
        <Section title="Diagnoses" titleAr="التشخيص">
          <Field label="Primary Diagnosis"      labelAr="التشخيص الرئيسي"    value={ds.primaryDiagnosis} />
          <Field label="Secondary Diagnoses"    labelAr="التشخيصات الثانوية" value={ds.secondaryDiagnoses} />
          <Field label="Condition at Discharge" labelAr="الحالة عند الخروج"  value={CONDITION_LABELS[ds.conditionAtDischarge ?? ""] ?? ds.conditionAtDischarge} />
        </Section>

        {/* ══════ HOSPITAL COURSE ══════ */}
        <Section title="Hospital Course" titleAr="المسار الاستشفائي">
          <p style={{ fontSize: "10.5pt", color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
            {ds.hospitalCourse}
          </p>
        </Section>

        {/* ══════ DISCHARGE MEDICATIONS ══════ */}
        {!!ds.dischargeMedications && (
          <Section title="Discharge Medications" titleAr="أدوية الخروج">
            <p style={{ fontSize: "10.5pt", color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
              {ds.dischargeMedications}
            </p>
          </Section>
        )}

        {/* ══════ FOLLOW-UP ══════ */}
        {!!ds.followUpInstructions && (
          <Section title="Follow-up Instructions" titleAr="تعليمات المتابعة">
            <p style={{ fontSize: "10.5pt", color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
              {ds.followUpInstructions}
            </p>
          </Section>
        )}

        {/* ══════ DIET & ACTIVITY ══════ */}
        {(ds.dietInstructions || ds.activityRestrictions) && (
          <Section title="Diet & Activity" titleAr="الغذاء والنشاط">
            <Field label="Diet Instructions"    labelAr="التغذية"           value={ds.dietInstructions} />
            <Field label="Activity Restrictions" labelAr="تقييد النشاط"    value={ds.activityRestrictions} />
          </Section>
        )}

        {/* ══════ ADDITIONAL NOTES ══════ */}
        {!!ds.notes && (
          <Section title="Additional Notes" titleAr="ملاحظات إضافية">
            <p style={{ fontSize: "10.5pt", color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
              {ds.notes}
            </p>
          </Section>
        )}

        {/* ══════ SIGNATURE BLOCK ══════ */}
        <div style={{
          marginTop: "36px", paddingTop: "20px",
          borderTop: "2px solid #374151",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          pageBreakInside: "avoid", breakInside: "avoid",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "40px", borderBottom: "1px solid #6b7280", marginBottom: "6px" }} />
            <div style={{ fontSize: "9.5pt", fontWeight: 700, color: "#111827" }}>
              Discharging Doctor
            </div>
            <div style={{ fontSize: "8.5pt", color: "#6b7280", marginTop: "1px" }}>
              الطبيب المسؤول عن الخروج
            </div>
            {!!ds.createdByName && (
              <div style={{ fontSize: "9pt", color: "#374151", marginTop: "3px", fontWeight: 600 }}>
                {ds.createdByName}
              </div>
            )}
            <div style={{ fontSize: "8pt", color: "#9ca3af", marginTop: "3px" }}>Name / Signature / Date</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "40px", borderBottom: "1px solid #6b7280", marginBottom: "6px" }} />
            <div style={{ fontSize: "9.5pt", fontWeight: 700, color: "#111827" }}>
              Consultant / Senior Physician
            </div>
            <div style={{ fontSize: "8.5pt", color: "#6b7280", marginTop: "1px" }}>
              الاستشاري / الطبيب الأول
            </div>
            <div style={{ fontSize: "8pt", color: "#9ca3af", marginTop: "3px" }}>Name / Signature / Date</div>
          </div>
        </div>

        {/* ══════ FOOTER ══════ */}
        <div style={{
          marginTop: "18px", paddingTop: "8px",
          borderTop: "1px solid #d1d5db",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: "7.5pt", color: "#9ca3af" }}>
            CONFIDENTIAL · For authorised medical staff only · {todayEn}
          </div>
          <div dir="rtl" style={{ fontSize: "7.5pt", color: "#9ca3af", textAlign: "right" }}>
            مستشفى المزيني للأطفال · نظام السجلات الطبية الإلكترونية · سري
          </div>
        </div>

      </div>{/* /print-body */}

      {/* ══════ PRINT CSS ══════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');

        html, body {
          font-family: 'Inter', 'Tajawal', 'Helvetica Neue', Arial, sans-serif;
          background: #f3f4f6;
        }

        @media screen {
          #print-body {
            margin-top: 52px;
            box-shadow: 0 4px 24px rgba(0,0,0,.14);
            background: #fff;
            border-radius: 4px;
          }
          body { background: #f3f4f6; }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 16mm;
            @bottom-center {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 8pt;
              color: #9ca3af;
            }
          }
          html, body {
            background: #fff !important;
            margin: 0 !important; padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            font-size: 10pt !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            max-width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #no-print { display: none !important; }
          #print-body {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
          h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            break-inside: auto;
          }
          col  { width: auto !important; }
          thead { display: table-header-group; break-inside: avoid; }
          tfoot { display: table-footer-group; }
          tr    { break-inside: avoid; page-break-inside: avoid; }
          td, th {
            break-inside: avoid;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
        }
      `}</style>
    </div>
  );
}
