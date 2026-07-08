import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  useListPatients, useListAppointments, useListLabOrders,
  useListInvoices, useListPrescriptions,
} from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Calendar, FlaskConical, Receipt, Pill,
  TrendingUp, TrendingDown, Minus, Download, RefreshCw,
  AlertTriangle, CheckCircle, Clock, FileBarChart,
  Activity, Brain, BarChart3, LayoutGrid,
} from "lucide-react";
import * as XLSX from "xlsx";
import { generateReportPDF, generateOverallReportPDF } from "@/lib/report-pdf";

type ReportType = "overall" | "patients" | "appointments" | "lab" | "revenue" | "prescriptions";
type Period = "today" | "week" | "month" | "quarter" | "half" | "year";

const PERIODS: { value: Period; labelEn: string; labelAr: string }[] = [
  { value: "today",   labelEn: "Today",          labelAr: "اليوم" },
  { value: "week",    labelEn: "This Week",       labelAr: "هذا الأسبوع" },
  { value: "month",   labelEn: "This Month",      labelAr: "هذا الشهر" },
  { value: "quarter", labelEn: "Last 3 Months",   labelAr: "آخر 3 أشهر" },
  { value: "half",    labelEn: "Last 6 Months",   labelAr: "آخر 6 أشهر" },
  { value: "year",    labelEn: "This Year",       labelAr: "هذا العام" },
];

const REPORT_TYPES: { value: ReportType; icon: React.ElementType; labelEn: string; labelAr: string; color: string }[] = [
  { value: "overall",       icon: LayoutGrid,   labelEn: "Overall",       labelAr: "الكل",             color: "#0ea5e9" },
  { value: "patients",      icon: Users,        labelEn: "Patients",      labelAr: "المرضى",          color: "#3b82f6" },
  { value: "appointments",  icon: Calendar,     labelEn: "Appointments",  labelAr: "المواعيد",         color: "#8b5cf6" },
  { value: "lab",           icon: FlaskConical, labelEn: "Lab Orders",    labelAr: "طلبات المختبر",    color: "#f59e0b" },
  { value: "revenue",       icon: Receipt,      labelEn: "Revenue",       labelAr: "الإيرادات",        color: "#10b981" },
  { value: "prescriptions", icon: Pill,         labelEn: "Prescriptions", labelAr: "الوصفات الطبية",   color: "#ef4444" },
];

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#84cc16"];

function getPeriodRange(period: Period): { start: Date; end: Date; groupBy: "hour" | "day" | "week" | "month" } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start: Date;
  let groupBy: "hour" | "day" | "week" | "month" = "day";

  switch (period) {
    case "today":
      start = new Date(now); start.setHours(0, 0, 0, 0); groupBy = "hour"; break;
    case "week":
      start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); groupBy = "day"; break;
    case "month":
      start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0); groupBy = "day"; break;
    case "quarter":
      start = new Date(now); start.setMonth(now.getMonth() - 2); start.setDate(1); start.setHours(0, 0, 0, 0); groupBy = "month"; break;
    case "half":
      start = new Date(now); start.setMonth(now.getMonth() - 5); start.setDate(1); start.setHours(0, 0, 0, 0); groupBy = "month"; break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0); groupBy = "month"; break;
  }
  return { start, end, groupBy };
}

function formatGroupKey(date: Date, groupBy: "hour" | "day" | "week" | "month"): string {
  if (groupBy === "hour") return `${date.getHours()}:00`;
  if (groupBy === "day") return `${date.toLocaleString("default", { month: "short" })} ${date.getDate()}`;
  if (groupBy === "week") {
    const start = new Date(date); start.setDate(date.getDate() - date.getDay());
    return `W ${start.getMonth() + 1}/${start.getDate()}`;
  }
  return date.toLocaleString("default", { month: "short" });
}

function groupByTime(items: any[], dateField: string, groupBy: "hour" | "day" | "week" | "month") {
  const map: Record<string, number> = {};
  items.forEach(item => {
    const d = new Date(item[dateField]);
    const key = formatGroupKey(d, groupBy);
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map).map(([name, count]) => ({ name, count }));
}

function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  const map: Record<string, number> = {};
  items.forEach(item => {
    const v = String(item[key] ?? "unknown");
    map[v] = (map[v] ?? 0) + 1;
  });
  return map;
}

function KpiCard({ label, value, sub, icon: Icon, color, trend }:
  { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; trend?: "up" | "down" | "neutral" }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            {trend && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${color}80, transparent)` }} />
    </Card>
  );
}

function InterpretationPanel({ lines, language }: { lines: string[]; language: string }) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              {language === "ar" ? "التفسير والتحليل المهني" : "Professional Interpretation & Analysis"}
            </CardTitle>
            <CardDescription className="text-xs">
              {language === "ar" ? "تحليل آلي للبيانات بناءً على المعايير السريرية" : "Automated data analysis based on clinical benchmarks"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2.5">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    admitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40",
    discharged: "bg-gray-100 text-gray-700 dark:bg-gray-800/60",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40",
    collected: "bg-blue-100 text-blue-700 dark:bg-blue-900/40",
    resulted: "bg-purple-100 text-purple-700 dark:bg-purple-900/40",
    reviewed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    partial: "bg-orange-100 text-orange-700 dark:bg-orange-900/40",
    unpaid: "bg-red-100 text-red-700 dark:bg-red-900/40",
    dispensed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/40",
  };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function buildPatientInterp(patients: any[], allPatients: any[], admitted: number, discharged: number, trend: any[], periodLabel: string, language: string): string[] {
  const avgPerDay = trend.length > 1 ? (patients.length / Math.max(1, trend.length)).toFixed(1) : String(patients.length);
  const genderDist = countBy(patients, "gender");
  const genderStr = Object.entries(genderDist).map(([k, v]) => `${k}: ${v}`).join(", ");
  if (language === "ar") return [
    `في فترة "${periodLabel}" سُجّل ${patients.length} مريض جديد من إجمالي ${allPatients.length} في النظام.`,
    admitted > 0 ? `منهم ${admitted} مريضاً في حالة "مقبول" (${patients.length > 0 ? ((admitted / patients.length) * 100).toFixed(1) : 0}% من حالات الفترة).` : "لا توجد حالات قيد الإدخال خلال هذه الفترة.",
    discharged > 0 ? `أُخرج ${discharged} مريضاً — يعكس معدل صرف إيجابياً.` : "لم يُسجَّل أي خروج في هذه الفترة.",
    trend.length > 1 ? `متوسط الدخول اليومي: ${avgPerDay} مريض — راقب القدرة الاستيعابية عند الذروة.` : "فترة قصيرة — يُوصى بعرض تقرير أسبوعي لصورة أوضح.",
    genderStr ? `توزيع الجنس: ${genderStr}.` : "بيانات الجنس غير متوفرة.",
  ];
  return [
    `During "${periodLabel}", ${patients.length} new patient(s) registered out of ${allPatients.length} total in system.`,
    admitted > 0 ? `${admitted} patient(s) currently admitted (${patients.length > 0 ? ((admitted / patients.length) * 100).toFixed(1) : 0}% of period cases), indicating active inpatient demand.` : "No active admissions recorded this period.",
    discharged > 0 ? `${discharged} patient(s) discharged — healthy patient turnover.` : "No discharges recorded this period.",
    trend.length > 1 ? `Average admission rate: ${avgPerDay} patient(s) per time unit — monitor bed capacity if trend continues.` : "Short period; consider weekly/monthly view for trend analysis.",
    genderStr ? `Gender distribution: ${genderStr}.` : "Gender data unavailable for selected period.",
  ];
}

function buildApptInterp(appointments: any[], completed: number, cancelled: number, compRate: string, cancRate: string, periodLabel: string, language: string): string[] {
  if (language === "ar") return [
    `في فترة "${periodLabel}" جُدولت ${appointments.length} موعداً.`,
    completed > 0 ? `معدل الإتمام: ${compRate} — ${Number(compRate) >= 80 ? "ممتاز." : Number(compRate) >= 60 ? "مقبول، راجع أسباب الإلغاء." : "يحتاج تحسيناً عاجلاً."}` : "لم تُسجَّل مواعيد مكتملة.",
    cancelled > 0 ? `${cancelled} موعد ملغى (${cancRate}) — ${Number(cancRate) > 20 ? "نسبة مرتفعة تستدعي التحليل." : "ضمن الحدود المقبولة."}` : "لا إلغاءات — نتيجة ممتازة.",
    "يُنصح بمراجعة التوزيع الأسبوعي للمواعيد لتحسين كفاءة الجدولة.",
  ];
  return [
    `During "${periodLabel}", ${appointments.length} appointment(s) were scheduled.`,
    completed > 0 ? `Completion rate: ${compRate} — ${Number(compRate) >= 80 ? "Excellent operational efficiency." : Number(compRate) >= 60 ? "Acceptable; review cancellation causes." : "Below benchmark — urgent scheduling review needed."}` : "No completed appointments recorded.",
    cancelled > 0 ? `${cancelled} appointment(s) cancelled (${cancRate}) — ${Number(cancRate) > 20 ? "High cancellation rate requiring root-cause analysis." : "Within acceptable limits."}` : "Zero cancellations — outstanding result.",
    "Consider reviewing weekly appointment distribution to optimize scheduling efficiency.",
  ];
}

function buildLabInterp(labOrders: any[], resulted: number, pending: number, critical: number, turnRate: string, periodLabel: string, language: string): string[] {
  if (language === "ar") return [
    `في فترة "${periodLabel}" أُنشئ ${labOrders.length} طلب مختبر.`,
    resulted > 0 ? `معدل إتمام الفحوصات: ${turnRate} — ${Number(turnRate) >= 85 ? "ممتاز." : Number(turnRate) >= 60 ? "مقبول، تابع الطلبات المعلقة." : "يستدعي مراجعة سير العمل."}` : "لم تكتمل نتائج بعد.",
    critical > 0 ? `${critical} حالة عاجلة أو حرجة — تستوجب المراجعة الطبية الفورية.` : "لا حالات حرجة — مطمئن.",
    pending > 0 ? `${pending} طلب معلق — يُوصى بمتابعة فورية.` : "لا طلبات معلقة — كفاءة عالية.",
  ];
  return [
    `During "${periodLabel}", ${labOrders.length} lab order(s) were created.`,
    resulted > 0 ? `Result completion rate: ${turnRate} — ${Number(turnRate) >= 85 ? "Excellent lab turnaround." : Number(turnRate) >= 60 ? "Acceptable; follow up on pending orders." : "Below target — workflow review required."}` : "No results completed yet.",
    critical > 0 ? `${critical} urgent/critical order(s) require immediate clinical review.` : "No critical orders — reassuring finding.",
    pending > 0 ? `${pending} order(s) still pending — immediate follow-up recommended.` : "Zero pending orders — highly efficient lab workflow.",
  ];
}

function buildRevenueInterp(invoices: any[], totalRev: number, totalPaid: number, totalUnpaid: number, collRate: string, trend: any[], periodLabel: string, language: string): string[] {
  const peakRev = trend.length > 0 ? Math.max(...trend.map(r => r.count)) : 0;
  if (language === "ar") return [
    `في فترة "${periodLabel}" بلغت الإيرادات ${totalRev.toLocaleString()} ر.س من ${invoices.length} فاتورة.`,
    `المحصّل: ${totalPaid.toLocaleString()} ر.س — معدل التحصيل: ${collRate} — ${Number(collRate) >= 90 ? "أداء مالي ممتاز." : Number(collRate) >= 70 ? "جيد، مجال للتحسين." : "يستدعي مراجعة سياسات التحصيل."}`,
    totalUnpaid > 0 ? `المتأخرات: ${totalUnpaid.toLocaleString()} ر.س — يُوصى بمتابعة الحسابات المستحقة.` : "لا مستحقات غير مسددة — أداء فوترة ممتاز.",
    trend.length > 1 ? `أعلى فاتورة في الفترة: ${peakRev.toLocaleString()} ر.س.` : "بيانات محدودة — مدّد الفترة لتحليل أعمق.",
  ];
  return [
    `During "${periodLabel}", total revenue reached SAR ${totalRev.toLocaleString()} across ${invoices.length} invoice(s).`,
    `Collected: SAR ${totalPaid.toLocaleString()} — Collection rate: ${collRate} — ${Number(collRate) >= 90 ? "Excellent financial performance." : Number(collRate) >= 70 ? "Good, with room for improvement." : "Below benchmark — review collection policies."}`,
    totalUnpaid > 0 ? `Outstanding: SAR ${totalUnpaid.toLocaleString()} — accounts receivable follow-up recommended.` : "No outstanding balances — excellent billing performance.",
    trend.length > 1 ? `Peak invoices in period: ${peakRev}.` : "Limited data — extend period for deeper trend analysis.",
  ];
}

function buildRxInterp(prescriptions: any[], dispensed: number, pending: number, cancelled: number, dispRate: string, periodLabel: string, language: string): string[] {
  if (language === "ar") return [
    `في فترة "${periodLabel}" أُصدرت ${prescriptions.length} وصفة طبية.`,
    dispensed > 0 ? `معدل الصرف: ${dispRate} — ${Number(dispRate) >= 85 ? "ممتاز." : Number(dispRate) >= 65 ? "جيد، تابع المعلقة." : "يستدعي مراجعة نظام الصرف."}` : "لم تُصرف وصفات بعد.",
    pending > 0 ? `${pending} وصفة معلقة تحتاج اهتمام الصيدلية.` : "لا وصفات معلقة — أداء الصيدلية ممتاز.",
    cancelled > 0 ? `${cancelled} وصفة ملغاة — راجع أسباب الإلغاء للتحسين.` : "لا إلغاءات في هذه الفترة.",
  ];
  return [
    `During "${periodLabel}", ${prescriptions.length} prescription(s) were issued.`,
    dispensed > 0 ? `Dispensing rate: ${dispRate} — ${Number(dispRate) >= 85 ? "Excellent pharmacy performance." : Number(dispRate) >= 65 ? "Good; monitor pending prescriptions." : "Below target — dispensing workflow review needed."}` : "No prescriptions dispensed yet.",
    pending > 0 ? `${pending} prescription(s) pending pharmacy action.` : "Zero pending prescriptions — outstanding pharmacy efficiency.",
    cancelled > 0 ? `${cancelled} prescription(s) cancelled — review reasons for continuous improvement.` : "No cancellations this period.",
  ];
}

export default function Reports() {
  const { language } = useTranslation();
  const isRtl = language === "ar";
  const [reportType, setReportType] = useState<ReportType>("patients");
  const [period, setPeriod] = useState<Period>("month");

  const { start, end, groupBy } = useMemo(() => getPeriodRange(period), [period]);

  const { data: patientResp,    isLoading: loadPat,  refetch: refetchPat }  = useListPatients({});
  const { data: allAppts = [],  isLoading: loadAppt, refetch: refetchAppt } = useListAppointments({});
  const { data: allLabs = [],   isLoading: loadLab,  refetch: refetchLab }  = useListLabOrders({});
  const { data: allInvoices = [],isLoading: loadInv, refetch: refetchInv }  = useListInvoices({});
  const { data: allRx = [],     isLoading: loadRx,   refetch: refetchRx }   = useListPrescriptions({});

  const allPatients: any[] = Array.isArray(patientResp)
    ? patientResp
    : ((patientResp as any)?.patients ?? []);

  const isLoading = loadPat || loadAppt || loadLab || loadInv || loadRx;

  function refetchAll() {
    refetchPat(); refetchAppt(); refetchLab(); refetchInv(); refetchRx();
  }

  function inRange(dateStr: string | null | undefined) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  }

  const patients     = useMemo(() => (allPatients as any[]).filter(p => inRange(p.createdAt ?? p.created_at)), [allPatients, start, end]);
  const appointments = useMemo(() => (allAppts as any[]).filter(a => inRange(a.scheduledAt ?? a.scheduled_at)), [allAppts, start, end]);
  const labOrders    = useMemo(() => (allLabs as any[]).filter(l => inRange(l.createdAt ?? l.created_at)), [allLabs, start, end]);
  const invoices     = useMemo(() => (allInvoices as any[]).filter(i => inRange(i.createdAt ?? i.created_at)), [allInvoices, start, end]);
  const prescriptions = useMemo(() => (allRx as any[]).filter(r => inRange(r.createdAt ?? r.created_at)), [allRx, start, end]);

  const periodLabel = PERIODS.find(p => p.value === period)?.[language === "ar" ? "labelAr" : "labelEn"] ?? period;
  const reportLabel = REPORT_TYPES.find(r => r.value === reportType)?.[language === "ar" ? "labelAr" : "labelEn"] ?? reportType;

  function exportToExcel() {
    if (reportType === "overall") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patients),      "Patients");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appointments),  "Appointments");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(labOrders),     "Lab Orders");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices),      "Revenue");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prescriptions), "Prescriptions");
      XLSX.writeFile(wb, `Overall-Hospital-${period}-report.xlsx`);
      return;
    }
    let data: any[] = [];
    let sheetName = reportLabel;
    switch (reportType) {
      case "patients":      data = patients; break;
      case "appointments":  data = appointments; break;
      case "lab":           data = labOrders; break;
      case "revenue":       data = invoices; break;
      case "prescriptions": data = prescriptions; break;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}-${period}-report.xlsx`);
  }

  function exportToPDF() {
    const dateRange = `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
    const en = language !== "ar";

    switch (reportType) {
      case "overall": {
        const admitted   = patients.filter(p => (p.status ?? p.admissionStatus) === "admitted").length;
        const discharged = patients.filter(p => (p.status ?? p.admissionStatus) === "discharged").length;
        const totalRev   = invoices.reduce((s, i) => s + Number(i.totalAmount ?? i.total_amount ?? 0), 0);
        const totalPaid  = invoices.reduce((s, i) => s + Number(i.paidAmount ?? i.paid_amount ?? 0), 0);
        const compAppts  = appointments.filter(a => a.status === "completed").length;
        const dispRx     = prescriptions.filter(r => r.status === "dispensed").length;
        const labDone    = labOrders.filter(l => l.status === "resulted" || l.status === "reviewed").length;
        const collRate   = totalRev > 0 ? `${((totalPaid / totalRev) * 100).toFixed(1)}%` : "0%";

        const patTrend   = groupByTime(patients, "createdAt", groupBy);
        const apptTrend  = groupByTime(appointments, "scheduledAt", groupBy);
        const labTrend   = groupByTime(labOrders, "createdAt", groupBy);
        const revTrend   = groupByTime(invoices, "createdAt", groupBy);
        const rxTrend    = groupByTime(prescriptions, "createdAt", groupBy);

        const compApptRate = appointments.length > 0 ? `${((compAppts / appointments.length) * 100).toFixed(1)}%` : "0%";
        const dispRxRate   = prescriptions.length > 0 ? `${((dispRx / prescriptions.length) * 100).toFixed(1)}%` : "0%";
        const labRate      = labOrders.length > 0 ? `${((labDone / labOrders.length) * 100).toFixed(1)}%` : "0%";
        const cancAppts    = appointments.filter(a => a.status === "cancelled").length;
        const cancApptRate = appointments.length > 0 ? `${((cancAppts / appointments.length) * 100).toFixed(1)}%` : "0%";
        const rxPending    = prescriptions.filter(r => r.status === "pending").length;
        const labPending   = labOrders.filter(l => l.status === "pending").length;
        const labCritical  = labOrders.filter(l => l.priority === "urgent" || l.priority === "stat" || l.isCritical).length;
        const rxCancelled  = prescriptions.filter(r => r.status === "cancelled").length;

        generateOverallReportPDF({
          period: periodLabel,
          dateRange,
          language,
          execKpis: [
            { label: en ? "Patients"     : "المرضى",         value: patients.length },
            { label: en ? "Appointments" : "المواعيد",        value: appointments.length },
            { label: en ? "Lab Orders"   : "طلبات المختبر",   value: labOrders.length },
            { label: en ? "Revenue (SAR)": "الإيرادات",       value: `SAR ${totalRev.toLocaleString()}`, sub: collRate },
            { label: en ? "Prescriptions": "الوصفات",         value: prescriptions.length },
          ],
          sections: [
            {
              title: en ? "Patients" : "المرضى",
              color: [59, 130, 246],
              kpis: [
                { label: en ? "Period Total" : "إجمالي الفترة", value: patients.length },
                { label: en ? "Admitted"     : "مقبولون",        value: admitted },
                { label: en ? "Discharged"   : "مخرجون",         value: discharged },
                { label: en ? "System Total" : "إجمالي النظام",  value: allPatients.length },
              ],
              trendData: patTrend,
              trendLabel: en ? "Registrations" : "التسجيلات",
              tableColumns: en ? ["File #", "Name", "Gender", "Status"] : ["رقم الملف", "الاسم", "الجنس", "الحالة"],
              tableRows: patients.slice(0, 50).map(p => ({
                "File #": p.fileNumber ?? "—", Name: p.nameEn ?? "—",
                "رقم الملف": p.fileNumber ?? "—", "الاسم": p.nameEn ?? "—",
                Gender: p.gender ?? "—", "الجنس": p.gender ?? "—",
                Status: p.status ?? "—", "الحالة": p.status ?? "—",
              })),
              interpretation: buildPatientInterp(patients, allPatients, admitted, discharged, patTrend, periodLabel, language),
            },
            {
              title: en ? "Appointments" : "المواعيد",
              color: [139, 92, 246],
              kpis: [
                { label: en ? "Total"     : "الإجمالي",  value: appointments.length },
                { label: en ? "Completed" : "مكتملة",    value: compAppts,  sub: compApptRate },
                { label: en ? "Scheduled" : "مجدولة",    value: appointments.filter(a => a.status === "scheduled").length },
                { label: en ? "Cancelled" : "ملغاة",     value: cancAppts,  sub: cancApptRate },
              ],
              trendData: apptTrend,
              trendLabel: en ? "Appointments" : "المواعيد",
              tableColumns: en ? ["Patient", "Type", "Status"] : ["المريض", "النوع", "الحالة"],
              tableRows: appointments.slice(0, 50).map(a => ({
                Patient: a.patientName ?? "—", "المريض": a.patientName ?? "—",
                Type: a.type ?? "—", "النوع": a.type ?? "—",
                Status: a.status ?? "—", "الحالة": a.status ?? "—",
              })),
              interpretation: buildApptInterp(appointments, compAppts, cancAppts, compApptRate, cancApptRate, periodLabel, language),
            },
            {
              title: en ? "Lab Orders" : "طلبات المختبر",
              color: [245, 158, 11],
              kpis: [
                { label: en ? "Total"   : "الإجمالي",   value: labOrders.length },
                { label: en ? "Resulted": "مكتملة",      value: labDone,    sub: labRate },
                { label: en ? "Pending" : "معلقة",       value: labPending },
                { label: en ? "Urgent"  : "عاجلة",       value: labCritical },
              ],
              trendData: labTrend,
              trendLabel: en ? "Lab Orders" : "طلبات المختبر",
              tableColumns: en ? ["Patient", "Test", "Priority", "Status"] : ["المريض", "الفحص", "الأولوية", "الحالة"],
              tableRows: labOrders.slice(0, 50).map(l => ({
                Patient: l.patientName ?? "—", "المريض": l.patientName ?? "—",
                Test: l.testName ?? "—", "الفحص": l.testName ?? "—",
                Priority: l.priority ?? "normal", "الأولوية": l.priority ?? "normal",
                Status: l.status ?? "—", "الحالة": l.status ?? "—",
              })),
              interpretation: buildLabInterp(labOrders, labDone, labPending, labCritical, labRate, periodLabel, language),
            },
            {
              title: en ? "Revenue" : "الإيرادات",
              color: [16, 185, 129],
              kpis: [
                { label: en ? "Total Revenue" : "إجمالي الإيرادات", value: `SAR ${totalRev.toLocaleString()}` },
                { label: en ? "Collected"     : "المحصّل",          value: `SAR ${totalPaid.toLocaleString()}`, sub: collRate },
                { label: en ? "Outstanding"   : "المتأخرات",        value: `SAR ${(totalRev - totalPaid).toLocaleString()}` },
                { label: en ? "Invoices"      : "الفواتير",         value: invoices.length },
              ],
              trendData: revTrend,
              trendLabel: en ? "Revenue" : "الإيرادات",
              tableColumns: en ? ["Patient", "Total", "Paid", "Status"] : ["المريض", "المبلغ", "المدفوع", "الحالة"],
              tableRows: invoices.slice(0, 50).map(i => ({
                Patient: i.patientName ?? "—", "المريض": i.patientName ?? "—",
                Total: Number(i.totalAmount ?? i.total_amount ?? 0).toLocaleString(),
                "المبلغ": Number(i.totalAmount ?? i.total_amount ?? 0).toLocaleString(),
                Paid: Number(i.paidAmount ?? i.paid_amount ?? 0).toLocaleString(),
                "المدفوع": Number(i.paidAmount ?? i.paid_amount ?? 0).toLocaleString(),
                Status: i.status ?? "—", "الحالة": i.status ?? "—",
              })),
              interpretation: buildRevenueInterp(invoices, totalRev, totalPaid, totalRev - totalPaid, collRate, revTrend, periodLabel, language),
            },
            {
              title: en ? "Prescriptions" : "الوصفات الطبية",
              color: [239, 68, 68],
              kpis: [
                { label: en ? "Total"     : "الإجمالي", value: prescriptions.length },
                { label: en ? "Dispensed" : "مصروفة",   value: dispRx,     sub: dispRxRate },
                { label: en ? "Pending"   : "معلقة",    value: rxPending },
                { label: en ? "Cancelled" : "ملغاة",    value: rxCancelled },
              ],
              trendData: rxTrend,
              trendLabel: en ? "Prescriptions" : "الوصفات",
              tableColumns: en ? ["Patient", "Doctor", "Status"] : ["المريض", "الطبيب", "الحالة"],
              tableRows: prescriptions.slice(0, 50).map(r => ({
                Patient: r.patientName ?? "—", "المريض": r.patientName ?? "—",
                Doctor: r.doctorName ?? "—", "الطبيب": r.doctorName ?? "—",
                Status: r.status ?? "—", "الحالة": r.status ?? "—",
              })),
              interpretation: buildRxInterp(prescriptions, dispRx, rxPending, rxCancelled, dispRxRate, periodLabel, language),
            },
          ],
        });
        break;
      }
      case "patients": {
        const admitted   = patients.filter(p => (p.status ?? p.admissionStatus) === "admitted").length;
        const discharged = patients.filter(p => (p.status ?? p.admissionStatus) === "discharged").length;
        const dispRate   = patients.length > 0 ? `${((admitted / patients.length) * 100).toFixed(1)}%` : "0%";
        const trend      = groupByTime(patients, "createdAt", groupBy);
        const interp     = buildPatientInterp(patients, allPatients, admitted, discharged, trend, periodLabel, language);
        generateReportPDF({
          reportType: en ? "Patients" : "المرضى",
          period: periodLabel, dateRange, language,
          kpis: [
            { label: en ? "Period Total"    : "إجمالي الفترة",  value: patients.length },
            { label: en ? "Admitted"        : "مقبولون",        value: admitted, sub: dispRate },
            { label: en ? "Discharged"      : "مخرجون",         value: discharged },
            { label: en ? "System Total"    : "إجمالي النظام",  value: allPatients.length, sub: en ? "All time" : "جميع الأوقات" },
          ],
          trendData: trend,
          trendLabel: en ? "Patient Registrations Over Period" : "دخول المرضى خلال الفترة",
          tableColumns: en ? ["File #", "Name", "Gender", "Status", "Date"] : ["رقم الملف", "الاسم", "الجنس", "الحالة", "التاريخ"],
          tableRows: patients.slice(0, 100).map(p => ({
            "File #": p.fileNumber ?? "—", Name: p.nameEn ?? "—", "رقم الملف": p.fileNumber ?? "—",
            "الاسم": p.nameEn ?? "—", Gender: p.gender ?? "—", "الجنس": p.gender ?? "—",
            Status: p.status ?? "—", "الحالة": p.status ?? "—",
            Date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—",
            "التاريخ": p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—",
          })),
          interpretation: interp,
        });
        break;
      }
      case "appointments": {
        const completed  = appointments.filter(a => a.status === "completed").length;
        const scheduled  = appointments.filter(a => a.status === "scheduled").length;
        const cancelled  = appointments.filter(a => a.status === "cancelled").length;
        const compRate   = appointments.length > 0 ? `${((completed / appointments.length) * 100).toFixed(1)}%` : "0%";
        const cancRate   = appointments.length > 0 ? `${((cancelled / appointments.length) * 100).toFixed(1)}%` : "0%";
        const trend      = groupByTime(appointments, "scheduledAt", groupBy);
        const interp     = buildApptInterp(appointments, completed, cancelled, compRate, cancRate, periodLabel, language);
        generateReportPDF({
          reportType: en ? "Appointments" : "المواعيد",
          period: periodLabel, dateRange, language,
          kpis: [
            { label: en ? "Total"      : "الإجمالي",  value: appointments.length },
            { label: en ? "Completed"  : "مكتملة",    value: completed, sub: compRate },
            { label: en ? "Scheduled"  : "مجدولة",    value: scheduled },
            { label: en ? "Cancelled"  : "ملغاة",     value: cancelled, sub: cancRate },
          ],
          trendData: trend,
          trendLabel: en ? "Appointments Over Period" : "المواعيد خلال الفترة",
          tableColumns: en ? ["Patient", "Type", "Status", "Doctor", "Scheduled"] : ["المريض", "النوع", "الحالة", "الطبيب", "الموعد"],
          tableRows: appointments.slice(0, 100).map(a => ({
            Patient: a.patientName ?? "—", "المريض": a.patientName ?? "—",
            Type: a.type ?? "—", "النوع": a.type ?? "—",
            Status: a.status ?? "—", "الحالة": a.status ?? "—",
            Doctor: a.doctorName ?? "—", "الطبيب": a.doctorName ?? "—",
            Scheduled: a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—",
            "الموعد": a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—",
          })),
          interpretation: interp,
        });
        break;
      }
      case "lab": {
        const resulted = labOrders.filter(l => l.status === "resulted" || l.status === "reviewed").length;
        const pending  = labOrders.filter(l => l.status === "pending").length;
        const critical = labOrders.filter(l => l.priority === "urgent" || l.priority === "stat" || l.isCritical).length;
        const turnRate = labOrders.length > 0 ? `${((resulted / labOrders.length) * 100).toFixed(1)}%` : "0%";
        const trend    = groupByTime(labOrders, "createdAt", groupBy);
        const interp   = buildLabInterp(labOrders, resulted, pending, critical, turnRate, periodLabel, language);
        generateReportPDF({
          reportType: en ? "Lab Orders" : "طلبات المختبر",
          period: periodLabel, dateRange, language,
          kpis: [
            { label: en ? "Total Orders" : "إجمالي الطلبات", value: labOrders.length },
            { label: en ? "Resulted"     : "مكتملة",         value: resulted, sub: turnRate },
            { label: en ? "Pending"      : "معلقة",          value: pending },
            { label: en ? "Urgent"       : "عاجلة",          value: critical },
          ],
          trendData: trend,
          trendLabel: en ? "Lab Orders Over Period" : "طلبات المختبر خلال الفترة",
          tableColumns: en ? ["Patient", "Test", "Priority", "Status", "Date"] : ["المريض", "الفحص", "الأولوية", "الحالة", "التاريخ"],
          tableRows: labOrders.slice(0, 100).map(l => ({
            Patient: l.patientName ?? "—", "المريض": l.patientName ?? "—",
            Test: l.testName ?? "—", "الفحص": l.testName ?? "—",
            Priority: l.priority ?? "normal", "الأولوية": l.priority ?? "normal",
            Status: l.status ?? "—", "الحالة": l.status ?? "—",
            Date: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—",
            "التاريخ": l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—",
          })),
          interpretation: interp,
        });
        break;
      }
      case "revenue": {
        const totalRev   = invoices.reduce((s, i) => s + Number(i.totalAmount ?? i.total_amount ?? 0), 0);
        const totalPaid  = invoices.reduce((s, i) => s + Number(i.paidAmount ?? i.paid_amount ?? 0), 0);
        const totalUnpaid = totalRev - totalPaid;
        const collRate   = totalRev > 0 ? `${((totalPaid / totalRev) * 100).toFixed(1)}%` : "0%";
        const paid       = invoices.filter(i => i.status === "paid").length;
        const trend      = groupByTime(invoices, "createdAt", groupBy);
        const interp     = buildRevenueInterp(invoices, totalRev, totalPaid, totalUnpaid, collRate, trend, periodLabel, language);
        generateReportPDF({
          reportType: en ? "Revenue" : "الإيرادات",
          period: periodLabel, dateRange, language,
          kpis: [
            { label: en ? "Total Revenue" : "إجمالي الإيرادات", value: `SAR ${totalRev.toLocaleString()}` },
            { label: en ? "Collected"     : "المحصّل",          value: `SAR ${totalPaid.toLocaleString()}`, sub: collRate },
            { label: en ? "Outstanding"   : "المتأخرات",        value: `SAR ${totalUnpaid.toLocaleString()}` },
            { label: en ? "Invoices"      : "الفواتير",         value: invoices.length, sub: `${paid} ${en ? "paid" : "مدفوع"}` },
          ],
          trendData: trend,
          trendLabel: en ? "Revenue Over Period (invoice count)" : "الإيرادات خلال الفترة (عدد الفواتير)",
          tableColumns: en ? ["Patient", "Total (SAR)", "Paid (SAR)", "Status", "Date"] : ["المريض", "المبلغ", "المدفوع", "الحالة", "التاريخ"],
          tableRows: invoices.slice(0, 100).map(i => ({
            Patient: i.patientName ?? "—", "المريض": i.patientName ?? "—",
            "Total (SAR)": Number(i.totalAmount ?? i.total_amount ?? 0).toLocaleString(),
            "المبلغ": Number(i.totalAmount ?? i.total_amount ?? 0).toLocaleString(),
            "Paid (SAR)": Number(i.paidAmount ?? i.paid_amount ?? 0).toLocaleString(),
            "المدفوع": Number(i.paidAmount ?? i.paid_amount ?? 0).toLocaleString(),
            Status: i.status ?? "—", "الحالة": i.status ?? "—",
            Date: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—",
            "التاريخ": i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—",
          })),
          interpretation: interp,
        });
        break;
      }
      case "prescriptions": {
        const dispensed  = prescriptions.filter(r => r.status === "dispensed").length;
        const pending    = prescriptions.filter(r => r.status === "pending").length;
        const cancelled  = prescriptions.filter(r => r.status === "cancelled").length;
        const dispRate   = prescriptions.length > 0 ? `${((dispensed / prescriptions.length) * 100).toFixed(1)}%` : "0%";
        const trend      = groupByTime(prescriptions, "createdAt", groupBy);
        const interp     = buildRxInterp(prescriptions, dispensed, pending, cancelled, dispRate, periodLabel, language);
        generateReportPDF({
          reportType: en ? "Prescriptions" : "الوصفات الطبية",
          period: periodLabel, dateRange, language,
          kpis: [
            { label: en ? "Total"      : "الإجمالي",  value: prescriptions.length },
            { label: en ? "Dispensed"  : "مصروفة",    value: dispensed, sub: dispRate },
            { label: en ? "Pending"    : "معلقة",     value: pending },
            { label: en ? "Cancelled"  : "ملغاة",     value: cancelled },
          ],
          trendData: trend,
          trendLabel: en ? "Prescriptions Over Period" : "الوصفات خلال الفترة",
          tableColumns: en ? ["Patient", "Doctor", "Status", "Date"] : ["المريض", "الطبيب", "الحالة", "التاريخ"],
          tableRows: prescriptions.slice(0, 100).map(r => ({
            Patient: r.patientName ?? "—", "المريض": r.patientName ?? "—",
            Doctor: r.doctorName ?? "—", "الطبيب": r.doctorName ?? "—",
            Status: r.status ?? "—", "الحالة": r.status ?? "—",
            Date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—",
            "التاريخ": r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—",
          })),
          interpretation: interp,
        });
        break;
      }
    }
  }

  const currentReport = REPORT_TYPES.find(r => r.value === reportType)!;

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            {language === "ar" ? "التقارير والتحليلات" : "Reports & Analytics"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === "ar"
              ? "تقارير احترافية شاملة لجميع أقسام المستشفى"
              : "Comprehensive professional reports across all hospital departments"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetchAll} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {language === "ar" ? "تحديث" : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {language === "ar" ? "Excel" : "Excel"}
          </Button>
          <Button size="sm" onClick={exportToPDF} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white border-0">
            <Download className="h-3.5 w-3.5" />
            {language === "ar" ? "تصدير PDF" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Report type selector */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 flex-wrap">
          {REPORT_TYPES.map(r => {
            const Icon = r.icon;
            const active = reportType === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setReportType(r.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={active ? { color: r.color } : {}} />
                {language === "ar" ? r.labelAr : r.labelEn}
              </button>
            );
          })}
        </div>

        {/* Period picker */}
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {language === "ar" ? p.labelAr : p.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period badge */}
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {start.toLocaleDateString()} – {end.toLocaleDateString()}
        </Badge>
      </div>

      {/* Report Sections */}
      {reportType === "overall" && (
        <OverallReport
          patients={patients} allPatients={allPatients as any[]}
          appointments={appointments} labOrders={labOrders}
          invoices={invoices} prescriptions={prescriptions}
          groupBy={groupBy} periodLabel={periodLabel} language={language}
        />
      )}
      {reportType === "patients" && (
        <PatientReport patients={patients} allPatients={allPatients as any[]} period={period} groupBy={groupBy} periodLabel={periodLabel} language={language} />
      )}
      {reportType === "appointments" && (
        <AppointmentReport appointments={appointments} period={period} groupBy={groupBy} periodLabel={periodLabel} language={language} />
      )}
      {reportType === "lab" && (
        <LabReport labOrders={labOrders} period={period} groupBy={groupBy} periodLabel={periodLabel} language={language} />
      )}
      {reportType === "revenue" && (
        <RevenueReport invoices={invoices} period={period} groupBy={groupBy} periodLabel={periodLabel} language={language} />
      )}
      {reportType === "prescriptions" && (
        <PrescriptionReport prescriptions={prescriptions} period={period} groupBy={groupBy} periodLabel={periodLabel} language={language} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════ OVERALL REPORT ═══════════════════════════════════════ */
function OverallReport({ patients, allPatients, appointments, labOrders, invoices, prescriptions, groupBy, periodLabel, language }:
  { patients: any[]; allPatients: any[]; appointments: any[]; labOrders: any[]; invoices: any[]; prescriptions: any[]; groupBy: any; periodLabel: string; language: string }) {

  const en = language !== "ar";
  const totalRev  = invoices.reduce((s, i) => s + Number(i.totalAmount ?? i.total_amount ?? 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paidAmount ?? i.paid_amount ?? 0), 0);
  const collRate  = totalRev > 0 ? `${((totalPaid / totalRev) * 100).toFixed(1)}%` : "0%";
  const compAppts = appointments.filter(a => a.status === "completed").length;
  const compRate  = appointments.length > 0 ? `${((compAppts / appointments.length) * 100).toFixed(1)}%` : "0%";
  const labDone   = labOrders.filter(l => l.status === "resulted" || l.status === "reviewed").length;
  const labRate   = labOrders.length > 0 ? `${((labDone / labOrders.length) * 100).toFixed(1)}%` : "0%";
  const dispRx    = prescriptions.filter(r => r.status === "dispensed").length;
  const dispRate  = prescriptions.length > 0 ? `${((dispRx / prescriptions.length) * 100).toFixed(1)}%` : "0%";
  const admitted  = patients.filter(p => (p.status ?? p.admissionStatus) === "admitted").length;

  const sections = [
    {
      titleEn: "Patients", titleAr: "المرضى",
      icon: Users, color: "#3b82f6",
      kpis: [
        { label: en ? "Period Total"  : "إجمالي الفترة",  value: patients.length },
        { label: en ? "System Total"  : "إجمالي النظام",   value: allPatients.length },
        { label: en ? "Admitted"      : "مقبولون",         value: admitted },
      ],
      trendData: groupByTime(patients, "createdAt", groupBy),
      interp: buildPatientInterp(patients, allPatients, admitted,
        patients.filter(p => (p.status ?? p.admissionStatus) === "discharged").length,
        groupByTime(patients, "createdAt", groupBy), periodLabel, language)[0],
    },
    {
      titleEn: "Appointments", titleAr: "المواعيد",
      icon: Calendar, color: "#8b5cf6",
      kpis: [
        { label: en ? "Total"     : "الإجمالي", value: appointments.length },
        { label: en ? "Completed" : "مكتملة",   value: compAppts, sub: compRate },
        { label: en ? "Cancelled" : "ملغاة",    value: appointments.filter(a => a.status === "cancelled").length },
      ],
      trendData: groupByTime(appointments, "scheduledAt", groupBy),
      interp: buildApptInterp(appointments, compAppts, appointments.filter(a => a.status === "cancelled").length, compRate,
        appointments.length > 0 ? `${((appointments.filter(a => a.status === "cancelled").length / appointments.length) * 100).toFixed(1)}%` : "0%",
        periodLabel, language)[0],
    },
    {
      titleEn: "Lab Orders", titleAr: "طلبات المختبر",
      icon: FlaskConical, color: "#f59e0b",
      kpis: [
        { label: en ? "Total"   : "الإجمالي", value: labOrders.length },
        { label: en ? "Resulted": "مكتملة",   value: labDone, sub: labRate },
        { label: en ? "Pending" : "معلقة",    value: labOrders.filter(l => l.status === "pending").length },
      ],
      trendData: groupByTime(labOrders, "createdAt", groupBy),
      interp: buildLabInterp(labOrders, labDone, labOrders.filter(l => l.status === "pending").length,
        labOrders.filter(l => l.priority === "urgent" || l.priority === "stat" || l.isCritical).length,
        labRate, periodLabel, language)[0],
    },
    {
      titleEn: "Revenue", titleAr: "الإيرادات",
      icon: Receipt, color: "#10b981",
      kpis: [
        { label: en ? "Total Revenue": "إجمالي الإيرادات", value: `SAR ${totalRev.toLocaleString()}` },
        { label: en ? "Collected"    : "المحصّل",          value: `SAR ${totalPaid.toLocaleString()}`, sub: collRate },
        { label: en ? "Outstanding"  : "المتأخرات",        value: `SAR ${(totalRev - totalPaid).toLocaleString()}` },
      ],
      trendData: groupByTime(invoices, "createdAt", groupBy),
      interp: buildRevenueInterp(invoices, totalRev, totalPaid, totalRev - totalPaid, collRate,
        groupByTime(invoices, "createdAt", groupBy), periodLabel, language)[0],
    },
    {
      titleEn: "Prescriptions", titleAr: "الوصفات الطبية",
      icon: Pill, color: "#ef4444",
      kpis: [
        { label: en ? "Total"     : "الإجمالي", value: prescriptions.length },
        { label: en ? "Dispensed" : "مصروفة",   value: dispRx, sub: dispRate },
        { label: en ? "Pending"   : "معلقة",    value: prescriptions.filter(r => r.status === "pending").length },
      ],
      trendData: groupByTime(prescriptions, "createdAt", groupBy),
      interp: buildRxInterp(prescriptions, dispRx,
        prescriptions.filter(r => r.status === "pending").length,
        prescriptions.filter(r => r.status === "cancelled").length,
        dispRate, periodLabel, language)[0],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.titleEn} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${s.color}18` }}>
                    <Icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {en ? s.titleEn : s.titleAr}
                  </span>
                </div>
                <div className="space-y-1">
                  {s.kpis.map((kpi, ki) => (
                    <div key={ki} className={`flex items-center justify-between ${ki === 0 ? "" : "opacity-70"}`}>
                      <span className="text-[10px] text-muted-foreground truncate">{kpi.label}</span>
                      <span className={`font-bold ${ki === 0 ? "text-base" : "text-xs"} text-foreground`}>{kpi.value}</span>
                    </div>
                  ))}
                  {s.kpis[1]?.sub && (
                    <div className="text-[10px] font-medium mt-0.5" style={{ color: s.color }}>{s.kpis[1].sub}</div>
                  )}
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${s.color}80, transparent)` }} />
            </Card>
          );
        })}
      </div>

      {/* Combined trend chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {en ? "Combined Hospital Activity" : "النشاط الكلي للمستشفى"}
          </CardTitle>
          <CardDescription className="text-xs">
            {en ? "All modules aggregated by period" : "جميع الأقسام مجمعة حسب الفترة"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const combinedMap: Record<string, number> = {};
            sections.forEach(s => s.trendData.forEach(d => {
              combinedMap[d.name] = (combinedMap[d.name] ?? 0) + d.count;
            }));
            const combined = Object.entries(combinedMap).map(([name, count]) => ({ name, count }));
            return combined.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name={en ? "Events" : "أحداث"} fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                {en ? "No data for selected period" : "لا توجد بيانات للفترة المحددة"}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Per-module mini cards with analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.titleEn} className="border" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: s.color }} />
                  {en ? s.titleEn : s.titleAr}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 mb-3">
                  {s.kpis.map((kpi, ki) => (
                    <div key={ki} className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase">{kpi.label}</span>
                      <span className="text-lg font-bold text-foreground">{kpi.value}</span>
                      {kpi.sub && <span className="text-[10px]" style={{ color: s.color }}>{kpi.sub}</span>}
                    </div>
                  ))}
                </div>
                {s.trendData.length > 1 && (
                  <ResponsiveContainer width="100%" height={70}>
                    <BarChart data={s.trendData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Bar dataKey="count" fill={s.color} radius={[2, 2, 0, 0]} />
                      <XAxis dataKey="name" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {s.interp && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t pt-2 border-border">
                    {s.interp}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall interpretation */}
      <InterpretationPanel language={language} lines={
        en ? [
          `Period "${periodLabel}" summary across all hospital departments.`,
          `Patient flow: ${patients.length} registered (${admitted} admitted, ${patients.filter(p => (p.status ?? p.admissionStatus) === "discharged").length} discharged).`,
          `Appointment efficiency: ${compAppts}/${appointments.length} completed (${compRate}) — ${Number(compRate.replace("%","")) >= 80 ? "Excellent." : "Needs review."}`,
          `Lab turnaround: ${labDone}/${labOrders.length} resulted (${labRate}).`,
          `Revenue collected: SAR ${totalPaid.toLocaleString()} / SAR ${totalRev.toLocaleString()} (${collRate}).`,
          `Pharmacy dispensing: ${dispRx}/${prescriptions.length} dispensed (${dispRate}).`,
        ] : [
          `ملخص فترة "${periodLabel}" عبر جميع أقسام المستشفى.`,
          `تدفق المرضى: ${patients.length} مسجّل (${admitted} مقبول، ${patients.filter(p => (p.status ?? p.admissionStatus) === "discharged").length} مخرج).`,
          `كفاءة المواعيد: ${compAppts}/${appointments.length} مكتملة (${compRate}) — ${Number(compRate.replace("%","")) >= 80 ? "ممتاز." : "يحتاج مراجعة."}`,
          `معدل المختبر: ${labDone}/${labOrders.length} مكتملة (${labRate}).`,
          `الإيرادات المحصّلة: ${totalPaid.toLocaleString()} / ${totalRev.toLocaleString()} ر.س (${collRate}).`,
          `صرف الوصفات: ${dispRx}/${prescriptions.length} مصروفة (${dispRate}).`,
        ]
      } />
    </div>
  );
}

/* ═══════════════════════════════════════ PATIENT REPORT ═══════════════════════════════════════ */
function PatientReport({ patients, allPatients, period, groupBy, periodLabel, language }:
  { patients: any[]; allPatients: any[]; period: string; groupBy: any; periodLabel: string; language: string }) {

  const totalAll = allPatients.length;
  const admitted  = patients.filter(p => (p.status ?? p.admissionStatus) === "admitted").length;
  const discharged = patients.filter(p => (p.status ?? p.admissionStatus) === "discharged").length;
  const active    = patients.filter(p => (p.status ?? p.admissionStatus) === "active").length;

  const trend = groupByTime(patients, "createdAt", groupBy);
  const statusDist = countBy(patients, "status");
  const genderDist = countBy(patients, "gender");
  const pieStatus = Object.entries(statusDist).map(([name, value]) => ({ name, value }));
  const pieGender = Object.entries(genderDist).map(([name, value]) => ({ name, value }));

  const admitRate = patients.length > 0 ? ((admitted / patients.length) * 100).toFixed(1) : "0";
  const avgPerDay = period === "today" ? patients.length : (patients.length / Math.max(1, trend.length)).toFixed(1);

  const interpretation = language === "ar" ? [
    `في فترة "${periodLabel}" سُجّل ${patients.length} مريض جديد من إجمالي ${totalAll} في النظام.`,
    admitted > 0
      ? `من بينهم ${admitted} مريضاً في حالة "مقبول" بنسبة ${admitRate}% من إجمالي حالات الفترة.`
      : "لا توجد حالات قيد الإدخال حالياً خلال هذه الفترة.",
    discharged > 0
      ? `أُخرج ${discharged} مريضاً خلال الفترة، مما يعكس معدل صرف إيجابياً.`
      : "لم يُسجَّل أي خروج في هذه الفترة.",
    trend.length > 1
      ? `متوسط الدخول اليومي خلال الفترة: ${avgPerDay} مريض — يُنصح بمراقبة القدرة الاستيعابية عند الذروة.`
      : "البيانات لفترة قصيرة، يُوصى بعرض تقرير أسبوعي للحصول على صورة أوضح.",
    pieGender.length > 0
      ? `توزيع الجنس: ${pieGender.map(g => `${g.name}: ${g.value}`).join("، ")}.`
      : "بيانات الجنس غير متوفرة لهذه الفترة.",
  ] : [
    `During "${periodLabel}", ${patients.length} new patient${patients.length !== 1 ? "s were" : " was"} registered out of ${totalAll} total in the system.`,
    admitted > 0
      ? `${admitted} patient${admitted !== 1 ? "s are" : " is"} currently admitted (${admitRate}% of period cases), indicating active inpatient demand.`
      : "No active admissions recorded during this period.",
    discharged > 0
      ? `${discharged} patient${discharged !== 1 ? "s were" : " was"} discharged, reflecting a healthy patient turnover rate.`
      : "No discharges recorded during this period.",
    trend.length > 1
      ? `Average admission rate: ${avgPerDay} patient(s) per time unit — monitor bed capacity if trend continues.`
      : "Short period selected; consider a weekly or monthly view for trend analysis.",
    pieGender.length > 0
      ? `Gender distribution: ${pieGender.map(g => `${g.name}: ${g.value}`).join(", ")}.`
      : "Gender data unavailable for the selected period.",
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={language === "ar" ? "إجمالي الفترة" : "Period Total"} value={patients.length} icon={Users} color="#3b82f6" trend="up" />
        <KpiCard label={language === "ar" ? "مقبولون" : "Admitted"} value={admitted} icon={Activity} color="#8b5cf6" />
        <KpiCard label={language === "ar" ? "مخرجون" : "Discharged"} value={discharged} icon={CheckCircle} color="#10b981" />
        <KpiCard label={language === "ar" ? "إجمالي النظام" : "System Total"} value={totalAll} sub={language === "ar" ? "جميع الأوقات" : "All time"} icon={Users} color="#6b7280" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "دخول المرضى خلال الفترة" : "Patient Registrations Over Period"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name={language === "ar" ? "مريض" : "Patients"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "توزيع الحالة" : "Status Distribution"}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieStatus.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieStatus} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {pieStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <InterpretationPanel lines={interpretation} language={language} />

      <ReportTable data={patients.slice(0, 50)} columns={[
        { key: "fileNumber", label: language === "ar" ? "رقم الملف" : "File #" },
        { key: "nameEn", label: language === "ar" ? "الاسم" : "Name" },
        { key: "gender", label: language === "ar" ? "الجنس" : "Gender" },
        { key: "status", label: language === "ar" ? "الحالة" : "Status", render: (v) => <StatusBadge status={v} /> },
        { key: "createdAt", label: language === "ar" ? "التاريخ" : "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
      ]} language={language} />
    </div>
  );
}

/* ═══════════════════════════════════════ APPOINTMENT REPORT ═══════════════════════════════════════ */
function AppointmentReport({ appointments, period, groupBy, periodLabel, language }:
  { appointments: any[]; period: string; groupBy: any; periodLabel: string; language: string }) {

  const completed  = appointments.filter(a => a.status === "completed").length;
  const scheduled  = appointments.filter(a => a.status === "scheduled").length;
  const cancelled  = appointments.filter(a => a.status === "cancelled").length;
  const completionRate = appointments.length > 0 ? ((completed / appointments.length) * 100).toFixed(1) : "0";
  const cancellationRate = appointments.length > 0 ? ((cancelled / appointments.length) * 100).toFixed(1) : "0";

  const trend = groupByTime(appointments, "scheduledAt", groupBy);
  const typeDist = countBy(appointments, "type");
  const pieType = Object.entries(typeDist).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: language === "ar" ? "مكتملة" : "Completed", value: completed, fill: "#10b981" },
    { name: language === "ar" ? "مجدولة" : "Scheduled", value: scheduled, fill: "#3b82f6" },
    { name: language === "ar" ? "ملغاة" : "Cancelled", value: cancelled, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  const interpretation = language === "ar" ? [
    `في فترة "${periodLabel}" جُدولت ${appointments.length} موعداً.`,
    completed > 0
      ? `معدل إتمام المواعيد: ${completionRate}% — ${Number(completionRate) >= 80 ? "ممتاز، يعكس كفاءة عالية في إدارة المواعيد." : Number(completionRate) >= 60 ? "مقبول، يُنصح بمراجعة أسباب الإلغاء." : "يحتاج تحسيناً عاجلاً في جدولة المواعيد."}`
      : "لم تُسجَّل مواعيد مكتملة خلال هذه الفترة.",
    cancelled > 0
      ? `${cancelled} موعد ملغى (${cancellationRate}%) — ${Number(cancellationRate) > 20 ? "نسبة عالية تستدعي تحليل الأسباب." : "ضمن الحدود المقبولة."}`
      : "لا إلغاءات في هذه الفترة — نتيجة ممتازة.",
    pieType.length > 0
      ? `أنواع المواعيد: ${pieType.map(t => `${t.name}: ${t.value}`).join("، ")}.`
      : "بيانات نوع الموعد غير متوفرة.",
  ] : [
    `During "${periodLabel}", ${appointments.length} appointment${appointments.length !== 1 ? "s were" : " was"} scheduled.`,
    completed > 0
      ? `Appointment completion rate: ${completionRate}% — ${Number(completionRate) >= 80 ? "Excellent, reflects high operational efficiency." : Number(completionRate) >= 60 ? "Acceptable; review cancellation causes to improve." : "Below benchmark — urgent scheduling review recommended."}`
      : "No completed appointments recorded for this period.",
    cancelled > 0
      ? `${cancelled} appointment${cancelled !== 1 ? "s were" : " was"} cancelled (${cancellationRate}%) — ${Number(cancellationRate) > 20 ? "High cancellation rate requiring root-cause analysis." : "Within acceptable limits."}`
      : "Zero cancellations this period — outstanding result.",
    pieType.length > 0
      ? `Appointment type breakdown: ${pieType.map(t => `${t.name}: ${t.value}`).join(", ")}.`
      : "Appointment type data not available.",
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={language === "ar" ? "إجمالي المواعيد" : "Total Appointments"} value={appointments.length} icon={Calendar} color="#8b5cf6" />
        <KpiCard label={language === "ar" ? "مكتملة" : "Completed"} value={completed} sub={`${completionRate}%`} icon={CheckCircle} color="#10b981" trend={Number(completionRate) >= 80 ? "up" : "down"} />
        <KpiCard label={language === "ar" ? "مجدولة" : "Scheduled"} value={scheduled} icon={Clock} color="#3b82f6" />
        <KpiCard label={language === "ar" ? "ملغاة" : "Cancelled"} value={cancelled} sub={`${cancellationRate}%`} icon={AlertTriangle} color="#ef4444" trend={Number(cancellationRate) > 20 ? "down" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "المواعيد خلال الفترة" : "Appointments Over Period"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={language === "ar" ? "موعد" : "Appointments"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "توزيع الحالة" : "Status Breakdown"}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <InterpretationPanel lines={interpretation} language={language} />

      <ReportTable data={appointments.slice(0, 50)} columns={[
        { key: "patientName", label: language === "ar" ? "المريض" : "Patient" },
        { key: "type", label: language === "ar" ? "النوع" : "Type" },
        { key: "status", label: language === "ar" ? "الحالة" : "Status", render: (v) => <StatusBadge status={v} /> },
        { key: "doctorName", label: language === "ar" ? "الطبيب" : "Doctor" },
        { key: "scheduledAt", label: language === "ar" ? "الموعد" : "Scheduled", render: (v) => v ? new Date(v).toLocaleString() : "—" },
      ]} language={language} />
    </div>
  );
}

/* ═══════════════════════════════════════ LAB REPORT ═══════════════════════════════════════ */
function LabReport({ labOrders, period, groupBy, periodLabel, language }:
  { labOrders: any[]; period: string; groupBy: any; periodLabel: string; language: string }) {

  const pending   = labOrders.filter(l => l.status === "pending").length;
  const resulted  = labOrders.filter(l => l.status === "resulted" || l.status === "reviewed").length;
  const critical  = labOrders.filter(l => l.priority === "urgent" || l.priority === "stat" || l.isCritical).length;
  const turnRate  = labOrders.length > 0 ? ((resulted / labOrders.length) * 100).toFixed(1) : "0";

  const trend = groupByTime(labOrders, "createdAt", groupBy);
  const statusDist = countBy(labOrders, "status");
  const pieStatus = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

  const interpretation = language === "ar" ? [
    `في فترة "${periodLabel}" أُنشئ ${labOrders.length} طلب مختبر.`,
    resulted > 0
      ? `معدل إتمام الفحوصات: ${turnRate}% — ${Number(turnRate) >= 85 ? "ممتاز، يعكس سرعة استجابة المختبر." : Number(turnRate) >= 60 ? "مقبول. يُنصح بمتابعة الطلبات المعلقة." : "يستدعي مراجعة سير العمل في المختبر."}`
      : "لم تكتمل نتائج في هذه الفترة حتى الآن.",
    critical > 0
      ? `${critical} حالة عاجلة أو حرجة — تستوجب المراجعة الطبية الفورية.`
      : "لا توجد حالات حرجة أو عاجلة في هذه الفترة.",
    pending > 0
      ? `${pending} طلب لا يزال معلقاً — يُوصى بمتابعة فورية لضمان استمرارية الرعاية.`
      : "لا طلبات معلقة — نظام المختبر يعمل بكفاءة.",
  ] : [
    `During "${periodLabel}", ${labOrders.length} lab order${labOrders.length !== 1 ? "s were" : " was"} created.`,
    resulted > 0
      ? `Result completion rate: ${turnRate}% — ${Number(turnRate) >= 85 ? "Excellent lab turnaround performance." : Number(turnRate) >= 60 ? "Acceptable; follow up on pending orders." : "Below target — workflow review required."}`
      : "No results completed during this period yet.",
    critical > 0
      ? `${critical} urgent/critical order${critical !== 1 ? "s require" : " requires"} immediate clinical review.`
      : "No critical or urgent orders this period — reassuring finding.",
    pending > 0
      ? `${pending} order${pending !== 1 ? "s are" : " is"} still pending — immediate follow-up recommended.`
      : "Zero pending orders — lab workflow is highly efficient.",
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={language === "ar" ? "إجمالي الطلبات" : "Total Orders"} value={labOrders.length} icon={FlaskConical} color="#f59e0b" />
        <KpiCard label={language === "ar" ? "مكتملة" : "Resulted"} value={resulted} sub={`${turnRate}%`} icon={CheckCircle} color="#10b981" trend={Number(turnRate) >= 80 ? "up" : "neutral"} />
        <KpiCard label={language === "ar" ? "معلقة" : "Pending"} value={pending} icon={Clock} color="#6b7280" trend={pending > 5 ? "down" : "neutral"} />
        <KpiCard label={language === "ar" ? "عاجلة/حرجة" : "Urgent/Critical"} value={critical} icon={AlertTriangle} color="#ef4444" trend={critical > 0 ? "down" : "up"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "طلبات المختبر خلال الفترة" : "Lab Orders Over Period"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name={language === "ar" ? "طلب" : "Orders"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "توزيع الحالة" : "Status Distribution"}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieStatus.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieStatus} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {pieStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <InterpretationPanel lines={interpretation} language={language} />

      <ReportTable data={labOrders.slice(0, 50)} columns={[
        { key: "patientName", label: language === "ar" ? "المريض" : "Patient" },
        { key: "testName", label: language === "ar" ? "الفحص" : "Test" },
        { key: "priority", label: language === "ar" ? "الأولوية" : "Priority", render: (v) => <StatusBadge status={v ?? "normal"} /> },
        { key: "status", label: language === "ar" ? "الحالة" : "Status", render: (v) => <StatusBadge status={v} /> },
        { key: "createdAt", label: language === "ar" ? "التاريخ" : "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
      ]} language={language} />
    </div>
  );
}

/* ═══════════════════════════════════════ REVENUE REPORT ═══════════════════════════════════════ */
function RevenueReport({ invoices, period, groupBy, periodLabel, language }:
  { invoices: any[]; period: string; groupBy: any; periodLabel: string; language: string }) {

  const totalRevenue  = invoices.reduce((sum, i) => sum + (Number(i.totalAmount ?? i.total_amount ?? 0)), 0);
  const totalPaid     = invoices.reduce((sum, i) => sum + (Number(i.paidAmount ?? i.paid_amount ?? 0)), 0);
  const totalUnpaid   = totalRevenue - totalPaid;
  const collectionRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : "0";

  const paid    = invoices.filter(i => i.status === "paid").length;
  const unpaid  = invoices.filter(i => i.status === "unpaid").length;
  const partial = invoices.filter(i => i.status === "partial").length;

  const trend = groupByTime(invoices, "createdAt", groupBy);
  const revTrend = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      const d = new Date(inv.createdAt ?? inv.created_at);
      const key = formatGroupKey(d, groupBy);
      map[key] = (map[key] ?? 0) + Number(inv.totalAmount ?? inv.total_amount ?? 0);
    });
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }));
  }, [invoices, groupBy]);

  const pieStatus = [
    { name: language === "ar" ? "مدفوع" : "Paid", value: paid, fill: "#10b981" },
    { name: language === "ar" ? "جزئي" : "Partial", value: partial, fill: "#f59e0b" },
    { name: language === "ar" ? "غير مدفوع" : "Unpaid", value: unpaid, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  const interpretation = language === "ar" ? [
    `في فترة "${periodLabel}" بلغت الإيرادات الإجمالية ${totalRevenue.toLocaleString()} ر.س من ${invoices.length} فاتورة.`,
    `المبالغ المحصّلة: ${totalPaid.toLocaleString()} ر.س — معدل التحصيل: ${collectionRate}% — ${Number(collectionRate) >= 90 ? "ممتاز، أداء مالي قوي." : Number(collectionRate) >= 70 ? "جيد، مع وجود مجال للتحسين." : "يستدعي مراجعة سياسات التحصيل."}`,
    totalUnpaid > 0
      ? `المتأخرات: ${totalUnpaid.toLocaleString()} ر.س على ${unpaid + partial} فاتورة — يُوصى بمتابعة المدينين.`
      : "لا توجد مستحقات غير مسددة خلال هذه الفترة.",
    revTrend.length > 1
      ? `أعلى إيراد في الفترة: ${Math.max(...revTrend.map(r => r.revenue)).toLocaleString()} ر.س.`
      : "بيانات محدودة — الرجاء تمديد الفترة لتحليل أعمق.",
  ] : [
    `During "${periodLabel}", total revenue reached SAR ${totalRevenue.toLocaleString()} across ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}.`,
    `Collected: SAR ${totalPaid.toLocaleString()} — Collection rate: ${collectionRate}% — ${Number(collectionRate) >= 90 ? "Excellent financial performance." : Number(collectionRate) >= 70 ? "Good, with room for improvement." : "Below benchmark — review collection policies."}`,
    totalUnpaid > 0
      ? `Outstanding: SAR ${totalUnpaid.toLocaleString()} across ${unpaid + partial} invoice${(unpaid + partial) !== 1 ? "s" : ""} — follow-up with accounts receivable recommended.`
      : "No outstanding balances this period — excellent billing performance.",
    revTrend.length > 1
      ? `Peak revenue in period: SAR ${Math.max(...revTrend.map(r => r.revenue)).toLocaleString()}.`
      : "Limited data — extend period for deeper trend analysis.",
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={language === "ar" ? "إجمالي الإيرادات" : "Total Revenue"} value={`SAR ${totalRevenue.toLocaleString()}`} icon={Receipt} color="#10b981" />
        <KpiCard label={language === "ar" ? "المحصّل" : "Collected"} value={`SAR ${totalPaid.toLocaleString()}`} sub={`${collectionRate}%`} icon={CheckCircle} color="#3b82f6" trend={Number(collectionRate) >= 80 ? "up" : "down"} />
        <KpiCard label={language === "ar" ? "المتأخرات" : "Outstanding"} value={`SAR ${totalUnpaid.toLocaleString()}`} icon={AlertTriangle} color="#ef4444" trend={totalUnpaid > 0 ? "down" : "up"} />
        <KpiCard label={language === "ar" ? "الفواتير" : "Invoices"} value={invoices.length} sub={`${paid} ${language === "ar" ? "مدفوع" : "paid"}`} icon={BarChart3} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "الإيرادات عبر الزمن" : "Revenue Over Period"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`SAR ${Number(v).toLocaleString()}`, language === "ar" ? "الإيراد" : "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "حالة الفواتير" : "Invoice Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieStatus.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieStatus} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {pieStatus.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <InterpretationPanel lines={interpretation} language={language} />

      <ReportTable data={invoices.slice(0, 50)} columns={[
        { key: "patientName", label: language === "ar" ? "المريض" : "Patient" },
        { key: "totalAmount", label: language === "ar" ? "المبلغ" : "Total", render: (v) => `SAR ${Number(v ?? 0).toLocaleString()}` },
        { key: "paidAmount", label: language === "ar" ? "المدفوع" : "Paid", render: (v) => `SAR ${Number(v ?? 0).toLocaleString()}` },
        { key: "status", label: language === "ar" ? "الحالة" : "Status", render: (v) => <StatusBadge status={v} /> },
        { key: "createdAt", label: language === "ar" ? "التاريخ" : "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
      ]} language={language} />
    </div>
  );
}

/* ═══════════════════════════════════════ PRESCRIPTION REPORT ═══════════════════════════════════════ */
function PrescriptionReport({ prescriptions, period, groupBy, periodLabel, language }:
  { prescriptions: any[]; period: string; groupBy: any; periodLabel: string; language: string }) {

  const dispensed  = prescriptions.filter(r => r.status === "dispensed").length;
  const pending    = prescriptions.filter(r => r.status === "pending").length;
  const cancelled  = prescriptions.filter(r => r.status === "cancelled").length;
  const dispRate   = prescriptions.length > 0 ? ((dispensed / prescriptions.length) * 100).toFixed(1) : "0";

  const trend = groupByTime(prescriptions, "createdAt", groupBy);

  const interpretation = language === "ar" ? [
    `في فترة "${periodLabel}" أُصدرت ${prescriptions.length} وصفة طبية.`,
    dispensed > 0
      ? `تم صرف ${dispensed} وصفة (${dispRate}%) — ${Number(dispRate) >= 85 ? "معدل صرف ممتاز." : Number(dispRate) >= 65 ? "جيد، مع متابعة الوصفات المعلقة." : "يستدعي مراجعة نظام الصرف."}`
      : "لم تُصرف وصفات في هذه الفترة حتى الآن.",
    pending > 0
      ? `${pending} وصفة معلقة تحتاج اهتماماً من الصيدلية.`
      : "لا وصفات معلقة — أداء الصيدلية ممتاز.",
    cancelled > 0
      ? `${cancelled} وصفة ملغاة — يُنصح بمراجعة أسباب الإلغاء للتحسين المستمر.`
      : "لا إلغاءات في هذه الفترة.",
  ] : [
    `During "${periodLabel}", ${prescriptions.length} prescription${prescriptions.length !== 1 ? "s were" : " was"} issued.`,
    dispensed > 0
      ? `Dispensing rate: ${dispRate}% — ${Number(dispRate) >= 85 ? "Excellent pharmacy performance." : Number(dispRate) >= 65 ? "Good; monitor pending prescriptions." : "Below target — dispensing workflow review needed."}`
      : "No prescriptions dispensed yet this period.",
    pending > 0
      ? `${pending} prescription${pending !== 1 ? "s are" : " is"} pending pharmacy action.`
      : "Zero pending prescriptions — outstanding pharmacy efficiency.",
    cancelled > 0
      ? `${cancelled} prescription${cancelled !== 1 ? "s were" : " was"} cancelled — review cancellation reasons for continuous improvement.`
      : "No cancellations this period.",
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={language === "ar" ? "إجمالي الوصفات" : "Total Prescriptions"} value={prescriptions.length} icon={Pill} color="#ef4444" />
        <KpiCard label={language === "ar" ? "مصروفة" : "Dispensed"} value={dispensed} sub={`${dispRate}%`} icon={CheckCircle} color="#10b981" trend={Number(dispRate) >= 80 ? "up" : "neutral"} />
        <KpiCard label={language === "ar" ? "معلقة" : "Pending"} value={pending} icon={Clock} color="#f59e0b" trend={pending > 5 ? "down" : "neutral"} />
        <KpiCard label={language === "ar" ? "ملغاة" : "Cancelled"} value={cancelled} icon={AlertTriangle} color="#6b7280" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "الوصفات خلال الفترة" : "Prescriptions Over Period"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name={language === "ar" ? "وصفة" : "Prescriptions"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{language === "ar" ? "توزيع الحالة" : "Status Distribution"}</CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: language === "ar" ? "مصروفة" : "Dispensed", value: dispensed, fill: "#10b981" },
                      { name: language === "ar" ? "معلقة" : "Pending", value: pending, fill: "#f59e0b" },
                      { name: language === "ar" ? "ملغاة" : "Cancelled", value: cancelled, fill: "#ef4444" },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={75} dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}
                  >
                    {[dispensed, pending, cancelled].filter(v => v > 0).map((_, i) => (
                      <Cell key={i} fill={["#10b981", "#f59e0b", "#ef4444"][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <InterpretationPanel lines={interpretation} language={language} />

      <ReportTable data={prescriptions.slice(0, 50)} columns={[
        { key: "patientName", label: language === "ar" ? "المريض" : "Patient" },
        { key: "doctorName", label: language === "ar" ? "الطبيب" : "Doctor" },
        { key: "status", label: language === "ar" ? "الحالة" : "Status", render: (v) => <StatusBadge status={v} /> },
        { key: "createdAt", label: language === "ar" ? "التاريخ" : "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
      ]} language={language} />
    </div>
  );
}

/* ═══════════════════════════════════════ SHARED TABLE ═══════════════════════════════════════ */
function ReportTable({ data, columns, language }:
  { data: any[]; columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[]; language: string }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          {language === "ar" ? "لا توجد بيانات للعرض في هذه الفترة" : "No records to display for the selected period"}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {language === "ar" ? `سجلات الفترة (${data.length} نتيجة)` : `Period Records (${data.length} results)`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {columns.map(c => (
                  <th key={c.key} className="text-start font-semibold text-muted-foreground px-4 py-2.5 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className="px-4 py-2.5 text-foreground/80">
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
