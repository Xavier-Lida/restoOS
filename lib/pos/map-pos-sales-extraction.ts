import type { SaleItem } from "@/lib/square/sale-items-csv";
import type { PosSalesCsvExtractionLlm } from "@/lib/schemas/pos-sales-csv-extraction";
import type { ParsedSquareSummary } from "@/lib/square/csv";

function normalizeIsoDate(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function num(value: number | null | undefined, fallback = 0): number {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

export function mapExtractionToSaleItems(extraction: PosSalesCsvExtractionLlm): SaleItem[] {
  const items: SaleItem[] = [];

  for (const row of extraction.sale_lines) {
    const saleDate = normalizeIsoDate(row.sale_date);
    if (!saleDate || !row.item_name.trim()) {
      continue;
    }
    items.push({
      date: saleDate,
      time: row.sale_time?.trim() ?? "",
      timezone: "",
      category: row.category?.trim() ?? "",
      item: row.item_name.trim(),
      quantity: num(row.quantity, 1),
      grossSales: num(row.gross_sales_cad),
      discounts: num(row.discounts_cad),
      netSales: num(row.net_sales_cad),
      taxes: num(row.taxes_cad),
      transactionId: row.transaction_id?.trim() ?? "",
      paymentId: row.payment_id?.trim() ?? "",
      device: row.device?.trim() ?? "",
      operator: row.operator?.trim() ?? "",
      paymentMethod: row.payment_method?.trim() ?? "",
    });
  }

  return items;
}

export function mapExtractionToDailySummaries(
  extraction: PosSalesCsvExtractionLlm,
  filename: string,
): ParsedSquareSummary[] {
  const summaries: ParsedSquareSummary[] = [];

  for (const row of extraction.daily_summaries ?? []) {
    const reportDay = normalizeIsoDate(row.report_day);
    if (!reportDay) {
      continue;
    }
    summaries.push({
      periodStart: reportDay,
      periodEnd: reportDay,
      reportDay,
      grossSalesCad: num(row.gross_sales_cad),
      netSalesCad: num(row.net_sales_cad),
      totalSalesCad: num(row.total_sales_cad, num(row.net_sales_cad)),
      taxesCad: num(row.taxes_cad),
      tipsCad: num(row.tips_cad),
      paymentsTotalCad: num(row.payments_total_cad),
      transactionsCount: num(row.transactions_count),
      metrics: { source: "llm_extraction", filename },
    });
  }

  return summaries;
}

export function deriveDailySummariesFromSaleItems(
  items: SaleItem[],
  filename: string,
): ParsedSquareSummary[] {
  const byDay = new Map<
    string,
    {
      gross: number;
      net: number;
      taxes: number;
      txIds: Set<string>;
    }
  >();

  for (const row of items) {
    const day = row.date;
    if (!day) {
      continue;
    }
    const bucket = byDay.get(day) ?? { gross: 0, net: 0, taxes: 0, txIds: new Set<string>() };
    bucket.gross += row.grossSales;
    bucket.net += row.netSales;
    bucket.taxes += row.taxes;
    if (row.transactionId) {
      bucket.txIds.add(row.transactionId);
    }
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reportDay, bucket]) => ({
      periodStart: reportDay,
      periodEnd: reportDay,
      reportDay,
      grossSalesCad: Math.round(bucket.gross * 100) / 100,
      netSalesCad: Math.round(bucket.net * 100) / 100,
      totalSalesCad: Math.round(bucket.net * 100) / 100,
      taxesCad: Math.round(bucket.taxes * 100) / 100,
      tipsCad: 0,
      paymentsTotalCad: Math.round(bucket.net * 100) / 100,
      transactionsCount: bucket.txIds.size || items.filter((i) => i.date === reportDay).length,
      metrics: { source: "derived_from_lines", filename },
    }));
}
