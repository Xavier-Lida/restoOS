import { describe, expect, it } from "vitest";

import { mapPosQuantitiesToMenu, saleDateFromDaysAgo } from "@/lib/square/menu-item-quantity";

describe("saleDateFromDaysAgo", () => {
  it("returns ISO date 30 days before reference", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(saleDateFromDaysAgo(30, now)).toBe("2026-05-02");
  });
});

describe("mapPosQuantitiesToMenu", () => {
  it("aggregates multiple pos keys matching one menu item", () => {
    const qtyByPosKey = new Map([
      ["burger", 5],
      ["burger combo", 3],
    ]);
    const menu = [{ id: "m1", item_name: "Burger" }];
    const out = mapPosQuantitiesToMenu(menu, qtyByPosKey);
    expect(out.get("m1")).toBe(8);
  });

  it("omits menu items with no matching sales", () => {
    const out = mapPosQuantitiesToMenu([{ id: "m1", item_name: "Salade" }], new Map([["burger", 2]]));
    expect(out.has("m1")).toBe(false);
  });
});
