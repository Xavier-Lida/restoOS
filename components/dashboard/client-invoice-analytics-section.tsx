import Link from "next/link";
import type { ReactNode } from "react";
import { FileTextIcon } from "lucide-react";

import { ClientInvoiceChartsClient } from "@/components/dashboard/client-invoice-charts.client";
import { Button } from "@/components/ui/button";
import { hasClientInvoices, loadClientInvoiceChartBundle } from "@/lib/dashboard/client-invoice-charts";
import type { RevenueRange } from "@/lib/square/dashboard";

type ClientInvoiceAnalyticsSectionProps = {
  userId: string;
  range: RevenueRange;
};

export async function ClientInvoiceAnalyticsSection({
  userId,
  range,
}: ClientInvoiceAnalyticsSectionProps): Promise<ReactNode> {
  const has = await hasClientInvoices(userId);
  if (!has) {
    return (
      <section className="flex flex-col gap-4 rounded-lg border border-dashed border-primary/20 bg-card p-6 text-card-foreground">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileTextIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Factures clients pour le CA B2B</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Importe des factures PDF ou images : après analyse, les graphiques CA par jour, par client et par ligne
              apparaissent ici.
            </p>
            <div className="pt-2">
              <Button asChild>
                <Link href="/dashboard/integrations/client-invoices">Importer des factures</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const bundle = await loadClientInvoiceChartBundle(userId, range);
  return <ClientInvoiceChartsClient bundle={bundle} selectedRange={range} />;
}
