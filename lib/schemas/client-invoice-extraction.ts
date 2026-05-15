import { z } from "zod";

import { cadAmountNullable, confidenceField, quantityNullable, warningsField } from "@/lib/schemas/fields";
import { extractJsonObject } from "@/lib/schemas/llm-json";

/** Ligne de facture client (graphiques : CA par article, panier moyen, remises). */
export const clientInvoiceLineSchema = z.object({
  line_number: z.coerce.number().int().min(0).max(99_999).nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  description: z.string().max(500),
  quantity: quantityNullable,
  unit: z.string().max(32).nullable().optional(),
  unit_price_cad: cadAmountNullable,
  discount_cad: cadAmountNullable,
  tax_cad: cadAmountNullable,
  line_total_cad: cadAmountNullable,
});

/** Ligne de taxe (graphiques : ventilation TPS/TVQ ou taxes incluses). */
export const clientInvoiceTaxLineSchema = z.object({
  code: z.string().max(32).nullable().optional(),
  label: z.string().max(120),
  rate_percent: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") {
        return null;
      }
      if (typeof v === "number") {
        return Number.isFinite(v) ? v : null;
      }
      const n = Number.parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }),
  amount_cad: cadAmountNullable,
});

/**
 * Réponse LLM pour une facture **émise au client** (restaurant → entreprise / groupe).
 * Alimente : série temporelle CA B2B, top clients, mix produits facturés, taxes.
 */
export const clientInvoiceExtractionLlmSchema = z.object({
  confidence: confidenceField,
  warnings: warningsField,
  invoice_number: z.string().max(120).nullable().optional(),
  client_name: z.string().max(300).nullable().optional(),
  vendor_name: z.string().max(300).nullable().optional(),
  invoice_date: z.string().max(32).nullable().optional(),
  due_date: z.string().max(32).nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  amount_subtotal_cad: cadAmountNullable,
  amount_tax_cad: cadAmountNullable,
  amount_total_cad: cadAmountNullable,
  amount_paid_cad: cadAmountNullable,
  balance_due_cad: cadAmountNullable,
  po_reference: z.string().max(120).nullable().optional(),
  payment_terms: z.string().max(200).nullable().optional(),
  tax_lines: z.array(clientInvoiceTaxLineSchema).max(24).optional().default([]),
  lines: z.array(clientInvoiceLineSchema).max(250).optional().default([]),
});

export type ClientInvoiceExtractionLlm = z.infer<typeof clientInvoiceExtractionLlmSchema>;

export function parseClientInvoiceExtractionLlmJson(raw: string): ClientInvoiceExtractionLlm {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return clientInvoiceExtractionLlmSchema.parse(parsed);
}
