import type { SaleItem } from "@/lib/square/sale-items-csv";
import { normalizePosItemName } from "@/lib/square/item-name";

export type AggregatedSaleItemRow = {
  sale_date: string;
  pos_item_name: string;
  pos_item_key: string;
  quantity: number;
  net_sales_cad: number;
};

function bucketKey(saleDate: string, posItemKey: string): string {
  return `${saleDate}\0${posItemKey}`;
}

/**
 * Agrège les lignes CSV article par (date, article) pour upsert en base.
 * Ignore les lignes sans nom d'article ou sans date ISO valide.
 */
export function aggregateSaleItemsForImport(items: SaleItem[]): AggregatedSaleItemRow[] {
  const buckets = new Map<string, AggregatedSaleItemRow>();

  for (const row of items) {
    const posItemName = row.item.trim();
    if (!posItemName) {
      continue;
    }
    const saleDate = row.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(saleDate)) {
      continue;
    }

    const posItemKey = normalizePosItemName(posItemName);
    const key = bucketKey(saleDate, posItemKey);
    const existing = buckets.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      existing.net_sales_cad += row.netSales;
      continue;
    }

    buckets.set(key, {
      sale_date: saleDate,
      pos_item_name: posItemName,
      pos_item_key: posItemKey,
      quantity: row.quantity,
      net_sales_cad: row.netSales,
    });
  }

  return [...buckets.values()];
}
