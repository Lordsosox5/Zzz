import { useState } from "react";
import { useListDrugs } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";

export default function Pharmacy() {
  const { t } = useTranslation();
  const { data: drugs, isLoading } = useListDrugs();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.pharmacy")}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("generic.new")} Drug
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drug Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No drugs found in inventory.
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
