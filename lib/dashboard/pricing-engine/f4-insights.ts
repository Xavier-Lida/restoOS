import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import type { PricingProfile } from "@/lib/pricing-engine/math";
import { computeF4Decision, type F4Decision, type F4ActionCode } from "@/lib/pricing-engine/f4";
import { loadPricingF2Insights, type PricingF2DishPoint } from "@/lib/dashboard/pricing-engine/f2-spm-insights";

export type PricingF4DishDecision = PricingF2DishPoint & {
  action: F4ActionCode;
  suggested_price_cad: number | null;
  decision: F4Decision;
};

export type PricingF4Insights = {
  range: RevenueRange;
  profile: PricingProfile;
  competitorMode: "ok" | "missing";
  decisions: PricingF4DishDecision[];
  actionCounts: Record<F4ActionCode, number>;
  generatedAt: string;
};

function initActionCounts(): Record<F4ActionCode, number> {
  return {
    C1: 0,
    C2: 0,
    C3: 0,
    O1: 0,
    A1: 0,
    GEL: 0,
    NO_CHANGE: 0,
  };
}

export async function loadPricingF4Insights(args: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
  profile: PricingProfile;
}): Promise<PricingF4Insights> {
  const { userId, menuItems, range, profile } = args;

  const f2 = await loadPricingF2Insights({ userId, menuItems, range });

  const supabase = await createClient();
  const from28dIso = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const nbAjustements28jByDish = new Map<string, number>();
  try {
    const { data } = await supabase
      .from("pricing_suggestions")
      .select("menu_item_id,status,updated_at")
      .eq("user_id", userId)
      .in("status", ["accepted", "rejected"])
      .gte("updated_at", from28dIso);

    if (data) {
      for (const row of data as Array<Record<string, unknown>>) {
        const dishId = String(row.menu_item_id ?? "");
        const status = String(row.status ?? "");
        if (!dishId) continue;
        if (status !== "accepted") continue;
        nbAjustements28jByDish.set(dishId, (nbAjustements28jByDish.get(dishId) ?? 0) + 1);
      }
    }
  } catch {
    // If table/columns missing, fallback to 0.
  }

  const decisions: PricingF4DishDecision[] = (f2.dishes as PricingF2DishPoint[]).map((dish) => {
    const nbAjustements28j = nbAjustements28jByDish.get(dish.menu_item_id) ?? 0;

    const decision = computeF4Decision({
      profile,
      currentPriceCad: dish.price_ttc_cad,
      refMarcheCad: dish.ref_marche_cad,
      spmPct: dish.spm_pct,
      platCostCad: dish.plat_cost_cad_est,
      moCad: dish.mo_cad,
      fixeCad: dish.fixe_cad,
      irrPct: dish.irr_pct,
      nbAjustements28j,
      costDeltaSupplierPct: 0,
    });

    return {
      ...dish,
      action: decision.action,
      suggested_price_cad: decision.suggestedPriceCad,
      decision,
    };
  });

  const actionCounts = initActionCounts();
  for (const d of decisions) {
    actionCounts[d.action] += 1;
  }

  decisions.sort((a, b) => {
    const order = ["C1", "C2", "C3", "GEL", "O1", "A1", "NO_CHANGE"] as const;
    return order.indexOf(a.action) - order.indexOf(b.action);
  });

  return {
    range,
    profile,
    competitorMode: f2.modeCompetitors,
    decisions,
    actionCounts,
    generatedAt: new Date().toISOString(),
  };
}

