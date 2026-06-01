import { z } from "zod";

import { cadAmountNullable, confidenceField, warningsField } from "@/lib/schemas/fields";
import { extractJsonObject } from "@/lib/schemas/llm-json";

const posSaleLineSchema = z.object({
  sale_date: z.string().max(32),
  sale_time: z.string().max(32).nullable().optional(),
  item_name: z.string().min(1).max(300),
  category: z.string().max(120).nullable().optional(),
  quantity: z.coerce.number().min(0).max(99999),
  gross_sales_cad: cadAmountNullable,
  discounts_cad: cadAmountNullable,
  net_sales_cad: cadAmountNullable,
  taxes_cad: cadAmountNullable,
  transaction_id: z.string().max(120).nullable().optional(),
  payment_id: z.string().max(120).nullable().optional(),
  device: z.string().max(120).nullable().optional(),
  operator: z.string().max(120).nullable().optional(),
  payment_method: z.string().max(120).nullable().optional(),
});

const dailySummarySchema = z.object({
  report_day: z.string().max(32),
  gross_sales_cad: cadAmountNullable,
  net_sales_cad: cadAmountNullable,
  total_sales_cad: cadAmountNullable,
  taxes_cad: cadAmountNullable,
  tips_cad: cadAmountNullable,
  payments_total_cad: cadAmountNullable,
  transactions_count: z.coerce.number().int().min(0).nullable().optional(),
});

export const posSalesCsvExtractionLlmSchema = z.object({
  pos_vendor_hint: z.string().max(80).nullable().optional(),
  confidence: confidenceField,
  warnings: warningsField,
  sale_lines: z.array(posSaleLineSchema).max(5000),
  daily_summaries: z.array(dailySummarySchema).max(400).optional().default([]),
});

export type PosSalesCsvExtractionLlm = z.infer<typeof posSalesCsvExtractionLlmSchema>;

export function parsePosSalesCsvExtractionLlmJson(raw: string): PosSalesCsvExtractionLlm {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return posSalesCsvExtractionLlmSchema.parse(parsed);
}
