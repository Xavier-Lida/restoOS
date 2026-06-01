import "server-only";

import { revalidatePath } from "next/cache";

import { isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import {
  generatePricingSuggestionsWithLlm,
  type MenuItemForPricing,
  type PricingSuggestionFilterStats,
} from "@/lib/dashboard/generate-pricing-suggestions-llm";
import { generatePricingSuggestionsWithF4 } from "@/lib/dashboard/generate-pricing-suggestions-f4";
import {
  deletePendingPricingSuggestionsForUser,
  insertPricingSuggestions,
  isLegacyPricingSuggestionsColumnMessage,
  isMissingPricingSuggestionsTableMessage,
} from "@/lib/dashboard/pricing-suggestions";
import { applyMonthlyGainFromSalesVolume } from "@/lib/dashboard/apply-suggestion-monthly-gain";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import { hasSquareReports, loadSquareDailyRevenue, summarizeSquareRevenue } from "@/lib/square/dashboard";
import { loadMenuItemQuantitySold30d } from "@/lib/square/menu-item-sales-volume";

export type PricingGenerationErrorCode =
  | "missing_ai"
  | "no_menu"
  | "generation_failed"
  | "missing_table"
  | "insert_failed"
  | "no_suggestions"
  | "filtered";

export type PricingGenerationResult =
  | { ok: true; count: number }
  | {
      ok: false;
      code: PricingGenerationErrorCode;
      message: string;
      detail?: string;
      stats?: PricingSuggestionFilterStats;
    };

export async function runPricingSuggestionsGeneration(): Promise<PricingGenerationResult> {
  const { supabase, user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const menuItems: MenuItemForPricing[] = snapshot.menuItems.map((m) => ({
    id: m.id,
    item_name: m.item_name,
    category: m.category,
    price_cad: Number(m.price_cad),
  }));

  if (menuItems.length === 0) {
    return { ok: false, code: "no_menu", message: "Menu vide." };
  }

  const profile = snapshot.onboarding.dominant_profile ?? "securitaire";

  // Progressive replacement: le profil Securitaire passe d’abord en déterministe (F4),
  // même si la config IA n’est pas disponible.
  if (profile === "securitaire") {
    const generated = await generatePricingSuggestionsWithF4({
      userId: user.id,
      menuItems: snapshot.menuItems,
      profile,
    });

    if (generated.suggestions.length === 0) {
      return { ok: false, code: "no_suggestions", message: "Aucune suggestion F4 (A1) à générer." };
    }

    try {
      await deletePendingPricingSuggestionsForUser(user.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (isMissingPricingSuggestionsTableMessage(msg)) {
        return { ok: false, code: "missing_table", message: msg };
      }
      throw e;
    }

    const rows = generated.suggestions.map((s) => ({
      user_id: user.id,
      restaurant_id: snapshot.onboarding.id,
      menu_item_id: s.menu_item_id,
      current_price_cad: s.current_price_cad,
      suggested_price_cad: s.suggested_price_cad,
      rationale: s.rationale,
      estimated_monthly_gain_cad: s.estimated_monthly_gain_cad,
      confidence: s.confidence,
      model: s.model,
      status: "pending" as const,
    }));

    try {
      await insertPricingSuggestions(supabase, rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (isMissingPricingSuggestionsTableMessage(msg) || isLegacyPricingSuggestionsColumnMessage(msg)) {
        return { ok: false, code: "missing_table", message: msg };
      }
      return { ok: false, code: "insert_failed", message: msg, detail: msg };
    }

    revalidatePath("/dashboard/pricing-suggestions");
    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/stats");
    return { ok: true, count: generated.suggestions.length };
  }

  if (!isAnthropicConfigured()) {
    return { ok: false, code: "missing_ai", message: "ANTHROPIC_API_KEY manquant." };
  }

  const hasSquare = await hasSquareReports(user.id);
  let squareContext: { hasSquare: boolean; totalNetSales30d: number; menuItemCount: number };
  if (hasSquare) {
    const points = await loadSquareDailyRevenue(user.id, "30d");
    const summary = summarizeSquareRevenue(points);
    squareContext = {
      hasSquare: true,
      totalNetSales30d: summary.totalNetSales,
      menuItemCount: menuItems.length,
    };
  } else {
    squareContext = {
      hasSquare: false,
      totalNetSales30d: 0,
      menuItemCount: menuItems.length,
    };
  }

  let generated;
  try {
    generated = await generatePricingSuggestionsWithLlm({
      menuItems,
      dominantProfile: snapshot.onboarding.dominant_profile,
      square: squareContext,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return { ok: false, code: "missing_ai", message: msg };
    }
    return { ok: false, code: "generation_failed", message: msg };
  }

  if (generated.suggestions.length === 0) {
    const code = generated.stats.parsedFromModel > 0 ? "filtered" : "no_suggestions";
    return {
      ok: false,
      code,
      message:
        code === "filtered"
          ? "Réponse IA sans suggestion utilisable."
          : "Le modèle n'a proposé aucune ligne.",
      stats: generated.stats,
    };
  }

  const quantityByMenuItemId = await loadMenuItemQuantitySold30d(user.id, menuItems);
  const suggestionsWithGain = applyMonthlyGainFromSalesVolume(generated.suggestions, quantityByMenuItemId);

  try {
    await deletePendingPricingSuggestionsForUser(user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (isMissingPricingSuggestionsTableMessage(msg)) {
      return { ok: false, code: "missing_table", message: msg };
    }
    throw e;
  }

  const rows = suggestionsWithGain.map((s) => ({
    user_id: user.id,
    restaurant_id: snapshot.onboarding.id,
    menu_item_id: s.menu_item_id,
    current_price_cad: s.current_price_cad,
    suggested_price_cad: s.suggested_price_cad,
    rationale: s.rationale,
    estimated_monthly_gain_cad: s.estimated_monthly_gain_cad,
    confidence: s.confidence,
    model: generated.model,
    status: "pending" as const,
  }));

  try {
    await insertPricingSuggestions(supabase, rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (isMissingPricingSuggestionsTableMessage(msg) || isLegacyPricingSuggestionsColumnMessage(msg)) {
      return { ok: false, code: "missing_table", message: msg };
    }
    return { ok: false, code: "insert_failed", message: msg, detail: msg };
  }

  revalidatePath("/dashboard/pricing-suggestions");
  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/stats");

  return { ok: true, count: generated.suggestions.length };
}

export function pricingGenerationResultToSearchParams(
  result: Exclude<PricingGenerationResult, { ok: true }>,
): URLSearchParams {
  const q = new URLSearchParams({ error: result.code });
  if (result.code === "filtered" || result.code === "no_suggestions") {
    q.delete("error");
    q.set("status", result.code);
    if (result.stats) {
      q.set("parsed", String(result.stats.parsedFromModel));
      q.set("kept", String(result.stats.kept));
      q.set("drop_id", String(result.stats.droppedUnknownItem));
      q.set("drop_dup", String(result.stats.droppedDuplicate));
      q.set("drop_same", String(result.stats.droppedSamePrice));
    }
  }
  if (result.code === "insert_failed" && result.detail) {
    q.set("detail", result.detail.slice(0, 240));
  }
  return q;
}
