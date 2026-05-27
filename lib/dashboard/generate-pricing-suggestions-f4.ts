import "server-only";

import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { PricingProfile } from "@/lib/pricing-engine/math";
import { loadPricingF4Insights } from "@/lib/dashboard/pricing-engine/f4-insights";

export type F4SuggestionRow = {
  menu_item_id: string;
  current_price_cad: number;
  suggested_price_cad: number;
  rationale: string;
  estimated_monthly_gain_cad: number;
  confidence: number;
  model: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function generatePricingSuggestionsWithF4(args: {
  userId: string;
  menuItems: MenuItemRecord[];
  profile: PricingProfile;
}): Promise<{ suggestions: F4SuggestionRow[]; counts: { A1: number; O1: number; C2: number } }> {
  const { userId, menuItems, profile } = args;

  const insights = await loadPricingF4Insights({ userId, menuItems, range: "30d", profile });
  const suggestions = insights.decisions
    .filter((d) => d.action === "A1" && d.decision.suggestedPriceCad != null)
    .map((d) => {
      const suggested = d.decision.suggestedPriceCad as number;
      const current = d.decision.currentPriceCad;
      const delta = suggested - current;

      // Proxy "gain" : delta price * volume mensuelle estimée (transactions).
      const estimated_monthly_gain_cad = delta * (d.volume_mois_est ?? 0);

      const confidenceBase = d.spm_pct != null ? 0.62 : 0.45;
      const confidence = clamp(
        confidenceBase * (d.confidence === "incomplet" ? 0.8 : 1),
        0,
        1,
      );

      const spmPart = d.spm_pct != null ? ` · SPM ${d.spm_pct.toFixed(1)}%` : "";
      const refPart = d.ref_marche_cad != null ? ` · RefMarché ${d.ref_marche_cad.toFixed(2)}$` : "";

      const rationale = `F4 : décision A1 basée sur plancher/plafond + profil ${profile}. IRR ${d.irr_pct.toFixed(
        1,
      )}%${spmPart}${refPart}.`;

      return {
        menu_item_id: d.menu_item_id,
        current_price_cad: current,
        suggested_price_cad: suggested,
        rationale,
        estimated_monthly_gain_cad: Math.round(estimated_monthly_gain_cad * 100) / 100,
        confidence,
        model: "F4-deterministic",
      };
    });

  return {
    suggestions,
    counts: { A1: insights.actionCounts.A1, O1: insights.actionCounts.O1, C2: insights.actionCounts.C2 },
  };
}

