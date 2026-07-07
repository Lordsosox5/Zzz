import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListRadiologyOrders, useCreateRadiologyOrder, useUpdateRadiologyOrder,
  getListRadiologyOrdersQueryKey,
  type RadiologyOrder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canEnterLabResults } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PatientSearchCombobox } from "@/components/patient-search-combobox";
import { RadiologyReportViewDialog, type RadiologyOrderForReport } from "@/components/radiology-report-view-dialog";

interface ReportSections {
  indication: string;
  technique: string;
  findings: string;
  impression: string;
  recommendations: string;
  completedAt: string;
}

const BLANK_SECTIONS: ReportSections = {
  indication: "",
  technique: "",
  findings: "",
  impression: "",
  recommendations: "",
  completedAt: new Date().toISOString().slice(0, 16),
};

function sectionsToText(s: ReportSections): string {
  const parts: string[] = [];
  if (s.indication.trim())     parts.push(`CLINICAL INDICATION:\n${s.indication.trim()}`);
  if (s.technique.trim())      parts.push(`TECHNIQUE:\n${s.technique.trim()}`);
  if (s.findings.trim())       parts.push(`FINDINGS:\n${s.findings.trim()}`);
  if (s.impression.trim())     parts.push(`IMPRESSION:\n${s.impression.trim()}`);
  if (s.recommendations.trim()) parts.push(`RECOMMENDATIONS:\n${s.recommendations.trim()}`);
  return parts.join("\n\n");
}

/* ── Enter Radiology Report Dialog ── */
function EnterRadiologyReportDialog({ orderId, studyDescription, onSuccess }: { orderId: number; studyDescription: string; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const updateMutation = useUpdateRadiologyOrder();
  const [form, setForm] = useState<ReportSections>({ ...BLANK_SECTIONS, completedAt: new Date().toISOString().slice(0, 16) });

  const set = (key: keyof ReportSections) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reportText = sectionsToText(form);
    if (!reportText.trim()) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.requiredField") });
      return;
    }
    updateMutation.mutate(
      { id: orderId, data: { status: "reported", report: reportText, completedAt: new Date(form.completedAt).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setOpen(false);
          setForm({ ...BLANK_SECTIONS, completedAt: new Date().toISOString().slice(0, 16) });
          onSuccess();
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" /> {t("radiology.enterReport")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            {t("radiology.reportTitle")}
            <span className="font-normal text-muted-foreground truncate">— {studyDescription}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Clinical Indication */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Clinical Indication <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={form.indication}
                onChange={set("indication")}
                placeholder="Reason for study / clinical history…"
                className="min-h-[72px] resize-none text-sm"
              />
            </div>

            {/* Technique */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Technique
              </Label>
              <Textarea
                value={form.technique}
                onChange={set("technique")}
                placeholder="Imaging technique, sequences, contrast used…"
                className="min-h-[72px] resize-none text-sm"
              />
            </div>

            {/* Findings */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Findings <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={form.findings}
                onChange={set("findings")}
                placeholder="Describe all relevant positive and negative findings systematically…"
                className="min-h-[120px] resize-none text-sm"
              />
            </div>

            {/* Impression */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Impression <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={form.impression}
                onChange={set("impression")}
                placeholder="Summary of key findings, differential diagnosis or conclusion…"
                className="min-h-[88px] resize-none text-sm"
              />
            </div>

            {/* Recommendations */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Recommendations
              </Label>
              <Textarea
                value={form.recommendations}
                onChange={set("recommendations")}
                placeholder="Follow-up imaging, clinical correlation, or further workup (optional)…"
                className="min-h-[60px] resize-none text-sm"
              />
            </div>

            {/* Reported At */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("radiology.reportedAt")}
              </Label>
              <Input type="datetime-local" value={form.completedAt} onChange={set("completedAt")} className="text-sm" />
            </div>

          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="gap-1.5">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("generic.save")} — {t("radiology.statusReported")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Radiology() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const { data: orders, isLoading } = useListRadiologyOrders({});
  const createMutation = useCreateRadiologyOrder();

  const user = getUser();
  const role = user?.role ?? "";
  const canReport = canEnterLabResults(role);

  const [form, setForm] = useState({ patientId: "", patientName: "", modality: "x-ray", studyDescription: "", priority: "routine", scheduledAt: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: getListRadiologyOrdersQueryKey() });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.selectPatient") });
      return;
    }
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), modality: form.modality, studyDescription: form.studyDescription, priority: form.priority || undefined, scheduledAt: form.scheduledAt || undefined } },
      {
        onSuccess: () => {
          refreshOrders();
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", patientName: "", modality: "x-ray", studyDescription: "", priority: "routine", scheduledAt: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.radiology")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("radiology.newOrder")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("radiology.newOrder")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-3">
                <Label>{t("generic.patient")} *</Label>
                <PatientSearchCombobox
                  value={form.patientId}
                  onChange={(id, name) => setForm(p => ({ ...p, patientId: id, patientName: name }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("radiology.modality")} *</Label>
                  <Select value={form.modality} onValueChange={v => setForm(p => ({ ...p, modality: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="x-ray">{t("radiology.xray")}</SelectItem>
                      <SelectItem value="ct">{t("radiology.ct")}</SelectItem>
                      <SelectItem value="mri">{t("radiology.mri")}</SelectItem>
                      <SelectItem value="ultrasound">{t("radiology.ultrasound")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>{t("generic.priority")}</Label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">{t("generic.routine")}</SelectItem>
                      <SelectItem value="urgent">{t("generic.urgent")}</SelectItem>
                      <SelectItem value="stat">{t("generic.stat")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label>{t("radiology.studyDesc")} *</Label>
                <Input name="studyDescription" required value={form.studyDescription} onChange={handleChange} placeholder="e.g. Chest X-Ray PA view" />
              </div>
              <div className="space-y-3">
                <Label>{t("appt.dateTime")}</Label>
                <Input name="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={handleChange} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("radiology.orders")}</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("generic.patient")}</TableHead>
                <TableHead>{t("radiology.modality")}</TableHead>
                <TableHead>{t("radiology.studyDesc")}</TableHead>
                <TableHead>{t("generic.priority")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className="text-end">{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : orders && orders.length > 0 ? (
                orders.map((order: RadiologyOrder) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/patients/${order.patientId}`); }}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {order.patientName ?? order.patientId}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase font-mono text-xs">{order.modality}</Badge>
                    </TableCell>
                    <TableCell>{order.studyDescription}</TableCell>
                    <TableCell>
                      <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'secondary'}>
                        {order.priority === "stat" ? t("generic.stat") : order.priority === "urgent" ? t("generic.urgent") : t("generic.routine")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === "reported" ? "default" : "outline"}>
                        {order.status === "reported" ? t("radiology.statusReported") : t("radiology.statusPending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {order.status === "reported" && (
                          <RadiologyReportViewDialog order={order as RadiologyOrderForReport} />
                        )}
                        {order.status !== "reported" && canReport && (
                          <EnterRadiologyReportDialog
                            orderId={order.id}
                            studyDescription={order.studyDescription}
                            onSuccess={refreshOrders}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{t("radiology.noOrders")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrder && (
        <RadiologyReportViewDialog
          order={selectedOrder as RadiologyOrderForReport}
          open={true}
          onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}
        />
      )}
    </div>
  );
}
