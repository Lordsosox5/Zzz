import {
  useGetDashboardStats,
  useGetDashboardAlerts,
  useGetTodayAppointments,
  useGetBedOccupancy,
  useGetRevenueStats,
  useListLabOrders,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { isLabRole } from "@/lib/permissions";
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
  Pill, ClipboardList, TrendingUp, ShieldAlert, Package,
} from "lucide-react";

function getGreeting(hour: number): "dash.goodMorning" | "dash.goodAfternoon" | "dash.goodEvening" {
  if (hour < 12) return "dash.goodMorning";
  if (hour < 17) return "dash.goodAfternoon";
  return "dash.goodEvening";
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
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
  label,
  value,
  subLabel,
  subValue,
  icon: Icon,
  iconColor,
  iconBg,
  loading,
  isCurrency = false,
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
}) {
  const display = isCurrency && typeof value === "number" ? formatCurrency(value) : (value ?? 0);
  return (
    <Card className="relative overflow-hidden">
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

function GeneralDashboard() {
  const { t, isRtl } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: alerts, isLoading: alertsLoading } = useGetDashboardAlerts();
  const { data: appointments, isLoading: apptsLoading } = useGetTodayAppointments();
  const { data: occupancy, isLoading: occupancyLoading } = useGetBedOccupancy();
  const { data: revenue, isLoading: revenueLoading } = useGetRevenueStats();

  const today = new Date().toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayName = isRtl ? (user?.nameAr ?? user?.nameEn) : user?.nameEn;

  const statCards = [
    {
      label: t("dash.totalPatients"),
      value: stats?.totalPatients,
      subLabel: t("dash.newPatients") + ":",
      subValue: <span className="text-xs font-semibold text-emerald-600">+{stats?.newPatientsThisMonth ?? 0}</span>,
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-500/10",
    },
    {
      label: t("dash.todayAppts"),
      value: stats?.todayAppointments,
      subLabel: t("dash.completedToday") + ":",
      subValue: <span className="text-xs font-semibold text-emerald-600">{stats?.completedAppointmentsToday ?? 0}</span>,
      icon: Calendar,
      iconColor: "text-green-600",
      iconBg: "bg-green-500/10",
    },
    {
      label: t("dash.activeAdmissions"),
      value: stats?.activeAdmissions,
      subLabel: t("dash.bedRate") + ":",
      subValue: <span className="text-xs font-semibold text-purple-600">{stats?.bedOccupancyRate?.toFixed(1) ?? 0}%</span>,
      icon: BedDouble,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-500/10",
    },
    {
      label: t("dash.pendingLabs"),
      value: stats?.pendingLabOrders,
      subLabel: t("dash.criticalCount") + ":",
      subValue: stats?.criticalAlerts
        ? <span className="text-xs font-semibold text-red-600">{stats.criticalAlerts}</span>
        : <span className="text-xs text-muted-foreground">0</span>,
      icon: FlaskConical,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-500/10",
    },
    {
      label: t("dash.pendingRx"),
      value: stats?.pendingPrescriptions,
      subLabel: t("dash.lowStock") + ":",
      subValue: stats?.lowStockDrugs
        ? <span className="text-xs font-semibold text-orange-600">{stats.lowStockDrugs}</span>
        : <span className="text-xs text-muted-foreground">0</span>,
      icon: Pill,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-500/10",
    },
    {
      label: t("dash.revenue"),
      value: stats?.totalRevenue,
      subLabel: t("dash.thisMonth") + ":",
      subValue: revenue
        ? <><span className="text-xs font-semibold">{formatCurrency(revenue.thisMonth)}</span> <Trend current={revenue.thisMonth} previous={revenue.lastMonth} /></>
        : null,
      icon: DollarSign,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-500/10",
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-0.5">{today}</p>
          <h1 className="text-2xl font-bold tracking-tight">
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
          <div key={i} className={i < 3 ? "xl:col-span-2" : "xl:col-span-2"}>
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
            />
          </div>
        ))}
      </div>

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
                  <div
                    key={alert.id}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${alertStyle(alert.severity ?? "info")}`}
                  >
                    <AlertSeverityIcon severity={alert.severity ?? "info"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug text-sm">
                          {isRtl && alert.messageAr ? alert.messageAr : alert.message}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${alertBadgeStyle(alert.severity ?? "info")}`}>
                          {alert.severity === "critical" ? "Critical" : alert.severity === "warning" ? "Warning" : "Info"}
                        </span>
                      </div>
                      {alert.patientName && (
                        <p className="text-xs text-muted-foreground mt-1">{t("dash.patient")}: {alert.patientName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
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
                    <div key={appt.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
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
                      <div className="shrink-0">
                        {apptStatusBadge(appt.status)}
                      </div>
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

                <Progress
                  value={(occupancy.occupied / occupancy.total) * 100}
                  className="h-2 mb-2"
                />

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
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {ward.occupied}/{ward.total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
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

      {/* Bottom row: Revenue */}
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
                <div key={i} className={`rounded-lg p-4 ${item.bg}`}>
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
                    <div key={m.method} className="flex items-center gap-2 text-sm">
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
    </div>
  );
}

function LabDashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const user = getUser();
  const hour = new Date().getHours();
  const displayName = user?.nameEn;

  const { data: pending, isLoading: loadingPending } = useListLabOrders({ status: "pending" });
  const { data: collected, isLoading: loadingCollected } = useListLabOrders({ status: "collected" });

  const statCards = [
    { label: t("lab.pendingOnly"), value: pending?.length ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", loading: loadingPending },
    { label: t("lab.collected"), value: collected?.length ?? 0, icon: FlaskConical, color: "text-blue-600", bg: "bg-blue-500/10", loading: loadingCollected },
    { label: t("lab.resulted"), value: 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10", loading: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t(getGreeting(hour))}, {displayName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("lab.queueDesc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
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
        <CardContent className="p-0">
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
                  <TableRow key={order.id} className={order.isCritical ? "bg-destructive/5" : undefined}>
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

export default function Dashboard() {
  const user = getUser();
  return isLabRole(user?.role ?? "") ? <LabDashboard /> : <GeneralDashboard />;
}
