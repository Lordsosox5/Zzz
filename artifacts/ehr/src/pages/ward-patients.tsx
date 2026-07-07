import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, Baby, BedDouble, UserRound, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";
import { PatientStatusBadge } from "@/components/patient-status-badge";

type WardType = "nursery" | "picu";

type Patient = {
  id: number;
  mrn: string;
  nameEn: string;
  nameAr?: string | null;
  dateOfBirth: string;
  gender: string;
  status: string;
  place?: string | null;
  guardianName?: string | null;
  admissionDate?: string | null;
};

const GENDER_BADGE: Record<string, string> = {
  male:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  female: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
};

function calcAge(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (totalMonths < 1) {
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    return `${days}d`;
  }
  if (totalMonths < 24) return `${totalMonths}m`;
  return `${Math.floor(totalMonths / 12)}y`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const WARD_CONFIG: Record<WardType, {
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  iconBg: string;
}> = {
  nursery: {
    icon: Baby,
    color: "text-pink-600",
    bgGradient: "from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20",
    iconBg: "bg-pink-100 dark:bg-pink-900/30",
  },
  picu: {
    icon: BedDouble,
    color: "text-red-600",
    bgGradient: "from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
    iconBg: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function WardPatients({ ward }: { ward: WardType }) {
  const { t, isRtl } = useTranslation();
  const [search, setSearch] = useState("");

  const wardLabel = ward === "nursery" ? t("nav.nursery") : t("nav.picu");
  const cfg = WARD_CONFIG[ward];
  const Icon = cfg.icon;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ward-patients", ward, search],
    queryFn: async () => {
      const params = new URLSearchParams({ place: ward, limit: "200" });
      if (search) params.set("search", search);
      const token = getToken();
      const res = await fetch(`/api/patients?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load patients");
      return res.json() as Promise<{ patients: Patient[]; total: number }>;
    },
    staleTime: 30_000,
  });

  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;

  const admitted = patients.filter(p => p.status === "admitted").length;
  const discharged = patients.filter(p => p.status === "discharged").length;

  return (
    <div className="space-y-5">

      {/* Header banner */}
      <div className={`rounded-xl bg-gradient-to-r ${cfg.bgGradient} border p-5 flex items-center gap-4`}>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.iconBg} shrink-0`}>
          <Icon className={`h-6 w-6 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{wardLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {isRtl
              ? `${total} مريض — ${admitted} داخلي، ${discharged} خرج`
              : `${total} patient${total !== 1 ? "s" : ""} — ${admitted} admitted, ${discharged} discharged`}
          </p>
        </div>
        {/* Stat pills */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-background/70 border">
            <span className="text-xl font-bold text-foreground">{admitted}</span>
            <span className="text-[11px] text-muted-foreground">{isRtl ? "داخلي" : "Admitted"}</span>
          </div>
          <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-background/70 border">
            <span className="text-xl font-bold text-foreground">{total}</span>
            <span className="text-[11px] text-muted-foreground">{isRtl ? "الكل" : "Total"}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="ps-9"
              placeholder={isRtl ? "بحث بالاسم أو رقم الملف..." : "Search by name or MRN..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{isRtl ? "جاري التحميل..." : "Loading patients..."}</span>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-destructive">
              {isRtl ? "تعذّر تحميل البيانات" : "Failed to load patients"}
            </div>
          ) : patients.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Icon className={`h-10 w-10 mx-auto opacity-25 ${cfg.color}`} />
              <p className="text-sm text-muted-foreground">
                {search
                  ? (isRtl ? "لا توجد نتائج مطابقة" : "No patients match your search")
                  : (isRtl ? `لا يوجد مرضى في ${wardLabel} حالياً` : `No patients currently in ${wardLabel}`)}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-32">{isRtl ? "رقم الملف" : "MRN"}</TableHead>
                  <TableHead>{isRtl ? "الاسم" : "Patient"}</TableHead>
                  <TableHead className="w-20 text-center">{isRtl ? "العمر" : "Age"}</TableHead>
                  <TableHead className="w-24 text-center">{isRtl ? "الجنس" : "Gender"}</TableHead>
                  <TableHead className="w-28 text-center">{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="w-36">{isRtl ? "تاريخ الدخول" : "Admission"}</TableHead>
                  <TableHead className="hidden md:table-cell">{isRtl ? "ولي الأمر" : "Guardian"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map(patient => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <TableCell>
                      <Link href={`/patients/${patient.id}`}>
                        <span className="font-mono text-xs font-semibold text-primary hover:underline">
                          {patient.mrn}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">
                              {isRtl && patient.nameAr ? patient.nameAr : patient.nameEn}
                            </p>
                            {patient.nameAr && patient.nameEn && (
                              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                                {isRtl ? patient.nameEn : patient.nameAr}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">{calcAge(patient.dateOfBirth)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`text-[11px] capitalize ${GENDER_BADGE[patient.gender] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {isRtl
                          ? patient.gender === "male" ? "ذكر" : patient.gender === "female" ? "أنثى" : patient.gender
                          : patient.gender}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <PatientStatusBadge status={patient.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {formatDate(patient.admissionDate)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {patient.guardianName ?? "—"}
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
