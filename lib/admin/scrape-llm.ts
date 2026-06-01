import "server-only";

import { extractMarketMenuWithLlm, type MarketMenuExtractedItem } from "@/lib/menu/extract-market-menu-llm";
import { type MinimalScrapeItem } from "@/lib/admin/scrape-types";
import type { MarketMenuExtractionLlm } from "@/lib/schemas/market-menu-extraction";

export type LlmExtractionResult = {
  items: MinimalScrapeItem[];
  marketItems: MarketMenuExtractedItem[];
  restaurant: MarketMenuExtractionLlm["restaurant"];
  confidence: number;
  warnings: string[];
  model: string;
};

export async function extractMenuItemsWithLlm(plainText: string): Promise<LlmExtractionResult> {
  const result = await extractMarketMenuWithLlm(plainText);
  return {
    items: result.items.map((row) => ({
      name: row.name,
      category: row.category,
      price: row.price,
      notes: row.description,
    })),
    marketItems: result.items,
    restaurant: result.restaurant,
    confidence: result.confidence,
    warnings: result.warnings,
    model: result.model,
  };
}
