import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MenuItemRecord } from "@/lib/onboarding/types";
import { loadLatestMarketMenuItems } from "@/lib/market/load-latest-market-items";
import { loadPricingF0F1Insights } from "@/lib/dashboard/pricing-engine/f0f1-insights";
import type { RevenueRange } from "@/lib/square/dashboard";

import type { PricingF0F1DishPoint } from "@/lib/dashboard/pricing-engine/f0f1-insights";
import { posItemMatchesMenuName } from "@/lib/square/item-name";

export type SpmVerdict = "trop_bas" | "zone_optimal" | "hors_marche";

export function spmVerdict(spmPct: number): SpmVerdict {
  if (spmPct < -15) return "trop_bas";
  if (spmPct <= 10) return "zone_optimal";
  return "hors_marche";
}

export type PricingF2DishPoint = PricingF0F1DishPoint & {
  ref_marche_cad: number | null;
  spm_pct: number | null;
  competitorCount: number;
  spm_verdict: SpmVerdict | null;
  spm_reco: string;
};

export type PricingF2Insights = {
  range: RevenueRange;
  modeCompetitors: "ok" | "missing";
  competitorRunCompletedAt: string | null;
  dishes: PricingF2DishPoint[];
};

function kappaFromCompetitorCategory(category: string): number {
  const c = category.trim().toLowerCase();
  if (/gastro|gastronom/i.test(c)) return 1.4;
  if (/bistro|bistronom/i.test(c)) return 1.15;
  if (/rapide|fast/i.test(c)) return 0.75;
  return 1.0;
}

export async function loadPricingF2Insights(args: { userId: string; menuItems: MenuItemRecord[]; range: RevenueRange }) {
  const { userId, menuItems, range } = args;

  const base = await loadPricingF0F1Insights({ userId, menuItems, range });

  // Si on n'a pas d'info concurrents, on garde les calculs F0/F1 seuls.
  const supabase = await createClient();

  type LatestRunRow = { id: string; completed_at: string | null } | null;
  let latestRun: LatestRunRow = null;
  let runItems: Array<{ item_name: string; category: string; price_cad: number | null }> = [];

  try {
    const { data: runRow, error } = await supabase
      .from("scrape_runs")
      .select("id, completed_at")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    latestRun = (runRow ?? null) as LatestRunRow;
  } catch {
    latestRun = null;
  }

  const marketItems = await loadLatestMarketMenuItems();
  runItems = marketItems.map((r) => ({
    item_name: r.item_name,
    category: r.category,
    price_cad: r.price_cad,
  }));

  const dishes: PricingF2DishPoint[] = base.dishes.map((dish) => {
    const matches = runItems
      .filter((r) => r.price_cad != null && posItemMatchesMenuName(r.item_name, dish.item_name))
      .map((r) => ({
        price: r.price_cad as number,
        kappa: kappaFromCompetitorCategory(r.category),
      }));

    if (matches.length === 0) {
      return {
        ...dish,
        ref_marche_cad: null,
        spm_pct: null,
        competitorCount: 0,
        spm_verdict: null,
        spm_reco: "Pas assez de données...",
        confidence: "incomplet",
      };
    }

    const num = matches.reduce((acc, m) => acc + m.price * m.kappa, 0);
    const den = matches.reduce((acc, m) => acc + m.kappa, 0);
    const ref_marche_cad = den > 0 ? num / den : null;

    if (!ref_marche_cad || !Number.isFinite(ref_marche_cad) || ref_marche_cad <= 0) {
      return {
        ...dish,
        ref_marche_cad: null,
        spm_pct: null,
        competitorCount: matches.length,
        spm_verdict: null,
        spm_reco: "Référence marché inexploitée (SPM indisponible).",
        confidence: "incomplet",
      };
    }

    const spm_pct = ((dish.price_ttc_cad - ref_marche_cad) / ref_marche_cad) * 100;
    const verdict = spmVerdict(spm_pct);

    const spm_reco =
      verdict === "trop_bas"
        ? "Vous êtes sous le marché : hausse recommandée selon le profil."
        : verdict === "zone_optimal"
          ? "Positionnement optimal : maintenez le prix."
          : "Vous êtes au-dessus du marché : analyser l'impact avant hausse.";

    return {
      ...dish,
      ref_marche_cad,
      spm_pct,
      competitorCount: matches.length,
      spm_verdict: verdict,
      spm_reco,
      confidence: "complet",
    };
  });

  return {
    range,
    modeCompetitors: latestRun ? "ok" : "missing",
    competitorRunCompletedAt: latestRun?.completed_at ?? null,
    dishes,
  } satisfies PricingF2Insights;
}

