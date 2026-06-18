import { useState } from "react";
import { useListDrugs, useCreateDrug, getListDrugsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Pharmacy() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: drugs, isLoading } = useListDrugs();
  const createMutation = useCreateDrug();

  const [form, setForm] = useState({ name: "", genericName: "", category: "", stockQuantity: "", minStockLevel: "", unit: "", unitPrice: "" });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { name: form.name, genericName: form.genericName || undefined, category: form.category, stockQuantity: Number(form.stockQuantity), minStockLevel: form.minStockLevel ? Number(form.minStockLevel) : undefined, unit: form.unit, unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDrugsQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ name: "", genericName: "", category: "", stockQuantity: "", minStockLevel: "", unit: "", unitPrice: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.pharmacy")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("pharmacy.newDrug")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("pharmacy.newDrug")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("pharmacy.drugName")} *</Label>
                  <Input name="name" required value={form.name} onChange={handleChange} />
                </div>
                <div className="space-y-3">
                  <Label>{t("pharmacy.genericName")}</Label>
                  <Input name="genericName" value={form.genericName} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("generic.category")} *</Label>
                  <Input name="category" required value={form.category} onChange={handleChange} placeholder="e.g. Antibiotic" />
                </div>
                <div className="space-y-3">
                  <Label>{t("pharmacy.unit")} *</Label>
                  <Input name="unit" required value={form.unit} onChange={handleChange} placeholder="e.g. tablet" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3">
                  <Label>{t("pharmacy.stockQty")} *</Label>
                  <Input name="stockQuantity" type="number" required value={form.stockQuantity} onChange={handleChange} />
                </div>
                <div className="space-y-3">
                  <Label>{t("pharmacy.minStock")}</Label>
                  <Input name="minStockLevel" type="number" value={form.minStockLevel} onChange={handleChange} />
                </div>
                <div className="space-y-3">
                  <Label>{t("pharmacy.unitPrice")}</Label>
                  <Input name="unitPrice" type="number" step="0.01" value={form.unitPrice} onChange={handleChange} />
                </div>
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
        <CardHeader><CardTitle>{t("pharmacy.inventory")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.name")}</TableHead>
                <TableHead>{t("generic.category")}</TableHead>
                <TableHead>{t("pharmacy.unit")}</TableHead>
                <TableHead>{t("pharmacy.stockQty")}</TableHead>
                <TableHead>{t("pharmacy.unitPrice")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : drugs && drugs.length > 0 ? (
                drugs.map((drug) => (
                  <TableRow key={drug.id}>
                    <TableCell className="font-medium">
                      <div>{drug.name}</div>
                      <div className="text-xs text-muted-foreground">{drug.genericName}</div>
                    </TableCell>
                    <TableCell>{drug.category}</TableCell>
                    <TableCell>{drug.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {drug.stockQuantity}
                        {drug.stockQuantity <= (drug.minStockLevel || 0) && (
                          <Badge variant="destructive">{t("pharmacy.lowStock")}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{drug.unitPrice ? `$${drug.unitPrice.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}><Button variant="ghost" size="sm">{t("generic.edit")}</Button></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("pharmacy.noInventory")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
