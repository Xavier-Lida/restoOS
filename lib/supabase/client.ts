import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, apiKey } = getSupabaseEnv();
  return createBrowserClient(url, apiKey);
}
