import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Vaccinations() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.vaccinations")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vaccination Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Select a patient to view their vaccination history.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
