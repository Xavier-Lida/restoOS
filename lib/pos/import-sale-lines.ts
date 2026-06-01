import { createHash } from "node:crypto";

import { buildPosSaleLineDedupKey } from "@/lib/pos/dedup-key";
import { normalizePosItemName } from "@/lib/square/item-name";
import type { SaleItem } from "@/lib/square/sale-items-csv";

export type PosSaleLineInsert = {
  restaurant_id: string;
  import_batch_id: string;
  dedup_key: string;
  sale_date: string;
  sold_at: string | null;
  pos_item_name: string;
  pos_item_key: string;
  category: string | null;
  quantity: number;
  gross_sales_cad: number;
  discounts_cad: number;
  net_sales_cad: number;
  taxes_cad: number;
  external_transaction_id: string | null;
  external_payment_id: string | null;
  device: string | null;
  operator: string | null;
  payment_method: string | null;
};

export type PosTransactionInsert = {
  restaurant_id: string;
  import_batch_id: string;
  external_transaction_id: string;
  external_payment_id: string | null;
  sold_at: string | null;
  sale_date: string;
  gross_sales_cad: number;
  net_sales_cad: number;
  taxes_cad: number;
  device: string | null;
  operator: string | null;
  payment_method: string | null;
};

function combineSoldAt(date: string, time: string, timezone: string): string | null {
  const d = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(d)) {
    return null;
  }
  const t = time.trim();
  if (!t) {
    return `${d}T00:00:00`;
  }
  const tz = timezone.trim();
  return tz ? `${d}T${t}${tz.startsWith("+") || tz.startsWith("-") ? tz : ""}` : `${d}T${t}`;
}

export function hashImportFile(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function buildPosImportRows(args: {
  restaurantId: string;
  importBatchId: string;
  items: SaleItem[];
}): { lines: PosSaleLineInsert[]; transactions: PosTransactionInsert[] } {
  const lines: PosSaleLineInsert[] = [];
  const transactionBuckets = new Map<string, PosTransactionInsert>();
  let lineIndex = 0;

  for (const row of args.items) {
    const posItemName = row.item.trim();
    if (!posItemName) {
      continue;
    }
    const saleDate = row.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(saleDate)) {
      continue;
    }

    const soldAt = combineSoldAt(row.date, row.time, row.timezone);
    const txId = row.transactionId.trim();
    const payId = row.paymentId.trim();
    const dedupKey = buildPosSaleLineDedupKey({
      restaurantId: args.restaurantId,
      externalTransactionId: txId,
      externalPaymentId: payId,
      posItemName,
      soldAtIso: soldAt,
      saleDate,
      lineIndex,
    });
    lineIndex += 1;

    lines.push({
      restaurant_id: args.restaurantId,
      import_batch_id: args.importBatchId,
      dedup_key: dedupKey,
      sale_date: saleDate,
      sold_at: soldAt,
      pos_item_name: posItemName,
      pos_item_key: normalizePosItemName(posItemName),
      category: row.category.trim() || null,
      quantity: row.quantity,
      gross_sales_cad: Math.round(row.grossSales * 100) / 100,
      discounts_cad: Math.round(row.discounts * 100) / 100,
      net_sales_cad: Math.round(row.netSales * 100) / 100,
      taxes_cad: Math.round(row.taxes * 100) / 100,
      external_transaction_id: txId || null,
      external_payment_id: payId || null,
      device: row.device.trim() || null,
      operator: row.operator.trim() || null,
      payment_method: row.paymentMethod.trim() || null,
    });

    if (txId) {
      const existing = transactionBuckets.get(txId);
      if (existing) {
        existing.gross_sales_cad += row.grossSales;
        existing.net_sales_cad += row.netSales;
        existing.taxes_cad += row.taxes;
      } else {
        transactionBuckets.set(txId, {
          restaurant_id: args.restaurantId,
          import_batch_id: args.importBatchId,
          external_transaction_id: txId,
          external_payment_id: payId || null,
          sold_at: soldAt,
          sale_date: saleDate,
          gross_sales_cad: row.grossSales,
          net_sales_cad: row.netSales,
          taxes_cad: row.taxes,
          device: row.device.trim() || null,
          operator: row.operator.trim() || null,
          payment_method: row.paymentMethod.trim() || null,
        });
      }
    }
  }

  const transactions = [...transactionBuckets.values()].map((t) => ({
    ...t,
    gross_sales_cad: Math.round(t.gross_sales_cad * 100) / 100,
    net_sales_cad: Math.round(t.net_sales_cad * 100) / 100,
    taxes_cad: Math.round(t.taxes_cad * 100) / 100,
  }));

  return { lines, transactions };
}
