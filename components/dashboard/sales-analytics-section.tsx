import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3Icon } from "lucide-react";

import { fetchSalesOverviewAction, hasSquareReportsForUser } from "@/app/dashboard/stats/actions";
import { SalesAnalyticsIsland } from "@/components/dashboard/sales-analytics-island.client";
import { Button } from "@/components/ui/button";
import type { RevenueRange } from "@/lib/square/dashboard";

type SalesAnalyticsSectionProps = {
  range: RevenueRange;
  urlParams: Record<string, string | undefined>;
};

export async function SalesAnalyticsSection({
  range,
  urlParams,
}: SalesAnalyticsSectionProps): Promise<ReactNode> {
  const hasReports = await hasSquareReportsForUser();
  if (!hasReports) {
    return (
      <section className="flex flex-col gap-4 rounded-xl border border-dashed border-primary/20 bg-card p-6 text-card-foreground">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Importe tes ventes pour activer les graphiques</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Upload un CSV de ventes (Square, Lightspeed, Toast, etc.) pour visualiser l&apos;évolution de tes ventes.
            </p>
            <div className="pt-2">
              <Button asChild>
                <Link href="/dashboard/integrations/sales-csv">Importer un CSV</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const initialPayload = await fetchSalesOverviewAction(range);

  return (
    <SalesAnalyticsIsland initialRange={range} initialPayload={initialPayload} urlParams={urlParams} />
  );
}
