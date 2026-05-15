import { cache } from "react";
import { redirect } from "next/navigation";

import { onboardingSteps } from "@/lib/onboarding/constants";
import { createClient } from "@/lib/supabase/server";
import { type OnboardingRecord, type OnboardingSnapshot } from "@/lib/onboarding/types";

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
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

export async function getOrCreateOnboarding(userId: string): Promise<OnboardingRecord> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("restaurant_onboarding")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<OnboardingRecord>();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("restaurant_onboarding")
    .insert({ user_id: userId })
    .select("*")
    .single<OnboardingRecord>();

  if (error || !created) {
    throw new Error(error?.message ?? "Unable to initialize onboarding.");
  }

  return created;
}

async function loadOnboardingSnapshot(userId: string): Promise<OnboardingSnapshot> {
  const supabase = await createClient();
  const onboarding = await getOrCreateOnboarding(userId);

  const { data: menuItems, error: menuError } = await supabase
    .from("restaurant_menu_items")
    .select("*")
    .eq("onboarding_id", onboarding.id)
    .order("position", { ascending: true });

  if (menuError) {
    throw new Error(menuError.message);
  }

  return {
    onboarding,
    menuItems: menuItems ?? [],
  };
}

/** Deduped per request (layout + pages). */
export const getOnboardingSnapshot = cache(loadOnboardingSnapshot);

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

/** Highest step index the user may open (0 = owner … 4 = review). */
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
