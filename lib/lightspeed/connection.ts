import { createClient } from "@/lib/supabase/server";

import type { LightspeedConnectionRow } from "@/lib/lightspeed/types";

export async function getConnectionForUser(userId: string): Promise<LightspeedConnectionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lightspeed_connections")
    .select(
      "id, user_id, environment, status, last_sync_at, last_backfill_at, last_error, consecutive_failures, business_id",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as LightspeedConnectionRow;
}
