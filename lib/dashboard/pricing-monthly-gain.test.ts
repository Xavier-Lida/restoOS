import { describe, expect, it } from "vitest";

import { applyMonthlyGainFromSalesVolume } from "@/lib/dashboard/apply-suggestion-monthly-gain";
import { computeMonthlyGainFromQuantity } from "@/lib/dashboard/pricing-monthly-gain";

describe("computeMonthlyGainFromQuantity", () => {
  it("returns delta times quantity when qty positive", () => {
    expect(computeMonthlyGainFromQuantity(1.5, 40)).toBe(60);
  });

  it("returns null when quantity is zero", () => {
    expect(computeMonthlyGainFromQuantity(2, 0)).toBeNull();
  });

  it("returns null when quantity negative", () => {
    expect(computeMonthlyGainFromQuantity(2, -1)).toBeNull();
  });
});

describe("applyMonthlyGainFromSalesVolume", () => {
  it("sets gain from menu item quantities", () => {
    const qty = new Map([["id-1", 10]]);
    const out = applyMonthlyGainFromSalesVolume(
      [
        {
          menu_item_id: "id-1",
          current_price_cad: 10,
          suggested_price_cad: 11,
          estimated_monthly_gain_cad: 999,
        },
      ],
      qty,
    );
    expect(out[0]?.estimated_monthly_gain_cad).toBe(10);
  });

  it("sets null when no quantity for menu item", () => {
    const out = applyMonthlyGainFromSalesVolume(
      [
        {
          menu_item_id: "id-2",
          current_price_cad: 10,
          suggested_price_cad: 12,
          estimated_monthly_gain_cad: 50,
        },
      ],
      new Map(),
    );
    expect(out[0]?.estimated_monthly_gain_cad).toBeNull();
  });
});
