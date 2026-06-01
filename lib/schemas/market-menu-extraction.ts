import { z } from "zod";

import { cadAmountNullable, confidenceField, warningsField } from "@/lib/schemas/fields";
import { extractJsonObject } from "@/lib/schemas/llm-json";

const priceTierSchema = z.enum(["budget", "mid", "premium", "fine_dining"]).nullable().optional();

const marketRestaurantSchema = z.object({
  display_name: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  region: z.string().max(120).nullable().optional(),
  postal_prefix: z.string().max(12).nullable().optional(),
  cuisine_types: z.array(z.string().max(80)).max(12).optional().default([]),
  price_tier: priceTierSchema,
  service_style: z.string().max(80).nullable().optional(),
  language: z.string().max(16).nullable().optional(),
});

const marketMenuItemSchema = z.object({
  name: z.string().min(1).max(220),
  category: z.string().max(120).nullable().optional(),
  price_cad: cadAmountNullable,
  description: z.string().max(600).nullable().optional(),
  portion_size: z.string().max(40).nullable().optional(),
  protein: z.string().max(80).nullable().optional(),
  diet_tags: z.array(z.string().max(40)).max(12).optional().default([]),
  alcohol: z.boolean().optional().default(false),
  is_special: z.boolean().optional().default(false),
  raw_excerpt: z.string().max(400).nullable().optional(),
});

export const marketMenuExtractionLlmSchema = z.object({
  restaurant: marketRestaurantSchema.optional(),
  menu_language: z.string().max(16).optional(),
  confidence: confidenceField,
  warnings: warningsField,
  items: z.array(marketMenuItemSchema).max(400),
});

export type MarketMenuExtractionLlm = z.infer<typeof marketMenuExtractionLlmSchema>;

export function parseMarketMenuExtractionLlmJson(raw: string): MarketMenuExtractionLlm {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return marketMenuExtractionLlmSchema.parse(parsed);
}
