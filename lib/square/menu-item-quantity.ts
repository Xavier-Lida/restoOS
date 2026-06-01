import { posItemMatchesMenuName } from "@/lib/square/item-name";

export const SALES_WINDOW_DAYS = 30;

export function saleDateFromDaysAgo(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Somme les quantités POS par clé menu (match nom permissif). */
export function mapPosQuantitiesToMenu(
  menuItems: ReadonlyArray<{ id: string; item_name: string }>,
  qtyByPosKey: ReadonlyMap<string, number>,
): Map<string, number> {
  const posEntries = [...qtyByPosKey.entries()];
  const out = new Map<string, number>();

  for (const menuItem of menuItems) {
    let total = 0;
    for (const [posKey, qty] of posEntries) {
      if (posItemMatchesMenuName(posKey, menuItem.item_name)) {
        total += qty;
      }
    }
    if (total > 0) {
      out.set(menuItem.id, total);
    }
  }

  return out;
}
