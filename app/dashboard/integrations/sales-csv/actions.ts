"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseSalesCsv } from "@/lib/square/csv";
import { getAuthedUser } from "@/lib/onboarding/server";

function getUploadedFile(formData: FormData): File {
  const candidate = formData.get("report");
  if (!(candidate instanceof File)) {
    throw new Error("Aucun fichier recu.");
  }
  if (!candidate.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Format invalide. Upload un fichier CSV.");
  }
  return candidate;
}

export async function uploadSalesCsvAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const file = getUploadedFile(formData);
  const content = await file.text();
  const summaries = parseSalesCsv(content, file.name);
  const rows = summaries.map((parsed) => ({
    user_id: user.id,
    source_filename: file.name,
    period_start: parsed.periodStart,
    period_end: parsed.periodEnd,
    report_day: parsed.reportDay,
    gross_sales_cad: parsed.grossSalesCad,
    net_sales_cad: parsed.netSalesCad,
    total_sales_cad: parsed.totalSalesCad,
    taxes_cad: parsed.taxesCad,
    tips_cad: parsed.tipsCad,
    payments_total_cad: parsed.paymentsTotalCad,
    transactions_count: parsed.transactionsCount,
    payload: parsed.metrics,
  }));

  const reportDays = rows.map((r) => r.report_day);

  const { data: existing } = await supabase
    .from("square_sales_reports")
    .select("report_day")
    .eq("user_id", user.id)
    .in("report_day", reportDays);

  const existingDays = new Set((existing ?? []).map((r) => r.report_day));
  const newCount = reportDays.filter((d) => !existingDays.has(d)).length;
  const updatedCount = reportDays.filter((d) => existingDays.has(d)).length;

  const { error } = await supabase.from("square_sales_reports").upsert(rows, { onConflict: "user_id,report_day" });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("square_sales_reports") && msg.includes("schema cache")) {
      redirect("/dashboard/integrations/sales-csv?error=missing_table");
    }
    throw new Error(`Import CSV impossible: ${msg}`);
  }

  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/integrations/sales-csv");
  redirect(`/dashboard/integrations/sales-csv?status=imported&new=${newCount}&updated=${updatedCount}`);
}
