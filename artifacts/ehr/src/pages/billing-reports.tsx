import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useListInvoices, useListPatients } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Receipt, TrendingUp, TrendingDown, Minus, Download,
  RefreshCw, DollarSign, AlertCircle, CheckCircle, Clock,
  CreditCard, FileBarChart, Search,
} from "lucide-react";
import * as XLSX from "xlsx";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Period = "today" | "week" | "month" | "quarter" | "half" | "year";
type StatusFilter = "all" | "paid" | "partial" | "unpaid";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const PERIODS: { value: Period; labelEn: string; labelAr: string }[] = [
  { value: "today",   labelEn: "Today",        labelAr: "اليوم" },
  { value: "week",    labelEn: "This Week",     labelAr: "هذا الأسبوع" },
  { value: "month",   labelEn: "This Month",    labelAr: "هذا الشهر" },
  { value: "quarter", labelEn: "Last 3 Months", labelAr: "آخر 3 أشهر" },
  { value: "half",    labelEn: "Last 6 Months", labelAr: "آخر 6 أشهر" },
  { value: "year",    labelEn: "This Year",     labelAr: "هذا العام" },
];

const STATUS_COLORS: Record<string, string> = {
  paid:    "#10b981",
  partial: "#f59e0b",
  unpaid:  "#ef4444",
};

const METHOD_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];

const AXIS_STYLE = { fontSize: 10, fill: "hsl(var(--muted-foreground))" } as const;
const GRID_PROPS = { strokeDasharray: "3 3" as const, stroke: "hsl(var(--border))", vertical: false as const };

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getPeriodRange(period: Period) {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  let start: Date;
  let groupBy: "hour" | "day" | "month" = "day";
  switch (period) {
    case "today":   start = new Date(now); start.setHours(0,0,0,0); groupBy = "hour"; break;
    case "week":    start = new Date(now); start.setDate(now.getDate()-6); start.setHours(0,0,0,0); break;
    case "month":   start = new Date(now); start.setDate(1); start.setHours(0,0,0,0); break;
    case "quarter": start = new Date(now); start.setMonth(now.getMonth()-2); start.setDate(1); start.setHours(0,0,0,0); groupBy = "month"; break;
    case "half":    start = new Date(now); start.setMonth(now.getMonth()-5); start.setDate(1); start.setHours(0,0,0,0); groupBy = "month"; break;
    case "year":    start = new Date(now.getFullYear(),0,1,0,0,0,0); groupBy = "month"; break;
  }
  return { start, end, groupBy };
}

function fmtKey(d: Date, groupBy: "hour" | "day" | "month"): string {
  if (groupBy === "hour")  return `${d.getHours()}:00`;
  if (groupBy === "month") return d.toLocaleString("default", { month: "short", year: "2-digit" });
  return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
}

function n(v: unknown): number { return Number(v ?? 0); }
function money(v: number, lang: string) {
  return lang === "ar"
    ? `${v.toLocaleString("ar-SA")} ج.س`
    : `SDG ${v.toLocaleString()}`;
}
function pct(num: number, den: number) {
  if (den === 0) return "0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-xl text-xs min-w-[130px]">
      {label != null && <p className="font-semibold text-foreground mb-1.5 pb-1 border-b">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.stroke ?? p.fill ?? p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-bold">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1 leading-tight">{value}</p>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    unpaid:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  const labels: Record<string, { en: string; ar: string }> = {
    paid:    { en: "Paid",    ar: "مدفوعة" },
    partial: { en: "Partial", ar: "جزئي" },
    unpaid:  { en: "Unpaid",  ar: "غير مدفوعة" },
  };
  const info = labels[status] ?? { en: status, ar: status };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {info.en}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function BillingReports() {
  const { language } = useTranslation();
  const isRtl = language === "ar";
  const [period, setPeriod]         = useState<Period>("month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]         = useState("");

  const { start, end, groupBy } = useMemo(() => getPeriodRange(period), [period]);

  const { data: allInvoices = [], isLoading: loadInv, refetch } = useListInvoices({});
  const { data: patientsResp }  = useListPatients({});
  const allPatients: any[] = Array.isArray(patientsResp)
    ? patientsResp
    : ((patientsResp as any)?.patients ?? []);

  const patientMap = useMemo(() => {
    const m: Record<number, string> = {};
    allPatients.forEach((p: any) => { m[p.id] = p.nameEn ?? p.name_en ?? "—"; });
    return m;
  }, [allPatients]);

  function inRange(dateStr?: string | null) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  }

  const periodLabel = PERIODS.find(p => p.value === period)?.[isRtl ? "labelAr" : "labelEn"] ?? period;

  /* period-filtered invoices */
  const invoices: any[] = useMemo(
    () => (allInvoices as any[]).filter(i => inRange(i.createdAt ?? i.created_at)),
    [allInvoices, start, end],
  );

  /* ── KPIs ── */
  const totalBilled    = useMemo(() => invoices.reduce((s, i) => s + n(i.totalAmount ?? i.total_amount), 0), [invoices]);
  const totalCollected = useMemo(() => invoices.reduce((s, i) => s + n(i.paidAmount  ?? i.paid_amount), 0), [invoices]);
  const totalOutstanding = totalBilled - totalCollected;
  const collectionRate   = pct(totalCollected, totalBilled);

  const paidCount    = invoices.filter(i => i.status === "paid").length;
  const partialCount = invoices.filter(i => i.status === "partial").length;
  const unpaidCount  = invoices.filter(i => i.status === "unpaid").length;

  /* ── Revenue trend ── */
  const revenueTrend = useMemo(() => {
    const map: Record<string, { billed: number; collected: number }> = {};
    invoices.forEach(i => {
      const key = fmtKey(new Date(i.createdAt ?? i.created_at), groupBy);
      if (!map[key]) map[key] = { billed: 0, collected: 0 };
      map[key].billed    += n(i.totalAmount ?? i.total_amount);
      map[key].collected += n(i.paidAmount  ?? i.paid_amount);
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [invoices, groupBy]);

  /* ── Status breakdown (count + amount) ── */
  const statusData = useMemo(() => [
    { name: isRtl ? "مدفوعة"      : "Paid",    count: paidCount,    amount: invoices.filter(i => i.status === "paid"   ).reduce((s, i) => s + n(i.totalAmount ?? i.total_amount), 0), color: STATUS_COLORS.paid    },
    { name: isRtl ? "جزئي"        : "Partial", count: partialCount, amount: invoices.filter(i => i.status === "partial").reduce((s, i) => s + n(i.totalAmount ?? i.total_amount), 0), color: STATUS_COLORS.partial },
    { name: isRtl ? "غير مدفوعة" : "Unpaid",  count: unpaidCount,  amount: invoices.filter(i => i.status === "unpaid" ).reduce((s, i) => s + n(i.totalAmount ?? i.total_amount), 0), color: STATUS_COLORS.unpaid  },
  ], [invoices, paidCount, partialCount, unpaidCount, isRtl]);

  /* ── Payment method bar ── */
  const methodData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(i => {
      const m = i.paymentMethod ?? i.payment_method ?? "unknown";
      map[m] = (map[m] ?? 0) + n(i.totalAmount ?? i.total_amount);
    });
    return Object.entries(map).map(([name, amount], idx) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      amount,
      color: METHOD_COLORS[idx % METHOD_COLORS.length],
    }));
  }, [invoices]);

  /* ── Outstanding invoices table ── */
  const outstandingList = useMemo(() => {
    return (allInvoices as any[])
      .filter(i => i.status === "partial" || i.status === "unpaid")
      .map(i => ({
        ...i,
        _patientName: patientMap[i.patientId ?? i.patient_id] ?? "—",
        _due: n(i.totalAmount ?? i.total_amount) - n(i.paidAmount ?? i.paid_amount),
      }))
      .sort((a, b) => b._due - a._due);
  }, [allInvoices, patientMap]);

  const filteredOutstanding = useMemo(() => {
    return outstandingList.filter(i => {
      const matchStatus = statusFilter === "all" || i.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q
        || i._patientName.toLowerCase().includes(q)
        || (i.invoiceNumber ?? i.invoice_number ?? "").toString().toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [outstandingList, statusFilter, search]);

  /* ── Export ── */
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const summaryRows = invoices.map(i => ({
      "Invoice #":       i.invoiceNumber ?? i.invoice_number ?? i.id,
      "Patient":         patientMap[i.patientId ?? i.patient_id] ?? "—",
      "Date":            new Date(i.createdAt ?? i.created_at).toLocaleDateString(),
      "Status":          i.status,
      "Payment Method":  i.paymentMethod ?? i.payment_method ?? "—",
      "Total (SDG)":     n(i.totalAmount ?? i.total_amount),
      "Paid (SDG)":      n(i.paidAmount  ?? i.paid_amount),
      "Outstanding (SDG)": n(i.totalAmount ?? i.total_amount) - n(i.paidAmount ?? i.paid_amount),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Invoices");

    const outRows = outstandingList.map(i => ({
      "Invoice #":         i.invoiceNumber ?? i.invoice_number ?? i.id,
      "Patient":           i._patientName,
      "Date":              new Date(i.createdAt ?? i.created_at).toLocaleDateString(),
      "Status":            i.status,
      "Total (SDG)":       n(i.totalAmount ?? i.total_amount),
      "Paid (SDG)":        n(i.paidAmount  ?? i.paid_amount),
      "Outstanding (SDG)": i._due,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outRows), "Outstanding");

    XLSX.writeFile(wb, `billing-report-${period}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const isLoading = loadInv;

  return (
    <div className="flex flex-col gap-6 p-6" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <FileBarChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isRtl ? "التقارير المالية" : "Financial Reports"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isRtl ? "الفواتير · التحصيل · المتأخرات" : "Invoices · Collections · Outstanding Balances"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  {isRtl ? p.labelAr : p.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isRtl ? "تحديث" : "Refresh"}
          </Button>
          <Button size="sm" onClick={exportExcel} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Download className="h-3.5 w-3.5" />
            {isRtl ? "تصدير Excel" : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* ── Period label ── */}
      <p className="text-xs text-muted-foreground -mt-3">
        {isRtl
          ? `تعرض البيانات لـ: ${periodLabel} · ${invoices.length} فاتورة`
          : `Showing data for: ${periodLabel} · ${invoices.length} invoice(s)`}
      </p>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={isRtl ? "إجمالي الفواتير" : "Total Billed"}
          value={money(totalBilled, language)}
          sub={isRtl ? `${invoices.length} فاتورة` : `${invoices.length} invoice(s)`}
          icon={Receipt}
          color="#3b82f6"
          trend="neutral"
        />
        <KpiCard
          label={isRtl ? "المبلغ المحصّل" : "Collected"}
          value={money(totalCollected, language)}
          sub={`${collectionRate} ${isRtl ? "معدل التحصيل" : "collection rate"}`}
          icon={DollarSign}
          color="#10b981"
          trend={Number(collectionRate) >= 85 ? "up" : Number(collectionRate) >= 60 ? "neutral" : "down"}
        />
        <KpiCard
          label={isRtl ? "المتأخرات" : "Outstanding"}
          value={money(totalOutstanding, language)}
          sub={isRtl ? `${unpaidCount + partialCount} فاتورة مفتوحة` : `${unpaidCount + partialCount} open invoice(s)`}
          icon={AlertCircle}
          color="#ef4444"
          trend={totalOutstanding > 0 ? "down" : "up"}
        />
        <KpiCard
          label={isRtl ? "معدل التحصيل" : "Collection Rate"}
          value={collectionRate}
          sub={isRtl
            ? `${paidCount} مدفوعة · ${partialCount} جزئي · ${unpaidCount} معلقة`
            : `${paidCount} paid · ${partialCount} partial · ${unpaidCount} unpaid`}
          icon={TrendingUp}
          color="#8b5cf6"
          trend={Number(collectionRate) >= 85 ? "up" : Number(collectionRate) >= 60 ? "neutral" : "down"}
        />
      </div>

      {/* ── Revenue Trend + Status Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isRtl ? "اتجاه الإيرادات" : "Revenue Trend"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRtl ? "إجمالي الفواتير مقابل المبلغ المحصّل" : "Total billed vs collected over time"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
                {isRtl ? "لا بيانات للفترة المحددة" : "No data for selected period"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} />
                  <YAxis tick={AXIS_STYLE} width={60} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="billed"    name={isRtl ? "مُفوتر"   : "Billed"}    stroke="#3b82f6" fill="url(#billedGrad)"    strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="collected" name={isRtl ? "محصّل"    : "Collected"} stroke="#10b981" fill="url(#collectedGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart — 1/3 width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isRtl ? "توزيع حالات الفواتير" : "Invoice Status Split"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRtl ? "بحسب العدد" : "By count"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
                {isRtl ? "لا بيانات" : "No data"}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} dataKey="count" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: string) => [v, name]}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {statusData.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold">{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Methods Bar ── */}
      {methodData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isRtl ? "الإيرادات حسب طريقة الدفع" : "Revenue by Payment Method"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRtl ? "المبلغ الإجمالي لكل طريقة دفع (SDG)" : "Total billed amount per payment method (SDG)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={methodData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} width={60} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name={isRtl ? "المبلغ (SDG)" : "Amount (SDG)"} radius={[4,4,0,0]}>
                  {methodData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Outstanding Invoices Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {isRtl ? "الفواتير المفتوحة (غير مسددة بالكامل)" : "Open Invoices (Unpaid / Partial)"}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isRtl
                  ? `${outstandingList.length} فاتورة إجمالاً · مرتبة حسب المبلغ المتبقي`
                  : `${outstandingList.length} total · sorted by highest outstanding amount`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={isRtl ? "بحث…" : "Search…"}
                  className="pl-8 h-8 w-44 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "الكل"         : "All"}</SelectItem>
                  <SelectItem value="partial">{isRtl ? "جزئي"     : "Partial"}</SelectItem>
                  <SelectItem value="unpaid">{isRtl ? "غير مدفوعة" : "Unpaid"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOutstanding.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">{isRtl ? "لا فواتير مفتوحة" : "No open invoices"}</p>
              <p className="text-xs">{isRtl ? "ممتاز — جميع الفواتير مسددة" : "All invoices are fully paid"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{isRtl ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                    <TableHead className="text-xs">{isRtl ? "المريض"        : "Patient"}</TableHead>
                    <TableHead className="text-xs">{isRtl ? "التاريخ"       : "Date"}</TableHead>
                    <TableHead className="text-xs">{isRtl ? "الحالة"        : "Status"}</TableHead>
                    <TableHead className="text-xs text-right">{isRtl ? "الإجمالي (SDG)"  : "Total (SDG)"}</TableHead>
                    <TableHead className="text-xs text-right">{isRtl ? "المدفوع (SDG)"   : "Paid (SDG)"}</TableHead>
                    <TableHead className="text-xs text-right font-bold text-red-600">{isRtl ? "المتبقي (SDG)" : "Due (SDG)"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutstanding.map((inv: any) => (
                    <TableRow key={inv.id} className="hover:bg-muted/40">
                      <TableCell className="text-xs font-mono">
                        {inv.invoiceNumber ?? inv.invoice_number ?? `#${inv.id}`}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{inv._patientName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.createdAt ?? inv.created_at).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
                      </TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-xs text-right">
                        {n(inv.totalAmount ?? inv.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right text-emerald-600 font-medium">
                        {n(inv.paidAmount ?? inv.paid_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-red-600">
                        {inv._due.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Insight panel ── */}
      {invoices.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-sm font-semibold">
                {isRtl ? "تحليل مالي للفترة" : "Financial Summary"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                isRtl
                  ? `إجمالي الفواتير في فترة "${periodLabel}": ${money(totalBilled, language)} (${invoices.length} فاتورة)`
                  : `Total billed in "${periodLabel}": ${money(totalBilled, language)} across ${invoices.length} invoice(s).`,
                isRtl
                  ? `معدل التحصيل: ${collectionRate} — ${Number(collectionRate) >= 90 ? "أداء مالي ممتاز." : Number(collectionRate) >= 70 ? "جيد، مجال للتحسين." : "يستدعي مراجعة سياسات التحصيل."}`
                  : `Collection rate: ${collectionRate} — ${Number(collectionRate) >= 90 ? "Excellent financial performance." : Number(collectionRate) >= 70 ? "Good, with room for improvement." : "Below benchmark — review collection policies."}`,
                totalOutstanding > 0
                  ? isRtl
                    ? `المتأخرات: ${money(totalOutstanding, language)} من ${unpaidCount + partialCount} فاتورة مفتوحة — يُنصح بالمتابعة الفورية.`
                    : `Outstanding: ${money(totalOutstanding, language)} across ${unpaidCount + partialCount} open invoice(s) — prompt follow-up recommended.`
                  : isRtl ? "لا متأخرات — أداء تحصيل مثالي في هذه الفترة." : "No outstanding balances — perfect collection rate this period.",
                methodData.length > 0
                  ? isRtl
                    ? `الطريقة الأكثر استخداماً: ${[...methodData].sort((a,b) => b.amount - a.amount)[0]?.name ?? "—"}`
                    : `Most used payment method: ${[...methodData].sort((a,b) => b.amount - a.amount)[0]?.name ?? "—"}`
                  : "",
              ].filter(Boolean).map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
