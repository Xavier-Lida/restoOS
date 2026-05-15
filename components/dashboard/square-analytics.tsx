import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3Icon } from "lucide-react";

import { RoiCard } from "@/components/dashboard/roi-card";
import { SquareRevenueCard } from "@/components/dashboard/square-revenue-card";
import { Button } from "@/components/ui/button";
import { loadAcceptedSuggestionsGain } from "@/lib/dashboard/pricing-suggestions-stats";
import { getRestoprixSubscriptionCad } from "@/lib/dashboard/subscription-cad";
import {
  hasSquareReports,
  loadSquareDailyRevenue,
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
      <section className="flex flex-col gap-4 rounded-lg border border-dashed border-primary/20 bg-card p-6 text-card-foreground">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Importe ton rapport Square pour activer les graphiques</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Upload des CSV de récapitulatif des ventes Square pour visualiser l&apos;évolution de tes ventes dans
              la section statistiques.
            </p>
            <div className="pt-2">
              <Button asChild>
                <Link href="/dashboard/integrations/square">Importer un CSV Square</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const [points, suggestions] = await Promise.all([
    loadSquareDailyRevenue(userId, range),
    loadAcceptedSuggestionsGain(userId),
  ]);
  const summary = summarizeSquareRevenue(points);
  const subscriptionCad = getRestoprixSubscriptionCad();

  return (
    <div className="flex flex-col gap-6">
      <SquareRevenueCard data={points} summary={summary} selectedRange={range} />
      <RoiCard
        monthlyGainCad={suggestions.totalMonthlyGainCad}
        acceptedCount={suggestions.acceptedCount}
        subscriptionCad={subscriptionCad}
      />
    </div>
  );
}
