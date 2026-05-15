import type { MenuItemRecord } from "@/lib/onboarding/types";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

const MENU_CSV_HEADER = ["categorie", "nom", "prix_cad", "notes"] as const;

/** UTF-8 CSV (BOM) for Excel ; rows triées par catégorie (fr) puis position. */
export function buildMenuCsv(items: MenuItemRecord[]): string {
  const header = MENU_CSV_HEADER.join(",");
  const sorted = [...items].sort((a, b) => {
    const ca = (a.category.trim() || "Autre").localeCompare(b.category.trim() || "Autre", "fr");
    if (ca !== 0) return ca;
    return a.position - b.position;
  });
  const lines = sorted.map((row) =>
    [
      csvEscape(row.category.trim() || "Autre"),
      csvEscape(row.item_name),
      csvEscape(Number(row.price_cad).toFixed(2)),
      csvEscape(row.notes ?? ""),
    ].join(","),
  );
  return `\ufeff${[header, ...lines].join("\r\n")}\r\n`;
}
