import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicApiKey, getAnthropicModel } from "@/lib/admin/anthropic-env";
import { normalizePosItemName } from "@/lib/square/item-name";
import {
  marketMenuExtractionLlmSchema,
  type MarketMenuExtractionLlm,
  parseMarketMenuExtractionLlmJson,
} from "@/lib/schemas/market-menu-extraction";
import { MAX_MENU_LLM_INPUT_CHARS } from "@/lib/menu/extract-menu-items-llm";

export type MarketMenuExtractedItem = {
  name: string;
  normalized_name: string;
  category: string;
  price: number | null;
  description: string | null;
  portion_size: string | null;
  protein: string | null;
  diet_tags: string[];
  alcohol: boolean;
  is_special: boolean;
  raw_excerpt: string | null;
};

export type MarketMenuExtractionResult = {
  restaurant: MarketMenuExtractionLlm["restaurant"];
  items: MarketMenuExtractedItem[];
  confidence: number;
  warnings: string[];
  model: string;
  menu_language?: string;
};

const SYSTEM_PROMPT = `Tu es un extracteur expert de menus de restaurants québécois pour une base de données de comparaison marché.
Tu reçois du texte brut issu d'une page web ou PDF.
Réponds avec UN SEUL objet JSON UTF-8 valide, sans markdown.`;

function buildUserPrompt(truncatedText: string): string {
  return `Extrais les métadonnées du restaurant ET chaque plat/boisson avec le maximum de détails comparables (portion, protéine, régime, alcool, plat du jour).

Texte:
---
${truncatedText}
---

Schéma JSON EXACT:
{
  "restaurant": {
    "display_name": null,
    "city": null,
    "region": null,
    "postal_prefix": null,
    "cuisine_types": [],
    "price_tier": null,
    "service_style": null,
    "language": "fr"
  },
  "menu_language": "fr",
  "confidence": 0.0,
  "warnings": [],
  "items": [
    {
      "name": "nom court",
      "category": null,
      "price_cad": 17.95,
      "description": null,
      "portion_size": null,
      "protein": null,
      "diet_tags": [],
      "alcohol": false,
      "is_special": false,
      "raw_excerpt": null
    }
  ]
}

Règles:
- price_tier: "budget" | "mid" | "premium" | "fine_dining" ou null si inconnu.
- region: grande région QC si déductible (ex. Montréal, Québec, Estrie).
- N'invente pas de plats; diet_tags ex: vegetarian, vegan, gluten_free, spicy.
- price_cad en CAD; null si absent.
- confidence 0-1.`;
}

function mapItems(parsed: MarketMenuExtractionLlm): MarketMenuExtractedItem[] {
  return parsed.items
    .map((row) => {
      const name = row.name.trim();
      const price =
        row.price_cad == null || (typeof row.price_cad === "number" && Number.isNaN(row.price_cad))
          ? null
          : Number(row.price_cad);
      return {
        name,
        normalized_name: normalizePosItemName(name),
        category: (row.category?.trim() || "Autres") || "Autres",
        price,
        description: row.description?.trim() || null,
        portion_size: row.portion_size?.trim() || null,
        protein: row.protein?.trim() || null,
        diet_tags: row.diet_tags ?? [],
        alcohol: row.alcohol ?? false,
        is_special: row.is_special ?? false,
        raw_excerpt: row.raw_excerpt?.trim() || null,
      };
    })
    .filter((row) => row.name.length > 0);
}

export async function extractMarketMenuWithLlm(plainText: string): Promise<MarketMenuExtractionResult> {
  const truncated = plainText.slice(0, MAX_MENU_LLM_INPUT_CHARS);
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  const model = getAnthropicModel();

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(truncated) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse LLM vide.");
  }

  const parsed = parseMarketMenuExtractionLlmJson(textBlock.text);
  marketMenuExtractionLlmSchema.parse(parsed);

  return {
    restaurant: parsed.restaurant,
    items: mapItems(parsed),
    confidence: parsed.confidence,
    warnings: parsed.warnings ?? [],
    model,
    menu_language: parsed.menu_language,
  };
}
