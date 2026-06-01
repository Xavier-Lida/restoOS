import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getRestaurantIdForUser } from "@/lib/restaurant/resolve";
import {
  mapPosQuantitiesToMenu,
  saleDateFromDaysAgo,
  SALES_WINDOW_DAYS,
} from "@/lib/square/menu-item-quantity";
import { isMissingPosSalesItemsDailyMessage } from "@/lib/pos/table-errors";

export { mapPosQuantitiesToMenu, saleDateFromDaysAgo, SALES_WINDOW_DAYS };

export async function loadPosItemQuantitySold30d(userId: string): Promise<Map<string, number>> {
  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();
  const fromDate = saleDateFromDaysAgo(SALES_WINDOW_DAYS);

  const { data, error } = await supabase
    .from("pos_sales_items_daily")
    .select("pos_item_key, quantity")
    .eq("restaurant_id", restaurantId)
    .gte("sale_date", fromDate);

  if (error) {
    if (isMissingPosSalesItemsDailyMessage(error.message ?? "")) {
      return new Map();
    }
    throw new Error(`Read pos_sales_items_daily failed: ${error.message}`);
  }

  const qtyByPosKey = new Map<string, number>();
  for (const row of data ?? []) {
    const key = String(row.pos_item_key ?? "");
    const qty = Number(row.quantity ?? 0);
    if (!key || !Number.isFinite(qty)) {
      continue;
    }
    qtyByPosKey.set(key, (qtyByPosKey.get(key) ?? 0) + qty);
  }

  return qtyByPosKey;
}

export async function loadMenuItemQuantitySold30d(
  userId: string,
  menuItems: ReadonlyArray<{ id: string; item_name: string }>,
): Promise<Map<string, number>> {
  const qtyByPosKey = await loadPosItemQuantitySold30d(userId);
  return mapPosQuantitiesToMenu(menuItems, qtyByPosKey);
}

export async function hasPosItemSalesInLast30d(userId: string): Promise<boolean> {
  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();
  const fromDate = saleDateFromDaysAgo(SALES_WINDOW_DAYS);

  try {
    const { count, error } = await supabase
      .from("pos_sale_lines")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .gte("sale_date", fromDate);

    if (error) {
      if (isMissingPosSalesItemsDailyMessage(error.message ?? "")) {
        return false;
      }
      throw new Error(`Read pos_sale_lines count failed: ${error.message}`);
    }
    return (count ?? 0) > 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (isMissingPosSalesItemsDailyMessage(msg)) {
      return false;
    }
    throw e;
  }
}

/** @deprecated */
export const hasSquareItemSalesInLast30d = hasPosItemSalesInLast30d;
