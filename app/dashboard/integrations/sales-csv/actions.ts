"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildPosImportRows, hashImportFile } from "@/lib/pos/import-sale-lines";
import { parsePosSalesCsvContent } from "@/lib/pos/import-pos-sales-from-csv";
import {
  isMissingPosDailySalesReportsTableMessage,
  isMissingPosSaleLinesTableMessage,
} from "@/lib/pos/table-errors";
import { getOrCreateRestaurant } from "@/lib/restaurant/server";
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
  const restaurant = await getOrCreateRestaurant(user.id);
  const file = getUploadedFile(formData);
  const content = await file.text();
  const fileSha = hashImportFile(content);

  const { data: existingBatch } = await supabase
    .from("pos_import_batches")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("file_sha256", fileSha)
    .maybeSingle();

  if (existingBatch?.id) {
    redirect("/dashboard/integrations/sales-csv?error=duplicate_file");
  }

  const parsed = await parsePosSalesCsvContent(content, file.name);
  const { saleItems, dailySummaries } = parsed;

  const reportRows = dailySummaries.map((summary) => ({
    restaurant_id: restaurant.id,
    source_filename: file.name,
    period_start: summary.periodStart,
    period_end: summary.periodEnd,
    report_day: summary.reportDay,
    gross_sales_cad: summary.grossSalesCad,
    net_sales_cad: summary.netSalesCad,
    total_sales_cad: summary.totalSalesCad,
    taxes_cad: summary.taxesCad,
    tips_cad: summary.tipsCad,
    payments_total_cad: summary.paymentsTotalCad,
    transactions_count: summary.transactionsCount,
    payload: {
      ...summary.metrics,
      parse_method: parsed.parseMethod,
      parse_model: parsed.model ?? null,
      parse_warnings: parsed.warnings,
    },
  }));

  const reportDays = reportRows.map((r) => r.report_day);

  const { data: existingReports } = await supabase
    .from("pos_daily_sales_reports")
    .select("report_day")
    .eq("restaurant_id", restaurant.id)
    .in("report_day", reportDays);

  const existingDays = new Set((existingReports ?? []).map((r) => r.report_day));
  const newCount = reportDays.filter((d) => !existingDays.has(d)).length;
  const updatedCount = reportDays.filter((d) => existingDays.has(d)).length;

  if (reportRows.length > 0) {
    const { error: reportError } = await supabase
      .from("pos_daily_sales_reports")
      .upsert(reportRows, { onConflict: "restaurant_id,report_day" });

    if (reportError) {
      const msg = reportError.message ?? "";
      if (isMissingPosDailySalesReportsTableMessage(msg)) {
        redirect("/dashboard/integrations/sales-csv?error=missing_table");
      }
      throw new Error(`Import CSV impossible: ${msg}`);
    }
  }

  const periodStart = reportRows.reduce<string | null>((min, r) => {
    const d = r.report_day;
    return min == null || d < min ? d : min;
  }, null);
  const periodEnd = reportRows.reduce<string | null>((max, r) => {
    const d = r.report_day;
    return max == null || d > max ? d : max;
  }, null);

  const { data: batch, error: batchError } = await supabase
    .from("pos_import_batches")
    .insert({
      restaurant_id: restaurant.id,
      source: "csv_import",
      filename: file.name,
      file_sha256: fileSha,
      period_start: periodStart,
      period_end: periodEnd,
      row_count: saleItems.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    const msg = batchError?.message ?? "";
    if (isMissingPosSaleLinesTableMessage(msg)) {
      redirect("/dashboard/integrations/sales-csv?error=missing_items_table");
    }
    throw new Error(`Import lot POS impossible: ${msg}`);
  }

  const { lines, transactions } = buildPosImportRows({
    restaurantId: restaurant.id,
    importBatchId: batch.id,
    items: saleItems,
  });

  let linesImported = 0;

  if (transactions.length > 0) {
    const { error: txError } = await supabase.from("pos_transactions").upsert(transactions, {
      onConflict: "restaurant_id,external_transaction_id",
      ignoreDuplicates: false,
    });
    if (txError && !txError.message.includes("duplicate")) {
      throw new Error(`Import transactions impossible: ${txError.message}`);
    }
  }

  if (lines.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const { error: linesError } = await supabase.from("pos_sale_lines").upsert(chunk, {
        onConflict: "restaurant_id,dedup_key",
        ignoreDuplicates: true,
      });
      if (linesError) {
        const msg = linesError.message ?? "";
        if (isMissingPosSaleLinesTableMessage(msg)) {
          redirect("/dashboard/integrations/sales-csv?error=missing_items_table");
        }
        throw new Error(`Import lignes vente impossible: ${msg}`);
      }
      linesImported += chunk.length;
    }
  }

  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/integrations/sales-csv");
  revalidatePath("/dashboard/pricing-suggestions");

  const q = new URLSearchParams({
    status: "imported",
    new: String(newCount),
    updated: String(updatedCount),
    method: parsed.parseMethod,
  });
  if (linesImported > 0) {
    q.set("items", String(linesImported));
  }
  redirect(`/dashboard/integrations/sales-csv?${q.toString()}`);
}
