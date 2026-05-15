"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isLegacyPricingSuggestionsColumnMessage,
  isMissingPricingSuggestionsTableMessage,
} from "@/lib/dashboard/pricing-suggestions";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

function readSuggestionId(formData: FormData): string | null {
  const raw = formData.get("suggestion_id")?.toString().trim() ?? "";
  return /^[0-9a-f-]{36}$/iu.test(raw) ? raw : null;
}

export async function acceptPricingSuggestionAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const id = readSuggestionId(formData);
  if (!id) {
    redirect("/dashboard/pricing-suggestions?error=invalid_id");
  }

  const { data: row, error: fetchError } = await supabase
    .from("pricing_suggestions")
    .select("id, user_id, menu_item_id, suggested_price_cad, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    const msg = fetchError.message ?? "";
    if (isMissingPricingSuggestionsTableMessage(msg)) {
      redirect("/dashboard/pricing-suggestions?error=missing_table");
    }
    throw new Error(msg);
  }

  if (!row || row.status !== "pending") {
    redirect("/dashboard/pricing-suggestions?error=not_found");
  }

  const onboarding = await getOnboardingSnapshot(user.id);
  const menuItemId = row.menu_item_id as string;
  const suggested = Number(row.suggested_price_cad);

  const owned = onboarding.menuItems.some((m) => m.id === menuItemId);
  if (!owned) {
    redirect("/dashboard/pricing-suggestions?error=not_found");
  }

  const { error: priceError } = await supabase
    .from("restaurant_menu_items")
    .update({ price_cad: suggested })
    .eq("id", menuItemId)
    .eq("onboarding_id", onboarding.onboarding.id);

  if (priceError) {
    throw new Error(priceError.message);
  }

  const { error: acceptError } = await supabase
    .from("pricing_suggestions")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (acceptError) {
    throw new Error(acceptError.message);
  }

  await supabase
    .from("pricing_suggestions")
    .update({ status: "rejected" })
    .eq("user_id", user.id)
    .eq("menu_item_id", menuItemId)
    .eq("status", "pending")
    .neq("id", id);

  revalidatePath("/dashboard/pricing-suggestions");
  revalidatePath("/dashboard/menu");
  revalidatePath("/dashboard/stats");
  revalidatePath("/onboarding/menu");
  redirect("/dashboard/pricing-suggestions?status=accepted");
}

export async function rejectPricingSuggestionAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const id = readSuggestionId(formData);
  if (!id) {
    redirect("/dashboard/pricing-suggestions?error=invalid_id");
  }

  const { error } = await supabase
    .from("pricing_suggestions")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    const msg = error.message ?? "";
    if (isMissingPricingSuggestionsTableMessage(msg)) {
      redirect("/dashboard/pricing-suggestions?error=missing_table");
    }
    throw new Error(msg);
  }

  revalidatePath("/dashboard/pricing-suggestions");
  revalidatePath("/dashboard/stats");
  redirect("/dashboard/pricing-suggestions?status=rejected");
}
