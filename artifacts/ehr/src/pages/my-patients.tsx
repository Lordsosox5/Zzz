import { useState } from "react";
import { Link } from "wouter";
import { useListPatients, useListUnits } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, Building2, User, UserPlus, ChevronRight } from "lucide-react";
import { canAdmitNewPatient } from "@/lib/permissions";

function ageFromDob(dob: string | null | undefined): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) years--;
  if (years === 0) {
    const m = ((now.getFullYear() - birth.getFullYear()) * 12) + (now.getMonth() - birth.getMonth());
    return `${Math.max(0, m)}m`;
  }
  return `${years}y`;
}

export default function MyPatients() {
  const { t, isRtl } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const user = getUser();
  const { data: unitsData = [] } = useListUnits();
  const userUnit = user?.unitId ? unitsData.find(u => u.id === user.unitId) : null;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setTimeout(() => setDebouncedSearch(e.target.value), 400);
  };

  const { data, isLoading } = useListPatients({
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const patients = data?.patients ?? [];

  const unitNameDisplay = userUnit
    ? (isRtl && userUnit.nameAr ? userUnit.nameAr : userUnit.nameEn)
    : null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.myPatients")}</h1>
          {unitNameDisplay && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {isRtl ? `الوحدة: ${unitNameDisplay}` : `Unit: ${unitNameDisplay}`}
            </p>
          )}
        </div>
        {canAdmitNewPatient(user?.role ?? "") && (
          <Button asChild size="sm">
            <Link href="/patients/new">
              <UserPlus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "تسجيل مريض جديد" : "New Patient"}
            </Link>
          </Button>
        )}
      </div>

      {/* No unit warning */}
      {!userUnit && !isLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>
            {isRtl
              ? "لم يتم تعيين وحدة لحسابك بعد. يرجى التواصل مع المشرف."
              : "No unit has been assigned to your account yet. Contact your supervisor."}
          </span>
        </div>
      )}

      {/* Patient list */}
      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={isRtl ? "بحث باسم المريض أو رقم السجل..." : "Search by name or MRN..."}
                value={searchTerm}
                onChange={handleSearch}
                className={isRtl ? "pr-9" : "pl-9"}
              />
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {isLoading ? "—" : patients.length} {isRtl ? "مريض" : "patients"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <User className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                {isRtl ? "لا يوجد مرضى في وحدتك حالياً" : "No patients in your unit yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">{isRtl ? "رقم السجل" : "MRN"}</TableHead>
                  <TableHead>{isRtl ? "الاسم" : "Name"}</TableHead>
                  <TableHead className="hidden sm:table-cell">{isRtl ? "العمر" : "Age"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isRtl ? "الجنس" : "Gender"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isRtl ? "فصيلة الدم" : "Blood"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map(patient => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => { window.location.href = `/patients/${patient.id}`; }}
                  >
                    <TableCell className="px-4 font-mono text-xs text-muted-foreground">
                      {patient.mrn}
                    </TableCell>
                    <TableCell className="font-medium">
                      {isRtl && patient.nameAr ? patient.nameAr : patient.nameEn}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {ageFromDob(patient.dateOfBirth)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">
                      {patient.gender ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {patient.bloodGroup
                        ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{patient.bloodGroup}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={patient.status === "active" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {patient.status ?? "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
