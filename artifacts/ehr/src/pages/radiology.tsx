import { useState } from "react";
import { useListRadiologyOrders, useCreateRadiologyOrder, getListRadiologyOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Radiology() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: orders, isLoading } = useListRadiologyOrders({});
  const createMutation = useCreateRadiologyOrder();

  const [form, setForm] = useState({ patientId: "", modality: "x-ray", studyDescription: "", priority: "routine", scheduledAt: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), modality: form.modality, studyDescription: form.studyDescription, priority: form.priority || undefined, scheduledAt: form.scheduledAt || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRadiologyOrdersQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", modality: "x-ray", studyDescription: "", priority: "routine", scheduledAt: "" });
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
                <Label>{t("generic.patientId")} *</Label>
                <Input name="patientId" type="number" required value={form.patientId} onChange={handleChange} placeholder="e.g. 1" />
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
                <TableHead>{t("generic.patientId")}</TableHead>
                <TableHead>{t("radiology.modality")}</TableHead>
                <TableHead>{t("radiology.studyDesc")}</TableHead>
                <TableHead>{t("generic.priority")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{order.patientId}</TableCell>
                    <TableCell className="uppercase font-mono text-xs">{order.modality}</TableCell>
                    <TableCell>{order.studyDescription}</TableCell>
                    <TableCell>
                      <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'default' : 'secondary'}>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("radiology.noOrders")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
