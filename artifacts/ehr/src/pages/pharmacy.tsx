import { useState } from "react";
import { useListDrugs } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";

export default function Pharmacy() {
  const { t, isRtl } = useTranslation();
  const { data: drugs, isLoading } = useListDrugs();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.pharmacy")}</h1>
        <Button>
          <Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {t("pharmacy.newDrug")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pharmacy.inventory")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.name")}</TableHead>
                <TableHead>{t("generic.category")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : drugs && drugs.length > 0 ? (
                drugs.map((drug) => (
                  <TableRow key={drug.id}>
                    <TableCell className="font-medium">
                      <div>{drug.name}</div>
                      <div className="text-xs text-muted-foreground">{drug.genericName}</div>
                    </TableCell>
                    <TableCell>{drug.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {drug.stockQuantity} {drug.unit}
                        {drug.stockQuantity <= (drug.minStockLevel || 0) && (
                          <Badge variant="destructive">{t("pharmacy.lowStock")}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}>
                      <Button variant="ghost" size="sm">{t("generic.edit")}</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {t("pharmacy.noInventory")}
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
