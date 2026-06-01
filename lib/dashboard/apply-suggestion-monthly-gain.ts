import { computeMonthlyGainFromQuantity } from "@/lib/dashboard/pricing-monthly-gain";

export type SuggestionWithPrices = {
  menu_item_id: string;
  current_price_cad: number;
  suggested_price_cad: number;
  estimated_monthly_gain_cad: number | null;
};

export function applyMonthlyGainFromSalesVolume<T extends SuggestionWithPrices>(
  suggestions: T[],
  quantityByMenuItemId: ReadonlyMap<string, number>,
): T[] {
  return suggestions.map((s) => {
    const qty = quantityByMenuItemId.get(s.menu_item_id) ?? 0;
    const delta = s.suggested_price_cad - s.current_price_cad;
    return {
      ...s,
      estimated_monthly_gain_cad: computeMonthlyGainFromQuantity(delta, qty),
    };
  });
}
