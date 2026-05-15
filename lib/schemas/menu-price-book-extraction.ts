import { z } from "zod";

import { cadAmountNullable, confidenceField, warningsField } from "@/lib/schemas/fields";
import { extractJsonObject } from "@/lib/schemas/llm-json";

const menuItemSchema = z.object({
  name: z.string().min(1).max(220),
  category: z.string().max(120).nullable().optional(),
  price_cad: cadAmountNullable,
  description: z.string().max(600).nullable().optional(),
});

/**
 * Menu avec prix (PDF / texte) — aligné sur l’usage `extract-menu-items-llm`.
 * Alimente : distribution des prix, mix par catégorie, point d’ancrage pour marge théorique menu vs recette.
 */
export const menuPriceBookExtractionLlmSchema = z.object({
  menu_language: z.string().max(16).optional(),
  confidence: confidenceField,
  warnings: warningsField,
  items: z.array(menuItemSchema).max(400),
});

export type MenuPriceBookExtractionLlm = z.infer<typeof menuPriceBookExtractionLlmSchema>;

export function parseMenuPriceBookExtractionLlmJson(raw: string): MenuPriceBookExtractionLlm {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return menuPriceBookExtractionLlmSchema.parse(parsed);
}
