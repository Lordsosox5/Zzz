import { useState } from "react";
import { useListPrescriptions } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, Loader2 } from "lucide-react";

export default function Prescriptions() {
  const { t } = useTranslation();
  const { data: prescriptions, isLoading } = useListPrescriptions({});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.prescriptions")}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("generic.new")} Prescription
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : prescriptions && prescriptions.length > 0 ? (
                prescriptions.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell>{new Date(rx.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{rx.patientName}</TableCell>
                    <TableCell className="font-medium">{rx.drugName}</TableCell>
                    <TableCell>{rx.dosage} - {rx.frequency}</TableCell>
                    <TableCell>
                      <Badge variant={rx.status === 'active' ? 'default' : 'secondary'}>{rx.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No active prescriptions found.
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
