import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListPatients,
  useListUnits,
  useDeletePatient,
  getListPatientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser, getToken } from "@/lib/auth";
import { isUnitRole, canExportData } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, UserPlus, Loader2, Building2, Trash2, FileSpreadsheet, FileText, Filter, CalendarRange, Stethoscope, Users } from "lucide-react";
import { PatientStatusBadge } from "@/components/patient-status-badge";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type Patient = {
  id: number;
  mrn: string;
  nameEn: string;
  nameAr?: string | null;
  dateOfBirth: string;
  gender: string;
  status: string;
};

type ExportFilters = {
  dateFrom: string;
  dateTo: string;
  unitId: string;
  ageMin: string;
  ageMax: string;
  diagnosis: string;
};

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function Patients() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [exporting, setExporting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: "",
    dateTo: "",
    unitId: "",
    ageMin: "",
    ageMax: "",
    diagnosis: "",
  });

  const user = getUser();
  const unitRestricted = user && isUnitRole(user.role);
  const isAdmin = user?.role === "super_admin";
  const canExport = user ? canExportData(user.role) : false;
  const isDataAnalyser = user?.role === "data_analyser";

  const { data: unitsData = [] } = useListUnits();
  const userUnit = unitRestricted && user?.unitId
    ? unitsData.find((u) => u.id === user.unitId)
    : null;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setTimeout(() => setDebouncedSearch(e.target.value), 500);
  };

  const { data, isLoading } = useListPatients({
    search: debouncedSearch || undefined,
    limit: 20,
  });

  const deleteMutation = useDeletePatient();

  const handleDelete = () => {
    if (!patientToDelete) return;
    deleteMutation.mutate(
      { id: patientToDelete.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          toast({ title: t("generic.success"), description: t("patient.deleteSuccess") });
          setPatientToDelete(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: t("generic.error"), description: t("patient.deleteError") });
          setPatientToDelete(null);
        },
      }
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch ALL patients (all pages)
      const allPatients: any[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const resp = await fetch(`/api/patients?limit=${pageSize}&page=${page}`, { headers });
        const json = await resp.json();
        if (!json.patients?.length) break;
        allPatients.push(...json.patients);
        if (allPatients.length >= json.total) break;
        page++;
      }

      // 2. Fetch all related datasets in parallel
      const [
        diagnosesRaw,
        prescriptionsRaw,
        labOrdersRaw,
        radiologyOrdersRaw,
        appointmentsRaw,
        vaccinationsRaw,
        growthRaw,
        notesRaw,
        dischargeRaw,
        invoicesRaw,
      ] = await Promise.all([
        fetch(`/api/diagnoses`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/prescriptions`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/lab-orders`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/radiology-orders`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/appointments`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/vaccinations`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/growth-records`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/clinical-notes`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/discharge-summaries`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`/api/invoices`, { headers }).then((r) => r.json()).catch(() => []),
      ]);

      // 3. Build unit name map
      const unitMap: Record<number, string> = {};
      unitsData.forEach((u) => { unitMap[u.id] = isRtl && u.nameAr ? u.nameAr : u.nameEn; });

      // 4. Diagnosis pre-filter (if text set)
      let diagnosisFilterIds: Set<number> | null = null;
      if (filters.diagnosis.trim()) {
        const term = filters.diagnosis.trim().toLowerCase();
        const matched = (diagnosesRaw as any[]).filter(
          (d) =>
            (d.code ?? "").toLowerCase().includes(term) ||
            (d.description ?? "").toLowerCase().includes(term) ||
            (d.name ?? "").toLowerCase().includes(term)
        );
        diagnosisFilterIds = new Set(matched.map((d) => d.patientId));
      }

      // 5. Apply filters to patient list
      const filtered = allPatients.filter((p) => {
        if (filters.dateFrom) {
          if (new Date(p.createdAt ?? p.dateOfBirth) < new Date(filters.dateFrom)) return false;
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo); to.setHours(23, 59, 59);
          if (new Date(p.createdAt ?? p.dateOfBirth) > to) return false;
        }
        if (filters.unitId && filters.unitId !== "all") {
          if (String(p.unitId) !== filters.unitId) return false;
        }
        if (filters.ageMin !== "" || filters.ageMax !== "") {
          const age = calcAge(p.dateOfBirth);
          if (filters.ageMin !== "" && age < Number(filters.ageMin)) return false;
          if (filters.ageMax !== "" && age > Number(filters.ageMax)) return false;
        }
        if (diagnosisFilterIds !== null && !diagnosisFilterIds.has(p.id)) return false;
        return true;
      });

      if (!filtered.length) {
        toast({
          variant: "destructive",
          title: isRtl ? "لا توجد نتائج" : "No results",
          description: isRtl ? "لا يوجد مرضى يطابقون المعايير المحددة" : "No patients match the selected criteria",
        });
        return;
      }

      const pidSet = new Set(filtered.map((p) => p.id));
      const fmt = (d: any) => (d ? new Date(d).toLocaleDateString() : "");
      const fmtDt = (d: any) => (d ? new Date(d).toLocaleString() : "");

      // Helper: auto-fit column widths
      const autoWidth = (rows: Record<string, any>[]) =>
        Object.keys(rows[0] ?? {}).map((k) => ({
          wch: Math.max(k.length + 2, ...rows.map((r) => String(r[k] ?? "").length + 1)),
        }));

      const makeSheet = (rows: Record<string, any>[]) => {
        if (!rows.length) return XLSX.utils.json_to_sheet([{ Note: "No records" }]);
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = autoWidth(rows);
        return ws;
      };

      // ── Sheet 1: Patients (all fields) ────────────────────────────────────
      const patientRows = filtered.map((p: any) => ({
        MRN: p.mrn,
        "Name (EN)": p.nameEn,
        "Name (AR)": p.nameAr ?? "",
        "Date of Birth": fmt(p.dateOfBirth),
        "Age (Years)": p.dateOfBirth ? calcAge(p.dateOfBirth) : "",
        Gender: p.gender,
        "Blood Group": p.bloodGroup ?? p.bloodType ?? "",
        "Mother Blood Group": p.motherBloodGroup ?? "",
        Nationality: p.nationality ?? "",
        "National ID": p.nationalId ?? "",
        Phone: p.phone ?? "",
        Address: p.address ?? "",
        Residence: p.residence ?? "",
        "Weight (kg)": p.weight ?? "",
        "Height (cm)": p.height ?? "",
        "Admission Date": fmt(p.admissionDate),
        "Discharge Date": fmt(p.dischargeDate),
        "Guardian Name": p.guardianName ?? "",
        "Guardian Relation": p.guardianRelation ?? "",
        "Guardian Phone": p.guardianPhone ?? "",
        Allergies: p.allergies ?? "",
        Status: p.status,
        Unit: p.unitId ? (unitMap[p.unitId] ?? String(p.unitId)) : "",
        "Registered At": fmtDt(p.createdAt),
        "Last Updated": fmtDt(p.updatedAt),
      }));

      // ── Sheet 2: Diagnoses ────────────────────────────────────────────────
      const diagRows = (diagnosesRaw as any[])
        .filter((d) => pidSet.has(d.patientId))
        .map((d) => ({
          MRN: allPatients.find((p) => p.id === d.patientId)?.mrn ?? "",
          "Patient Name": d.patientName ?? allPatients.find((p) => p.id === d.patientId)?.nameEn ?? "",
          "ICD Code": d.code ?? "",
          Description: d.description ?? d.name ?? "",
          Status: d.status ?? "",
          "Diagnosed At": fmtDt(d.createdAt),
        }));

      // ── Sheet 3: Prescriptions ────────────────────────────────────────────
      const rxRows = (Array.isArray(prescriptionsRaw) ? prescriptionsRaw : (prescriptionsRaw as any)?.prescriptions ?? [])
        .filter((r: any) => pidSet.has(r.patientId))
        .map((r: any) => ({
          MRN: allPatients.find((p) => p.id === r.patientId)?.mrn ?? "",
          "Patient Name": r.patientName ?? "",
          "Drug Name": r.drugName ?? r.medicationName ?? "",
          Dosage: r.dosage ?? "",
          Frequency: r.frequency ?? "",
          Duration: r.duration ?? "",
          Route: r.route ?? "",
          Instructions: r.instructions ?? r.notes ?? "",
          Status: r.status ?? "",
          "Prescribed By": r.prescriberName ?? "",
          "Prescribed At": fmtDt(r.createdAt),
        }));

      // ── Sheet 4: Lab Orders ───────────────────────────────────────────────
      const labRows = (Array.isArray(labOrdersRaw) ? labOrdersRaw : (labOrdersRaw as any)?.orders ?? [])
        .filter((o: any) => pidSet.has(o.patientId))
        .map((o: any) => ({
          MRN: allPatients.find((p) => p.id === o.patientId)?.mrn ?? "",
          "Patient Name": o.patientName ?? "",
          "Test Name": o.testName ?? "",
          "Test Code": o.testCode ?? "",
          Category: o.category ?? "",
          Priority: o.priority ?? "",
          Status: o.status ?? "",
          "Result Value": o.resultValue ?? "",
          "Result Status": o.resultStatus ?? "",
          "Ordered By": o.orderedByName ?? "",
          "Ordered At": fmtDt(o.createdAt),
          "Resulted At": fmtDt(o.resultedAt),
          Notes: o.notes ?? "",
        }));

      // ── Sheet 5: Radiology Orders ─────────────────────────────────────────
      const radRows = (Array.isArray(radiologyOrdersRaw) ? radiologyOrdersRaw : (radiologyOrdersRaw as any)?.orders ?? [])
        .filter((o: any) => pidSet.has(o.patientId))
        .map((o: any) => ({
          MRN: allPatients.find((p) => p.id === o.patientId)?.mrn ?? "",
          "Patient Name": o.patientName ?? "",
          Modality: o.modality ?? "",
          Study: o.study ?? o.studyName ?? "",
          Priority: o.priority ?? "",
          Status: o.status ?? "",
          Findings: o.findings ?? o.report ?? "",
          Impression: o.impression ?? "",
          "Ordered By": o.orderedByName ?? "",
          "Ordered At": fmtDt(o.createdAt),
          "Reported At": fmtDt(o.reportedAt),
        }));

      // ── Sheet 6: Appointments ─────────────────────────────────────────────
      const apptRows = (Array.isArray(appointmentsRaw) ? appointmentsRaw : [])
        .filter((a: any) => pidSet.has(a.patientId))
        .map((a: any) => ({
          MRN: allPatients.find((p) => p.id === a.patientId)?.mrn ?? "",
          "Patient Name": a.patientName ?? "",
          Type: a.type ?? "",
          Status: a.status ?? "",
          "Scheduled At": fmtDt(a.scheduledAt),
          "Doctor/Provider": a.doctorName ?? a.providerName ?? "",
          Notes: a.notes ?? "",
        }));

      // ── Sheet 7: Vaccinations ─────────────────────────────────────────────
      const vaccRows = (Array.isArray(vaccinationsRaw) ? vaccinationsRaw : [])
        .filter((v: any) => pidSet.has(v.patientId))
        .map((v: any) => ({
          MRN: allPatients.find((p) => p.id === v.patientId)?.mrn ?? "",
          "Patient Name": v.patientName ?? allPatients.find((p) => p.id === v.patientId)?.nameEn ?? "",
          Vaccine: v.vaccineName ?? v.name ?? "",
          Dose: v.dose ?? v.doseNumber ?? "",
          "Batch Number": v.batchNumber ?? "",
          "Given At": fmtDt(v.givenAt ?? v.administeredAt ?? v.createdAt),
          "Next Due": fmt(v.nextDueDate ?? v.nextDue),
          "Given By": v.administeredBy ?? v.givenBy ?? "",
          Notes: v.notes ?? "",
        }));

      // ── Sheet 8: Growth Records ───────────────────────────────────────────
      const growthRows = (Array.isArray(growthRaw) ? growthRaw : [])
        .filter((g: any) => pidSet.has(g.patientId))
        .map((g: any) => ({
          MRN: allPatients.find((p) => p.id === g.patientId)?.mrn ?? "",
          "Patient Name": g.patientName ?? allPatients.find((p) => p.id === g.patientId)?.nameEn ?? "",
          "Weight (kg)": g.weight ?? "",
          "Height (cm)": g.height ?? "",
          "Head Circ. (cm)": g.headCircumference ?? "",
          "BMI": g.bmi ?? "",
          "Weight %ile": g.weightPercentile ?? "",
          "Height %ile": g.heightPercentile ?? "",
          "BMI %ile": g.bmiPercentile ?? "",
          "Recorded At": fmtDt(g.createdAt),
          Notes: g.notes ?? "",
        }));

      // ── Sheet 9: Clinical Notes ───────────────────────────────────────────
      const notesRows = (Array.isArray(notesRaw) ? notesRaw : [])
        .filter((n: any) => pidSet.has(n.patientId))
        .map((n: any) => ({
          MRN: allPatients.find((p) => p.id === n.patientId)?.mrn ?? "",
          "Patient Name": n.patientName ?? allPatients.find((p) => p.id === n.patientId)?.nameEn ?? "",
          Type: n.type ?? "",
          Content: n.content ?? "",
          Author: n.authorName ?? "",
          "Written At": fmtDt(n.createdAt),
        }));

      // ── Sheet 10: Discharge Summaries ─────────────────────────────────────
      const dischargeRows = (Array.isArray(dischargeRaw) ? dischargeRaw : [])
        .filter((d: any) => pidSet.has(d.patientId))
        .map((d: any) => ({
          MRN: allPatients.find((p) => p.id === d.patientId)?.mrn ?? "",
          "Patient Name": d.patientName ?? allPatients.find((p) => p.id === d.patientId)?.nameEn ?? "",
          "Admission Diagnosis": d.admissionDiagnosis ?? "",
          "Discharge Diagnosis": d.dischargeDiagnosis ?? "",
          "Treatment Summary": d.treatmentSummary ?? d.summary ?? "",
          Condition: d.conditionAtDischarge ?? d.condition ?? "",
          "Follow-up": d.followUpInstructions ?? d.followUp ?? "",
          "Discharged By": d.physicianName ?? d.dischargedBy ?? "",
          "Discharge Date": fmtDt(d.dischargeDate ?? d.createdAt),
        }));

      // ── Sheet 11: Invoices / Billing ──────────────────────────────────────
      const invoiceRows = (Array.isArray(invoicesRaw) ? invoicesRaw : (invoicesRaw as any)?.invoices ?? [])
        .filter((i: any) => pidSet.has(i.patientId))
        .map((i: any) => ({
          MRN: allPatients.find((p) => p.id === i.patientId)?.mrn ?? "",
          "Patient Name": i.patientName ?? allPatients.find((p) => p.id === i.patientId)?.nameEn ?? "",
          "Invoice #": i.invoiceNumber ?? i.id,
          "Total Amount": i.totalAmount ?? i.total ?? "",
          "Paid Amount": i.paidAmount ?? i.paid ?? "",
          "Balance Due": i.balanceDue ?? i.balance ?? "",
          Status: i.status ?? "",
          "Invoice Date": fmt(i.invoiceDate ?? i.createdAt),
          Notes: i.notes ?? "",
        }));

      // ── Sheet 12: Export Criteria ─────────────────────────────────────────
      const criteriaRows: { Filter: string; Value: string }[] = [];
      if (filters.dateFrom || filters.dateTo)
        criteriaRows.push({ Filter: "Period (Registration)", Value: `${filters.dateFrom || "—"} → ${filters.dateTo || "—"}` });
      if (filters.unitId && filters.unitId !== "all")
        criteriaRows.push({ Filter: "Unit", Value: unitMap[Number(filters.unitId)] ?? filters.unitId });
      if (filters.ageMin !== "" || filters.ageMax !== "")
        criteriaRows.push({ Filter: "Age Range", Value: `${filters.ageMin || "0"} – ${filters.ageMax || "∞"} yrs` });
      if (filters.diagnosis)
        criteriaRows.push({ Filter: "Diagnosis", Value: filters.diagnosis });
      if (!criteriaRows.length)
        criteriaRows.push({ Filter: "Filters", Value: "None — full export" });
      criteriaRows.push({ Filter: "Total Patients Exported", Value: String(filtered.length) });
      criteriaRows.push({ Filter: "Diagnoses Records", Value: String(diagRows.length) });
      criteriaRows.push({ Filter: "Prescriptions Records", Value: String(rxRows.length) });
      criteriaRows.push({ Filter: "Lab Orders Records", Value: String(labRows.length) });
      criteriaRows.push({ Filter: "Radiology Orders Records", Value: String(radRows.length) });
      criteriaRows.push({ Filter: "Appointments Records", Value: String(apptRows.length) });
      criteriaRows.push({ Filter: "Vaccinations Records", Value: String(vaccRows.length) });
      criteriaRows.push({ Filter: "Growth Records", Value: String(growthRows.length) });
      criteriaRows.push({ Filter: "Clinical Notes Records", Value: String(notesRows.length) });
      criteriaRows.push({ Filter: "Discharge Summaries Records", Value: String(dischargeRows.length) });
      criteriaRows.push({ Filter: "Invoice Records", Value: String(invoiceRows.length) });
      criteriaRows.push({ Filter: "Export Date & Time", Value: new Date().toLocaleString() });
      criteriaRows.push({ Filter: "Exported By", Value: user?.username ?? "" });

      // ── Build workbook ────────────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, makeSheet(patientRows),    "Patients");
      XLSX.utils.book_append_sheet(wb, makeSheet(diagRows),       "Diagnoses");
      XLSX.utils.book_append_sheet(wb, makeSheet(rxRows),         "Prescriptions");
      XLSX.utils.book_append_sheet(wb, makeSheet(labRows),        "Lab Orders");
      XLSX.utils.book_append_sheet(wb, makeSheet(radRows),        "Radiology Orders");
      XLSX.utils.book_append_sheet(wb, makeSheet(apptRows),       "Appointments");
      XLSX.utils.book_append_sheet(wb, makeSheet(vaccRows),       "Vaccinations");
      XLSX.utils.book_append_sheet(wb, makeSheet(growthRows),     "Growth Records");
      XLSX.utils.book_append_sheet(wb, makeSheet(notesRows),      "Clinical Notes");
      XLSX.utils.book_append_sheet(wb, makeSheet(dischargeRows),  "Discharge Summaries");
      XLSX.utils.book_append_sheet(wb, makeSheet(invoiceRows),    "Invoices");
      XLSX.utils.book_append_sheet(wb, makeSheet(criteriaRows),   "Export Criteria");

      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `AMH_patients_full_export_${dateTag}.xlsx`);

      toast({
        title: isRtl ? "تم التصدير بنجاح" : "Export complete",
        description: isRtl
          ? `تم تصدير ${filtered.length} مريض في ${12} أوراق عمل`
          : `${filtered.length} patients exported across 12 sheets`,
      });
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: t("generic.error"), description: isRtl ? "فشل التصدير" : "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  const handlePdfReport = async () => {
    setGeneratingPdf(true);
    try {
      const token = getToken();
      const h = { Authorization: `Bearer ${token}` };

      // Fetch all patients
      const allPts: any[] = [];
      let pg = 1;
      while (true) {
        const r = await fetch(`/api/patients?limit=100&page=${pg}`, { headers: h });
        const j = await r.json();
        if (!j.patients?.length) break;
        allPts.push(...j.patients);
        if (allPts.length >= j.total) break;
        pg++;
      }

      const [diagsRaw, rxsRaw, labsRaw, radsRaw, apptsRaw, vaccsRaw, growthRaw, invRaw] =
        await Promise.all([
          fetch(`/api/diagnoses`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/prescriptions`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/lab-orders`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/radiology-orders`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/appointments`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/vaccinations`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/growth-records`, { headers: h }).then(r => r.json()).catch(() => []),
          fetch(`/api/invoices`, { headers: h }).then(r => r.json()).catch(() => []),
        ]);

      const uMap: Record<number, string> = {};
      unitsData.forEach(u => { uMap[u.id] = u.nameEn; });

      // Diagnosis pre-filter
      let diagFltIds: Set<number> | null = null;
      if (filters.diagnosis.trim()) {
        const term = filters.diagnosis.trim().toLowerCase();
        const m = (diagsRaw as any[]).filter(d =>
          (d.code ?? "").toLowerCase().includes(term) ||
          (d.description ?? "").toLowerCase().includes(term));
        diagFltIds = new Set(m.map((d: any) => d.patientId));
      }

      // Apply patient filters
      const filtered = allPts.filter(p => {
        if (filters.dateFrom && new Date(p.createdAt) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo) { const to = new Date(filters.dateTo); to.setHours(23,59,59); if (new Date(p.createdAt) > to) return false; }
        if (filters.unitId && filters.unitId !== "all" && String(p.unitId) !== filters.unitId) return false;
        if (filters.ageMin !== "" && calcAge(p.dateOfBirth) < Number(filters.ageMin)) return false;
        if (filters.ageMax !== "" && calcAge(p.dateOfBirth) > Number(filters.ageMax)) return false;
        if (diagFltIds !== null && !diagFltIds.has(p.id)) return false;
        return true;
      });

      if (!filtered.length) {
        toast({ variant: "destructive", title: "No results", description: "No patients match the selected criteria" });
        return;
      }

      const pidSet = new Set(filtered.map(p => p.id));

      const diags  = (Array.isArray(diagsRaw)  ? diagsRaw  : []).filter((d: any) => pidSet.has(d.patientId));
      const rxs    = (Array.isArray(rxsRaw)    ? rxsRaw    : (rxsRaw as any)?.prescriptions ?? []).filter((r: any) => pidSet.has(r.patientId));
      const labs   = (Array.isArray(labsRaw)   ? labsRaw   : []).filter((o: any) => pidSet.has(o.patientId));
      const rads   = (Array.isArray(radsRaw)   ? radsRaw   : []).filter((o: any) => pidSet.has(o.patientId));
      const appts  = (Array.isArray(apptsRaw)  ? apptsRaw  : []).filter((a: any) => pidSet.has(a.patientId));
      const vaccs  = (Array.isArray(vaccsRaw)  ? vaccsRaw  : []).filter((v: any) => pidSet.has(v.patientId));
      const growth = (Array.isArray(growthRaw) ? growthRaw : []).filter((g: any) => pidSet.has(g.patientId));
      const invs   = (Array.isArray(invRaw)    ? invRaw    : (invRaw as any)?.invoices ?? []).filter((i: any) => pidSet.has(i.patientId));

      // ── Statistics helpers ──────────────────────────────────────────────
      const freq = (arr: any[], keyFn: (x: any) => string): Record<string, number> => {
        const m: Record<string, number> = {};
        arr.forEach(x => { const k = keyFn(x) || "Unknown"; m[k] = (m[k] || 0) + 1; });
        return m;
      };
      const topN = (m: Record<string, number>, n: number) =>
        Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
      const pct = (n: number, tot: number) => tot ? (n / tot * 100).toFixed(1) : "0.0";

      // Demographics
      const total     = filtered.length;
      const active    = filtered.filter(p => p.status === "active").length;
      const disch     = total - active;
      const genderMap = freq(filtered, p => p.gender === "male" ? "Male" : p.gender === "female" ? "Female" : "Other");
      const ageGroups: Record<string, number> = { "< 1 yr": 0, "1–5 yrs": 0, "5–12 yrs": 0, "12–18 yrs": 0 };
      filtered.forEach(p => {
        const a = calcAge(p.dateOfBirth);
        if (a < 1) ageGroups["< 1 yr"]++;
        else if (a < 5) ageGroups["1–5 yrs"]++;
        else if (a < 12) ageGroups["5–12 yrs"]++;
        else ageGroups["12–18 yrs"]++;
      });
      const bloodMap  = freq(filtered, p => p.bloodGroup ?? p.bloodType ?? "");
      const natMap    = freq(filtered, p => p.nationality ?? "");
      const unitFrq   = freq(filtered, p => p.unitId ? (uMap[p.unitId] ?? `Unit ${p.unitId}`) : "Unassigned");

      // Clinical
      const diagMap      = freq(diags, d => [d.code, d.description ?? d.name].filter(Boolean).join(" — ") || "Unknown");
      const labStatMap   = freq(labs,  o => o.status ?? "Unknown");
      const labCatMap    = freq(labs,  o => o.category ?? "Unknown");
      const radModMap    = freq(rads,  o => o.modality ?? "Unknown");
      const radStatMap   = freq(rads,  o => o.status ?? "Unknown");
      const rxStatMap    = freq(rxs,   r => r.status ?? "Unknown");
      const rxDrugMap    = freq(rxs,   r => r.drugName ?? r.medicationName ?? "Unknown");
      const apptStatMap  = freq(appts, a => a.status ?? "Unknown");
      const apptTypeMap  = freq(appts, a => a.type ?? "Unknown");
      const vaccMap      = freq(vaccs, v => v.vaccineName ?? v.name ?? "Unknown");
      const invStatMap   = freq(invs,  i => i.status ?? "Unknown");

      const growthNum = growth.filter((g: any) => g.weight && g.height);
      const avgW = growthNum.length ? (growthNum.reduce((s: number, g: any) => s + parseFloat(g.weight), 0) / growthNum.length).toFixed(1) : "—";
      const avgH = growthNum.length ? (growthNum.reduce((s: number, g: any) => s + parseFloat(g.height), 0) / growthNum.length).toFixed(1) : "—";
      const avgBMI = growthNum.length ? (growthNum.reduce((s: number, g: any) => s + parseFloat(g.bmi ?? 0), 0) / growthNum.length).toFixed(1) : "—";

      const totalBilled   = invs.reduce((s: number, i: any) => s + parseFloat(i.totalAmount ?? i.total ?? 0), 0);
      const totalCollected= invs.reduce((s: number, i: any) => s + parseFloat(i.paidAmount  ?? i.paid  ?? 0), 0);
      const outstanding   = totalBilled - totalCollected;
      const collRate      = totalBilled > 0 ? (totalCollected / totalBilled * 100).toFixed(1) : "0.0";

      // ── HTML helpers ───────────────────────────────────────────────────
      const COLORS = ["#1d4ed8","#0d9488","#16a34a","#ea580c","#7c3aed","#dc2626","#0284c7","#ca8a04","#db2777","#65a30d","#0891b2","#9333ea"];

      const bar = (items: [string, number][], tot: number, ci = 0) =>
        (items.length === 0
          ? `<p style="color:#94a3b8;font-size:10px;margin:4px 0">No data available.</p>`
          : items.map(([label, cnt], i) => {
              const p = tot > 0 ? cnt / tot * 100 : 0;
              const c = COLORS[(ci + i) % COLORS.length];
              return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
                <span style="min-width:155px;max-width:155px;font-size:10px;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${label}">${label}</span>
                <div style="flex:1;background:#f1f5f9;border-radius:3px;height:13px;overflow:hidden">
                  <div style="width:${Math.max(p,.5)}%;background:${c};height:13px;border-radius:3px"></div>
                </div>
                <span style="min-width:72px;font-size:10px;font-weight:700;color:${c};text-align:right">${cnt} &nbsp;(${p.toFixed(1)}%)</span>
              </div>`;
            }).join(""));

      const kpi = (val: string|number, lbl: string, sub: string, c: string) =>
        `<div style="flex:1;min-width:130px;background:${c}10;border:1.5px solid ${c}25;border-radius:10px;padding:14px 16px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:${c};line-height:1.1">${val}</div>
          <div style="font-size:10.5px;font-weight:600;color:#475569;margin-top:4px">${lbl}</div>
          ${sub ? `<div style="font-size:9.5px;color:#94a3b8;margin-top:2px">${sub}</div>` : ""}
        </div>`;

      const h2 = (t: string, icon: string) =>
        `<div style="display:flex;align-items:center;gap:9px;margin:28px 0 12px;padding-bottom:8px;border-bottom:2.5px solid #0f2855">
          <span style="font-size:17px">${icon}</span>
          <span style="font-size:14px;font-weight:800;color:#0f2855;text-transform:uppercase;letter-spacing:.08em">${t}</span>
        </div>`;

      const box = (title: string, body: string, full = false) =>
        `<div style="${full ? "" : ""}background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:13px 16px;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;color:#1e3a6e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px">${title}</div>
          ${body}
        </div>`;

      const col2 = (a: string, b: string) =>
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${a}${b}</div>`;

      // Filters summary
      const fltDesc: string[] = [];
      if (filters.dateFrom || filters.dateTo) fltDesc.push(`Period: ${filters.dateFrom || "—"} → ${filters.dateTo || "—"}`);
      if (filters.unitId && filters.unitId !== "all") fltDesc.push(`Unit: ${uMap[Number(filters.unitId)] ?? filters.unitId}`);
      if (filters.ageMin || filters.ageMax) fltDesc.push(`Age: ${filters.ageMin || "0"}–${filters.ageMax || "∞"} yrs`);
      if (filters.diagnosis) fltDesc.push(`Diagnosis: ${filters.diagnosis}`);

      const reportDate = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
      const reportTime = new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

      // ── Build HTML ─────────────────────────────────────────────────────
      const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>AMH Statistical Report — ${reportDate}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  @page { size: A4; margin: 16mm 14mm 18mm; }
  @media print { .pb { page-break-before: always; } * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter',Arial,sans-serif; font-size:11px; color:#1e293b; background:#fff; }
</style>
</head><body>

<!-- LETTERHEAD -->
<div style="background:#0f2855;color:#fff;padding:20px 28px 18px;position:relative;overflow:hidden">
  <div style="display:flex;align-items:flex-start;gap:14px">
    <div style="width:42px;height:42px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">❤</div>
    <div style="flex:1">
      <div style="font-size:19px;font-weight:800;letter-spacing:.02em">Almuzini Children Hospital</div>
      <div style="font-size:10px;opacity:.7;margin-top:2px">مستشفى المزيني للأطفال &nbsp;·&nbsp; Pediatric Health Information System</div>
    </div>
    <div style="text-align:right;opacity:.85;flex-shrink:0">
      <div style="font-size:13px;font-weight:800;letter-spacing:.04em">STATISTICAL REPORT</div>
      <div style="font-size:9.5px;margin-top:3px">${reportDate} &nbsp;·&nbsp; ${reportTime}</div>
      <div style="font-size:9.5px;margin-top:2px">By: ${user?.username ?? "System"}</div>
    </div>
  </div>
  ${fltDesc.length
    ? `<div style="margin-top:11px;background:rgba(255,255,255,.1);border-radius:6px;padding:7px 12px;font-size:9.5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <span style="opacity:.65;font-weight:700">FILTERS:</span>
        ${fltDesc.map(f => `<span style="background:rgba(255,255,255,.18);padding:2px 9px;border-radius:100px">${f}</span>`).join("")}
      </div>`
    : `<div style="margin-top:8px;font-size:9.5px;opacity:.55">No filters applied — full population report</div>`}
  <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#3b82f6,#06b6d4,#10b981,#f59e0b,#ef4444,#8b5cf6)"></div>
</div>

<div style="padding:20px 28px">

<!-- 1. EXECUTIVE SUMMARY -->
${h2("Executive Summary", "📊")}
<div style="display:flex;flex-wrap:wrap;gap:9px;margin-bottom:4px">
  ${kpi(total, "Total Patients", "", "#0f2855")}
  ${kpi(active, "Active (Inpatient)", `${pct(active, total)}%`, "#16a34a")}
  ${kpi(disch, "Discharged", `${pct(disch, total)}%`, "#64748b")}
  ${kpi(diags.length, "Diagnosis Records", `${Object.keys(diagMap).length} unique`, "#7c3aed")}
  ${kpi(labs.length, "Lab Orders", `${rads.length} radiology`, "#0d9488")}
  ${kpi(rxs.length, "Prescriptions", `${Object.keys(rxDrugMap).length} drugs`, "#ea580c")}
  ${kpi(appts.length, "Appointments", "", "#0284c7")}
  ${kpi(vaccs.length, "Vaccine Doses", `${new Set(vaccs.map((v: any) => v.patientId)).size} pts`, "#db2777")}
</div>

<!-- 2. DEMOGRAPHICS -->
<div class="pb"></div>
${h2("Patient Demographics", "👤")}
${col2(
  box("Gender Distribution", bar(topN(genderMap, 5), total)),
  box("Patient Status", bar([["Active (Inpatient)", active], ["Discharged", disch]], total, 2))
)}
${box("Age Group Distribution", bar(Object.entries(ageGroups).filter(([,v]) => v > 0), total, 4))}
${col2(
  box("Blood Group Distribution", bar(topN(bloodMap, 12).filter(([k]) => k && k !== "Unknown"), filtered.filter(p => p.bloodGroup || p.bloodType).length, 1)),
  box("Unit Distribution", bar(topN(unitFrq, 10), total, 3))
)}
${box("Top Nationalities", bar(topN(natMap, 12).filter(([k]) => k && k !== "Unknown"), total, 6))}

<!-- 3. DIAGNOSES -->
<div class="pb"></div>
${h2("Diagnoses Analysis", "🩺")}
${box(`Top 20 Most Frequent Diagnoses — ${diags.length} total records, ${Object.keys(diagMap).length} unique conditions`,
  bar(topN(diagMap, 20), diags.length)
)}

<!-- 4. LABORATORY -->
<div class="pb"></div>
${h2("Laboratory", "🔬")}
${col2(
  box(`Status Breakdown — ${labs.length} total orders`, bar(topN(labStatMap, 8), labs.length)),
  box("Top Test Categories", bar(topN(labCatMap, 10), labs.length, 2))
)}
<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:13px 16px;margin-bottom:12px">
  <div style="font-size:10px;font-weight:700;color:#0369a1;margin-bottom:6px">LAB SUMMARY METRICS</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center">
    ${[
      ["Total Orders", labs.length, "#0284c7"],
      ["Resulted",    labs.filter((o: any) => o.status === "resulted").length, "#16a34a"],
      ["Pending",     labs.filter((o: any) => o.status === "pending").length, "#ca8a04"],
      ["Critical",    labs.filter((o: any) => o.resultStatus === "critical" || o.status === "critical").length, "#dc2626"],
    ].map(([l, v, c]) => `<div style="background:${c}12;border-radius:8px;padding:10px 6px">
      <div style="font-size:20px;font-weight:800;color:${c}">${v}</div>
      <div style="font-size:9.5px;color:#64748b;margin-top:3px">${l}</div>
    </div>`).join("")}
  </div>
</div>

<!-- 5. RADIOLOGY -->
${h2("Radiology", "🫁")}
${col2(
  box(`By Modality — ${rads.length} total orders`, bar(topN(radModMap, 8), rads.length, 3)),
  box("By Status", bar(topN(radStatMap, 8), rads.length, 5))
)}

<!-- 6. PRESCRIPTIONS -->
<div class="pb"></div>
${h2("Prescriptions", "💊")}
${col2(
  box(`Status Breakdown — ${rxs.length} total`, bar(topN(rxStatMap, 8), rxs.length)),
  box("Prescription Metrics", `
    <div style="display:flex;flex-direction:column;gap:7px;font-size:10.5px;color:#475569">
      ${[
        ["Total prescriptions", rxs.length],
        ["Unique drug names", Object.keys(rxDrugMap).length],
        ["Patients prescribed", new Set(rxs.map((r: any) => r.patientId)).size],
        ["Avg Rx per patient", rxs.length && filtered.length ? (rxs.length / filtered.length).toFixed(1) : "—"],
      ].map(([l, v]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9">
        <span>${l}</span><strong style="color:#0f2855">${v}</strong>
      </div>`).join("")}
    </div>
  `)
)}
${box("Top Prescribed Drugs", bar(topN(rxDrugMap, 15), rxs.length, 2))}

<!-- 7. APPOINTMENTS -->
<div class="pb"></div>
${h2("Appointments", "📅")}
${col2(
  box(`By Status — ${appts.length} total`, bar(topN(apptStatMap, 8), appts.length)),
  box("By Type", bar(topN(apptTypeMap, 8), appts.length, 3))
)}

<!-- 8. VACCINATIONS -->
${h2("Vaccinations", "💉")}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:13px 16px;margin-bottom:12px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin-bottom:12px">
    ${[
      ["Total Doses", vaccs.length, "#16a34a"],
      ["Patients Vaccinated", new Set(vaccs.map((v: any) => v.patientId)).size, "#0d9488"],
      ["Vaccine Types", Object.keys(vaccMap).length, "#0284c7"],
    ].map(([l, v, c]) => `<div style="background:${c}12;border-radius:8px;padding:10px 6px">
      <div style="font-size:20px;font-weight:800;color:${c}">${v}</div>
      <div style="font-size:9.5px;color:#64748b;margin-top:3px">${l}</div>
    </div>`).join("")}
  </div>
</div>
${box("Most Administered Vaccines", bar(topN(vaccMap, 15), vaccs.length, 1))}

<!-- 9. GROWTH -->
${growth.length ? `
${h2("Growth & Anthropometrics", "📏")}
<div style="display:flex;flex-wrap:wrap;gap:9px;margin-bottom:14px">
  ${kpi(growth.length, "Measurements", "", "#0d9488")}
  ${kpi(avgW + " kg", "Avg Weight", "", "#16a34a")}
  ${kpi(avgH + " cm", "Avg Height", "", "#0284c7")}
  ${kpi(avgBMI, "Avg BMI", "", "#7c3aed")}
  ${kpi(new Set(growth.map((g: any) => g.patientId)).size, "Patients Monitored", "", "#ea580c")}
</div>` : ""}

<!-- 10. FINANCIAL -->
<div class="pb"></div>
${h2("Financial Summary", "💰")}
<div style="display:flex;flex-wrap:wrap;gap:9px;margin-bottom:14px">
  ${kpi(invs.length, "Total Invoices", "", "#0f2855")}
  ${kpi("SAR " + totalBilled.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2}), "Total Billed", "", "#ca8a04")}
  ${kpi("SAR " + totalCollected.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2}), "Total Collected", `${collRate}% rate`, "#16a34a")}
  ${kpi("SAR " + outstanding.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2}), "Outstanding", outstanding > 0 ? "unpaid balance" : "fully settled", outstanding > 0 ? "#dc2626" : "#16a34a")}
</div>
${box(`Invoice Status Breakdown — ${invs.length} invoices`, bar(topN(invStatMap, 8), invs.length))}

</div><!-- /content -->

<!-- FOOTER -->
<div style="background:#0f2855;color:rgba(255,255,255,.65);padding:9px 28px;font-size:9px;display:flex;justify-content:space-between;align-items:center;margin-top:24px">
  <span>❤ Almuzini Children Hospital &nbsp;·&nbsp; Pediatric EHR Statistical Report</span>
  <span>Population: ${total} patients &nbsp;·&nbsp; ${reportDate} ${reportTime} &nbsp;·&nbsp; CONFIDENTIAL</span>
</div>

<script>window.onload = () => { setTimeout(() => window.print(), 400); }</script>
</body></html>`;

      const win = window.open("", "_blank", "width=950,height=750");
      if (!win) {
        toast({ variant: "destructive", title: "Popup blocked", description: "Allow popups for this site and try again." });
        return;
      }
      win.document.write(html);
      win.document.close();
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: t("generic.error"), description: "PDF report generation failed" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const hasFilters =
    filters.dateFrom || filters.dateTo || (filters.unitId && filters.unitId !== "all") ||
    filters.ageMin !== "" || filters.ageMax !== "" || filters.diagnosis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.patients")}</h1>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <FileSpreadsheet className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
              {isRtl ? "تصدير Excel" : "Export Excel"}
            </Button>
          )}
          {!isDataAnalyser && (
            <Button asChild>
              <Link href="/patients/new">
                <UserPlus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
                {t("patient.newPatient")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {unitRestricted && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>
            {userUnit
              ? (isRtl
                  ? `عرض المرضى المقيدين بوحدة: ${userUnit.nameAr ?? userUnit.nameEn}`
                  : `Showing patients restricted to unit: ${userUnit.nameEn}`)
              : (isRtl
                  ? "لم يتم تعيين وحدة لحسابك — لا يوجد مرضى متاحون بعد."
                  : "No unit assigned to your account — no patients available yet.")}
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={t("generic.search")}
              value={searchTerm}
              onChange={handleSearch}
              className={`${isRtl ? "pr-9" : "pl-9"}`}
            />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">{t("patient.mrn")}</TableHead>
                <TableHead className="px-4">{t("generic.name")}</TableHead>
                <TableHead className="px-4">{t("patient.dob")}</TableHead>
                <TableHead className="px-4">{t("patient.gender")}</TableHead>
                <TableHead className="px-4">{t("generic.status")}</TableHead>
                <TableHead className="px-4">{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : data?.patients && data.patients.length > 0 ? (
                data.patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <TableCell className="px-4 font-mono text-xs">{patient.mrn}</TableCell>
                    <TableCell className="px-4 font-medium">
                      <div className="flex flex-col">
                        <span>{isRtl && patient.nameAr ? patient.nameAr : patient.nameEn}</span>
                        {(patient as any).motherBloodGroup && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {isRtl ? "فصيلة دم الأم:" : "Mother BG:"}{" "}
                            <span className="font-mono font-medium text-foreground">{(patient as any).motherBloodGroup}</span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4">
                      {patient.gender === "male"
                        ? t("patient.male")
                        : patient.gender === "female"
                        ? t("patient.female")
                        : patient.gender}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col gap-1.5">
                        <PatientStatusBadge status={patient.status} size="sm" />
                        {(patient as any).place && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            {(patient as any).place === "picu" ? "PICU"
                              : (patient as any).place === "phdu" ? "PHDU"
                              : (patient as any).place === "nursery" ? (isRtl ? "الحضانة" : "Nursery")
                              : (patient as any).place === "general_ward" ? (isRtl ? "العنبر العام" : "General Ward")
                              : (patient as any).place}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/patients/${patient.id}`}>
                            {t("patient.viewProfile")}
                          </Link>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setPatientToDelete(patient as Patient)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t("patient.notFound")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Export Dialog ── */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-lg" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              {isRtl ? "تصدير بيانات المرضى" : "Export Patient Data"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground -mt-2">
            {isRtl
              ? "اختر المعايير التالية لتصفية المرضى المُصدَّرين — اتركها فارغة لتصدير جميع المرضى."
              : "Apply filters below to narrow the export. Leave all blank to export every patient."}
          </p>

          <div className="space-y-5 pt-1">
            {/* Period */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{isRtl ? "الفترة الزمنية (تاريخ التسجيل)" : "Period (Registration Date)"}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "من" : "From"}</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "إلى" : "To"}</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Unit */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{isRtl ? "الوحدة" : "Unit"}</span>
              </div>
              <Select
                value={filters.unitId || "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, unitId: v === "all" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "جميع الوحدات" : "All units"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "جميع الوحدات" : "All units"}</SelectItem>
                  {unitsData.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {isRtl && u.nameAr ? u.nameAr : u.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Age */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{isRtl ? "الفئة العمرية (بالسنوات)" : "Age Range (Years)"}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "الحد الأدنى للعمر" : "Min age"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    placeholder="0"
                    value={filters.ageMin}
                    onChange={(e) => setFilters((f) => ({ ...f, ageMin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "الحد الأقصى للعمر" : "Max age"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    placeholder="18"
                    value={filters.ageMax}
                    onChange={(e) => setFilters((f) => ({ ...f, ageMax: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: isRtl ? "< سنة" : "< 1 yr", min: "0", max: "0" },
                  { label: isRtl ? "١–٥ سنوات" : "1–5 yrs", min: "1", max: "5" },
                  { label: isRtl ? "٥–١٢ سنة" : "5–12 yrs", min: "5", max: "12" },
                  { label: isRtl ? "١٢–١٨ سنة" : "12–18 yrs", min: "12", max: "18" },
                ].map((b) => (
                  <Button
                    key={b.label}
                    type="button"
                    size="sm"
                    variant={filters.ageMin === b.min && filters.ageMax === b.max ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() =>
                      setFilters((f) =>
                        f.ageMin === b.min && f.ageMax === b.max
                          ? { ...f, ageMin: "", ageMax: "" }
                          : { ...f, ageMin: b.min, ageMax: b.max }
                      )
                    }
                  >
                    {b.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Diagnosis */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{isRtl ? "التشخيص (رمز ICD أو وصف)" : "Diagnosis (ICD code or keyword)"}</span>
              </div>
              <Input
                placeholder={isRtl ? "مثال: J45 أو ربو أو pneumonia" : "e.g. J45, asthma, pneumonia"}
                value={filters.diagnosis}
                onChange={(e) => setFilters((f) => ({ ...f, diagnosis: e.target.value }))}
              />
              {filters.diagnosis && (
                <p className="text-xs text-muted-foreground">
                  {isRtl
                    ? "سيتم تصدير المرضى الذين لديهم تشخيص يطابق هذا المصطلح فقط."
                    : "Only patients who have a diagnosis matching this term will be exported."}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setFilters({ dateFrom: "", dateTo: "", unitId: "", ageMin: "", ageMax: "", diagnosis: "" })}
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                {isRtl ? "مسح الفلاتر" : "Clear filters"}
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setExportOpen(false)} disabled={exporting || generatingPdf}>
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button variant="outline" onClick={handlePdfReport} disabled={exporting || generatingPdf}>
                {generatingPdf
                  ? <Loader2 className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                  : <FileText className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 text-rose-600`} />}
                <span className={generatingPdf ? "" : "text-rose-600"}>
                  {isRtl ? "تقرير PDF إحصائي" : "PDF Report"}
                </span>
              </Button>
              <Button onClick={handleExport} disabled={exporting || generatingPdf}>
                {exporting
                  ? <Loader2 className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                  : <FileSpreadsheet className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
                {isRtl ? "تصدير Excel" : "Export Excel"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin-only terminal delete confirmation */}
      <AlertDialog
        open={!!patientToDelete}
        onOpenChange={(open) => { if (!open) setPatientToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {t("patient.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{t("patient.deleteConfirmDesc")}</span>
              {patientToDelete && (
                <span className="block rounded-md border bg-muted/50 px-3 py-2 font-medium">
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {patientToDelete.mrn}
                  </span>
                  {isRtl && patientToDelete.nameAr
                    ? patientToDelete.nameAr
                    : patientToDelete.nameEn}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("generic.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("patient.deletePatient")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
