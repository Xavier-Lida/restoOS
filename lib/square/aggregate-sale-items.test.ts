import { describe, expect, it } from "vitest";

import { aggregateSaleItemsForImport } from "@/lib/square/aggregate-sale-items";
import type { SaleItem } from "@/lib/square/sale-items-csv";

function row(partial: Partial<SaleItem> & Pick<SaleItem, "date" | "item" | "quantity">): SaleItem {
  return {
    date: partial.date,
    time: "",
    timezone: "",
    category: "",
    item: partial.item,
    quantity: partial.quantity,
    grossSales: 0,
    discounts: 0,
    netSales: partial.netSales ?? 0,
    taxes: 0,
    transactionId: "",
    paymentId: "",
    device: "",
    operator: "",
    paymentMethod: "",
  };
}

describe("aggregateSaleItemsForImport", () => {
  it("sums quantity and net sales for same day and item", () => {
    const aggregated = aggregateSaleItemsForImport([
      row({ date: "2026-05-01", item: "Burger", quantity: 2, netSales: 24 }),
      row({ date: "2026-05-01", item: "Burger", quantity: 3, netSales: 36 }),
    ]);
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]?.quantity).toBe(5);
    expect(aggregated[0]?.net_sales_cad).toBe(60);
    expect(aggregated[0]?.pos_item_key).toBe("burger");
  });

  it("skips rows without item name", () => {
    const aggregated = aggregateSaleItemsForImport([row({ date: "2026-05-01", item: "  ", quantity: 1 })]);
    expect(aggregated).toHaveLength(0);
  });
});
