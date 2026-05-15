"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseSquareSalesCsv } from "@/lib/square/csv";
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

export async function uploadSquareSalesReportAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const file = getUploadedFile(formData);
  const content = await file.text();
  const summaries = parseSquareSalesCsv(content, file.name);
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

  const { error } = await supabase.from("square_sales_reports").upsert(rows, { onConflict: "user_id,report_day" });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("square_sales_reports") && msg.includes("schema cache")) {
      redirect("/dashboard/integrations/square?error=missing_table");
    }
    throw new Error(`Import Square impossible: ${msg}`);
  }

  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/integrations/square");
  redirect("/dashboard/integrations/square?status=imported");
}
