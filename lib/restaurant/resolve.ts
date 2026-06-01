import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateRestaurant } from "@/lib/restaurant/server";

/** Resolves the tenant restaurant id for a Supabase auth user. */
export async function getRestaurantIdForUser(userId: string): Promise<string> {
  const restaurant = await getOrCreateRestaurant(userId);
  return restaurant.id;
}

export async function getRestaurantIdFromSession(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Non authentifié.");
  }
  return getRestaurantIdForUser(user.id);
}
