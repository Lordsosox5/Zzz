import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Loader2, Baby, BedDouble, UserRound,
  CalendarDays, MapPin, Users, ShieldPlus, LayoutGrid,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";
import { PatientStatusBadge } from "@/components/patient-status-badge";

type Patient = {
  id: number;
  mrn: string;
  nameEn: string;
  nameAr?: string | null;
  dateOfBirth: string;
  gender: string;
  status: string;
  place?: string | null;
  unitId?: number | null;
  guardianName?: string | null;
  admissionDate?: string | null;
};

const UNIT_TYPE_TO_PLACE: Record<string, string> = {
  icu:       "picu",
  nicu:      "nursery",
  emergency: "phdu",
  ward:      "general_ward",
  surgical:  "general_ward",
  outpatient:"general_ward",
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
    const days = Math.floor((now.getTime() - birth.getTime()) / 86_400_000);
    return `${days}d`;
  }
  if (totalMonths < 24) return `${totalMonths}m`;
  return `${Math.floor(totalMonths / 12)}y`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const PLACE_CONFIG: Record<string, {
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
  badgeClass: string;
}> = {
  picu: {
    labelEn: "PICU", labelAr: "PICU",
    icon: BedDouble,
    gradient: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  phdu: {
    labelEn: "PHDU", labelAr: "PHDU",
    icon: ShieldPlus,
    gradient: "from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    iconColor: "text-orange-600 dark:text-orange-400",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  nursery: {
    labelEn: "Nursery", labelAr: "الحضانة",
    icon: Baby,
    gradient: "from-pink-50 to-fuchsia-50 dark:from-pink-950/20 dark:to-fuchsia-950/20",
    iconBg: "bg-pink-100 dark:bg-pink-900/40",
    iconColor: "text-pink-600 dark:text-pink-400",
    badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  general_ward: {
    labelEn: "General Ward", labelAr: "العنبر العام",
    icon: LayoutGrid,
    gradient: "from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
    iconColor: "text-teal-600 dark:text-teal-400",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
};

const PLACE_ORDER = ["picu", "phdu", "nursery", "general_ward"];

function WardSection({ placeKey, patients, isRtl }: {
  placeKey: string;
  patients: Patient[];
  isRtl: boolean;
}) {
  const cfg = PLACE_CONFIG[placeKey];
  const Icon = cfg?.icon ?? MapPin;
  const label = isRtl ? (cfg?.labelAr ?? placeKey) : (cfg?.labelEn ?? placeKey);
  const gradient = cfg?.gradient ?? "from-muted/30 to-muted/10";
  const iconBg = cfg?.iconBg ?? "bg-muted";
  const iconColor = cfg?.iconColor ?? "text-muted-foreground";
  const badgeClass = cfg?.badgeClass ?? "bg-muted text-muted-foreground";
  const admitted = patients.filter(p => p.status === "admitted").length;

  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} border-b px-5 py-3.5 flex items-center gap-3`}>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} shrink-0`}>
          <Icon className={`h-4.5 w-4.5 h-[18px] w-[18px] ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight">{label}</h3>
          <p className="text-[12px] text-muted-foreground">
            {isRtl
              ? `${patients.length} مريض — ${admitted} داخلي`
              : `${patients.length} patient${patients.length !== 1 ? "s" : ""} — ${admitted} admitted`}
          </p>
        </div>
        <Badge className={`shrink-0 text-sm font-bold px-3 py-1 ${badgeClass} border-0`}>
          {patients.length}
        </Badge>
      </div>

      <CardContent className="p-0">
        {patients.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
            <Icon className="h-8 w-8 opacity-20" />
            <p className="text-sm">{isRtl ? "لا يوجد مرضى حالياً" : "No patients currently"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 ps-4">{isRtl ? "رقم الملف" : "MRN"}</TableHead>
                <TableHead>{isRtl ? "الاسم" : "Patient"}</TableHead>
                <TableHead className="w-16 text-center">{isRtl ? "العمر" : "Age"}</TableHead>
                <TableHead className="w-20 text-center hidden sm:table-cell">{isRtl ? "الجنس" : "Sex"}</TableHead>
                <TableHead className="w-28 text-center">{isRtl ? "الحالة" : "Status"}</TableHead>
                <TableHead className="w-28 hidden md:table-cell">{isRtl ? "الدخول" : "Admission"}</TableHead>
                <TableHead className="hidden lg:table-cell pe-4">{isRtl ? "ولي الأمر" : "Guardian"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map(patient => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="ps-4">
                    <Link href={`/patients/${patient.id}`}>
                      <span className="font-mono text-xs font-semibold text-primary hover:underline">
                        {patient.mrn}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/patients/${patient.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                          <UserRound className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">
                            {isRtl && patient.nameAr ? patient.nameAr : patient.nameEn}
                          </p>
                          {patient.nameAr && patient.nameEn && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {isRtl ? patient.nameEn : patient.nameAr}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center text-sm font-medium">
                    {calcAge(patient.dateOfBirth)}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] capitalize ${GENDER_BADGE[patient.gender] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {isRtl
                        ? patient.gender === "male" ? "ذكر" : patient.gender === "female" ? "أنثى" : patient.gender
                        : patient.gender}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <PatientStatusBadge status={patient.status} size="sm" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      {formatDate(patient.admissionDate)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground pe-4">
                    {patient.guardianName ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function WardCensus() {
  const { t, isRtl } = useTranslation();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ward-census"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch("/api/patients?limit=500&status=admitted", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load patients");
      return res.json() as Promise<{ patients: Patient[]; total: number }>;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: unitsRaw } = useQuery({
    queryKey: ["units-for-census"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch("/api/units", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json() as Promise<{ id: number; type: string }[]>;
    },
    staleTime: 120_000,
  });

  const unitTypeMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const u of (unitsRaw ?? [])) map[u.id] = u.type;
    return map;
  }, [unitsRaw]);

  const allPatients = data?.patients ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allPatients;
    const q = search.toLowerCase();
    return allPatients.filter(p =>
      p.nameEn.toLowerCase().includes(q) ||
      (p.nameAr ?? "").toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)
    );
  }, [allPatients, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Patient[]> = {};
    for (const place of PLACE_ORDER) map[place] = [];
    map["__unassigned"] = [];
    for (const p of filtered) {
      const unitType = p.unitId ? unitTypeMap[p.unitId] : null;
      const derivedPlace = unitType ? UNIT_TYPE_TO_PLACE[unitType] : null;
      const key = derivedPlace && PLACE_ORDER.includes(derivedPlace) ? derivedPlace : "__unassigned";
      map[key].push(p);
    }
    return map;
  }, [filtered, unitTypeMap]);

  const totalAdmitted = allPatients.length;

  const statCards = PLACE_ORDER.map(key => ({
    key,
    count: grouped[key]?.length ?? 0,
    cfg: PLACE_CONFIG[key],
  }));

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{t("ward.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("ward.subtitle")}</p>
      </div>

      {/* Summary stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center py-4 bg-primary/5 border-primary/20">
          <Users className="h-5 w-5 text-primary mb-1" />
          <span className="text-2xl font-bold text-primary">
            {isLoading ? "—" : totalAdmitted}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5">{t("ward.totalAdmitted")}</span>
        </Card>
        {statCards.map(({ key, count, cfg }) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className="flex flex-col items-center justify-center py-4">
              <Icon className={`h-4 w-4 mb-1 ${cfg.iconColor}`} />
              <span className="text-2xl font-bold">{isLoading ? "—" : count}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {isRtl ? cfg.labelAr : cfg.labelEn}
              </span>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="ps-9"
          placeholder={isRtl ? "بحث بالاسم أو رقم الملف..." : "Search by name or MRN..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">{isRtl ? "جاري التحميل..." : "Loading census..."}</span>
        </div>
      ) : isError ? (
        <div className="py-24 text-center text-sm text-destructive">
          {isRtl ? "تعذّر تحميل البيانات" : "Failed to load patient data"}
        </div>
      ) : (
        <div className="space-y-5">
          {PLACE_ORDER.map(key => (
            <WardSection
              key={key}
              placeKey={key}
              patients={grouped[key] ?? []}
              isRtl={isRtl}
            />
          ))}
          {(grouped["__unassigned"]?.length ?? 0) > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/30 px-5 py-3.5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                  <UserRound className="h-[18px] w-[18px] text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base leading-tight">{t("ward.unassigned")}</h3>
                  <p className="text-[12px] text-muted-foreground">
                    {isRtl
                      ? `${grouped["__unassigned"].length} مريض بدون جناح محدد`
                      : `${grouped["__unassigned"].length} patient${grouped["__unassigned"].length !== 1 ? "s" : ""} without a ward`}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-sm font-bold px-3 py-1">
                  {grouped["__unassigned"].length}
                </Badge>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="ps-4 w-28">{isRtl ? "رقم الملف" : "MRN"}</TableHead>
                      <TableHead>{isRtl ? "الاسم" : "Patient"}</TableHead>
                      <TableHead className="w-16 text-center">{isRtl ? "العمر" : "Age"}</TableHead>
                      <TableHead className="w-28 text-center">{isRtl ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="hidden md:table-cell pe-4">{isRtl ? "الدخول" : "Admission"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped["__unassigned"].map(patient => (
                      <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/40">
                        <TableCell className="ps-4">
                          <Link href={`/patients/${patient.id}`}>
                            <span className="font-mono text-xs font-semibold text-primary hover:underline">
                              {patient.mrn}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/patients/${patient.id}`} className="block">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                                <UserRound className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <p className="text-sm font-medium truncate">
                                {isRtl && patient.nameAr ? patient.nameAr : patient.nameEn}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {calcAge(patient.dateOfBirth)}
                        </TableCell>
                        <TableCell className="text-center">
                          <PatientStatusBadge status={patient.status} size="sm" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell pe-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3 shrink-0" />
                            {formatDate(patient.admissionDate)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
