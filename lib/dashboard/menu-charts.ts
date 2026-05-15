import "server-only";

import type { MenuCategoryChartPoint } from "@/lib/schemas/chart-inputs";
import type { MenuItemRecord } from "@/lib/onboarding/types";

export function buildMenuCategoryChartPoints(items: MenuItemRecord[]): MenuCategoryChartPoint[] {
  const map = new Map<string, number[]>();
  for (const item of items) {
    const cat = item.category?.trim() || "Autres";
    const arr = map.get(cat) ?? [];
    arr.push(Number(item.price_cad));
    map.set(cat, arr);
  }
  return [...map.entries()]
    .map(([category, prices]) => ({
      category,
      itemCount: prices.length,
      avgPriceCad: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPriceCad: Math.min(...prices),
      maxPriceCad: Math.max(...prices),
    }))
    .sort((a, b) => b.itemCount - a.itemCount);
}
