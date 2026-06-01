import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3Icon } from "lucide-react";

import { RoiCard } from "@/components/dashboard/roi-card";
import { SquareRevenueCard } from "@/components/dashboard/square-revenue-card";
import { Button } from "@/components/ui/button";
import { loadAcceptedSuggestionsGain } from "@/lib/dashboard/pricing-suggestions-stats";
import { getRestoprixSubscriptionCad } from "@/lib/dashboard/subscription-cad";
import {
  computePeriodDelta,
  hasSquareReports,
  loadSquareDailyRevenue,
  loadSquareDailyRevenuePrevious,
  summarizeSquareRevenue,
  type RevenueRange,
} from "@/lib/square/dashboard";

type SquareAnalyticsProps = {
  userId: string;
  range: RevenueRange;
};

export async function SquareAnalyticsSection({ userId, range }: SquareAnalyticsProps): Promise<ReactNode> {
  const hasReports = await hasSquareReports(userId);
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

  const [points, previousPoints, suggestions] = await Promise.all([
    loadSquareDailyRevenue(userId, range),
    loadSquareDailyRevenuePrevious(userId, range),
    loadAcceptedSuggestionsGain(userId),
  ]);
  const summary = summarizeSquareRevenue(points);
  const previousSummary = summarizeSquareRevenue(previousPoints);
  const subscriptionCad = getRestoprixSubscriptionCad();

  const deltas = {
    netSales: computePeriodDelta(summary.totalNetSales, previousSummary.totalNetSales),
    avgDaily: computePeriodDelta(summary.averageDailyNet, previousSummary.averageDailyNet),
    transactions: computePeriodDelta(summary.totalTransactions, previousSummary.totalTransactions),
    taxes: computePeriodDelta(summary.totalTaxes, previousSummary.totalTaxes),
  };

  return (
    <div className="flex flex-col gap-10">
      <SquareRevenueCard
        data={points}
        summary={summary}
        selectedRange={range}
        deltas={deltas}
      />
      <RoiCard
        monthlyGainCad={suggestions.totalMonthlyGainCad}
        acceptedCount={suggestions.acceptedCount}
        subscriptionCad={subscriptionCad}
      />
    </div>
  );
}
