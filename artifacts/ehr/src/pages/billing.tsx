import { useState } from "react";
import { useListInvoices, useCreateInvoice, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Billing() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: invoices, isLoading } = useListInvoices({});
  const createMutation = useCreateInvoice();

  const [form, setForm] = useState({ patientId: "", paymentMethod: "cash", notes: "", itemDescription: "", itemQty: "1", itemUnitPrice: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(form.itemQty) || 1;
    const price = Number(form.itemUnitPrice) || 0;
    const total = qty * price;
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), paymentMethod: form.paymentMethod, notes: form.notes || undefined, items: [{ description: form.itemDescription, quantity: qty, unitPrice: price, total }] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", paymentMethod: "cash", notes: "", itemDescription: "", itemQty: "1", itemUnitPrice: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.billing")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("billing.newInvoice")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("billing.newInvoice")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("billing.patientId")} *</Label>
                  <Input name="patientId" type="number" required value={form.patientId} onChange={handleChange} placeholder="e.g. 1" />
                </div>
                <div className="space-y-2">
                  <Label>{t("billing.paymentMethod")} *</Label>
                  <Select value={form.paymentMethod} onValueChange={v => setForm(p => ({ ...p, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("billing.selectPayment")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t("billing.cash")}</SelectItem>
                      <SelectItem value="card">{t("billing.card")}</SelectItem>
                      <SelectItem value="insurance">{t("billing.insurance")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 border rounded-md p-3">
                <p className="text-sm font-medium">{t("billing.itemDescription")}</p>
                <Input name="itemDescription" required value={form.itemDescription} onChange={handleChange} placeholder="e.g. Consultation fee" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("generic.quantity")}</Label>
                    <Input name="itemQty" type="number" min="1" value={form.itemQty} onChange={handleChange} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("billing.unitPrice")}</Label>
                    <Input name="itemUnitPrice" type="number" step="0.01" required value={form.itemUnitPrice} onChange={handleChange} placeholder="0.00" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("generic.notes")}</Label>
                <Textarea name="notes" value={form.notes} onChange={handleChange} className="min-h-[60px]" />
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
        <CardHeader><CardTitle>{t("billing.invoices")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("billing.patient")}</TableHead>
                <TableHead>{t("billing.method")}</TableHead>
                <TableHead>{t("billing.amount")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : invoices && invoices.length > 0 ? (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{inv.patientName ?? inv.patientId}</TableCell>
                    <TableCell className="capitalize">{inv.paymentMethod}</TableCell>
                    <TableCell className="font-medium">${inv.totalAmount.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge></TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}><Button variant="ghost" size="sm">{t("generic.view")}</Button></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("billing.noInvoices")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
