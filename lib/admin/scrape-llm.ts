import "server-only";

import { extractMenuItemsWithLlmFromText } from "@/lib/menu/extract-menu-items-llm";
import { type MinimalScrapeItem } from "@/lib/admin/scrape-types";

export type LlmExtractionResult = {
  items: MinimalScrapeItem[];
  confidence: number;
  warnings: string[];
  model: string;
};

export async function extractMenuItemsWithLlm(plainText: string): Promise<LlmExtractionResult> {
  return extractMenuItemsWithLlmFromText(plainText, "scrape");
}
