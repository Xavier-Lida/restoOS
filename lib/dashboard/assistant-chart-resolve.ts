import type { AssistantChart } from "@/lib/schemas/assistant-turn";
import { assistantChartSchema } from "@/lib/schemas/assistant-turn";

export type ChartCatalogEntry = {
  id: string;
  description: string;
  chart: AssistantChart;
};

export function buildChartCatalogMap(entries: ChartCatalogEntry[]): Map<string, ChartCatalogEntry> {
  return new Map(entries.map((e) => [e.id, e]));
}

export function resolveChartsFromCatalog(
  chartIds: string[],
  catalog: Map<string, ChartCatalogEntry>,
  titleOverrides?: Record<string, string>,
): AssistantChart[] {
  const charts: AssistantChart[] = [];
  for (const id of chartIds) {
    const entry = catalog.get(id);
    if (!entry) continue;
    const title = titleOverrides?.[id]?.trim() || entry.chart.title;
    charts.push({ ...entry.chart, title });
  }
  return charts.map((c) => assistantChartSchema.parse(c));
}
