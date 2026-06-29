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
import { Search, UserPlus, Loader2, Building2, Trash2, FileSpreadsheet, Filter, CalendarRange, Stethoscope, Users } from "lucide-react";
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
                      <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                        {patient.status === "active" ? "في المستشفى" : "خرج"}
                      </Badge>
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
              <Button variant="outline" onClick={() => setExportOpen(false)} disabled={exporting}>
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleExport} disabled={exporting}>
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
