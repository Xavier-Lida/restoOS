import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ClientInvoiceAiTaxLine = {
  code?: string | null;
  label: string;
  rate_percent?: number | null;
  amount_cad?: number | null;
};

export type ClientInvoiceAiLine = {
  line_number?: number | null;
  sku?: string | null;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  unit_price_cad?: number | null;
  discount_cad?: number | null;
  tax_cad?: number | null;
  line_total_cad?: number | null;
};

export type ClientInvoiceAiExtraction = {
  v?: number;
  confidence?: number;
  warnings?: string[];
  model?: string;
  invoice_number?: string | null;
  vendor_name?: string | null;
  client_name?: string | null;
  due_date?: string | null;
  currency?: string | null;
  amount_subtotal_cad?: number | null;
  amount_tax_cad?: number | null;
  amount_total_cad?: number | null;
  amount_paid_cad?: number | null;
  balance_due_cad?: number | null;
  po_reference?: string | null;
  payment_terms?: string | null;
  tax_lines?: ClientInvoiceAiTaxLine[];
  lines?: ClientInvoiceAiLine[];
};

export type ClientInvoiceRow = {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  client_label: string | null;
  invoice_date: string | null;
  amount_cad: number | null;
  notes: string | null;
  ai_extraction: ClientInvoiceAiExtraction;
  uploaded_at: string;
};

function parseAiExtraction(raw: unknown): ClientInvoiceAiExtraction {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const confidence = typeof o.confidence === "number" ? o.confidence : undefined;
  const warnings = Array.isArray(o.warnings) ? o.warnings.filter((w): w is string => typeof w === "string") : undefined;
  const model = typeof o.model === "string" ? o.model : undefined;
  const invoice_number = o.invoice_number == null ? null : String(o.invoice_number);
  const vendor_name = o.vendor_name == null ? null : String(o.vendor_name);
  const client_name = o.client_name == null ? null : String(o.client_name);
  const due_date = o.due_date == null ? null : String(o.due_date);
  const currency = o.currency == null ? null : String(o.currency);
  const v = typeof o.v === "number" ? o.v : undefined;
  const optionalNum = (x: unknown): number | null | undefined => {
    if (x === undefined) {
      return undefined;
    }
    if (x === null) {
      return null;
    }
    if (typeof x === "number") {
      return Number.isFinite(x) ? x : null;
    }
    return null;
  };
  const tax_lines = Array.isArray(o.tax_lines) ? (o.tax_lines as ClientInvoiceAiTaxLine[]) : undefined;
  const lines = Array.isArray(o.lines) ? (o.lines as ClientInvoiceAiLine[]) : undefined;
  return {
    v,
    confidence,
    warnings,
    model,
    invoice_number,
    vendor_name,
    client_name,
    due_date,
    currency,
    amount_subtotal_cad: optionalNum(o.amount_subtotal_cad),
    amount_tax_cad: optionalNum(o.amount_tax_cad),
    amount_total_cad: optionalNum(o.amount_total_cad),
    amount_paid_cad: optionalNum(o.amount_paid_cad),
    balance_due_cad: optionalNum(o.balance_due_cad),
    po_reference: o.po_reference == null ? null : String(o.po_reference),
    payment_terms: o.payment_terms == null ? null : String(o.payment_terms),
    tax_lines,
    lines,
  };
}

export async function loadClientInvoices(userId: string): Promise<ClientInvoiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_invoices")
    .select(
      "id, user_id, storage_path, original_filename, mime_type, file_size_bytes, client_label, invoice_date, amount_cad, notes, ai_extraction, uploaded_at",
    )
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Lecture factures clients impossible: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    storage_path: row.storage_path as string,
    original_filename: row.original_filename as string,
    mime_type: row.mime_type as string,
    file_size_bytes: Number(row.file_size_bytes ?? 0),
    client_label: (row.client_label as string | null) ?? null,
    invoice_date: (row.invoice_date as string | null) ?? null,
    amount_cad: row.amount_cad !== null && row.amount_cad !== undefined ? Number(row.amount_cad) : null,
    notes: (row.notes as string | null) ?? null,
    ai_extraction: parseAiExtraction(row.ai_extraction),
    uploaded_at: row.uploaded_at as string,
  }));
}
