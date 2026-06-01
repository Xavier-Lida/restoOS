import { describe, expect, it } from "vitest";

import { normalizePosItemName, posItemMatchesMenuName } from "@/lib/square/item-name";

describe("posItemMatchesMenuName", () => {
  it("matches exact normalized names", () => {
    expect(posItemMatchesMenuName("Burger Classique", "burger classique")).toBe(true);
  });

  it("matches substring bidirectionally", () => {
    expect(posItemMatchesMenuName("Burger", "Burger Classique")).toBe(true);
    expect(posItemMatchesMenuName("Burger Classique", "Burger")).toBe(true);
  });

  it("rejects empty names", () => {
    expect(posItemMatchesMenuName("", "Burger")).toBe(false);
    expect(posItemMatchesMenuName("Burger", "  ")).toBe(false);
  });

  it("normalizes accents via fr-CA locale", () => {
    expect(normalizePosItemName("  Café  ")).toBe("café");
  });
});
