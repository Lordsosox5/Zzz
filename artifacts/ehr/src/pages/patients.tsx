import { useState } from "react";
import { Link } from "wouter";
import { useListPatients, useListUnits } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { isUnitRole } from "@/lib/permissions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Loader2, Building2 } from "lucide-react";

export default function Patients() {
  const { t, isRtl } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const user = getUser();
  const unitRestricted = user && isUnitRole(user.role);

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
    limit: 20
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.patients")}</h1>
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
            {t("patient.newPatient")}
          </Link>
        </Button>
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
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={t("generic.search")}
              value={searchTerm}
              onChange={handleSearch}
              className={`${isRtl ? 'pr-9' : 'pl-9'}`}
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
                  <TableRow key={patient.id}>
                    <TableCell className="px-4 font-mono text-xs">{patient.mrn}</TableCell>
                    <TableCell className="px-4 font-medium">
                      {isRtl && patient.nameAr ? patient.nameAr : patient.nameEn}
                    </TableCell>
                    <TableCell className="px-4">{new Date(patient.dateOfBirth).toLocaleDateString()}</TableCell>
                    <TableCell className="px-4">
                      {patient.gender === 'male' ? t("patient.male") : patient.gender === 'female' ? t("patient.female") : patient.gender}
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>
                        {patient.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/patients/${patient.id}`}>{t("patient.viewProfile")}</Link>
                      </Button>
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
    </div>
  );
}
