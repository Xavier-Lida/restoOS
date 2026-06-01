import "server-only";

import type { MenuItemRecord } from "@/lib/onboarding/types";
import { loadSquareDailyRevenue, type RevenueRange } from "@/lib/square/dashboard";
import { DEFAULT_PRICING_ENGINE, computeFixeByVolume, computeIrr, computeMo, computePrixNet, estimateFoodCostPctByCategory, type PricingEngineDefaults, type IRRResult } from "@/lib/pricing-engine/math";
import { createClient } from "@/lib/supabase/server";

type SquareLoadMode = "ok" | "missing_square" | "error";

export type PricingF0F1DishPoint = {
  menu_item_id: string;
  item_name: string;
  category: string;

  price_ttc_cad: number;
  prix_net_cad: number;
  frais_pos_cad: number;

  food_cost_pct_est: number;
  plat_cost_cad_est: number;

  mo_cad: number;
  fixe_cad: number;

  volume_mois_est: number; // estimation basée sur les transactions Square (allocation proportionnelle au prix)

  irr_pct: number;
  irr_verdict: IRRResult["verdict"];

  confidence: "estimé" | "complet" | "incomplet";
};

export type PricingF0F1Insights = {
  modeSquare: SquareLoadMode;
  range: RevenueRange;
  dishes: PricingF0F1DishPoint[];
  totals: {
    totalFixesMensuel: number;
    totalPlatsVendusMois_est: number;
    avgVolumePlat_est: number;
  };
  engineDefaults: PricingEngineDefaults;
};

const rangeToDays: Record<RevenueRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export async function loadPricingF0F1Insights(args: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
}): Promise<PricingF0F1Insights> {
  const { userId, menuItems, range } = args;

  const supabase = await createClient(); // permet une vérification RLS/table manquante via un petit query optionnel
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = supabase;

  const defaults = DEFAULT_PRICING_ENGINE;

  const days = rangeToDays[range] ?? 30;
  const monthlyFactor = 30 / Math.max(1, days);

  let modeSquare: SquareLoadMode = "ok";
  let transactionsInRange = 0;
  try {
    const points = await loadSquareDailyRevenue(userId, range);
    transactionsInRange = points.reduce((acc, p) => acc + p.transactions, 0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (
      msg.toLowerCase().includes("pos_daily_sales_reports") ||
      msg.toLowerCase().includes("square_sales_reports")
    ) {
      modeSquare = "missing_square";
      transactionsInRange = 0;
    } else {
      modeSquare = "error";
      transactionsInRange = 0;
    }
  }

  const totalPlatsVendusMois_est = transactionsInRange * monthlyFactor;
  const dishCount = Math.max(1, menuItems.length);
  const sumMenuPrices = menuItems.reduce((acc, item) => acc + Number(item.price_cad), 0);
  const avgVolumePlat_est = totalPlatsVendusMois_est / dishCount;

  const mo = computeMo(defaults);

  const confidence: PricingF0F1DishPoint["confidence"] =
    modeSquare === "ok" ? "estimé" : modeSquare === "missing_square" ? "incomplet" : "incomplet";

  const dishes: PricingF0F1DishPoint[] = menuItems.map((item) => {
    const price_ttc_cad = Number(item.price_cad);
    const { fraisPOS, prixNet } = computePrixNet(price_ttc_cad, defaults);

    // F0 (estimé) : PlatCost ≈ PrixNet * foodCostPct (en absence encore de recettes/factures fournisseurs).
    const food_cost_pct_est = estimateFoodCostPctByCategory(item.category ?? "", defaults);
    const plat_cost_cad_est = prixNet * food_cost_pct_est;

    const volumePlatMois_est =
      sumMenuPrices > 0 ? totalPlatsVendusMois_est * (price_ttc_cad / sumMenuPrices) : 0;

    const fixe = computeFixeByVolume({
      totalFixesMensuel: defaults.totalFixesMensuel,
      totalPlatsVendusMois: totalPlatsVendusMois_est,
      volumePlat: volumePlatMois_est,
      moyenneVolumeTousPlats: avgVolumePlat_est,
    });

    const irr = computeIrr({
      prixNet,
      platCostCad: plat_cost_cad_est,
      moCad: mo.moCad,
      fixeCad: fixe.fixeCad,
    });

    return {
      menu_item_id: item.id,
      item_name: item.item_name,
      category: item.category,

      price_ttc_cad,
      prix_net_cad: prixNet,
      frais_pos_cad: fraisPOS,

      food_cost_pct_est,
      plat_cost_cad_est,

      mo_cad: mo.moCad,
      fixe_cad: fixe.fixeCad,

      volume_mois_est: volumePlatMois_est,

      irr_pct: irr.irrPct,
      irr_verdict: irr.verdict,

      confidence,
    };
  });

  // Tri descendant (plus actionnable pour IRR).
  dishes.sort((a, b) => b.irr_pct - a.irr_pct);

  return {
    modeSquare,
    range,
    dishes,
    totals: {
      totalFixesMensuel: defaults.totalFixesMensuel,
      totalPlatsVendusMois_est,
      avgVolumePlat_est,
    },
    engineDefaults: defaults,
  };
}

