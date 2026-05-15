import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function loadAcceptedSuggestionsGain(
  userId: string,
): Promise<{ totalMonthlyGainCad: number; acceptedCount: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pricing_suggestions")
    .select("estimated_monthly_gain_cad, status")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (error) {
    throw new Error(`Read pricing_suggestions failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ estimated_monthly_gain_cad: number | null }>;
  const totalMonthlyGainCad = rows.reduce(
    (sum, row) => sum + Number(row.estimated_monthly_gain_cad ?? 0),
    0,
  );
  return {
    totalMonthlyGainCad,
    acceptedCount: rows.length,
  };
}
