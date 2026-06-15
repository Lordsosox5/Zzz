import { useState } from "react";
import { useListLabOrders, useCreateLabOrder, useUpdateLabOrder, getListLabOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canEnterLabResults, isLabRole } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Save, FlaskConical, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function EnterResultDialog({ orderId, testName, onSuccess }: { orderId: number; testName: string; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const updateMutation = useUpdateLabOrder();

  const [form, setForm] = useState({
    result: "normal",
    resultValue: "",
    unit: "",
    referenceRange: "",
    isCritical: false,
    resultedAt: new Date().toISOString().slice(0, 16),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: orderId,
        data: {
          status: "resulted",
          result: form.result,
          resultValue: form.resultValue || undefined,
          unit: form.unit || undefined,
          referenceRange: form.referenceRange || undefined,
          isCritical: form.isCritical,
          resultedAt: form.resultedAt ? new Date(form.resultedAt).toISOString() : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setOpen(false);
          onSuccess();
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap">
          <FlaskConical className="h-3 w-3" /> {t("lab.enterResult")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("lab.enterResult")}: {testName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("generic.result")} *</Label>
            <Select value={form.result} onValueChange={v => setForm(p => ({ ...p, result: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">{t("lab.normal")}</SelectItem>
                <SelectItem value="abnormal">{t("lab.abnormal")}</SelectItem>
                <SelectItem value="critical">{t("lab.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("lab.resultValue")}</Label>
              <Input value={form.resultValue} onChange={e => setForm(p => ({ ...p, resultValue: e.target.value }))} placeholder="e.g. 7.4" />
            </div>
            <div className="space-y-2">
              <Label>{t("lab.unit")}</Label>
              <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. mmol/L" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("lab.referenceRange")}</Label>
            <Input value={form.referenceRange} onChange={e => setForm(p => ({ ...p, referenceRange: e.target.value }))} placeholder="e.g. 3.5 - 5.5 mmol/L" />
          </div>
          <div className="space-y-2">
            <Label>{t("lab.resultedAt")}</Label>
            <Input type="datetime-local" value={form.resultedAt} onChange={e => setForm(p => ({ ...p, resultedAt: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
            <Checkbox
              id="critical-lab"
              checked={form.isCritical}
              onCheckedChange={v => setForm(p => ({ ...p, isCritical: !!v }))}
            />
            <label htmlFor="critical-lab" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              {t("lab.isCritical")}
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("generic.cancel")}</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
              {t("lab.updateResult")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MarkCollectedButton({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateMutation = useUpdateLabOrder();

  const handle = () => {
    updateMutation.mutate(
      { id: orderId, data: { status: "collected", collectedAt: new Date().toISOString() } },
      {
        onSuccess: () => { toast({ title: t("generic.success"), description: t("lab.markCollected") }); onSuccess(); },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <Button size="sm" variant="secondary" onClick={handle} disabled={updateMutation.isPending} className="whitespace-nowrap">
      {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t("lab.markCollected")}
    </Button>
  );
}

export default function Lab() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const isLabTech = isLabRole(user?.role ?? "");
  const canEnter = canEnterLabResults(user?.role ?? "");

  const [statusFilter, setStatusFilter] = useState<string>(isLabTech ? "pending" : "all");
  const [isOpen, setIsOpen] = useState(false);
  const { data: orders, isLoading } = useListLabOrders(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );
  const createMutation = useCreateLabOrder();

  const [form, setForm] = useState({ patientId: "", testName: "", testCode: "", priority: "routine", notes: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), testName: form.testName, testCode: form.testCode || undefined, priority: form.priority || undefined, notes: form.notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLabOrdersQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", testName: "", testCode: "", priority: "routine", notes: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: getListLabOrdersQueryKey() });

  const pendingCount = orders?.filter(o => o.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.lab")}</h1>
          {isLabTech && (
            <p className="text-muted-foreground mt-1">{t("lab.queueDesc")}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("lab.allOrders")}</SelectItem>
              <SelectItem value="pending">{t("lab.pendingOnly")}</SelectItem>
              <SelectItem value="collected">{t("lab.collected")}</SelectItem>
              <SelectItem value="resulted">{t("lab.resulted")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Only non-lab-tech roles can create new orders */}
          {!isLabTech && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button><Plus className={`${isRtl ? 'ms-2' : 'me-2'} h-4 w-4`} />{t("lab.newOrder")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{t("lab.newOrder")}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>{t("generic.patientId")} *</Label>
                    <Input name="patientId" type="number" required value={form.patientId} onChange={handleChange} placeholder="e.g. 1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("lab.testName")} *</Label>
                      <Input name="testName" required value={form.testName} onChange={handleChange} placeholder="e.g. CBC" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("lab.testCode")}</Label>
                      <Input name="testCode" value={form.testCode} onChange={handleChange} placeholder="e.g. CBC-001" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("generic.priority")}</Label>
                    <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("generic.selectPriority")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">{t("generic.routine")}</SelectItem>
                        <SelectItem value="urgent">{t("generic.urgent")}</SelectItem>
                        <SelectItem value="stat">{t("generic.stat")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("generic.notes")}</Label>
                    <Textarea name="notes" value={form.notes} onChange={handleChange} className="min-h-[80px]" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                      {t("generic.save")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary for lab tech */}
      {isLabTech && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10 text-amber-600">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("lab.pendingOnly")}</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10 text-green-600">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("lab.resulted")}</p>
                <p className="text-2xl font-bold">{orders?.filter(o => o.status === "resulted").length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10 text-blue-600">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("lab.collected")}</p>
                <p className="text-2xl font-bold">{orders?.filter(o => o.status === "collected").length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isLabTech ? t("lab.queue") : t("lab.pendingOrders")}</CardTitle>
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
                <TableHead>{t("generic.result")}</TableHead>
                {(canEnter || isLabTech) && <TableHead className="text-end">{t("generic.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canEnter || isLabTech ? 7 : 6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id} className={order.isCritical ? "bg-destructive/5" : undefined}>
                    <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{order.patientName ?? `#${order.patientId}`}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.testName}</span>
                        {order.isCritical && (
                          <Badge variant="destructive" className="text-xs">⚠ {t("lab.critical")}</Badge>
                        )}
                      </div>
                      {order.testCode && <div className="text-xs text-muted-foreground font-mono">{order.testCode}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'secondary'} className="capitalize">
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'resulted' ? 'default' : order.status === 'collected' ? 'secondary' : 'outline'}>
                        {order.status === 'resulted' ? t("lab.resulted") : order.status === 'collected' ? t("lab.collected") : t("lab.pending")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.result ? (
                        <span className={`font-medium capitalize text-sm ${order.result === 'critical' ? 'text-destructive' : order.result === 'abnormal' ? 'text-orange-600' : 'text-green-600'}`}>
                          {order.result}
                          {order.resultValue && <span className="font-mono ms-1">({order.resultValue}{order.unit ? ` ${order.unit}` : ''})</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">–</span>
                      )}
                    </TableCell>
                    {(canEnter || isLabTech) && (
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === "pending" && isLabTech && (
                            <MarkCollectedButton orderId={order.id} onSuccess={refreshOrders} />
                          )}
                          {order.status !== "resulted" && canEnter && (
                            <EnterResultDialog orderId={order.id} testName={order.testName} onSuccess={refreshOrders} />
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEnter || isLabTech ? 7 : 6} className="h-24 text-center text-muted-foreground">
                    {t("lab.noOrders")}
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
