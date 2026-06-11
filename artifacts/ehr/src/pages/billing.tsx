import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Billing() {
  const { t, isRtl } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.billing")}</h1>
        <Button>
          <Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {t("billing.newInvoice")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("billing.invoices")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t("billing.noInvoices")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
