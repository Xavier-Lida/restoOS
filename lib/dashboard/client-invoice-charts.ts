import "server-only";

import { loadClientInvoices, type ClientInvoiceRow } from "@/lib/dashboard/client-invoices";
import type {
  ClientInvoiceByClientPoint,
  ClientInvoiceLineMixPoint,
  ClientInvoiceRevenueDailyPoint,
  ClientInvoiceTaxMixPoint,
} from "@/lib/schemas/chart-inputs";
import type { RevenueRange } from "@/lib/square/dashboard";

const rangeToDays: Record<RevenueRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function fromDateForRange(range: RevenueRange): string {
  const days = rangeToDays[range];
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function effectiveInvoiceDay(row: ClientInvoiceRow): string {
  if (row.invoice_date && /^\d{4}-\d{2}-\d{2}$/u.test(row.invoice_date)) {
    return row.invoice_date;
  }
  return row.uploaded_at.slice(0, 10);
}

function clientDisplayName(row: ClientInvoiceRow): string {
  const fromAi = row.ai_extraction.client_name?.trim();
  const fromLabel = row.client_label?.trim();
  const name = fromLabel || fromAi || "";
  return name.length > 0 ? name : "Client non identifié";
}

function invoiceAmountCad(row: ClientInvoiceRow): number {
  const fromAi = row.ai_extraction.amount_total_cad;
  if (typeof fromAi === "number" && Number.isFinite(fromAi)) {
    return fromAi;
  }
  return row.amount_cad != null && Number.isFinite(row.amount_cad) ? row.amount_cad : 0;
}

export function filterInvoicesInRange(rows: ClientInvoiceRow[], range: RevenueRange): ClientInvoiceRow[] {
  const from = fromDateForRange(range);
  return rows.filter((row) => effectiveInvoiceDay(row) >= from);
}

export function buildClientInvoiceDailyPoints(rows: ClientInvoiceRow[]): ClientInvoiceRevenueDailyPoint[] {
  const map = new Map<string, { totalCad: number; invoiceCount: number }>();
  for (const row of rows) {
    const day = effectiveInvoiceDay(row);
    const bucket = map.get(day) ?? { totalCad: 0, invoiceCount: 0 };
    bucket.totalCad += invoiceAmountCad(row);
    bucket.invoiceCount += 1;
    map.set(day, bucket);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, totalCad: v.totalCad, invoiceCount: v.invoiceCount }));
}

export function buildClientInvoiceByClientPoints(rows: ClientInvoiceRow[], limit = 12): ClientInvoiceByClientPoint[] {
  const map = new Map<string, { totalCad: number; invoiceCount: number; display: string }>();
  for (const row of rows) {
    const display = clientDisplayName(row);
    const key = display.toLocaleLowerCase("fr-CA");
    const bucket = map.get(key) ?? { totalCad: 0, invoiceCount: 0, display };
    bucket.totalCad += invoiceAmountCad(row);
    bucket.invoiceCount += 1;
    map.set(key, bucket);
  }
  return [...map.values()]
    .map((v) => ({
      clientKey: v.display,
      totalCad: v.totalCad,
      invoiceCount: v.invoiceCount,
    }))
    .sort((a, b) => b.totalCad - a.totalCad)
    .slice(0, limit);
}

function lineLabel(description: string, sku: string | null | undefined): string {
  const d = description.trim().slice(0, 48);
  if (d.length > 0) {
    return d;
  }
  const s = sku?.trim();
  return s && s.length > 0 ? s : "Ligne sans libellé";
}

function lineAmount(line: {
  line_total_cad?: number | null;
  quantity?: number | null;
  unit_price_cad?: number | null;
}): number {
  if (line.line_total_cad != null && Number.isFinite(line.line_total_cad)) {
    return line.line_total_cad;
  }
  const q = line.quantity ?? 0;
  const u = line.unit_price_cad ?? 0;
  if (q > 0 && u > 0 && Number.isFinite(q) && Number.isFinite(u)) {
    return q * u;
  }
  return 0;
}

export function buildClientInvoiceLineMixPoints(rows: ClientInvoiceRow[], limit = 10): ClientInvoiceLineMixPoint[] {
  const map = new Map<
    string,
    { totalCad: number; quantity: number; displayLabel: string }
  >();
  for (const row of rows) {
    const lines = row.ai_extraction.lines;
    if (!lines?.length) {
      continue;
    }
    for (const line of lines) {
      const displayLabel = lineLabel(line.description ?? "", line.sku);
      const key = displayLabel.toLocaleLowerCase("fr-CA");
      const prev = map.get(key);
      const addCad = lineAmount(line);
      const addQty = line.quantity != null && Number.isFinite(line.quantity) ? line.quantity : 0;
      if (prev) {
        map.set(key, {
          totalCad: prev.totalCad + addCad,
          quantity: prev.quantity + addQty,
          displayLabel: prev.displayLabel,
        });
      } else {
        map.set(key, { totalCad: addCad, quantity: addQty, displayLabel });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.totalCad - a.totalCad)
    .slice(0, limit)
    .map((v) => ({ label: v.displayLabel, totalCad: v.totalCad, quantity: v.quantity }));
}

export function buildClientInvoiceTaxMixPoints(rows: ClientInvoiceRow[], limit = 8): ClientInvoiceTaxMixPoint[] {
  const map = new Map<string, { totalCad: number; display: string }>();
  for (const row of rows) {
    const taxLines = row.ai_extraction.tax_lines;
    if (!taxLines?.length) {
      continue;
    }
    for (const t of taxLines) {
      const raw = (t.label ?? "").trim() || "Taxe";
      const key = raw.toLocaleLowerCase("fr-CA");
      const amt = t.amount_cad != null && Number.isFinite(t.amount_cad) ? t.amount_cad : 0;
      const prev = map.get(key);
      if (prev) {
        map.set(key, { totalCad: prev.totalCad + amt, display: prev.display });
      } else {
        map.set(key, { totalCad: amt, display: raw });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.totalCad - a.totalCad)
    .slice(0, limit)
    .map((v) => ({ label: v.display, totalCad: v.totalCad }));
}

export type ClientInvoiceChartBundle = {
  daily: ClientInvoiceRevenueDailyPoint[];
  byClient: ClientInvoiceByClientPoint[];
  lineMix: ClientInvoiceLineMixPoint[];
  taxMix: ClientInvoiceTaxMixPoint[];
  invoiceCount: number;
  totalCad: number;
};

export function buildClientInvoiceChartBundle(rows: ClientInvoiceRow[]): ClientInvoiceChartBundle {
  const daily = buildClientInvoiceDailyPoints(rows);
  const byClient = buildClientInvoiceByClientPoints(rows);
  const lineMix = buildClientInvoiceLineMixPoints(rows);
  const taxMix = buildClientInvoiceTaxMixPoints(rows);
  const invoiceCount = rows.length;
  const totalCad = rows.reduce((s, r) => s + invoiceAmountCad(r), 0);
  return { daily, byClient, lineMix, taxMix, invoiceCount, totalCad };
}

export async function hasClientInvoices(userId: string): Promise<boolean> {
  const rows = await loadClientInvoices(userId);
  return rows.length > 0;
}

export async function loadClientInvoiceChartBundle(
  userId: string,
  range: RevenueRange,
): Promise<ClientInvoiceChartBundle> {
  const all = await loadClientInvoices(userId);
  const rows = filterInvoicesInRange(all, range);
  return buildClientInvoiceChartBundle(rows);
}
