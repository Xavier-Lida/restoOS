import { DishMarketCompareSection } from "@/components/dashboard/dish-market-compare-section";
import { DishSalesChartSection } from "@/components/dashboard/dish-sales-chart-section";
import { SalesAnalyticsSection } from "@/components/dashboard/sales-analytics-section";
import {
  StatsFooter,
  StatsPageHeader,
  StatsPageShell,
} from "@/components/dashboard/stats-premium-ui";
import type { RevenueRange } from "@/lib/pos/daily-sales";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

const validRanges: ReadonlyArray<RevenueRange> = ["7d", "30d", "90d"];

function resolveRange(raw: string | string[] | undefined): RevenueRange {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return validRanges.includes(candidate as RevenueRange) ? (candidate as RevenueRange) : "30d";
}

function resolveParam(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

type StatsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardStatsPage({ searchParams }: { searchParams: StatsSearchParams }) {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const params = await searchParams;
  const range = resolveRange(params.range);
  const dishId = resolveParam(params.dish);
  const compareMode = resolveParam(params.compare);
  const compareDishId = resolveParam(params.compareDish);

  const urlParams: Record<string, string | undefined> = {
    range,
    dish: dishId,
    compare: compareMode,
    compareDish: compareDishId,
  };

  const salesSection = await SalesAnalyticsSection({ range, urlParams });

  const hasMenu = snapshot.menuItems.length > 0;
  const restaurantName = snapshot.onboarding.restaurant_name ?? "—";

  return (
    <StatsPageShell>
      <StatsPageHeader ownerName={snapshot.onboarding.owner_name ?? "vous"} kicker="Tableau de bord" />

      {salesSection}

      {hasMenu ? (
        <DishSalesChartSection
          userId={user.id}
          menuItems={snapshot.menuItems}
          dishId={dishId}
          compareMode={compareMode}
          compareDishId={compareDishId}
          urlParams={urlParams}
        />
      ) : null}

      {hasMenu ? (
        <DishMarketCompareSection
          userId={user.id}
          menuItems={snapshot.menuItems}
          dishId={dishId}
          urlParams={urlParams}
        />
      ) : null}

      <StatsFooter restaurantName={restaurantName} />
    </StatsPageShell>
  );
}
