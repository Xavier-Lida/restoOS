import "server-only";

import { loadLatestMarketMenuItems } from "@/lib/market/load-latest-market-items";

export type SpmCompetitorRow = {
  name: string;
  avgPriceCad: number;
  itemCount: number;
  isSelf: boolean;
};

export async function loadSpmCompetitorRows(args: {
  selfRestaurantName: string;
  selfAvgPriceCad: number;
}): Promise<{ rows: SpmCompetitorRow[]; filledCount: number; totalSlots: number }> {
  const { selfRestaurantName, selfAvgPriceCad } = args;
  const marketItems = await loadLatestMarketMenuItems();

  const byRestaurant = new Map<string, number[]>();
  for (const item of marketItems) {
    if (!Number.isFinite(item.price_cad)) {
      continue;
    }
    const key = item.market_restaurant_name;
    const bucket = byRestaurant.get(key) ?? [];
    bucket.push(item.price_cad);
    byRestaurant.set(key, bucket);
  }

  const rows: SpmCompetitorRow[] = [...byRestaurant.entries()]
    .map(([name, prices]) => ({
      name,
      avgPriceCad: prices.reduce((a, b) => a + b, 0) / prices.length,
      itemCount: prices.length,
      isSelf: false,
    }))
    .sort((a, b) => b.avgPriceCad - a.avgPriceCad);

  const selfRow: SpmCompetitorRow = {
    name: selfRestaurantName,
    avgPriceCad: selfAvgPriceCad,
    itemCount: 0,
    isSelf: true,
  };

  const merged = [...rows, selfRow].sort((a, b) => b.avgPriceCad - a.avgPriceCad);
  const filledCount = rows.length;
  const targetSlots = 9;

  return { rows: merged.slice(0, 8), filledCount, totalSlots: targetSlots };
}
