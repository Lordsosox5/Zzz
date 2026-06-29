import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useListGrowthRecords, useCreateGrowthRecord, getListGrowthRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PatientSearchCombobox } from "@/components/patient-search-combobox";
import { Plus, Loader2, Save, X, TrendingUp, BarChart3, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
} from "recharts";
import { getWhoReferenceCurve, ageInMonths, SD_LABELS } from "@/lib/who-charts";

const emptyForm = {
  patientId: "",
  patientName: "",
  measurementDate: "",
  weight: "",
  height: "",
  headCircumference: "",
  muac: "",
  notes: "",
};

const SD_COLORS: Record<string, string> = {
  severe: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  moderate: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  mild: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  normal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  risk_overweight: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  overweight: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  obese: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function fmt(v: number | null | undefined, unit = "", dp = 1) {
  if (v == null) return "—";
  return `${Number(v).toFixed(dp)}${unit}`;
}

function SdBadge({ cat }: { cat: string | null | undefined }) {
  if (!cat) return <span className="text-muted-foreground">—</span>;
  const label = SD_LABELS[cat]?.en ?? cat;
  return <Badge className={`text-xs ${SD_COLORS[cat] ?? ""}`}>{label}</Badge>;
}

type Rec = Record<string, unknown>;

export default function Growth() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Patient filter
  const [filterPatientId, setFilterPatientId] = useState("");
  const [filterPatientName, setFilterPatientName] = useState("");
  const [filterPatientDob, setFilterPatientDob] = useState("");
  const [filterPatientGender, setFilterPatientGender] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("records");

  const qParams = filterPatientId ? { patientId: Number(filterPatientId) } : {};
  const { data: records = [], isLoading } = useListGrowthRecords(qParams);
  const createMutation = useCreateGrowthRecord();

  // Sync patient DOB/gender from loaded records when patient filter is active
  useEffect(() => {
    if (filterPatientId && records.length > 0) {
      const r = records[0] as unknown as Rec;
      if (r.patientDob && !filterPatientDob) {
        setFilterPatientDob(r.patientDob as string);
        setFilterPatientGender((r.patientGender as string) ?? "male");
      }
    }
  }, [records, filterPatientId, filterPatientDob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.selectPatient") });
      return;
    }
    const payload: Record<string, unknown> = {
      patientId: Number(form.patientId),
      measurementDate: form.measurementDate,
    };
    if (form.weight) payload.weight = Number(form.weight);
    if (form.height) payload.height = Number(form.height);
    if (form.headCircumference) payload.headCircumference = Number(form.headCircumference);
    if (form.muac) payload.muac = Number(form.muac);
    if (form.notes) payload.notes = form.notes;

    createMutation.mutate(
      { data: payload as unknown as Parameters<typeof createMutation.mutate>[0]["data"] },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGrowthRecordsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm(emptyForm);
        },
        onError: () =>
          toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  // Sorted records for charts
  const sorted = useMemo(
    () => [...records].sort((a, b) => a.measurementDate.localeCompare(b.measurementDate)),
    [records]
  );

  // Trend chart data
  const trendData = useMemo(
    () =>
      sorted.map((r) => ({
        date: r.measurementDate,
        weight: r.weight != null ? Number(r.weight) : null,
        height: r.height != null ? Number(r.height) : null,
        muac: (r as unknown as Rec).muac != null ? Number((r as unknown as Rec).muac) : null,
      })),
    [sorted]
  );

  // WHO centile chart data
  const centileData = useMemo(() => {
    const sex = filterPatientGender || "male";
    const dob = filterPatientDob;
    const weightRef = getWhoReferenceCurve("weight", sex);
    const heightRef = getWhoReferenceCurve("height", sex);

    const wByAge: Record<number, number> = {};
    const hByAge: Record<number, number> = {};
    if (dob) {
      for (const r of sorted) {
        const age = ageInMonths(dob, r.measurementDate);
        if (r.weight != null) wByAge[age] = Number(r.weight);
        if (r.height != null) hByAge[age] = Number(r.height);
      }
    }

    return {
      weight: weightRef.map((pt) => ({
        month: pt.month,
        p3: pt.p3, p15: pt.p15, p50: pt.p50, p85: pt.p85, p97: pt.p97,
        patient: wByAge[pt.month] ?? null,
      })),
      height: heightRef.map((pt) => ({
        month: pt.month,
        p3: pt.p3, p15: pt.p15, p50: pt.p50, p85: pt.p85, p97: pt.p97,
        patient: hByAge[pt.month] ?? null,
      })),
    };
  }, [filterPatientGender, filterPatientDob, sorted]);

  const refLineProps = { strokeDasharray: "5 3" as const, dot: false as const };

  // Latest record for summary card
  const latest = sorted.length > 0 ? (sorted[sorted.length - 1] as unknown as Rec) : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.growth")}</h1>
        <Dialog
          open={isOpen}
          onOpenChange={(v) => {
            setIsOpen(v);
            if (!v) setForm(emptyForm);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
              {t("growth.newRecord")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("growth.addRecord")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("generic.patient")} *</Label>
                <PatientSearchCombobox
                  value={form.patientId}
                  onChange={(id, name) => setForm((p) => ({ ...p, patientId: id, patientName: name }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("growth.measurementDate")} *</Label>
                <Input
                  name="measurementDate"
                  type="date"
                  required
                  value={form.measurementDate}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("growth.weight")}</Label>
                  <Input
                    name="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.weight}
                    onChange={handleChange}
                    placeholder="kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("growth.height")}</Label>
                  <Input
                    name="height"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.height}
                    onChange={handleChange}
                    placeholder="cm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("growth.headCirc")}</Label>
                  <Input
                    name="headCircumference"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.headCircumference}
                    onChange={handleChange}
                    placeholder="cm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("growth.muac")}
                    <span className="ms-1 text-xs text-muted-foreground">MUAC</span>
                  </Label>
                  <Input
                    name="muac"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.muac}
                    onChange={handleChange}
                    placeholder="cm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("generic.notes")}</Label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setForm(emptyForm);
                  }}
                >
                  {t("generic.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                  ) : (
                    <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
                  )}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Patient filter ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                {t("growth.filterPatient")}
              </Label>
              <PatientSearchCombobox
                value={filterPatientId}
                onChange={(id, name) => {
                  setFilterPatientId(id);
                  setFilterPatientName(name);
                  setFilterPatientDob("");
                  setFilterPatientGender("");
                }}
              />
            </div>
            {filterPatientId && (
              <Button
                variant="outline"
                size="sm"
                className="mt-5 sm:mt-0 shrink-0"
                onClick={() => {
                  setFilterPatientId("");
                  setFilterPatientName("");
                  setFilterPatientDob("");
                  setFilterPatientGender("");
                  setActiveTab("records");
                }}
              >
                <X className="h-4 w-4 me-1" />
                {t("growth.clearFilter")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {t("growth.records")}
          </TabsTrigger>
          <TabsTrigger value="trend" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("growth.trendChart")}
          </TabsTrigger>
          <TabsTrigger value="centile" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("growth.centileChart")}
          </TabsTrigger>
        </TabsList>

        {/* ─── Records Tab ─── */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>{t("growth.charts")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("generic.patient")}</TableHead>
                    <TableHead>{t("growth.date")}</TableHead>
                    <TableHead>Wt (kg)</TableHead>
                    <TableHead>Ht (cm)</TableHead>
                    <TableHead>HC (cm)</TableHead>
                    <TableHead>MUAC (cm)</TableHead>
                    <TableHead>{t("growth.bmi")}</TableHead>
                    <TableHead title="Weight-for-Age Z-score">{t("growth.waz")}</TableHead>
                    <TableHead title="Height-for-Age Z-score">{t("growth.haz")}</TableHead>
                    <TableHead title="MUAC-for-Age Z-score">{t("growth.muaz")}</TableHead>
                    <TableHead>{t("growth.sdCategory")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : records.length > 0 ? (
                    records.map((r) => {
                      const rr = r as unknown as Rec;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <button
                              onClick={() => navigate(`/patients/${r.patientId}`)}
                              className="font-medium text-primary hover:underline cursor-pointer text-start"
                            >
                              {(rr.patientName as string) ?? `#${r.patientId}`}
                            </button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{r.measurementDate}</TableCell>
                          <TableCell>{fmt(r.weight as number | null, "")}</TableCell>
                          <TableCell>{fmt(r.height as number | null, "")}</TableCell>
                          <TableCell>{fmt(r.headCircumference as number | null, "")}</TableCell>
                          <TableCell>{fmt(rr.muac as number | null, "")}</TableCell>
                          <TableCell>{fmt(r.bmi as number | null, "")}</TableCell>
                          <TableCell>
                            {r.weightZScore != null ? (
                              <span className="font-mono text-sm">{Number(r.weightZScore).toFixed(2)}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {r.heightZScore != null ? (
                              <span className="font-mono text-sm">{Number(r.heightZScore).toFixed(2)}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {rr.muacZScore != null ? (
                              <span className="font-mono text-sm">{Number(rr.muacZScore).toFixed(2)}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <SdBadge cat={rr.sdCategory as string | null} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        {t("growth.noRecords")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Growth Trend Tab ─── */}
        <TabsContent value="trend">
          {!filterPatientId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                {t("growth.noPatientForCharts")}
              </CardContent>
            </Card>
          ) : trendData.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                {t("growth.noTrendData")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Weight over time */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("growth.trendWeight")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis unit=" kg" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)} kg`, t("growth.weight")]} />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ fill: "#2563eb", r: 4 }}
                        connectNulls
                        name={t("growth.weight")}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Height over time */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("growth.trendHeight")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis unit=" cm" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)} cm`, t("growth.height")]} />
                      <Line
                        type="monotone"
                        dataKey="height"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={{ fill: "#16a34a", r: 4 }}
                        connectNulls
                        name={t("growth.height")}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* MUAC over time — only shown if any MUAC data exists */}
              {trendData.some((d) => d.muac != null) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("growth.trendMuac")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis unit=" cm" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                        <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)} cm`, "MUAC"]} />
                        <ReferenceLine
                          y={12.5}
                          stroke="#22c55e"
                          strokeDasharray="4 2"
                          label={{ value: "Normal 12.5", fontSize: 10, fill: "#22c55e", position: "insideTopRight" }}
                        />
                        <ReferenceLine
                          y={11.5}
                          stroke="#ef4444"
                          strokeDasharray="4 2"
                          label={{ value: "SAM 11.5", fontSize: 10, fill: "#ef4444", position: "insideTopRight" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="muac"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          dot={{ fill: "#7c3aed", r: 4 }}
                          connectNulls
                          name="MUAC"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        <span className="inline-block w-4 border-t-2 border-green-500 me-1 align-middle"></span>
                        {t("growth.muacNormal")}
                      </span>
                      <span>
                        <span className="inline-block w-4 border-t-2 border-dashed border-orange-400 me-1 align-middle"></span>
                        {t("growth.muacMam")}
                      </span>
                      <span>
                        <span className="inline-block w-4 border-t-2 border-red-500 me-1 align-middle"></span>
                        {t("growth.muacSam")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── Centile Charts Tab ─── */}
        <TabsContent value="centile">
          {!filterPatientId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                {t("growth.noPatientForCharts")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-6 border-t-2 border-dashed border-red-400"></span>
                      3rd / 97th centile
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-6 border-t-2 border-dashed border-orange-400"></span>
                      15th / 85th centile
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-6 border-t-2 border-green-600"></span>
                      50th centile (Median)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-full bg-blue-600"></span>
                      {filterPatientName || t("growth.patient")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Weight-for-age */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("growth.weightChart")} — WHO 2006{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({filterPatientGender === "female" ? "Girls" : "Boys"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={centileData.weight} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis
                        dataKey="month"
                        label={{ value: t("growth.ageMonths"), position: "insideBottom", offset: -10, fontSize: 11 }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis unit=" kg" tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const pv = payload.find((p) => p.dataKey === "patient")?.value;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg text-xs space-y-0.5">
                              <p className="font-semibold">Age: {label} months</p>
                              {payload
                                .filter((p) => p.dataKey !== "patient")
                                .map((p) => (
                                  <p key={p.dataKey as string} style={{ color: p.stroke }}>
                                    {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value} kg
                                  </p>
                                ))}
                              {pv != null && (
                                <p className="font-bold text-blue-600">Patient: {Number(pv).toFixed(1)} kg</p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Line dataKey="p97" stroke="#ef4444" name="97th" {...refLineProps} />
                      <Line dataKey="p85" stroke="#f97316" name="85th" {...refLineProps} />
                      <Line dataKey="p50" stroke="#16a34a" strokeWidth={2} dot={false} name="50th" />
                      <Line dataKey="p15" stroke="#f97316" name="15th" {...refLineProps} />
                      <Line dataKey="p3" stroke="#ef4444" name="3rd" {...refLineProps} />
                      <Scatter
                        dataKey="patient"
                        fill="#2563eb"
                        name={filterPatientName || t("growth.patient")}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        shape={(props: any) => {
                          if (props.patient == null) return <g />;
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="#2563eb"
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                          );
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Height-for-age */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("growth.heightChart")} — WHO 2006{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({filterPatientGender === "female" ? "Girls" : "Boys"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={centileData.height} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis
                        dataKey="month"
                        label={{ value: t("growth.ageMonths"), position: "insideBottom", offset: -10, fontSize: 11 }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis unit=" cm" tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const pv = payload.find((p) => p.dataKey === "patient")?.value;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg text-xs space-y-0.5">
                              <p className="font-semibold">Age: {label} months</p>
                              {payload
                                .filter((p) => p.dataKey !== "patient")
                                .map((p) => (
                                  <p key={p.dataKey as string} style={{ color: p.stroke }}>
                                    {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value} cm
                                  </p>
                                ))}
                              {pv != null && (
                                <p className="font-bold text-blue-600">Patient: {Number(pv).toFixed(1)} cm</p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Line dataKey="p97" stroke="#ef4444" name="97th" {...refLineProps} />
                      <Line dataKey="p85" stroke="#f97316" name="85th" {...refLineProps} />
                      <Line dataKey="p50" stroke="#16a34a" strokeWidth={2} dot={false} name="50th" />
                      <Line dataKey="p15" stroke="#f97316" name="15th" {...refLineProps} />
                      <Line dataKey="p3" stroke="#ef4444" name="3rd" {...refLineProps} />
                      <Scatter
                        dataKey="patient"
                        fill="#2563eb"
                        name={filterPatientName || t("growth.patient")}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        shape={(props: any) => {
                          if (props.patient == null) return <g />;
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="#2563eb"
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                          );
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Latest measurement summary */}
              {latest && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Latest Measurements — {latest.measurementDate as string}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        {
                          label: "Weight",
                          value: fmt(latest.weight as number | null, " kg"),
                          z: latest.weightZScore as number | null,
                          p: latest.weightPercentile as number | null,
                        },
                        {
                          label: "Height",
                          value: fmt(latest.height as number | null, " cm"),
                          z: latest.heightZScore as number | null,
                          p: latest.heightPercentile as number | null,
                        },
                        {
                          label: "BMI",
                          value: fmt(latest.bmi as number | null, ""),
                          z: latest.bmiZScore as number | null,
                          p: latest.bmiPercentile as number | null,
                        },
                        {
                          label: "MUAC",
                          value: fmt(latest.muac as number | null, " cm"),
                          z: latest.muacZScore as number | null,
                          p: latest.muacPercentile as number | null,
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border p-3 space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                          <p className="text-lg font-bold">{item.value}</p>
                          <div className="text-xs space-y-0.5 text-muted-foreground">
                            {item.z != null && (
                              <p>
                                Z:{" "}
                                <span
                                  className={`font-mono font-semibold ${
                                    item.z < -2 || item.z > 2 ? "text-red-600" : item.z < -1 || item.z > 1 ? "text-orange-500" : "text-green-600"
                                  }`}
                                >
                                  {Number(item.z).toFixed(2)}
                                </span>
                              </p>
                            )}
                            {item.p != null && (
                              <p>
                                Centile: <span className="font-mono">{Number(item.p).toFixed(0)}th</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <SdBadge cat={latest.sdCategory as string | null} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
