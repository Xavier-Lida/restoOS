import { z } from "zod";

import { cadAmountNullable, confidenceField, quantityNullable, warningsField } from "@/lib/schemas/fields";
import { extractJsonObject } from "@/lib/schemas/llm-json";

/** Ingrédient d’une recette (coûts matière, graphiques d’usage par ingrédient). */
export const recipeIngredientLineSchema = z.object({
  name: z.string().max(200),
  quantity: quantityNullable,
  unit: z.string().max(32).nullable().optional(),
  /** Coût d’achat unitaire si indiqué sur la fiche (sinon null). */
  unit_cost_cad: cadAmountNullable,
  note: z.string().max(300).nullable().optional(),
});

/** Une recette / fiche technique (graphiques : coût par plat, structure des coûts). */
export const recipeSheetSchema = z.object({
  dish_name: z.string().max(220),
  category: z.string().max(120).nullable().optional(),
  /** Texte libre du rendement (ex. « 4 L », « 12 portions »). */
  yield_description: z.string().max(160).nullable().optional(),
  /** Nombre de portions si chiffré explicitement. */
  portions_count: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") {
        return null;
      }
      if (typeof v === "number") {
        return Number.isFinite(v) && v > 0 ? v : null;
      }
      const n = Number.parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  ingredients: z.array(recipeIngredientLineSchema).max(80),
});

/**
 * Livre de recettes / export PDF ou texte collé (fiches techniques).
 * Alimente : coût matière par plat, comparaison au prix menu (avec lien menu séparé).
 */
export const recipeBookExtractionLlmSchema = z.object({
  confidence: confidenceField,
  warnings: warningsField,
  document_language: z.string().max(16).optional(),
  recipes: z.array(recipeSheetSchema).max(120),
});

export type RecipeBookExtractionLlm = z.infer<typeof recipeBookExtractionLlmSchema>;

export function parseRecipeBookExtractionLlmJson(raw: string): RecipeBookExtractionLlm {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return recipeBookExtractionLlmSchema.parse(parsed);
}
