export type MinimalScrapeItem = {
  name: string;
  category: string;
  price: number | null;
  notes?: string | null;
};

export type ScrapeExtractionMeta = {
  method: "llm" | "heuristic" | "llm+fallback";
  model?: string;
  confidence?: number;
  warnings?: string[];
};
