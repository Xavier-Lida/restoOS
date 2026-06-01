import "server-only";

import { createClient } from "@/lib/supabase/server";
import { posItemMatchesMenuName } from "@/lib/square/item-name";
import { getRestaurantIdForUser } from "@/lib/restaurant/resolve";
import { isMissingPosSalesItemsDailyMessage } from "@/lib/pos/table-errors";
import type { RevenueRange } from "@/lib/square/dashboard";

export type DishDailyPoint = {
  day: string;
  quantity: number;
};

export type DishSalesSeriesBundle = {
  current: DishDailyPoint[];
  previous: DishDailyPoint[];
  hasItemSales: boolean;
};

const rangeToDays: Record<RevenueRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function enumerateDays(fromIso: string, toIso: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${fromIso}T12:00:00`);
  const end = new Date(`${toIso}T12:00:00`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function aggregateQuantityByDay(
  rows: Array<{ sale_date: string; pos_item_key: string; pos_item_name: string; quantity: number }>,
  menuItemName: string,
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const label = row.pos_item_name || row.pos_item_key;
    if (!posItemMatchesMenuName(label, menuItemName)) {
      continue;
    }
    const day = row.sale_date;
    byDay.set(day, (byDay.get(day) ?? 0) + row.quantity);
  }
  return byDay;
}

function fillSeries(days: string[], byDay: Map<string, number>): DishDailyPoint[] {
  return days.map((day) => ({ day, quantity: byDay.get(day) ?? 0 }));
}

export async function loadDishSalesSeriesBundle(args: {
  userId: string;
  range: RevenueRange;
  menuItemName: string;
}): Promise<DishSalesSeriesBundle> {
  const { userId, range, menuItemName } = args;
  const days = rangeToDays[range];
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

  const currentFrom = periodStart.toISOString().slice(0, 10);
  const currentTo = periodEnd.toISOString().slice(0, 10);
  const previousFrom = prevStart.toISOString().slice(0, 10);
  const previousTo = prevEnd.toISOString().slice(0, 10);

  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();

  let rows: Array<{
    sale_date: string;
    pos_item_key: string;
    pos_item_name: string;
    quantity: number;
  }> = [];

  try {
    const { data, error } = await supabase
      .from("pos_sales_items_daily")
      .select("sale_date, pos_item_key, pos_item_name, quantity")
      .eq("restaurant_id", restaurantId)
      .gte("sale_date", previousFrom)
      .lte("sale_date", currentTo);

    if (error) {
      if (isMissingPosSalesItemsDailyMessage(error.message ?? "")) {
        return { current: [], previous: [], hasItemSales: false };
      }
      throw new Error(`Read pos_sales_items_daily failed: ${error.message}`);
    }

    rows = (data ?? []).map((r) => ({
      sale_date: String(r.sale_date ?? ""),
      pos_item_key: String(r.pos_item_key ?? ""),
      pos_item_name: String(r.pos_item_name ?? ""),
      quantity: Number(r.quantity ?? 0),
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (isMissingPosSalesItemsDailyMessage(msg)) {
      return { current: [], previous: [], hasItemSales: false };
    }
    throw e;
  }

  const hasItemSales = rows.length > 0;
  const currentDays = enumerateDays(currentFrom, currentTo);
  const lastPrevDay = new Date(`${currentFrom}T12:00:00`);
  lastPrevDay.setUTCDate(lastPrevDay.getUTCDate() - 1);
  const previousToInclusive = lastPrevDay.toISOString().slice(0, 10);
  const previousDays = enumerateDays(previousFrom, previousToInclusive);

  const currentRows = rows.filter((r) => r.sale_date >= currentFrom && r.sale_date <= currentTo);
  const previousRows = rows.filter((r) => r.sale_date >= previousFrom && r.sale_date < currentFrom);

  const currentByDay = aggregateQuantityByDay(currentRows, menuItemName);
  const previousByDay = aggregateQuantityByDay(previousRows, menuItemName);

  return {
    current: fillSeries(currentDays, currentByDay),
    previous: fillSeries(previousDays, previousByDay),
    hasItemSales,
  };
}

export async function loadDishSalesSeriesForMenuItems(args: {
  userId: string;
  range: RevenueRange;
  items: Array<{ id: string; item_name: string }>;
}): Promise<Map<string, DishSalesSeriesBundle>> {
  const out = new Map<string, DishSalesSeriesBundle>();
  await Promise.all(
    args.items.map(async (item) => {
      const bundle = await loadDishSalesSeriesBundle({
        userId: args.userId,
        range: args.range,
        menuItemName: item.item_name,
      });
      out.set(item.id, bundle);
    }),
  );
  return out;
}
