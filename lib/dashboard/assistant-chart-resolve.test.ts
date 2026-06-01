import { describe, expect, it } from "vitest";

import { buildChartCatalogMap, resolveChartsFromCatalog } from "@/lib/dashboard/assistant-chart-resolve";

describe("resolveChartsFromCatalog", () => {
  const catalog = buildChartCatalogMap([
    {
      id: "revenue_7d",
      description: "7 jours",
      chart: {
        kind: "revenue_bars",
        id: "revenue_7d",
        title: "Ventes 7j",
        points: [{ day: "2025-01-01", netSales: 100, transactions: 5 }],
      },
    },
  ]);

  it("resolves chart by id with title override", () => {
    const charts = resolveChartsFromCatalog(["revenue_7d"], catalog, {
      revenue_7d: "Mes ventes",
    });
    expect(charts).toHaveLength(1);
    expect(charts[0]?.title).toBe("Mes ventes");
  });

  it("ignores unknown ids", () => {
    const charts = resolveChartsFromCatalog(["unknown", "revenue_7d"], catalog);
    expect(charts).toHaveLength(1);
  });
});
