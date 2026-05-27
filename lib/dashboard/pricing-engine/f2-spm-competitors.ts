import "server-only";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

  let runItems: Array<{ category: string; price_cad: number | null }> = [];
  try {
    const { data: runRow } = await supabase
      .from("scrape_runs")
      .select("id")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runRow?.id) {
      const { data: items } = await supabase
        .from("scrape_run_items")
        .select("category, price_cad")
        .eq("run_id", runRow.id);
      runItems = (items ?? []).map((r) => ({
        category: String(r.category ?? "Autre").trim() || "Autre",
        price_cad: r.price_cad != null ? Number(r.price_cad) : null,
      }));
    }
  } catch {
    runItems = [];
  }

  const byCategory = new Map<string, number[]>();
  for (const item of runItems) {
    if (item.price_cad == null || !Number.isFinite(item.price_cad)) continue;
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item.price_cad);
    byCategory.set(item.category, bucket);
  }

  const rows: SpmCompetitorRow[] = [...byCategory.entries()]
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
