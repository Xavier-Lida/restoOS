import { bestDelimiter, normalizeHeader, splitDelimitedLine, type CsvDelimiter } from "@/lib/square/csv-line";

export type SaleItem = {
  date: string;
  time: string;
  timezone: string;
  category: string;
  item: string;
  quantity: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  taxes: number;
  transactionId: string;
  paymentId: string;
  device: string;
  operator: string;
  paymentMethod: string;
};

type SaleItemColumnKey = keyof SaleItem;

const SALE_ITEM_COLUMN_SYNONYMS: Record<SaleItemColumnKey, readonly string[]> = {
  date: ["date"],
  time: ["heure", "time"],
  timezone: ["fuseau horaire", "timezone"],
  category: ["categorie", "category"],
  item: ["article", "item name", "item"],
  quantity: ["qte", "quantite", "quantity"],
  // "montant brut" (Square CA) = net + taxes; use as gross fallback when no better column exists
  grossSales: ["ventes brutes", "gross sales", "montant brut", "prix net"],
  discounts: ["reductions", "discounts", "montant de remise"],
  // "prix net" (Square CA) = after discounts, before taxes
  netSales: ["ventes nettes", "net sales", "prix net"],
  // "tps" = first Canadian tax (GST); TVQ is handled separately as taxes2
  taxes: ["taxes", "tax", "tps"],
  transactionId: ["no de transaction", "id de la transaction", "transaction id", "id transaction"],
  paymentId: ["no de paiement", "id de paiement", "payment id", "id paiement"],
  device: ["nom de l'appareil", "device name"],
  operator: ["point de vente", "employe", "employee", "caisse"],
  paymentMethod: ["marque de carte", "card brand"],
};

type SaleItemColumnIndex = Record<SaleItemColumnKey, number | null>;
// taxes2 captures a second tax column (e.g. TVQ in Square Canada) summed with taxes
type ColumnIndex = SaleItemColumnIndex & { taxes2: number | null };

function resolveSaleItemsDelimiter(headerLine: string): CsvDelimiter {
  const tabCount = splitDelimitedLine(headerLine, "\t").length;
  if (tabCount >= 8) {
    return "\t";
  }
  return bestDelimiter(headerLine);
}

function findColumnIndex(
  normalizedHeaders: readonly string[],
  patternsOrdered: readonly string[],
  role: "tax" | "other",
): number | null {
  for (const pattern of patternsOrdered) {
    for (let i = 0; i < normalizedHeaders.length; i += 1) {
      const h = normalizedHeaders[i] ?? "";
      const skipTaxMeta =
        role === "tax" && (h === "type de taxe" || h.startsWith("type de taxe") || h.includes("tax type"));
      if (skipTaxMeta) {
        continue;
      }
      if (h === pattern || h.startsWith(`${pattern} (`)) {
        return i;
      }
    }
  }
  return null;
}

function buildSaleItemColumnIndex(headers: string[]): ColumnIndex {
  const normalizedHeaders = headers.map(normalizeHeader);
  const keys = Object.keys(SALE_ITEM_COLUMN_SYNONYMS) as SaleItemColumnKey[];
  const entries = keys.map((key) => {
    const patterns = SALE_ITEM_COLUMN_SYNONYMS[key];
    const role = key === "taxes" ? "tax" : "other";
    return [key, findColumnIndex(normalizedHeaders, patterns, role)] as const;
  });
  const idx = Object.fromEntries(entries) as SaleItemColumnIndex;

  // If "taxes" resolved to TPS, look for TVQ as a second tax column to sum
  const taxes2 = findColumnIndex(normalizedHeaders, ["tvq"], "tax");

  return { ...idx, taxes2 };
}

function cellAt(cols: readonly string[], idx: number | null): string {
  if (idx === null) {
    return "";
  }
  return cols[idx]?.trim() ?? "";
}

export function parseAmount(str: string): number {
  const normalized = str
    .replaceAll("\uFEFF", "")
    .replaceAll("\u00A0", "")
    .replaceAll(/\s+/gu, "")
    .replaceAll("$", "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseQuantity(str: string): number {
  const t = str.replaceAll("\u00A0", "").replaceAll(/\s+/gu, "").replace(",", ".");
  const parsed = Number.parseFloat(t);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value.trim());
}

function rowToSaleItem(cols: string[], idx: ColumnIndex): SaleItem | null {
  const date = cellAt(cols, idx.date);
  if (!isIsoDate(date)) {
    return null;
  }

  const taxes = parseAmount(cellAt(cols, idx.taxes)) + parseAmount(cellAt(cols, idx.taxes2));
  const netSales = parseAmount(cellAt(cols, idx.netSales));

  // When "montant brut" is used for grossSales it includes taxes; prefer netSales when
  // the resolved grossSales column is the same index as netSales (both = "prix net").
  const rawGross = parseAmount(cellAt(cols, idx.grossSales));
  const grossSales = idx.grossSales === idx.netSales ? netSales : rawGross;

  return {
    date: date.trim(),
    time: cellAt(cols, idx.time),
    timezone: cellAt(cols, idx.timezone),
    category: cellAt(cols, idx.category),
    item: cellAt(cols, idx.item),
    quantity: parseQuantity(cellAt(cols, idx.quantity)),
    grossSales,
    discounts: parseAmount(cellAt(cols, idx.discounts)),
    netSales,
    taxes,
    transactionId: cellAt(cols, idx.transactionId),
    paymentId: cellAt(cols, idx.paymentId),
    device: cellAt(cols, idx.device),
    operator: cellAt(cols, idx.operator),
    paymentMethod: cellAt(cols, idx.paymentMethod),
  };
}

export function parseSquareCSV(content: string): SaleItem[] {
  const body = content.replace(/^\uFEFF/gu, "");
  const lines = body.split(/\r?\n/gu);
  const headerLineIndex = lines.findIndex((l) => l.trim().length > 0);
  if (headerLineIndex === -1) {
    return [];
  }

  const headerLine = (lines[headerLineIndex] ?? "").trim().replace(/^\uFEFF/gu, "");
  const delimiter = resolveSaleItemsDelimiter(headerLine);
  const headers = splitDelimitedLine(headerLine, delimiter);
  if (headers.length < 4) {
    return [];
  }

  const columnIndex = buildSaleItemColumnIndex(headers);
  if (columnIndex.date === null) {
    return [];
  }

  const out: SaleItem[] = [];
  for (let li = headerLineIndex + 1; li < lines.length; li += 1) {
    const rawLine = lines[li] ?? "";
    if (!rawLine.trim()) {
      continue;
    }
    const cols = splitDelimitedLine(rawLine, delimiter);
    const item = rowToSaleItem(cols, columnIndex);
    if (item === null) {
      continue;
    }
    out.push(item);
  }
  return out;
}
