"use server";

import { revalidatePath } from "next/cache";

import { actionFail, actionOk, type ActionResult } from "@/lib/form/action-result";
import { createMenuVersion } from "@/lib/restaurant/menu-versions";
import { getAuthedUser, getOrCreateOnboarding, getOnboardingSnapshot } from "@/lib/onboarding/server";
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
      .from("restaurants")
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
  "display_name",
  "address_line",
  "city",
  "postal_code",
] as const;

export async function saveRestaurantAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();
    await getOrCreateOnboarding(user.id);

    const restaurantName = readRequiredText(formData, "restaurant_name");
    if (!restaurantName) return actionFail("Le nom du restaurant est requis.");
    const addressLine = readRequiredText(formData, "address_line");
    if (!addressLine) return actionFail("L'adresse est requise.");
    const city = readRequiredText(formData, "city");
    if (!city) return actionFail("La ville est requise.");
    const postalCode = readRequiredText(formData, "postal_code");
    if (!postalCode) return actionFail("Le code postal est requis.");

    const { error } = await supabase
      .from("restaurants")
      .update({ display_name: restaurantName, address_line: addressLine, city, postal_code: postalCode })
      .eq("user_id", user.id);

    if (error) return actionFail(error.message);

    revalidatePath("/onboarding");
    return actionOk(undefined, "/onboarding/profile");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

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
      .from("restaurants")
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
      .from("restaurants")
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
      .from("menu_items")
      .select("position")
      .eq("restaurant_id", onboarding.id)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = (currentItems?.[0]?.position ?? -1) + 1;

    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: onboarding.id,
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
      .from("menu_items")
      .delete()
      .eq("id", itemId)
      .eq("restaurant_id", onboarding.id);

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

    const snapshot = await getOnboardingSnapshot(user.id);
    const previousItem = snapshot.menuItems.find((m) => m.id === itemId);
    const priceChanged = previousItem != null && Number(previousItem.price_cad) !== priceCad;

    const { error } = await supabase
      .from("menu_items")
      .update({
        item_name: itemName,
        category,
        price_cad: priceCad,
        notes,
      })
      .eq("id", itemId)
      .eq("restaurant_id", onboarding.id);

    if (error) {
      return actionFail(error.message);
    }

    if (priceChanged) {
      const refreshed = await getOnboardingSnapshot(user.id);
      await createMenuVersion({
        supabase,
        restaurantId: onboarding.id,
        source: "manual",
        createdBy: user.id,
        menuItems: refreshed.menuItems,
      });
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
      .from("menu_items")
      .select("id, position")
      .eq("restaurant_id", onboarding.id)
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
      supabase.from("menu_items").update({ position: entry.position }).eq("id", entry.id),
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

    const snapshot = await getOnboardingSnapshot(user.id);

    if (snapshot.menuItems.length === 0) {
      return actionFail("Ajoutez au moins un plat au menu avant de terminer.");
    }

    await createMenuVersion({
      supabase,
      restaurantId: onboarding.id,
      source: "manual",
      createdBy: user.id,
      menuItems: snapshot.menuItems,
    });

    const { error } = await supabase
      .from("restaurants")
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
