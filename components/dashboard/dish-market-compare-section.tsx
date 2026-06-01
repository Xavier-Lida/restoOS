import "server-only";

import type { MenuItemRecord } from "@/lib/onboarding/types";
import { loadLatestMarketMenuItems } from "@/lib/market/load-latest-market-items";
import { loadPricingF2Insights } from "@/lib/dashboard/pricing-engine/f2-spm-insights";

import {
  DishMarketCompareClient,
  type ScrapeCompetitorRow,
} from "@/components/dashboard/dish-market-compare.client";

const MARKET_INSIGHTS_RANGE = "30d" as const;

type DishMarketCompareSectionProps = {
  userId: string;
  menuItems: MenuItemRecord[];
  dishId?: string;
  urlParams: Record<string, string | undefined>;
};

export async function DishMarketCompareSection({
  userId,
  menuItems,
  dishId,
  urlParams,
}: DishMarketCompareSectionProps) {
  const [insights, marketItems] = await Promise.all([
    loadPricingF2Insights({ userId, menuItems, range: MARKET_INSIGHTS_RANGE }),
    loadLatestMarketMenuItems(),
  ]);

  const competitorItems: ScrapeCompetitorRow[] = marketItems.map((r) => ({
    item_name: r.item_name,
    category: r.category,
    price_cad: r.price_cad,
  }));

  const selectedDishId =
    dishId && menuItems.some((m) => m.id === dishId) ? dishId : (menuItems[0]?.id ?? "");

  return (
    <DishMarketCompareClient
      menuItems={menuItems.map((m) => ({ id: m.id, item_name: m.item_name }))}
      dishes={insights.dishes}
      competitorItems={competitorItems}
      initialDishId={selectedDishId}
      modeCompetitors={competitorItems.length > 0 ? "ok" : "missing"}
      urlParams={urlParams}
    />
  );
}
