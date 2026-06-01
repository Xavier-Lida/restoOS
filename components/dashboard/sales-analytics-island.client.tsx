"use client";

import { useCallback, useState, useTransition } from "react";

import {
  fetchSalesOverviewAction,
  type SalesOverviewPayload,
} from "@/app/dashboard/stats/actions";
import { RoiCard } from "@/components/dashboard/roi-card";
import { SalesOverviewCard } from "@/components/dashboard/sales-overview-card";
import { syncStatsUrl } from "@/lib/dashboard/sync-stats-url";
import type { RevenueRange } from "@/lib/square/dashboard";

type SalesAnalyticsIslandProps = {
  initialRange: RevenueRange;
  initialPayload: SalesOverviewPayload;
  urlParams: Record<string, string | undefined>;
};

export function SalesAnalyticsIsland({
  initialRange,
  initialPayload,
  urlParams,
}: SalesAnalyticsIslandProps) {
  const [range, setRange] = useState(initialRange);
  const [payload, setPayload] = useState(initialPayload);
  const [pending, startTransition] = useTransition();

  const handleRangeChange = useCallback(
    (nextRange: RevenueRange) => {
      if (nextRange === range) return;
      setRange(nextRange);
      syncStatsUrl({ ...urlParams, range: nextRange });
      startTransition(async () => {
        const next = await fetchSalesOverviewAction(nextRange);
        setPayload(next);
      });
    },
    [range, urlParams],
  );

  return (
    <div className="flex flex-col gap-10">
      <SalesOverviewCard
        data={payload.points}
        summary={payload.summary}
        selectedRange={range}
        onRangeChange={handleRangeChange}
        rangePending={pending}
      />
      <RoiCard
        restaurantProfitCad={payload.summary.totalNetSales > 0 ? payload.summary.totalNetSales : null}
        monthlyGainCad={payload.suggestions.totalMonthlyGainCad}
        acceptedCount={payload.suggestions.acceptedCount}
        subscriptionCad={payload.subscriptionCad}
      />
    </div>
  );
}
