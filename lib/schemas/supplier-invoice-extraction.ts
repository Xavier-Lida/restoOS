import { z } from "zod";

import { cadAmountNullable, confidenceField, quantityNullable, warningsField } from "@/lib/schemas/fields";
import { extractJsonObject } from "@/lib/schemas/llm-json";

/** Ligne d’achat fournisseur (graphiques : dépenses par catégorie, prix unitaires). */
export const supplierInvoiceLineSchema = z.object({
  product_name: z.string().max(300),
  supplier_sku: z.string().max(80).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  quantity: quantityNullable,
  unit: z.string().max(32).nullable().optional(),
  unit_price_cad: cadAmountNullable,
  line_total_cad: cadAmountNullable,
});

/**
 * Facture ou bon de livraison **fournisseur → restaurant** (achats matière).
 * Alimente : courbe des dépenses, prix d’achat pour rattacher aux recettes.
 */
export const supplierInvoiceExtractionLlmSchema = z.object({
  confidence: confidenceField,
  warnings: warningsField,
  invoice_number: z.string().max(120).nullable().optional(),
  supplier_name: z.string().max(300).nullable().optional(),
  restaurant_name: z.string().max(300).nullable().optional(),
  invoice_date: z.string().max(32).nullable().optional(),
  due_date: z.string().max(32).nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  amount_subtotal_cad: cadAmountNullable,
  amount_tax_cad: cadAmountNullable,
  amount_total_cad: cadAmountNullable,
  lines: z.array(supplierInvoiceLineSchema).max(300).optional().default([]),
});

export type SupplierInvoiceExtractionLlm = z.infer<typeof supplierInvoiceExtractionLlmSchema>;

export function parseSupplierInvoiceExtractionLlmJson(raw: string): SupplierInvoiceExtractionLlm {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return supplierInvoiceExtractionLlmSchema.parse(parsed);
}
