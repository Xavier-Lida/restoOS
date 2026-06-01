import "server-only";

import { extractPosSalesCsvWithLlm, MAX_CSV_SAMPLE_CHARS } from "@/lib/pos/extract-pos-sales-csv-llm";
import {
  deriveDailySummariesFromSaleItems,
  mapExtractionToDailySummaries,
  mapExtractionToSaleItems,
} from "@/lib/pos/map-pos-sales-extraction";
import { parseSalesCsv } from "@/lib/square/csv";
import { parseSquareCSV } from "@/lib/square/sale-items-csv";
import type { ParsedSquareSummary } from "@/lib/square/csv";
import type { SaleItem } from "@/lib/square/sale-items-csv";

export type PosSalesCsvImportParseResult = {
  saleItems: SaleItem[];
  dailySummaries: ParsedSquareSummary[];
  parseMethod: "llm" | "heuristic";
  model?: string;
  warnings: string[];
  confidence?: number;
};

export async function parsePosSalesCsvContent(
  content: string,
  filename: string,
): Promise<PosSalesCsvImportParseResult> {
  // Skip LLM for files that exceed the sample limit — it would only see a partial
  // snapshot and silently import a fraction of the rows while blocking the heuristic fallback.
  const csvTooLarge = content.length > MAX_CSV_SAMPLE_CHARS;
  const llm = csvTooLarge ? null : await extractPosSalesCsvWithLlm(content, filename);

  if (llm && llm.extraction.sale_lines.length > 0) {
    const saleItems = mapExtractionToSaleItems(llm.extraction);
    let dailySummaries = mapExtractionToDailySummaries(llm.extraction, filename);
    if (dailySummaries.length === 0 && saleItems.length > 0) {
      dailySummaries = deriveDailySummariesFromSaleItems(saleItems, filename);
    }
    return {
      saleItems,
      dailySummaries,
      parseMethod: "llm",
      model: llm.model,
      warnings: llm.extraction.warnings ?? [],
      confidence: llm.extraction.confidence,
    };
  }

  const saleItems = parseSquareCSV(content);
  const dailySummaries = parseSalesCsv(content, filename);
  const warnings: string[] = [];
  if (llm?.extraction.warnings?.length) {
    warnings.push(...llm.extraction.warnings);
  }
  if (saleItems.length === 0 && dailySummaries.length === 0) {
    warnings.push("Aucune ligne de vente détectée (IA et heuristique).");
  } else if (saleItems.length === 0) {
    warnings.push("Lignes articles absentes : seuls les totaux journaliers ont été importés.");
  } else if (csvTooLarge) {
    warnings.push("Fichier volumineux : parseur heuristique utilisé (toutes les lignes ont été traitées).");
  } else {
    warnings.push("Repli sur le parseur heuristique (colonnes reconnues automatiquement).");
  }

  return {
    saleItems,
    dailySummaries,
    parseMethod: "heuristic",
    warnings,
    confidence: llm?.extraction.confidence,
  };
}
