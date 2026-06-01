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
  // Only count price-increase acceptances for ROI — price reductions are a business
  // choice and don't reflect software-generated revenue.
  const gainRows = rows.filter((r) => Number(r.estimated_monthly_gain_cad ?? 0) > 0);
  const totalMonthlyGainCad = gainRows.reduce(
    (sum, row) => sum + Number(row.estimated_monthly_gain_cad),
    0,
  );
  return {
    totalMonthlyGainCad,
    acceptedCount: gainRows.length,
  };
}
