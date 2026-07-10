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
      const join = (arr: string[]) => arr.filter(Boolean).join(" | ");

      // ── Anonymization: Research ID is a one-way hash of the patient's real ID ──
      // Deterministic (same patient → same Research ID every export) but the
      // original ID cannot be recovered by inspecting the code or the output.
      const RESEARCH_ID_SALT = "AMH-EHR-RESEARCH-2026";
      const hashPatientId = (pid: number) => {
        const input = `${RESEARCH_ID_SALT}:${pid}`;
        let h1 = 0xdeadbeef ^ input.length;
        let h2 = 0x41c6ce57 ^ input.length;
        for (let i = 0; i < input.length; i++) {
          const ch = input.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        const combined = (h2 >>> 0) * 0x100000000 + (h1 >>> 0);
        const part1 = (h1 >>> 0).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
        const part2 = (Math.abs(combined) % 9000 + 1000).toString();
        return `RID-${part1}-${part2}`;
      };
      const researchIdMap = new Map<number, string>();
      filtered.forEach((p) => researchIdMap.set(p.id, hashPatientId(p.id)));

      const prescriptionsArr = Array.isArray(prescriptionsRaw) ? prescriptionsRaw : (prescriptionsRaw as any)?.prescriptions ?? [];
      const labOrdersArr = Array.isArray(labOrdersRaw) ? labOrdersRaw : (labOrdersRaw as any)?.orders ?? [];
      const radiologyOrdersArr = Array.isArray(radiologyOrdersRaw) ? radiologyOrdersRaw : (radiologyOrdersRaw as any)?.orders ?? [];
      const appointmentsArr = Array.isArray(appointmentsRaw) ? appointmentsRaw : [];
      const vaccinationsArr = Array.isArray(vaccinationsRaw) ? vaccinationsRaw : [];
      const growthArr = Array.isArray(growthRaw) ? growthRaw : [];
      const notesArr = Array.isArray(notesRaw) ? notesRaw : [];
      const dischargeArr = Array.isArray(dischargeRaw) ? dischargeRaw : [];
      const invoicesArr = Array.isArray(invoicesRaw) ? invoicesRaw : (invoicesRaw as any)?.invoices ?? [];

      const byPatient = (arr: any[], pid: number) => arr.filter((x) => x.patientId === pid);

      // ── Single-sheet, fully anonymized patient dataset ──────────────────────
      // Excludes: database ID/MRN (replaced by random Research ID), patient name,
      // guardian/mother's name, and admission date.
      const patientRows = filtered.map((p: any) => {
        const pid = p.id;
        const diag = byPatient(diagnosesRaw as any[], pid).map((d: any) => `${d.code ?? ""} ${d.description ?? d.name ?? ""}`.trim());
        const rx = byPatient(prescriptionsArr, pid).map((r: any) => `${r.drugName ?? r.medicationName ?? ""} (${r.dosage ?? ""}, ${r.frequency ?? ""})`.trim());
        const labs = byPatient(labOrdersArr, pid).map((o: any) => `${o.testName ?? ""} [${o.status ?? ""}]${o.resultValue ? ": " + o.resultValue : ""}`.trim());
        const rad = byPatient(radiologyOrdersArr, pid).map((o: any) => `${o.modality ?? ""} ${o.study ?? o.studyName ?? ""} [${o.status ?? ""}]`.trim());
        const appts = byPatient(appointmentsArr, pid).map((a: any) => `${fmtDt(a.scheduledAt)} - ${a.type ?? ""} [${a.status ?? ""}]`.trim());
        const vacc = byPatient(vaccinationsArr, pid).map((v: any) => `${v.vaccineName ?? v.name ?? ""} dose ${v.dose ?? v.doseNumber ?? ""} (${fmt(v.givenAt ?? v.administeredAt ?? v.createdAt)})`.trim());
        const growth = byPatient(growthArr, pid).map((g: any) => `${fmt(g.createdAt)}: ${g.weight ?? "?"}kg / ${g.height ?? "?"}cm`);
        const notes = byPatient(notesArr, pid).map((n: any) => `${n.type ?? "Note"}: ${n.content ?? ""}`);
        const discharge = byPatient(dischargeArr, pid).map((d: any) => `Dx: ${d.dischargeDiagnosis ?? ""} — ${d.treatmentSummary ?? d.summary ?? ""}`);
        const invoices = byPatient(invoicesArr, pid).map((i: any) => `#${i.invoiceNumber ?? i.id} - ${i.totalAmount ?? i.total ?? ""} (${i.status ?? ""})`);

        return {
          "Research ID": researchIdMap.get(pid),
          "Age (Years)": p.dateOfBirth ? calcAge(p.dateOfBirth) : "",
          Gender: p.gender ?? "",
          "Blood Group": p.bloodGroup ?? p.bloodType ?? "",
          "Mother Blood Group": p.motherBloodGroup ?? "",
          Nationality: p.nationality ?? "",
          Phone: p.phone ?? "",
          Address: p.address ?? "",
          Residence: p.residence ?? "",
          "Weight (kg)": p.weight ?? "",
          "Height (cm)": p.height ?? "",
          "Discharge Date": fmt(p.dischargeDate),
          "Guardian Relation": p.guardianRelation ?? "",
          "Guardian Phone": p.guardianPhone ?? "",
          Allergies: p.allergies ?? "",
          Status: p.status ?? "",
          Unit: p.unitId ? (unitMap[p.unitId] ?? String(p.unitId)) : "",
          Diagnoses: join(diag),
          Prescriptions: join(rx),
          "Lab Orders": join(labs),
          "Radiology Orders": join(rad),
          Appointments: join(appts),
          Vaccinations: join(vacc),
          "Growth Records": join(growth),
          "Clinical Notes": join(notes),
          "Discharge Summary": join(discharge),
          Invoices: join(invoices),
        };
      });

      // ── Build single-page workbook ───────────────────────────────────────
      const longCols = new Set([
        "Diagnoses", "Prescriptions", "Lab Orders", "Radiology Orders", "Appointments",
        "Vaccinations", "Growth Records", "Clinical Notes", "Discharge Summary", "Invoices",
      ]);
      const columnKeys = Object.keys(patientRows[0] ?? { "Research ID": "" });
      const ws = XLSX.utils.json_to_sheet(patientRows.length ? patientRows : [{ "Research ID": "No records" }]);
      ws["!cols"] = columnKeys.map((h) => ({
        wch: longCols.has(h)
          ? 40
          : Math.max(h.length + 2, ...patientRows.map((r: any) => String(r[h] ?? "").length + 1), 10),
      }));
      ws["!rows"] = [{ hpt: 20 }];
      (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
      (ws as any)["!views"] = [{ state: "frozen", ySplit: 1 }];
      ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: patientRows.length, c: columnKeys.length - 1 } }) };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Anonymized Patients");

      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `AMH_patients_anonymized_export_${dateTag}.xlsx`);

      toast({
        title: isRtl ? "تم التصدير بنجاح" : "Export complete",
        description: isRtl
          ? `تم تصدير ${filtered.length} مريض (بيانات مجهولة الهوية) في ورقة واحدة`
          : `${filtered.length} patients exported (anonymized) in a single sheet`,
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
