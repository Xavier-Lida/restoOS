"use server";

import { revalidatePath } from "next/cache";

import {
  isLegacyPricingSuggestionsColumnMessage,
  isMissingPricingSuggestionsTableMessage,
} from "@/lib/dashboard/pricing-suggestions";
import { createMenuVersion } from "@/lib/restaurant/menu-versions";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

type ActionResult = { ok: true } | { ok: false; message: string };

function readSuggestionId(formData: FormData): string | null {
  const raw = formData.get("suggestion_id")?.toString().trim() ?? "";
  return /^[0-9a-f-]{36}$/iu.test(raw) ? raw : null;
}

export async function acceptPricingSuggestionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const id = readSuggestionId(formData);
    if (!id) return { ok: false, message: "Identifiant invalide." };

    const { data: row, error: fetchError } = await supabase
      .from("pricing_suggestions")
      .select("id, user_id, menu_item_id, suggested_price_cad, status, estimated_monthly_gain_cad")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      const msg = fetchError.message ?? "";
      if (isMissingPricingSuggestionsTableMessage(msg) || isLegacyPricingSuggestionsColumnMessage(msg)) {
        return { ok: false, message: "Schéma Supabase incomplet. Applique les migrations." };
      }
      return { ok: false, message: msg };
    }

    if (!row || row.status !== "pending") {
      return { ok: false, message: "Suggestion introuvable ou déjà traitée." };
    }

    const snapshot = await getOnboardingSnapshot(user.id);
    const restaurantId = snapshot.onboarding.id;
    const menuItemId = row.menu_item_id as string;
    const suggested = Number(row.suggested_price_cad);

    const owned = snapshot.menuItems.some((m) => m.id === menuItemId);
    if (!owned) return { ok: false, message: "Plat introuvable." };

    const versionBeforeId = await createMenuVersion({
      supabase,
      restaurantId,
      source: "manual",
      createdBy: user.id,
      menuItems: snapshot.menuItems,
    });

    const { error: priceError } = await supabase
      .from("menu_items")
      .update({ price_cad: suggested })
      .eq("id", menuItemId)
      .eq("restaurant_id", restaurantId);

    if (priceError) return { ok: false, message: priceError.message };

    const refreshed = await getOnboardingSnapshot(user.id);
    const versionAfterId = await createMenuVersion({
      supabase,
      restaurantId,
      source: "pricing_suggestion",
      createdBy: user.id,
      menuItems: refreshed.menuItems,
    });

    const { error: acceptError } = await supabase
      .from("pricing_suggestions")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        menu_version_id_before: versionBeforeId,
        menu_version_id_after: versionAfterId,
        realized_monthly_gain_cad: row.estimated_monthly_gain_cad,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (acceptError) return { ok: false, message: acceptError.message };

    await supabase
      .from("pricing_suggestions")
      .update({ status: "rejected" })
      .eq("user_id", user.id)
      .eq("menu_item_id", menuItemId)
      .eq("status", "pending")
      .neq("id", id);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const monthKey = monthStart.toISOString().slice(0, 10);
    const gain = Number(row.estimated_monthly_gain_cad ?? 0);
    if (Number.isFinite(gain) && gain > 0) {
      await supabase.from("software_roi_events").upsert(
        {
          restaurant_id: restaurantId,
          month_start: monthKey,
          estimated_gain_cad: gain,
          realized_gain_cad: gain,
        },
        { onConflict: "restaurant_id,month_start" },
      );
    }

    revalidatePath("/dashboard/pricing-suggestions");
    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/stats");
    revalidatePath("/onboarding/menu");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erreur inattendue." };
  }
}

export async function rejectPricingSuggestionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const id = readSuggestionId(formData);
    if (!id) return { ok: false, message: "Identifiant invalide." };

    const { error } = await supabase
      .from("pricing_suggestions")
      .update({ status: "rejected" })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      const msg = error.message ?? "";
      if (isMissingPricingSuggestionsTableMessage(msg)) {
        return { ok: false, message: "Schéma Supabase incomplet. Applique les migrations." };
      }
      return { ok: false, message: msg };
    }

    revalidatePath("/dashboard/pricing-suggestions");
    revalidatePath("/dashboard/stats");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erreur inattendue." };
  }
}
