import { useState } from "react";
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
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Growth() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: records, isLoading } = useListGrowthRecords({});
  const createMutation = useCreateGrowthRecord();

  const [form, setForm] = useState({ patientId: "", measurementDate: "", weight: "", height: "", headCircumference: "", notes: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), measurementDate: form.measurementDate, weight: form.weight ? Number(form.weight) : undefined, height: form.height ? Number(form.height) : undefined, headCircumference: form.headCircumference ? Number(form.headCircumference) : undefined, notes: form.notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGrowthRecordsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", measurementDate: "", weight: "", height: "", headCircumference: "", notes: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.growth")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("growth.newRecord")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("growth.addRecord")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("generic.patientId")} *</Label>
                  <Input name="patientId" type="number" required value={form.patientId} onChange={handleChange} placeholder="e.g. 1" />
                </div>
                <div className="space-y-3">
                  <Label>{t("growth.measurementDate")} *</Label>
                  <Input name="measurementDate" type="date" required value={form.measurementDate} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <Label>{t("growth.weight")}</Label>
                  <Input name="weight" type="number" step="0.1" value={form.weight} onChange={handleChange} placeholder="kg" />
                </div>
                <div className="space-y-3">
                  <Label>{t("growth.height")}</Label>
                  <Input name="height" type="number" step="0.1" value={form.height} onChange={handleChange} placeholder="cm" />
                </div>
                <div className="space-y-3">
                  <Label>{t("growth.headCirc")}</Label>
                  <Input name="headCircumference" type="number" step="0.1" value={form.headCircumference} onChange={handleChange} placeholder="cm" />
                </div>
              </div>
              <div className="space-y-3">
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
        <CardHeader><CardTitle>{t("growth.charts")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.patientId")}</TableHead>
                <TableHead>{t("growth.date")}</TableHead>
                <TableHead>{t("growth.weight")}</TableHead>
                <TableHead>{t("growth.height")}</TableHead>
                <TableHead>{t("growth.headCirc")}</TableHead>
                <TableHead>{t("growth.bmi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : records && records.length > 0 ? (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.patientId}</TableCell>
                    <TableCell>{r.measurementDate}</TableCell>
                    <TableCell>{r.weight != null ? `${r.weight} kg` : '-'}</TableCell>
                    <TableCell>{r.height != null ? `${r.height} cm` : '-'}</TableCell>
                    <TableCell>{r.headCircumference != null ? `${r.headCircumference} cm` : '-'}</TableCell>
                    <TableCell>{r.bmi != null ? r.bmi.toFixed(1) : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("growth.noRecords")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
