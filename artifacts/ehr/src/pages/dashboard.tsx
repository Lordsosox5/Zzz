import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  useGetDashboardStats,
  useGetDashboardAlerts,
  useGetTodayAppointments,
  useGetBedOccupancy,
  useGetRevenueStats,
  useListLabOrders,
  useListPatients,
  useListUnits,
  useListDrugs,
  useListPrescriptions,
  useListInvoices,
  useListVaccinations,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { isLabRole, isUnitRole } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import {
  Users, Calendar, Activity, FlaskConical, DollarSign,
  BedDouble, AlertTriangle, Info, Clock, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus, UserPlus,
  Pill, ClipboardList, TrendingUp, ShieldAlert, Package, FileText,
} from "lucide-react";

function getGreeting(hour: number): "dash.goodMorning" | "dash.goodAfternoon" | "dash.goodEvening" {
  if (hour < 12) return "dash.goodMorning";
  if (hour < 17) return "dash.goodAfternoon";
  return "dash.goodEvening";
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `SDG ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `SDG ${(n / 1_000).toFixed(1)}K`;
  return `SDG ${n.toLocaleString()}`;
}

function Trend({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct > 0;
  const neutral = pct === 0;
  const good = invert ? !up : up;
  if (neutral) return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function StatCard({
  label, value, subLabel, subValue,
  icon: Icon, iconColor, iconBg, loading,
  isCurrency = false, onClick,
}: {
  label: string;
  value: number | string | undefined;
  subLabel?: string;
  subValue?: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  loading: boolean;
  isCurrency?: boolean;
  onClick?: () => void;
}) {
  const display = isCurrency && typeof value === "number" ? formatCurrency(value) : (value ?? 0);
  return (
    <Card
      className={`relative overflow-hidden transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98]" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{display}</p>
            )}
            {subLabel && (
              <div className="flex items-center gap-1.5 mt-2">
                {loading ? (
                  <Skeleton className="h-3 w-24" />
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{subLabel}</span>
                    {subValue}
                  </>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertSeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />;
  return <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />;
}

function alertStyle(severity: string) {
  if (severity === "critical") return "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20";
  if (severity === "warning") return "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20";
  return "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20";
}

function alertBadgeStyle(severity: string) {
  if (severity === "critical") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (severity === "warning") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
}

function AlertItem({
  alert, isRtl, navigate, t,
}: {
  alert: Record<string, unknown>;
  isRtl: boolean;
  navigate: (path: string) => void;
  t: (k: string) => string;
}) {
  const patientId = alert.patientId as number | undefined;
  const severity = (alert.severity as string) ?? "info";
  const isClickable = !!patientId;
  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${alertStyle(severity)} ${isClickable ? "cursor-pointer hover:brightness-95 transition-all" : ""}`}
      onClick={isClickable ? () => navigate(`/patients/${patientId}`) : undefined}
    >
      <AlertSeverityIcon severity={severity} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug text-sm">
            {isRtl && alert.messageAr ? String(alert.messageAr) : String(alert.message ?? "")}
          </p>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${alertBadgeStyle(severity)}`}>
            {severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Info"}
          </span>
        </div>
        {alert.patientName && (
          <p className="text-xs text-muted-foreground mt-1">{t("dash.patient")}: {String(alert.patientName)}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(alert.timestamp as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function apptStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    completed: { label: "Completed", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    in_progress: { label: "In Progress", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
    no_show: { label: "No Show", cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function apptTypeBadge(type: string) {
  const map: Record<string, string> = {
    emergency: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    outpatient: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    follow_up: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    consultation: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    procedure: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    checkup: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  };
  const cls = map[type] ?? "bg-gray-100 text-gray-500";
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── General Dashboard ────────────────────────────────────────────────────────

function GeneralDashboard() {
  const { t, isRtl } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const role = user?.role ?? "";
  const isSuperAdmin = role === "super_admin";
  const hour = new Date().getHours();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: alerts, isLoading: alertsLoading } = useGetDashboardAlerts();
  const { data: appointments, isLoading: apptsLoading } = useGetTodayAppointments();
  const { data: occupancy, isLoading: occupancyLoading } = useGetBedOccupancy();
  const { data: revenue, isLoading: revenueLoading } = useGetRevenueStats();

  const [trendPeriod, setTrendPeriod] = useState<30 | 90 | 180>(30);
  const { data: allPatientsData } = useListPatients({ limit: 500 });

  const trendData = useMemo(() => {
    const patients = (allPatientsData?.patients ?? []) as Array<{ createdAt?: string | null }>;
    const now = new Date();

    if (trendPeriod === 30) {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const count = patients.filter(p => (p.createdAt ?? "").slice(0, 10) === dateStr).length;
        return { label, count };
      });
    }

    if (trendPeriod === 90) {
      return Array.from({ length: 13 }, (_, i) => {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (12 - i) * 7);
        weekEnd.setHours(23, 59, 59, 999);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const label = weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const count = patients.filter(p => {
          if (!p.createdAt) return false;
          const d = new Date(p.createdAt);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return { label, count };
      });
    }

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const count = patients.filter(p => {
        if (!p.createdAt) return false;
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      return { label, count };
    });
  }, [allPatientsData, trendPeriod]);

  const today = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const displayName = isRtl ? (user?.nameAr ?? user?.nameEn) : user?.nameEn;

  const statCards = [
    {
      label: t("dash.totalPatients"),
      value: stats?.totalPatients,
      subLabel: t("dash.newPatients") + ":",
      subValue: <span className="text-xs font-semibold text-emerald-600">+{stats?.newPatientsThisMonth ?? 0}</span>,
      icon: Users, iconColor: "text-blue-600", iconBg: "bg-blue-500/10",
      onClick: () => navigate("/patients"),
    },
    {
      label: t("dash.todayAppts"),
      value: stats?.todayAppointments,
      subLabel: t("dash.completedToday") + ":",
      subValue: <span className="text-xs font-semibold text-emerald-600">{stats?.completedAppointmentsToday ?? 0}</span>,
      icon: Calendar, iconColor: "text-green-600", iconBg: "bg-green-500/10",
      onClick: () => navigate("/appointments"),
    },
    {
      label: t("dash.activeAdmissions"),
      value: stats?.activeAdmissions,
      subLabel: t("dash.bedRate") + ":",
      subValue: <span className="text-xs font-semibold text-purple-600">{stats?.bedOccupancyRate?.toFixed(1) ?? 0}%</span>,
      icon: BedDouble, iconColor: "text-purple-600", iconBg: "bg-purple-500/10",
      onClick: () => navigate("/patients"),
    },
    {
      label: t("dash.pendingLabs"),
      value: stats?.pendingLabOrders,
      subLabel: t("dash.criticalCount") + ":",
      subValue: stats?.criticalAlerts
        ? <span className="text-xs font-semibold text-red-600">{stats.criticalAlerts}</span>
        : <span className="text-xs text-muted-foreground">0</span>,
      icon: FlaskConical, iconColor: "text-amber-600", iconBg: "bg-amber-500/10",
      onClick: () => navigate("/lab"),
    },
    {
      label: t("dash.pendingRx"),
      value: stats?.pendingPrescriptions,
      subLabel: t("dash.lowStock") + ":",
      subValue: stats?.lowStockDrugs
        ? <span className="text-xs font-semibold text-orange-600">{stats.lowStockDrugs}</span>
        : <span className="text-xs text-muted-foreground">0</span>,
      icon: Pill, iconColor: "text-orange-600", iconBg: "bg-orange-500/10",
      onClick: () => navigate("/prescriptions"),
    },
    ...(isSuperAdmin ? [{
      label: t("dash.revenue"),
      value: stats?.totalRevenue,
      subLabel: t("dash.thisMonth") + ":",
      subValue: revenue
        ? <><span className="text-xs font-semibold">{formatCurrency(revenue.thisMonth)}</span> <Trend current={revenue.thisMonth} previous={revenue.lastMonth} /></>
        : null,
      icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10",
      isCurrency: true,
      onClick: () => navigate("/billing"),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(getGreeting(hour))}, {displayName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("dash.overview")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => navigate("/patients?new=1")} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            {t("dash.quickActions")}: {t("nav.patients")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/appointments?new=1")} className="gap-1.5">
            <Calendar className="h-4 w-4" />
            {t("appt.newAppointment")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/lab?new=1")} className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            {t("nav.lab")}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s, i) => (
          <div key={i} className="xl:col-span-2">
            <StatCard
              label={s.label}
              value={s.value}
              subLabel={s.subLabel}
              subValue={s.subValue}
              icon={s.icon}
              iconColor={s.iconColor}
              iconBg={s.iconBg}
              loading={statsLoading}
              isCurrency={s.isCurrency}
              onClick={s.onClick}
            />
          </div>
        ))}
      </div>

      {/* Patient Registration Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            {isRtl ? "تسجيل المرضى عبر الزمن" : "Patient Registrations Over Time"}
          </CardTitle>
          <div className="flex items-center gap-1">
            {([30, 90, 180] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={trendPeriod === p ? "default" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setTrendPeriod(p)}
              >
                {p === 30 ? (isRtl ? "٣٠ي" : "30d") : p === 90 ? (isRtl ? "٣م" : "3M") : (isRtl ? "٦م" : "6M")}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-5 pb-3 px-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={trendPeriod === 30 ? 4 : trendPeriod === 90 ? 1 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                formatter={(val: number) => [val, isRtl ? "مريض جديد" : "New patients"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#patientGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {isRtl
              ? `${trendData.reduce((s, d) => s + d.count, 0)} مريض مسجل في هذه الفترة`
              : `${trendData.reduce((s, d) => s + d.count, 0)} patient${trendData.reduce((s, d) => s + d.count, 0) !== 1 ? "s" : ""} registered in this period`}
          </p>
        </CardContent>
      </Card>

      {/* Middle row: Alerts + Appointments + Bed Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alerts */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              {t("dash.alerts")}
            </CardTitle>
            {alerts && alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.slice(0, 6).map((alert) => (
                  <AlertItem key={alert.id} alert={alert as Record<string, unknown>} isRtl={isRtl} navigate={navigate} t={t} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm">{t("dash.noAlerts")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {t("dash.todayAppts")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/appointments")}>
              {t("dash.viewAll")}
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {apptsLoading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 items-center p-4 border-b last:border-0">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="divide-y">
                {appointments.slice(0, 6).map((appt) => {
                  const time = new Date(appt.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const avatarLetter = initials(appt.patientName);
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/patients/${appt.patientId}`)}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {avatarLetter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{appt.patientName ?? `#${appt.patientId}`}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{time}</span>
                          <span className="text-muted-foreground/40">·</span>
                          {apptTypeBadge(appt.type)}
                        </div>
                        {appt.doctorName && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{appt.doctorName}</p>
                        )}
                      </div>
                      <div className="shrink-0">{apptStatusBadge(appt.status)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">{t("dash.noApptsToday")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bed Occupancy */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-purple-500" />
              {t("dash.occupancy")}
            </CardTitle>
            {!occupancyLoading && occupancy && (
              <div className="text-right">
                <span className="text-lg font-bold">{occupancy.occupancyRate?.toFixed(1)}%</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col gap-3">
            {occupancyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : occupancy ? (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{occupancy.occupied} / {occupancy.total} {t("dash.bedsOccupied")}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-purple-600 font-medium">{occupancy.occupied} <span className="text-muted-foreground font-normal">used</span></span>
                    <span className="text-green-600 font-medium">{occupancy.available} <span className="text-muted-foreground font-normal">free</span></span>
                  </div>
                </div>
                <Progress value={(occupancy.occupied / occupancy.total) * 100} className="h-2 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {t("dash.wardBreakdown")}
                </p>
                <div className="space-y-3">
                  {(occupancy.wards ?? []).map((ward: { name: string; nameAr: string; total: number; occupied: number }) => {
                    const pct = Math.round((ward.occupied / ward.total) * 100);
                    const wardName = isRtl ? ward.nameAr : ward.name;
                    let barColor = "bg-green-500";
                    if (pct >= 90) barColor = "bg-red-500";
                    else if (pct >= 75) barColor = "bg-amber-500";
                    else if (pct >= 50) barColor = "bg-blue-500";
                    return (
                      <div key={ward.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium truncate">{wardName}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">{ward.occupied}/{ward.total} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Revenue — super_admin only */}
      {isSuperAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              {t("dash.revenueTitle")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/billing")}>
              {t("dash.viewAll")}
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {revenueLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : revenue ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t("dash.revenue.total"), value: revenue.totalRevenue, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
                  { label: t("dash.revenue.paid"), value: revenue.paidRevenue, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
                  { label: t("dash.revenue.pending"), value: revenue.pendingRevenue, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
                  {
                    label: t("dash.thisMonth"),
                    value: revenue.thisMonth,
                    color: "text-purple-600",
                    bg: "bg-purple-50 dark:bg-purple-950/20",
                    extra: <Trend current={revenue.thisMonth} previous={revenue.lastMonth} />,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-4 cursor-pointer hover:brightness-95 transition-all active:scale-[0.98] ${item.bg}`}
                    onClick={() => navigate("/billing")}
                  >
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value ?? 0)}</p>
                    {item.extra && (
                      <div className="flex items-center gap-1 mt-1">
                        {item.extra}
                        <span className="text-xs text-muted-foreground">{t("dash.vsLastMonth")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {!revenueLoading && revenue?.byPaymentMethod && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment Methods</p>
                <div className="flex gap-6 flex-wrap">
                  {revenue.byPaymentMethod.map((m: { method: string; amount: number }) => {
                    const total = revenue.totalRevenue ?? 1;
                    const pct = Math.round((m.amount / total) * 100);
                    const labels: Record<string, string> = {
                      cash: t("dash.revenue.cash"),
                      insurance: t("dash.revenue.insurance"),
                      credit: t("dash.revenue.credit"),
                    };
                    const colors: Record<string, string> = {
                      cash: "bg-emerald-500",
                      insurance: "bg-blue-500",
                      credit: "bg-purple-500",
                    };
                    return (
                      <div
                        key={m.method}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate("/billing")}
                      >
                        <div className={`h-2.5 w-2.5 rounded-full ${colors[m.method] ?? "bg-gray-400"}`} />
                        <span className="text-muted-foreground">{labels[m.method] ?? m.method}</span>
                        <span className="font-semibold">{pct}%</span>
                        <span className="text-muted-foreground text-xs">({formatCurrency(m.amount)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Lab Technician Dashboard ─────────────────────────────────────────────────

function LabDashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();
  const displayName = user?.nameEn;

  const { data: pending, isLoading: loadingPending } = useListLabOrders({ status: "pending" });
  const { data: collected, isLoading: loadingCollected } = useListLabOrders({ status: "collected" });

  const statCards = [
    { label: t("lab.pendingOnly"), value: pending?.length ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", loading: loadingPending, onClick: () => navigate("/lab") },
    { label: t("lab.collected"), value: collected?.length ?? 0, icon: FlaskConical, color: "text-blue-600", bg: "bg-blue-500/10", loading: loadingCollected, onClick: () => navigate("/lab") },
    { label: t("lab.resulted"), value: 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10", loading: false, onClick: () => navigate("/lab") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(getGreeting(hour))}, {displayName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("lab.queueDesc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
              onClick={s.onClick}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{s.label}</p>
                  {s.loading ? <Skeleton className="h-8 w-12" /> : <p className="text-3xl font-bold">{s.value}</p>}
                </div>
                <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            {t("lab.queue")}
          </CardTitle>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate("/lab")}>
            {t("lab.allOrders")}
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">{t("generic.date")}</TableHead>
                <TableHead className="text-xs">{t("lab.patientName")}</TableHead>
                <TableHead className="text-xs">{t("lab.testName")}</TableHead>
                <TableHead className="text-xs">{t("generic.priority")}</TableHead>
                <TableHead className="text-xs">{t("generic.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPending ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center">
                    <Skeleton className="mx-auto h-4 w-48" />
                  </TableCell>
                </TableRow>
              ) : pending && pending.length > 0 ? (
                pending.slice(0, 8).map((order) => (
                  <TableRow
                    key={order.id}
                    className={`cursor-pointer hover:bg-muted/40 transition-colors ${order.isCritical ? "bg-destructive/5" : ""}`}
                    onClick={() => navigate(`/patients/${order.patientId}`)}
                  >
                    <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{order.patientName ?? `#${order.patientId}`}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.testName}
                        {order.isCritical && <Badge variant="destructive" className="text-xs">⚠</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.priority === "stat" ? "destructive" : order.priority === "urgent" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t("lab.pending")}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t("lab.noPending")}
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

// ─── Unit (House Officer / Medical Officer) Dashboard ─────────────────────────

function UnitDashboard() {
  const { t, isRtl } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();
  const displayName = isRtl ? (user?.nameAr ?? user?.nameEn) : user?.nameEn;

  const { data: patientsData, isLoading: patientsLoading } = useListPatients({ limit: 50 });
  const { data: unitsData = [] } = useListUnits();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: alerts, isLoading: alertsLoading } = useGetDashboardAlerts();

  const allFetched = patientsData?.patients ?? [];
  const unitPatients = user?.unitId
    ? allFetched.filter((p: any) => p.unitId === user.unitId)
    : allFetched;
  const userUnit = user?.unitId ? unitsData.find((u) => u.id === user.unitId) : null;
  const unitName = userUnit ? (isRtl && userUnit.nameAr ? userUnit.nameAr : userUnit.nameEn) : null;

  const today = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const roleLabelMap: Record<string, { en: string; ar: string }> = {
    house_officer: { en: "House Officer Dashboard", ar: "لوحة تحكم الطبيب المقيم" },
    medical_officer: { en: "Medical Officer Dashboard", ar: "لوحة تحكم الضابط الطبي" },
  };
  const roleLabel = isRtl
    ? (roleLabelMap[user?.role ?? ""]?.ar ?? "Unit Dashboard")
    : (roleLabelMap[user?.role ?? ""]?.en ?? "Unit Dashboard");

  const unitStats = [
    {
      label: isRtl ? "مرضى الوحدة" : "Unit Patients",
      value: patientsLoading ? undefined : unitPatients.length,
      icon: Users, iconColor: "text-blue-600", iconBg: "bg-blue-500/10",
      loading: patientsLoading, onClick: () => navigate("/my-patients"),
    },
    {
      label: t("dash.pendingLabs"),
      value: stats?.pendingLabOrders,
      icon: FlaskConical, iconColor: "text-amber-600", iconBg: "bg-amber-500/10",
      loading: statsLoading, onClick: () => navigate("/lab"),
    },
    {
      label: t("dash.pendingRx"),
      value: stats?.pendingPrescriptions,
      icon: Pill, iconColor: "text-orange-600", iconBg: "bg-orange-500/10",
      loading: statsLoading, onClick: () => navigate("/prescriptions"),
    },
    {
      label: t("dash.alerts"),
      value: stats?.criticalAlerts,
      icon: AlertTriangle, iconColor: "text-red-600", iconBg: "bg-red-500/10",
      loading: statsLoading, onClick: undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{roleLabel}</p>
          <p className="text-sm text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t(getGreeting(hour))}, {displayName} 👋</h1>
          {unitName && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {isRtl ? `الوحدة: ${unitName}` : `Unit: ${unitName}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => navigate("/my-patients")} className="gap-1.5">
            <Users className="h-4 w-4" />{isRtl ? "قائمة المرضى" : "Patient List"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/clinical-notes")} className="gap-1.5">
            <FileText className="h-4 w-4" />{t("nav.notes")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/lab")} className="gap-1.5">
            <FlaskConical className="h-4 w-4" />{t("nav.lab")}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {unitStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className={`relative overflow-hidden transition-all ${s.onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98]" : ""}`}
              onClick={s.onClick}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{s.label}</p>
                    {s.loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold tracking-tight">{s.value ?? 0}</p>}
                  </div>
                  <div className={`p-3 rounded-xl ${s.iconBg} ${s.iconColor} shrink-0`}><Icon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unit Patients + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {isRtl ? "مرضى الوحدة" : "Unit Patients"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {patientsLoading ? "—" : unitPatients.length} {isRtl ? "مريض" : "patients"}
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/my-patients")}>
                {t("dash.viewAll")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {patientsLoading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 items-center p-4 border-b last:border-0">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : unitPatients.length > 0 ? (
              <div className="divide-y">
                {unitPatients.slice(0, 8).map((patient) => {
                  const name = isRtl && patient.nameAr ? patient.nameAr : patient.nameEn;
                  return (
                    <div
                      key={patient.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {initials(patient.nameEn)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">{patient.mrn}</span>
                          {patient.bloodGroup && (
                            <><span className="text-muted-foreground/40">·</span><span className="text-xs text-destructive font-medium">{patient.bloodGroup}</span></>
                          )}
                        </div>
                      </div>
                      <Badge variant={patient.status === "active" ? "default" : "secondary"} className="text-xs capitalize shrink-0">
                        {patient.status ?? "active"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">{isRtl ? "لا يوجد مرضى في وحدتك حالياً" : "No patients in your unit yet"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />{t("dash.alerts")}
            </CardTitle>
            {alerts && alerts.length > 0 && <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>}
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {alertsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.slice(0, 5).map((alert) => (
                  <AlertItem key={alert.id} alert={alert as Record<string, unknown>} isRtl={isRtl} navigate={navigate} t={t} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm">{t("dash.noAlerts")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: isRtl ? "الملاحظات السريرية" : "Clinical Notes", icon: FileText, path: "/clinical-notes", color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: isRtl ? "الوصفات الطبية" : "Prescriptions", icon: Pill, path: "/prescriptions", color: "text-orange-600", bg: "bg-orange-500/10" },
          { label: isRtl ? "المختبر" : "Laboratory", icon: FlaskConical, path: "/lab", color: "text-amber-600", bg: "bg-amber-500/10" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.path} className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]" onClick={() => navigate(item.path)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{isRtl ? "انقر للفتح" : "Click to open"}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Nurse Dashboard ──────────────────────────────────────────────────────────

function NurseDashboard() {
  const { t, isRtl, language } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();
  const displayName = isRtl ? (user?.nameAr ?? user?.nameEn) : user?.nameEn;
  const today = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { data: patientsResp, isLoading: loadingPatients } = useListPatients({});
  const { data: appointments, isLoading: loadingAppts } = useGetTodayAppointments();
  const { data: alerts, isLoading: loadingAlerts } = useGetDashboardAlerts();
  const { data: vaccinations, isLoading: loadingVax } = useListVaccinations({});

  const patients: Record<string, unknown>[] = (patientsResp as { patients?: Record<string, unknown>[] })?.patients ?? (Array.isArray(patientsResp) ? patientsResp as Record<string, unknown>[] : []);
  const appts: Record<string, unknown>[] = Array.isArray(appointments) ? appointments as Record<string, unknown>[] : [];
  const vaxList: unknown[] = Array.isArray(vaccinations) ? vaccinations : [];
  const alertsList: Record<string, unknown>[] = Array.isArray(alerts) ? alerts as Record<string, unknown>[] : [];

  const kpiCards = [
    { label: t("dash.nurse.totalPatients"), value: loadingPatients ? undefined : patients.length, icon: Users, color: "text-blue-600", bg: "bg-blue-500/10", loading: loadingPatients, onClick: () => navigate("/patients") },
    { label: t("dash.nurse.upcomingAppts"), value: loadingAppts ? undefined : appts.length, icon: Calendar, color: "text-green-600", bg: "bg-green-500/10", loading: loadingAppts, onClick: () => navigate("/appointments") },
    { label: t("dash.nurse.vaccinations"), value: loadingVax ? undefined : vaxList.length, icon: Activity, color: "text-purple-600", bg: "bg-purple-500/10", loading: loadingVax, onClick: () => navigate("/vaccinations") },
    { label: t("dash.alerts"), value: loadingAlerts ? undefined : alertsList.length, icon: AlertTriangle, color: alertsList.length > 0 ? "text-red-600" : "text-muted-foreground", bg: alertsList.length > 0 ? "bg-red-500/10" : "bg-muted/40", loading: loadingAlerts, onClick: undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{t("dash.nurse.title")}</p>
          <p className="text-sm text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t(getGreeting(hour))}, {displayName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("dash.nurse.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => navigate("/patients")} className="gap-1.5">
            <Users className="h-4 w-4" /> {t("nav.patients")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/vaccinations")} className="gap-1.5">
            <Activity className="h-4 w-4" /> {t("nav.vaccinations")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/growth")} className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> {t("nav.growth")}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className={`relative overflow-hidden transition-all ${s.onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98]" : ""}`}
              onClick={s.onClick}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{s.label}</p>
                    {s.loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold tracking-tight">{s.value ?? 0}</p>}
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg} ${s.color} shrink-0`}><Icon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> {t("dash.todayAppts")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/appointments")}>{t("dash.viewAll")}</Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingAppts ? (
              <div className="space-y-0">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3 items-center p-4 border-b last:border-0">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : appts.length > 0 ? (
              <div className="divide-y">
                {appts.slice(0, 8).map((appt) => {
                  const time = new Date(appt.scheduledAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={appt.id as number}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/patients/${appt.patientId}`)}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {initials(appt.patientName as string)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{String(appt.patientName ?? `#${appt.patientId}`)}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">{time}</span>
                          <span className="text-muted-foreground/40">·</span>
                          {apptTypeBadge(appt.type as string)}
                        </div>
                      </div>
                      {apptStatusBadge(appt.status as string)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">{t("dash.noApptsToday")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" /> {t("dash.alerts")}
            </CardTitle>
            {alertsList.length > 0 && <Badge variant="destructive" className="text-xs">{alertsList.length}</Badge>}
          </CardHeader>
          <CardContent className="p-4 flex-1">
            {loadingAlerts ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : alertsList.length > 0 ? (
              <div className="space-y-2.5">
                {alertsList.slice(0, 6).map((alert) => (
                  <AlertItem key={alert.id as number} alert={alert} isRtl={isRtl} navigate={navigate} t={t} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm">{t("dash.noAlerts")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Patients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> {t("dash.nurse.quickPatients")}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/patients")}>{t("dash.viewAll")}</Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingPatients ? (
            <div className="space-y-0">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 items-center p-4 border-b last:border-0">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : patients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
              {patients.slice(0, 6).map((patient) => {
                const name = isRtl && patient.nameAr ? String(patient.nameAr) : String(patient.nameEn ?? "");
                const dob = patient.dateOfBirth as string;
                const age = dob ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)}y` : "";
                return (
                  <div
                    key={patient.id as number}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b sm:border-b-0"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {initials(patient.nameEn as string)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{String(patient.mrn ?? "")}{age ? ` · ${age}` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm">{t("dash.nurse.noPatients")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pharmacist Dashboard ─────────────────────────────────────────────────────

function PharmacistDashboard() {
  const { t, isRtl, language } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();
  const displayName = isRtl ? (user?.nameAr ?? user?.nameEn) : user?.nameEn;
  const today = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { data: drugsResp, isLoading: loadingDrugs } = useListDrugs({});
  const { data: rxResp, isLoading: loadingRx } = useListPrescriptions({ status: "pending" });

  const drugs: Record<string, unknown>[] = Array.isArray(drugsResp) ? drugsResp as Record<string, unknown>[] : [];
  const rxList: Record<string, unknown>[] = Array.isArray(rxResp) ? rxResp as Record<string, unknown>[] : [];
  const lowStock = drugs.filter(d => Number(d.stockQuantity) <= Number(d.minimumStock ?? 10));
  const controlled = drugs.filter(d => d.isControlled);

  const kpiCards = [
    { label: t("dash.pharma.totalDrugs"), value: loadingDrugs ? undefined : drugs.length, icon: Package, color: "text-blue-600", bg: "bg-blue-500/10", loading: loadingDrugs, onClick: () => navigate("/pharmacy") },
    { label: t("dash.pharma.lowStock"), value: loadingDrugs ? undefined : lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? "text-red-600" : "text-green-600", bg: lowStock.length > 0 ? "bg-red-500/10" : "bg-green-500/10", loading: loadingDrugs, onClick: () => navigate("/pharmacy"), isCritical: lowStock.length > 0 },
    { label: t("dash.pharma.pendingRx"), value: loadingRx ? undefined : rxList.length, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-500/10", loading: loadingRx, onClick: () => navigate("/prescriptions") },
    { label: t("dash.pharma.controlled"), value: loadingDrugs ? undefined : controlled.length, icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-500/10", loading: loadingDrugs, onClick: () => navigate("/pharmacy") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{t("dash.pharma.title")}</p>
          <p className="text-sm text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t(getGreeting(hour))}, {displayName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("dash.pharma.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => navigate("/pharmacy")} className="gap-1.5">
            <Package className="h-4 w-4" /> {t("nav.pharmacy")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/prescriptions")} className="gap-1.5">
            <Pill className="h-4 w-4" /> {t("nav.prescriptions")}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className={`relative overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98] ${s.isCritical ? "border-red-300 dark:border-red-800" : ""}`}
              onClick={s.onClick}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{s.label}</p>
                    {s.loading ? <Skeleton className="h-8 w-16" /> : <p className={`text-3xl font-bold tracking-tight ${s.isCritical ? "text-red-600 dark:text-red-400" : ""}`}>{s.value ?? 0}</p>}
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg} ${s.color} shrink-0`}><Icon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> {t("dash.pharma.lowStockList")}
            </CardTitle>
            <div className="flex items-center gap-2">
              {lowStock.length > 0 && <Badge variant="destructive" className="text-xs">{lowStock.length}</Badge>}
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/pharmacy")}>{t("dash.viewAll")}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingDrugs ? (
              <div className="space-y-0">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 items-center p-4 border-b last:border-0">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : lowStock.length > 0 ? (
              <div className="divide-y">
                {lowStock.slice(0, 8).map((drug) => {
                  const pct = Math.round((Number(drug.stockQuantity) / Math.max(Number(drug.minimumStock ?? 10), 1)) * 100);
                  const isCritical = pct < 50;
                  return (
                    <div
                      key={drug.id as number}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate("/pharmacy")}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isCritical ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                        <Pill className={`h-4 w-4 ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{String(drug.nameEn ?? drug.name ?? "")}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCritical ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                            {isCritical ? t("dash.pharma.critical") : t("dash.pharma.warning")}
                          </span>
                          {drug.isControlled && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">CS</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isCritical ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {String(drug.stockQuantity)} / {String(drug.minimumStock ?? 10)} {t("dash.pharma.units")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm">{t("dash.pharma.noLowStock")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Prescriptions */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-500" /> {t("dash.pharma.pendingRxList")}
            </CardTitle>
            <div className="flex items-center gap-2">
              {rxList.length > 0 && <Badge className="text-xs bg-amber-500 hover:bg-amber-600">{rxList.length}</Badge>}
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/prescriptions")}>{t("dash.viewAll")}</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingRx ? (
              <div className="space-y-0">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 border-b last:border-0">
                    <Skeleton className="h-3.5 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : rxList.length > 0 ? (
              <div className="divide-y">
                {rxList.slice(0, 6).map((rx) => (
                  <div
                    key={rx.id as number}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patients/${rx.patientId}`)}
                  >
                    <Pill className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{String(rx.patientName ?? `Patient #${rx.patientId}`)}</p>
                      <p className="text-xs text-muted-foreground truncate">{String(rx.medicationName ?? rx.medication ?? "")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm">{t("dash.pharma.noPendingRx")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Billing Officer Dashboard ────────────────────────────────────────────────

function BillingOfficerDashboard() {
  const { t, isRtl, language } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();
  const displayName = isRtl ? (user?.nameAr ?? user?.nameEn) : user?.nameEn;
  const today = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const { data: invoicesRaw, isLoading: loadingInvoices } = useListInvoices({});
  const { data: revenue, isLoading: loadingRevenue } = useGetRevenueStats();

  const invoices: Record<string, unknown>[] = Array.isArray(invoicesRaw) ? invoicesRaw as Record<string, unknown>[] : [];
  const pendingCount = invoices.filter(i => i.status === "pending").length;
  const partialCount = invoices.filter(i => i.status === "partial").length;
  const totalRevenue = (revenue?.totalRevenue as number) ?? invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPaid = (revenue?.paidRevenue as number) ?? invoices.reduce((s, i) => s + Number(i.paidAmount ?? 0), 0);
  const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", { day: "2-digit", month: "short" });

  const statusLabel = (status: string) =>
    status === "paid" ? t("billing.status.paid") :
    status === "partial" ? t("billing.status.partial") :
    t("billing.status.pending");

  const kpiCards = [
    { label: t("dash.billing.totalRevenue"), value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10", loading: loadingRevenue },
    { label: t("dash.billing.collected"), value: formatCurrency(totalPaid), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10", loading: loadingRevenue },
    { label: t("dash.billing.pendingCount"), value: pendingCount, icon: Clock, color: "text-orange-600", bg: "bg-orange-500/10", loading: loadingInvoices },
    { label: t("dash.billing.partialCount"), value: partialCount, icon: Activity, color: "text-amber-600", bg: "bg-amber-500/10", loading: loadingInvoices },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{t("dash.billing.title")}</p>
          <p className="text-sm text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t(getGreeting(hour))}, {displayName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("dash.billing.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => navigate("/billing")} className="gap-1.5 self-start sm:self-auto">
          <DollarSign className="h-4 w-4" /> {t("nav.billing")}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card
              key={i}
              className="relative overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
              onClick={() => navigate("/billing")}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{s.label}</p>
                    {s.loading ? <Skeleton className="h-8 w-20" /> : <p className={`text-2xl font-bold tracking-tight tabular-nums ${s.color}`}>{s.value ?? 0}</p>}
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg} ${s.color} shrink-0`}><Icon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Collection rate + Revenue breakdown */}
      {!loadingRevenue && revenue && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/billing")}>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> {t("dash.billing.revenueBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t("dash.billing.collectionRate")}</span>
                  <span className="text-lg font-bold text-emerald-600">{collectionRate}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${collectionRate >= 80 ? "bg-emerald-500" : collectionRate >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${collectionRate}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{t("dash.billing.collected")}: {formatCurrency(totalPaid)}</span>
                  <span>{t("dash.billing.totalRevenue")}: {formatCurrency(totalRevenue)}</span>
                </div>
              </div>
              {(revenue.byPaymentMethod as { method: string; amount: number }[]) && (
                <div className="space-y-2">
                  {(revenue.byPaymentMethod as { method: string; amount: number }[]).map((m) => {
                    const pct = totalRevenue > 0 ? Math.round((m.amount / totalRevenue) * 100) : 0;
                    const colors: Record<string, string> = { cash: "bg-emerald-500", card: "bg-blue-500", insurance: "bg-purple-500" };
                    const labels: Record<string, string> = { cash: t("billing.cash"), card: t("billing.card"), insurance: t("billing.insurance") };
                    return (
                      <div key={m.method}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{labels[m.method] ?? m.method}</span>
                          <span className="text-muted-foreground">{pct}% · {formatCurrency(m.amount)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${colors[m.method] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> {t("dash.billing.recentTitle")}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/billing")}>{t("dash.viewAll")}</Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loadingInvoices ? (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-3 items-center px-6 py-3 border-b last:border-0">
                  <Skeleton className="h-4 w-24" /><div className="flex-1" /><Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">{t("billing.invoiceHash")}</TableHead>
                  <TableHead>{t("billing.patient")}</TableHead>
                  <TableHead>{t("generic.date")}</TableHead>
                  <TableHead className="text-right">{t("billing.amount")}</TableHead>
                  <TableHead className="text-right">{t("billing.balance")}</TableHead>
                  <TableHead>{t("generic.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.slice(0, 8).map((inv) => {
                  const balance = Number(inv.totalAmount) - Number(inv.paidAmount ?? 0);
                  return (
                    <TableRow
                      key={inv.id as number}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => navigate(`/patients/${inv.patientId}`)}
                    >
                      <TableCell className="pl-6 font-mono text-sm font-medium">
                        {inv.invoiceNumber ? `#${inv.invoiceNumber}` : `#${String(inv.id).padStart(4, "0")}`}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{String(inv.patientName ?? `#${inv.patientId}`)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(inv.createdAt as string)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">SDG {Number(inv.totalAmount).toFixed(2)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        SDG {balance.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          inv.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" :
                          inv.status === "partial" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300" :
                          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                        }>
                          {statusLabel(inv.status as string)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">{t("dash.billing.noInvoices")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = getUser();
  const role = user?.role ?? "";
  if (isLabRole(role))             return <LabDashboard />;
  if (isUnitRole(role))            return <UnitDashboard />;
  if (role === "nurse")            return <NurseDashboard />;
  if (role === "pharmacist")       return <PharmacistDashboard />;
  if (role === "billing_officer")  return <BillingOfficerDashboard />;
  return <GeneralDashboard />;
}
