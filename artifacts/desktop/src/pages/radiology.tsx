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

/* ── Enter Radiology Report Dialog ── */
function EnterRadiologyReportDialog({ orderId, studyDescription, onSuccess }: { orderId: number; studyDescription: string; onSuccess: () => void }) {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const updateMutation = useUpdateRadiologyOrder();
  const [form, setForm] = useState({ report: "", completedAt: new Date().toISOString().slice(0, 16) });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.report.trim()) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.requiredField") });
      return;
    }
    updateMutation.mutate(
      { id: orderId, data: { status: "reported", report: form.report, completedAt: new Date(form.completedAt).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setOpen(false);
          setForm({ report: "", completedAt: new Date().toISOString().slice(0, 16) });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("radiology.reportTitle")}: {studyDescription}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-3">
            <Label>{t("radiology.reportText")} *</Label>
            <Textarea
              required
              value={form.report}
              onChange={e => setForm(p => ({ ...p, report: e.target.value }))}
              className="min-h-[180px]"
              placeholder={t("radiology.reportPlaceholder")}
            />
          </div>
          <div className="space-y-3">
            <Label>{t("radiology.reportedAt")}</Label>
            <Input type="datetime-local" value={form.completedAt} onChange={e => setForm(p => ({ ...p, completedAt: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />}
              {t("generic.save")}
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
