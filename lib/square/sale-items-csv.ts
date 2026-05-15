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
  grossSales: ["ventes brutes", "gross sales"],
  discounts: ["reductions", "discounts"],
  netSales: ["ventes nettes", "net sales"],
  taxes: ["taxes", "tax"],
  transactionId: ["no de transaction", "id de la transaction", "transaction id"],
  paymentId: ["no de paiement", "id de paiement", "payment id"],
  device: ["nom de l'appareil", "device name"],
  operator: ["point de vente", "employe", "employee"],
  paymentMethod: ["marque de carte", "card brand"],
};

type SaleItemColumnIndex = Record<SaleItemColumnKey, number | null>;

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

function buildSaleItemColumnIndex(headers: string[]): SaleItemColumnIndex {
  const normalizedHeaders = headers.map(normalizeHeader);
  const keys = Object.keys(SALE_ITEM_COLUMN_SYNONYMS) as SaleItemColumnKey[];
  const entries = keys.map((key) => {
    const patterns = SALE_ITEM_COLUMN_SYNONYMS[key];
    const role = key === "taxes" ? "tax" : "other";
    return [key, findColumnIndex(normalizedHeaders, patterns, role)] as const;
  });
  return Object.fromEntries(entries) as SaleItemColumnIndex;
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

function rowToSaleItem(cols: string[], idx: SaleItemColumnIndex): SaleItem | null {
  const date = cellAt(cols, idx.date);
  if (!isIsoDate(date)) {
    return null;
  }

  return {
    date: date.trim(),
    time: cellAt(cols, idx.time),
    timezone: cellAt(cols, idx.timezone),
    category: cellAt(cols, idx.category),
    item: cellAt(cols, idx.item),
    quantity: parseQuantity(cellAt(cols, idx.quantity)),
    grossSales: parseAmount(cellAt(cols, idx.grossSales)),
    discounts: parseAmount(cellAt(cols, idx.discounts)),
    netSales: parseAmount(cellAt(cols, idx.netSales)),
    taxes: parseAmount(cellAt(cols, idx.taxes)),
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
