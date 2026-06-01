import { describe, expect, it } from "vitest";

import { buildPosImportRows, hashImportFile } from "@/lib/pos/import-sale-lines";
import type { SaleItem } from "@/lib/square/sale-items-csv";

describe("buildPosImportRows", () => {
  it("builds deduped line rows from sale items", () => {
    const items: SaleItem[] = [
      {
        date: "2026-05-01",
        time: "12:00:00",
        timezone: "",
        category: "Plats",
        item: "Poutine",
        quantity: 2,
        grossSales: 24,
        discounts: 0,
        netSales: 24,
        taxes: 3,
        transactionId: "T1",
        paymentId: "P1",
        device: "",
        operator: "",
        paymentMethod: "",
      },
    ];

    const { lines, transactions } = buildPosImportRows({
      restaurantId: "rest-1",
      importBatchId: "batch-1",
      items,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.pos_item_key).toBeTruthy();
    expect(lines[0]?.dedup_key).toHaveLength(64);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.external_transaction_id).toBe("T1");
  });
});

describe("hashImportFile", () => {
  it("returns a hex sha256", () => {
    const hash = hashImportFile("hello");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
