import { describe, expect, it } from "vitest";

import { buildPosSaleLineDedupKey } from "@/lib/pos/dedup-key";

describe("buildPosSaleLineDedupKey", () => {
  it("is stable for the same inputs", () => {
    const args = {
      restaurantId: "rest-1",
      externalTransactionId: "tx-9",
      externalPaymentId: "pay-1",
      posItemName: "Poutine",
      soldAtIso: "2026-05-01T12:00:00",
      saleDate: "2026-05-01",
      lineIndex: 0,
    };
    expect(buildPosSaleLineDedupKey(args)).toBe(buildPosSaleLineDedupKey(args));
  });

  it("differs when transaction or item changes", () => {
    const base = {
      restaurantId: "rest-1",
      externalTransactionId: "tx-9",
      externalPaymentId: "pay-1",
      posItemName: "Poutine",
      soldAtIso: null as string | null,
      saleDate: "2026-05-01",
      lineIndex: 0,
    };
    const a = buildPosSaleLineDedupKey(base);
    const b = buildPosSaleLineDedupKey({ ...base, posItemName: "Burger" });
    expect(a).not.toBe(b);
  });
});
