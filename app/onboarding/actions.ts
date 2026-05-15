"use server";

import { revalidatePath } from "next/cache";

import { actionFail, actionOk, type ActionResult } from "@/lib/form/action-result";
import { getAuthedUser, getOrCreateOnboarding } from "@/lib/onboarding/server";
import { profileValues } from "@/lib/onboarding/types";

function readRequiredText(formData: FormData, field: string): string | null {
  const value = formData.get(field)?.toString().trim() ?? "";
  return value.length > 0 ? value : null;
}

export async function saveOwnerAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const ownerName = readRequiredText(formData, "owner_name");
    if (!ownerName) {
      return actionFail("Le nom complet est requis.");
    }

    const { error } = await supabase
      .from("restaurant_onboarding")
      .update({ owner_name: ownerName })
      .eq("user_id", user.id);

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    return actionOk("Informations enregistrées.", "/onboarding/restaurant");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

const restaurantWizardColumns = [
  "restaurant_name",
  "address_line",
  "city",
  "postal_code",
] as const;

export async function saveRestaurantWizardStepAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const stepRaw = formData.get("step")?.toString() ?? "";
    const step = Number.parseInt(stepRaw, 10);
    if (!Number.isInteger(step) || step < 0 || step > 3) {
      return actionFail("Étape invalide.");
    }

    const value = readRequiredText(formData, "value");
    if (!value) {
      return actionFail("Ce champ est requis.");
    }

    const column = restaurantWizardColumns[step];

    const { error } = await supabase
      .from("restaurant_onboarding")
      .update({ [column]: value })
      .eq("user_id", user.id);

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/restaurant");

    if (step === 3) {
      return actionOk("Adresse enregistrée.", "/onboarding/profile");
    }

    return actionOk("Enregistré.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

export async function saveProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const selectedProfile = readRequiredText(formData, "dominant_profile");
    if (!selectedProfile) {
      return actionFail("Sélection de profil invalide.");
    }

    const profileHandlers = new Map(
      profileValues.map((profile) => [profile, profile] as const),
    );
    const profileValue = profileHandlers.get(selectedProfile as (typeof profileValues)[number]);

    if (!profileValue) {
      return actionFail("Profil invalide.");
    }

    const { error } = await supabase
      .from("restaurant_onboarding")
      .update({ dominant_profile: profileValue })
      .eq("user_id", user.id);

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    return actionOk("Profil enregistré.", "/onboarding/menu");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

export async function addMenuItemAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const onboarding = await getOrCreateOnboarding(user.id);

    const itemName = readRequiredText(formData, "item_name");
    const category = readRequiredText(formData, "category");
    const priceInput = readRequiredText(formData, "price_cad");
    if (!itemName || !category || !priceInput) {
      return actionFail("Nom, catégorie et prix sont requis.");
    }

    const notes = formData.get("notes")?.toString().trim() ?? null;
    const priceCad = Number(priceInput.replace(",", "."));

    if (Number.isNaN(priceCad) || priceCad < 0) {
      return actionFail("Le prix doit être un nombre positif.");
    }

    const { data: currentItems } = await supabase
      .from("restaurant_menu_items")
      .select("position")
      .eq("onboarding_id", onboarding.id)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = (currentItems?.[0]?.position ?? -1) + 1;

    const { error } = await supabase.from("restaurant_menu_items").insert({
      onboarding_id: onboarding.id,
      item_name: itemName,
      category,
      price_cad: priceCad,
      notes,
      position: nextPosition,
    });

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/menu");
    revalidatePath("/onboarding/review");
    return actionOk("Plat ajouté au menu.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

export async function deleteMenuItemAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const onboarding = await getOrCreateOnboarding(user.id);
    const itemId = readRequiredText(formData, "item_id");
    if (!itemId) {
      return actionFail("Plat introuvable.");
    }

    const { error } = await supabase
      .from("restaurant_menu_items")
      .delete()
      .eq("id", itemId)
      .eq("onboarding_id", onboarding.id);

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/menu");
    revalidatePath("/onboarding/review");
    return actionOk("Plat retiré du menu.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

export async function updateMenuItemAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const onboarding = await getOrCreateOnboarding(user.id);
    const itemId = readRequiredText(formData, "item_id");
    const itemName = readRequiredText(formData, "item_name");
    const category = readRequiredText(formData, "category");
    const priceInput = readRequiredText(formData, "price_cad");
    if (!itemId || !itemName || !category || !priceInput) {
      return actionFail("Tous les champs obligatoires doivent être remplis.");
    }

    const notes = formData.get("notes")?.toString().trim() ?? null;
    const priceCad = Number(priceInput.replace(",", "."));

    if (Number.isNaN(priceCad) || priceCad < 0) {
      return actionFail("Le prix doit être un nombre positif.");
    }

    const { error } = await supabase
      .from("restaurant_menu_items")
      .update({
        item_name: itemName,
        category,
        price_cad: priceCad,
        notes,
      })
      .eq("id", itemId)
      .eq("onboarding_id", onboarding.id);

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/menu");
    revalidatePath("/onboarding/review");
    revalidatePath("/dashboard/menu");
    return actionOk("Plat mis à jour.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

async function swapMenuItemPosition(itemId: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const onboarding = await getOrCreateOnboarding(user.id);
    const { data: items, error: listError } = await supabase
      .from("restaurant_menu_items")
      .select("id, position")
      .eq("onboarding_id", onboarding.id)
      .order("position", { ascending: true });

    if (listError) {
      return actionFail(listError.message);
    }

    const orderedItems = items ?? [];
    const currentIndex = orderedItems.findIndex((item) => item.id === itemId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentItem = orderedItems[currentIndex];
    const targetItem = orderedItems[targetIndex];

    if (!currentItem || !targetItem) {
      return actionOk();
    }

    const updates = [
      { id: currentItem.id, position: targetItem.position },
      { id: targetItem.id, position: currentItem.position },
    ];

    const updateCalls = updates.map((entry) =>
      supabase.from("restaurant_menu_items").update({ position: entry.position }).eq("id", entry.id),
    );
    const [currentUpdate, targetUpdate] = await Promise.all(updateCalls);

    if (currentUpdate.error || targetUpdate.error) {
      return actionFail(currentUpdate.error?.message ?? targetUpdate.error?.message ?? "Erreur");
    }

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/menu");
    revalidatePath("/onboarding/review");
    return actionOk();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

export async function moveMenuItemUpAction(formData: FormData): Promise<ActionResult> {
  const itemId = readRequiredText(formData, "item_id");
  if (!itemId) {
    return actionFail("Plat introuvable.");
  }
  return swapMenuItemPosition(itemId, "up");
}

export async function moveMenuItemDownAction(formData: FormData): Promise<ActionResult> {
  const itemId = readRequiredText(formData, "item_id");
  if (!itemId) {
    return actionFail("Plat introuvable.");
  }
  return swapMenuItemPosition(itemId, "down");
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    const onboarding = await getOrCreateOnboarding(user.id);

    const { data: items } = await supabase
      .from("restaurant_menu_items")
      .select("id")
      .eq("onboarding_id", onboarding.id)
      .limit(1);

    const hasMenu = Boolean(items?.length);

    if (!hasMenu) {
      return actionFail("Ajoutez au moins un plat au menu avant de terminer.");
    }

    const { error } = await supabase
      .from("restaurant_onboarding")
      .update({
        onboarding_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return actionFail(error.message);
    }

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return actionOk("Onboarding terminé. Bienvenue sur le tableau de bord !", "/dashboard");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}
