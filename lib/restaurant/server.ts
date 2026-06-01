import { cache } from "react";
import { redirect } from "next/navigation";

import { onboardingSteps } from "@/lib/onboarding/constants";
import { createClient } from "@/lib/supabase/server";
import {
  type MenuItemRecord,
  type OnboardingSnapshot,
  type RestaurantRecord,
  type RestaurantSnapshot,
} from "@/lib/restaurant/types";

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function mapRestaurantRow(row: Record<string, unknown>): RestaurantRecord {
  const displayName = (row.display_name as string | null) ?? null;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    owner_name: (row.owner_name as string | null) ?? null,
    display_name: displayName,
    restaurant_name: displayName,
    address_line: (row.address_line as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    dominant_profile: (row.dominant_profile as RestaurantRecord["dominant_profile"]) ?? null,
    onboarding_status: row.onboarding_status as RestaurantRecord["onboarding_status"],
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

function mapMenuItemRow(row: Record<string, unknown>): MenuItemRecord {
  const restaurantId = row.restaurant_id as string;
  return {
    id: row.id as string,
    restaurant_id: restaurantId,
    onboarding_id: restaurantId,
    item_name: row.item_name as string,
    category: row.category as string,
    price_cad: Number(row.price_cad),
    notes: (row.notes as string | null) ?? null,
    position: Number(row.position),
  };
}

export async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getOrCreateRestaurant(userId: string): Promise<RestaurantRecord> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("restaurants")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return mapRestaurantRow(existing as Record<string, unknown>);
  }

  const { data: created, error } = await supabase
    .from("restaurants")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Unable to initialize restaurant.");
  }

  return mapRestaurantRow(created as Record<string, unknown>);
}

async function loadRestaurantSnapshot(userId: string): Promise<RestaurantSnapshot> {
  const supabase = await createClient();
  const restaurant = await getOrCreateRestaurant(userId);

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("position", { ascending: true });

  if (menuError) {
    throw new Error(menuError.message);
  }

  return {
    restaurant,
    menuItems: (menuItems ?? []).map((r) => mapMenuItemRow(r as Record<string, unknown>)),
  };
}

/** Deduped per request (layout + pages). */
export const getRestaurantSnapshot = cache(loadRestaurantSnapshot);

export function toOnboardingSnapshot(snapshot: RestaurantSnapshot): OnboardingSnapshot {
  return {
    onboarding: snapshot.restaurant,
    menuItems: snapshot.menuItems,
  };
}

export const getOnboardingSnapshot = cache(async (userId: string): Promise<OnboardingSnapshot> => {
  return toOnboardingSnapshot(await loadRestaurantSnapshot(userId));
});

export function getOnboardingCompletion(snapshot: OnboardingSnapshot) {
  const { onboarding, menuItems } = snapshot;
  const isOwnerDone = hasValue(onboarding.owner_name);
  const isRestaurantDone =
    hasValue(onboarding.restaurant_name) &&
    hasValue(onboarding.address_line) &&
    hasValue(onboarding.city) &&
    hasValue(onboarding.postal_code);
  const isProfileDone = hasValue(onboarding.dominant_profile);
  const isMenuDone = menuItems.length > 0;
  const isReviewDone = onboarding.onboarding_status === "completed";

  return {
    isOwnerDone,
    isRestaurantDone,
    isProfileDone,
    isMenuDone,
    isReviewDone,
  };
}

export function getNextOnboardingStep(snapshot: OnboardingSnapshot): string {
  const completion = getOnboardingCompletion(snapshot);
  const stepResolver: Array<{ done: boolean; href: string }> = [
    { done: completion.isOwnerDone, href: "/onboarding/owner" },
    { done: completion.isRestaurantDone, href: "/onboarding/restaurant" },
    { done: completion.isProfileDone, href: "/onboarding/profile" },
    { done: completion.isMenuDone, href: "/onboarding/menu" },
  ];

  const pending = stepResolver.find((entry) => !entry.done);
  return pending?.href ?? "/onboarding/review";
}

export function getStepIndex(pathname: string): number {
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return onboardingSteps.findIndex((step) => step.href === normalized);
}

export function getMaxUnlockedStepIndex(completion: ReturnType<typeof getOnboardingCompletion>): number {
  if (!completion.isOwnerDone) {
    return 0;
  }
  if (!completion.isRestaurantDone) {
    return 1;
  }
  if (!completion.isProfileDone) {
    return 2;
  }
  if (!completion.isMenuDone) {
    return 3;
  }
  return 4;
}

export function shouldRedirectOnboardingPath(
  pathname: string | null,
  snapshot: OnboardingSnapshot,
): string | null {
  if (!pathname) {
    return null;
  }
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (normalized === "/onboarding") {
    return null;
  }
  const stepIndex = getStepIndex(normalized);
  if (stepIndex < 0) {
    return null;
  }
  const completion = getOnboardingCompletion(snapshot);
  const maxUnlocked = getMaxUnlockedStepIndex(completion);
  if (stepIndex > maxUnlocked) {
    return getNextOnboardingStep(snapshot);
  }
  return null;
}
