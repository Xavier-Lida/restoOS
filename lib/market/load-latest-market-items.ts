import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MarketMenuItemRow = {
  item_name: string;
  category: string;
  price_cad: number;
  portion_size: string | null;
  protein: string | null;
  diet_tags: string[];
  market_restaurant_name: string;
  city: string | null;
  region: string | null;
  price_tier: string | null;
};

export async function loadLatestMarketMenuItems(): Promise<MarketMenuItemRow[]> {
  const supabase = await createClient();

  try {
    const { data: runRow } = await supabase
      .from("scrape_runs")
      .select("id")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!runRow?.id) {
      return [];
    }

    const { data: snapshot } = await supabase
      .from("market_menu_snapshots")
      .select("id, market_restaurant_id")
      .eq("scrape_run_id", runRow.id)
      .maybeSingle();

    if (!snapshot?.id) {
      return [];
    }

    const { data: restaurant } = await supabase
      .from("market_restaurants")
      .select("display_name, city, region, price_tier")
      .eq("id", snapshot.market_restaurant_id)
      .maybeSingle();

    const { data: items } = await supabase
      .from("market_menu_items")
      .select(
        "item_name, category, price_cad, portion_size, protein, diet_tags",
      )
      .eq("snapshot_id", snapshot.id)
      .order("position", { ascending: true });

    const restaurantName = String(restaurant?.display_name ?? "Concurrent");

    return (items ?? [])
      .map((r) => ({
        item_name: String(r.item_name ?? "").trim(),
        category: String(r.category ?? "Autre").trim() || "Autre",
        price_cad: r.price_cad != null ? Number(r.price_cad) : NaN,
        portion_size: (r.portion_size as string | null) ?? null,
        protein: (r.protein as string | null) ?? null,
        diet_tags: Array.isArray(r.diet_tags) ? (r.diet_tags as string[]) : [],
        market_restaurant_name: restaurantName,
        city: (restaurant?.city as string | null) ?? null,
        region: (restaurant?.region as string | null) ?? null,
        price_tier: (restaurant?.price_tier as string | null) ?? null,
      }))
      .filter((r) => r.item_name.length > 0 && Number.isFinite(r.price_cad));
  } catch {
    return [];
  }
}
