"use server";

import { revalidatePath } from "next/cache";

import { actionFail, actionOk, type ActionResult } from "@/lib/form/action-result";
import { getAuthedUser, getOrCreateOnboarding } from "@/lib/onboarding/server";
import { profileValues } from "@/lib/onboarding/types";

function readText(formData: FormData, field: string): string | null {
  const value = formData.get(field)?.toString().trim() ?? "";
  return value.length > 0 ? value : null;
}

export async function saveOwnerSettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const ownerName = readText(formData, "owner_name");
    if (!ownerName) return actionFail("Le nom complet est requis.");

    const { error } = await supabase
      .from("restaurants")
      .update({ owner_name: ownerName })
      .eq("user_id", user.id);

    if (error) return actionFail(error.message);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/stats");
    return actionOk("Nom enregistré.");
  } catch (err) {
    return actionFail(err instanceof Error ? err.message : "Erreur inattendue.");
  }
}

export async function saveRestaurantSettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const restaurantName = readText(formData, "restaurant_name");
    if (!restaurantName) return actionFail("Le nom du restaurant est requis.");
    const addressLine = readText(formData, "address_line");
    if (!addressLine) return actionFail("L'adresse est requise.");
    const city = readText(formData, "city");
    if (!city) return actionFail("La ville est requise.");
    const postalCode = readText(formData, "postal_code");
    if (!postalCode) return actionFail("Le code postal est requis.");

    const { error } = await supabase
      .from("restaurants")
      .update({ display_name: restaurantName, restaurant_name: restaurantName, address_line: addressLine, city, postal_code: postalCode })
      .eq("user_id", user.id);

    if (error) return actionFail(error.message);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/stats");
    return actionOk("Informations du restaurant enregistrées.");
  } catch (err) {
    return actionFail(err instanceof Error ? err.message : "Erreur inattendue.");
  }
}

export async function saveProfileSettingsAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const selectedProfile = readText(formData, "dominant_profile");
    if (!selectedProfile) return actionFail("Sélection de profil invalide.");

    const profileValue = profileValues.find((p) => p === selectedProfile);
    if (!profileValue) return actionFail("Profil invalide.");

    const { error } = await supabase
      .from("restaurants")
      .update({ dominant_profile: profileValue })
      .eq("user_id", user.id);

    if (error) return actionFail(error.message);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/pricing-suggestions");
    return actionOk("Profil de prix enregistré.");
  } catch (err) {
    return actionFail(err instanceof Error ? err.message : "Erreur inattendue.");
  }
}
