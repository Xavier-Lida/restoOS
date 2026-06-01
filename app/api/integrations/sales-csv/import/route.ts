import { revalidatePath } from "next/cache";

import { buildPosImportRows, hashImportFile } from "@/lib/pos/import-sale-lines";
import { parsePosSalesCsvContent } from "@/lib/pos/import-pos-sales-from-csv";
import {
  isMissingPosDailySalesReportsTableMessage,
  isMissingPosSaleLinesTableMessage,
} from "@/lib/pos/table-errors";
import { getOrCreateRestaurant } from "@/lib/restaurant/server";
import { getAuthedUser } from "@/lib/onboarding/server";
import { posItemMatchesMenuName } from "@/lib/square/item-name";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export type ImportSummary = {
  filename: string;
  parseMethod: "llm" | "heuristic";
  model?: string;
  totalSaleLines: number;
  linesInserted: number;
  linesSkipped: number;
  totalTransactions: number;
  transactionsInserted: number;
  newDays: number;
  updatedDays: number;
  periodStart: string | null;
  periodEnd: string | null;
  unmatchedPosItems: string[];
  warnings: string[];
};

export type SseEvent =
  | { phase: "start"; filename: string }
  | { phase: "parsing"; message: string }
  | { phase: "parsed"; rows: number; days: number; method: string; warnings: string[] }
  | { phase: "checking" }
  | { phase: "inserting_reports"; total: number }
  | { phase: "inserting_lines"; processed: number; total: number }
  | { phase: "done"; summary: ImportSummary }
  | { phase: "error"; message: string; code?: string };

function chunk(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("report");

  if (!(file instanceof File)) {
    return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return Response.json({ error: "Format invalide. Envoyez un fichier CSV." }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SseEvent) => controller.enqueue(chunk(event));

      try {
        const restaurant = await getOrCreateRestaurant(user.id);

        emit({ phase: "start", filename: file.name });

        const content = await (file as File).text();
        const fileSha = hashImportFile(content);

        // Duplicate file check
        const { data: existingBatch } = await supabase
          .from("pos_import_batches")
          .select("id")
          .eq("restaurant_id", restaurant.id)
          .eq("file_sha256", fileSha)
          .maybeSingle();

        if (existingBatch?.id) {
          emit({
            phase: "error",
            message: "Ce fichier CSV a déjà été importé. Utilise un export plus récent si besoin.",
            code: "duplicate_file",
          });
          controller.close();
          return;
        }

        // Parsing
        emit({ phase: "parsing", message: "Analyse du fichier par IA…" });
        const parsed = await parsePosSalesCsvContent(content, file.name);

        emit({
          phase: "parsed",
          rows: parsed.saleItems.length,
          days: parsed.dailySummaries.length,
          method: parsed.parseMethod,
          warnings: parsed.warnings,
        });

        // Menu items for unmatched detection
        const { data: menuItems } = await supabase
          .from("menu_items")
          .select("item_name")
          .eq("restaurant_id", restaurant.id);

        const menuNames = (menuItems ?? []).map((m) => m.item_name as string);

        // Identify unmatched POS items (unique names not found in menu)
        const uniquePosNames = [...new Set(parsed.saleItems.map((s) => s.item.trim()).filter(Boolean))];
        const unmatchedPosItems = uniquePosNames.filter(
          (posName) => !menuNames.some((menuName) => posItemMatchesMenuName(posName, menuName)),
        );

        // Check which days are new vs already existing
        emit({ phase: "checking" });
        const reportRows = parsed.dailySummaries.map((summary) => ({
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
          .in("report_day", reportDays.length > 0 ? reportDays : [""]);

        const existingDays = new Set((existingReports ?? []).map((r) => r.report_day));
        const newDays = reportDays.filter((d) => !existingDays.has(d)).length;
        const updatedDays = reportDays.filter((d) => existingDays.has(d)).length;

        // Upsert daily reports
        emit({ phase: "inserting_reports", total: reportRows.length });
        if (reportRows.length > 0) {
          const { error: reportError } = await supabase
            .from("pos_daily_sales_reports")
            .upsert(reportRows, { onConflict: "restaurant_id,report_day" });

          if (reportError) {
            const msg = reportError.message ?? "";
            if (isMissingPosDailySalesReportsTableMessage(msg)) {
              emit({ phase: "error", message: "Table manquante : applique les migrations Supabase.", code: "missing_table" });
              controller.close();
              return;
            }
            emit({ phase: "error", message: `Import journalier impossible : ${msg}` });
            controller.close();
            return;
          }
        }

        // Period bounds
        const periodStart = reportRows.reduce<string | null>((min, r) => (!min || r.report_day < min ? r.report_day : min), null);
        const periodEnd = reportRows.reduce<string | null>((max, r) => (!max || r.report_day > max ? r.report_day : max), null);

        // Create batch
        const { data: batch, error: batchError } = await supabase
          .from("pos_import_batches")
          .insert({
            restaurant_id: restaurant.id,
            source: "csv_import",
            filename: file.name,
            file_sha256: fileSha,
            period_start: periodStart,
            period_end: periodEnd,
            row_count: parsed.saleItems.length,
          })
          .select("id")
          .single();

        if (batchError || !batch) {
          const msg = batchError?.message ?? "";
          if (isMissingPosSaleLinesTableMessage(msg)) {
            emit({ phase: "error", message: "Tables POS absentes : applique les migrations Supabase.", code: "missing_items_table" });
            controller.close();
            return;
          }
          emit({ phase: "error", message: `Création du lot impossible : ${msg}` });
          controller.close();
          return;
        }

        const { lines, transactions } = buildPosImportRows({
          restaurantId: restaurant.id,
          importBatchId: batch.id,
          items: parsed.saleItems,
        });

        // Count lines before insert to compute actual inserts vs skipped
        const { count: linesBefore } = await supabase
          .from("pos_sale_lines")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id);

        // Upsert transactions
        let transactionsInserted = 0;
        if (transactions.length > 0) {
          const { count: txBefore } = await supabase
            .from("pos_transactions")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id);

          await supabase.from("pos_transactions").upsert(transactions, {
            onConflict: "restaurant_id,external_transaction_id",
            ignoreDuplicates: false,
          });

          const { count: txAfter } = await supabase
            .from("pos_transactions")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id);

          transactionsInserted = Math.max(0, (txAfter ?? 0) - (txBefore ?? 0));
        }

        // Upsert sale lines in chunks with live progress
        const chunkSize = 500;
        let processed = 0;
        emit({ phase: "inserting_lines", processed: 0, total: lines.length });

        for (let i = 0; i < lines.length; i += chunkSize) {
          const chunkSlice = lines.slice(i, i + chunkSize);
          const { error: linesError } = await supabase.from("pos_sale_lines").upsert(chunkSlice, {
            onConflict: "restaurant_id,dedup_key",
            ignoreDuplicates: true,
          });

          if (linesError) {
            const msg = linesError.message ?? "";
            if (isMissingPosSaleLinesTableMessage(msg)) {
              emit({ phase: "error", message: "Tables POS absentes : applique les migrations Supabase.", code: "missing_items_table" });
              controller.close();
              return;
            }
            emit({ phase: "error", message: `Import lignes impossible : ${msg}` });
            controller.close();
            return;
          }

          processed += chunkSlice.length;
          emit({ phase: "inserting_lines", processed, total: lines.length });
        }

        const { count: linesAfter } = await supabase
          .from("pos_sale_lines")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id);

        const linesInserted = Math.max(0, (linesAfter ?? 0) - (linesBefore ?? 0));
        const linesSkipped = lines.length - linesInserted;

        revalidatePath("/dashboard/stats");
        revalidatePath("/dashboard/integrations/sales-csv");
        revalidatePath("/dashboard/pricing-suggestions");

        emit({
          phase: "done",
          summary: {
            filename: file.name,
            parseMethod: parsed.parseMethod,
            model: parsed.model,
            totalSaleLines: lines.length,
            linesInserted,
            linesSkipped,
            totalTransactions: transactions.length,
            transactionsInserted,
            newDays,
            updatedDays,
            periodStart,
            periodEnd,
            unmatchedPosItems,
            warnings: parsed.warnings,
          },
        });
      } catch (err) {
        emit({
          phase: "error",
          message: err instanceof Error ? err.message : "Erreur serveur inattendue.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
