import { useGetDashboardStats, useGetDashboardAlerts, useGetTodayAppointments, useListLabOrders, getGetDashboardStatsQueryKey, getListLabOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { isLabRole, canEnterLabResults } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, AlertTriangle, Activity, Pill, DollarSign, FlaskConical, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

function LabDashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const user = getUser();
  const canEnter = canEnterLabResults(user?.role ?? "");
  const { data: pending, isLoading: loadingPending } = useListLabOrders({ status: "pending" });
  const { data: collected, isLoading: loadingCollected } = useListLabOrders({ status: "collected" });

  const statCards = [
    { label: t("lab.pendingOnly"), value: pending?.length ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", loading: loadingPending },
    { label: t("lab.collected"), value: collected?.length ?? 0, icon: FlaskConical, color: "text-blue-600", bg: "bg-blue-500/10", loading: loadingCollected },
    { label: t("lab.resulted"), value: 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10", loading: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.dashboard")}</h1>
        <p className="text-muted-foreground mt-1">{t("lab.queueDesc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{s.label}</p>
                  {s.loading ? <Skeleton className="h-8 w-12" /> : <h2 className="text-3xl font-bold">{s.value}</h2>}
                </div>
                <div className={`p-3 rounded-full ${s.bg} ${s.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            {t("lab.queue")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/lab")}>
            {t("lab.allOrders")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("lab.patientName")}</TableHead>
                <TableHead>{t("lab.testName")}</TableHead>
                <TableHead>{t("generic.priority")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPending ? (
                <TableRow><TableCell colSpan={5} className="h-20 text-center"><Skeleton className="mx-auto h-4 w-48" /></TableCell></TableRow>
              ) : pending && pending.length > 0 ? (
                pending.slice(0, 8).map(order => (
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
                      <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'secondary'} className="capitalize">
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

function GeneralDashboard() {
  const { t, isRtl } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: alerts, isLoading: alertsLoading } = useGetDashboardAlerts();
  const { data: appointments, isLoading: apptsLoading } = useGetTodayAppointments();

  const statCards = [
    { title: "dash.totalPatients", value: stats?.totalPatients, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "dash.todayAppts", value: stats?.todayAppointments, icon: Calendar, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "dash.activeAdmissions", value: stats?.activeAdmissions, icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "dash.pendingLabs", value: stats?.pendingLabOrders, icon: Pill, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "dash.revenue", value: stats?.totalRevenue ? `$${stats.totalRevenue.toLocaleString()}` : null, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("nav.dashboard")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t(stat.title)}</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <h2 className="text-3xl font-bold">{stat.value || 0}</h2>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("dash.alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3 mt-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-3 mt-4">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">{isRtl && alert.messageAr ? alert.messageAr : alert.message}</h4>
                      {alert.patientName && <p className="text-xs text-muted-foreground mt-1">{t("dash.patient")}: {alert.patientName}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("dash.noAlerts")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t("dash.todayAppts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apptsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-4 mt-2">
                {appointments.slice(0, 6).map((appt) => (
                  <div key={appt.id} className="flex items-center gap-3 border-b last:border-0 pb-3 last:pb-0">
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap">
                      {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{appt.patientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{appt.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("dash.noApptsToday")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const user = getUser();
  return isLabRole(user?.role ?? "") ? <LabDashboard /> : <GeneralDashboard />;
}
