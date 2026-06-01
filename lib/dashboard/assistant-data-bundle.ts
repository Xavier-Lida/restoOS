import "server-only";

import type { ChartCatalogEntry } from "@/lib/dashboard/assistant-chart-resolve";
import { loadPendingPricingSuggestions } from "@/lib/dashboard/pricing-suggestions";
import { loadDishSalesSeriesBundle } from "@/lib/dashboard/dish-sales-series";
import {
  formatIntegrationAssistantSnippet,
  resolveIntegrationAssistantContext,
} from "@/lib/dashboard/integration-assistant-snippet";
import { loadLatestMarketMenuItems } from "@/lib/market/load-latest-market-items";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import type { OnboardingSnapshot } from "@/lib/onboarding/types";
import {
  hasPosDailyReports,
  loadPosDailyRevenue,
  summarizePosRevenue,
} from "@/lib/pos/daily-sales";
import type { AssistantChart } from "@/lib/schemas/assistant-turn";

function matchesDishName(a: string, b: string): boolean {
  const x = a.trim().toLocaleLowerCase("fr-CA");
  const y = b.trim().toLocaleLowerCase("fr-CA");
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

function formatDayLabel(isoDay: string): string {
  const d = new Date(`${isoDay}T12:00:00`);
  return d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
}

function buildRevenueChart(id: string, title: string, points: Awaited<ReturnType<typeof loadPosDailyRevenue>>): AssistantChart {
  return {
    kind: "revenue_bars",
    id,
    title,
    points: points.map((p) => ({
      day: p.day,
      netSales: p.netSales,
      transactions: p.transactions,
    })),
  };
}

export type AssistantDataBundle = {
  snapshot: OnboardingSnapshot;
  integrationsSnippet: string;
  marketSnippet: string;
  chartCatalog: ChartCatalogEntry[];
  catalogMap: Map<string, ChartCatalogEntry>;
  hasSalesData: boolean;
  hasMarketData: boolean;
};

export function formatMarketSnippetForAssistant(
  items: Awaited<ReturnType<typeof loadLatestMarketMenuItems>>,
): string {
  if (items.length === 0) {
    return "Aucune donnée marché (scraping concurrent) disponible pour ce compte.";
  }
  const restaurant = items[0]?.market_restaurant_name ?? "Concurrent";
  const lines = items.slice(0, 40).map((item) => {
    const price = Number(item.price_cad).toFixed(2);
    return `- ${item.category}: ${item.item_name} — ${price} $ (${restaurant})`;
  });
  const extra = items.length > 40 ? `\n… et ${items.length - 40} autre(s) item(s) marché.` : "";
  return [`Concurrent scrapé: ${restaurant}`, ...lines].join("\n") + extra;
}

export async function loadAssistantDataBundle(userId: string): Promise<AssistantDataBundle> {
  const snapshot = await getOnboardingSnapshot(userId);
  const menuItems = snapshot.menuItems;

  let integrationsSnippet: string;
  let hasSalesData = false;
  try {
    const ctx = await resolveIntegrationAssistantContext(userId);
    hasSalesData = ctx.kind === "square-reports-present";
    if (hasSalesData) {
      const points30 = await loadPosDailyRevenue(userId, "30d");
      const summary = summarizePosRevenue(points30);
      integrationsSnippet = [
        formatIntegrationAssistantSnippet(ctx),
        `Synthèse 30 jours : ventes nettes **${summary.totalNetSales.toFixed(0)} $**, ${summary.totalTransactions} transactions, moyenne journalière **${summary.averageDailyNet.toFixed(0)} $**.`,
      ].join("\n");
    } else {
      integrationsSnippet = formatIntegrationAssistantSnippet(ctx);
    }
  } catch {
    integrationsSnippet =
      "Intégrations POS : impossible de résumer les données pour le moment (erreur serveur).";
  }

  try {
    hasSalesData = hasSalesData || (await hasPosDailyReports(userId));
  } catch {
    /* keep prior */
  }

  const marketItems = await loadLatestMarketMenuItems();
  const marketSnippet = formatMarketSnippetForAssistant(marketItems);
  const hasMarketData = marketItems.length > 0;

  const catalog: ChartCatalogEntry[] = [];

  if (hasSalesData) {
    try {
      const [points7, points30] = await Promise.all([
        loadPosDailyRevenue(userId, "7d"),
        loadPosDailyRevenue(userId, "30d"),
      ]);
      if (points7.length > 0) {
        catalog.push({
          id: "revenue_7d",
          description: "Ventes nettes quotidiennes sur 7 jours (barres).",
          chart: buildRevenueChart("revenue_7d", "Ventes nettes — 7 jours", points7),
        });
      }
      if (points30.length > 0) {
        catalog.push({
          id: "revenue_30d",
          description: "Ventes nettes quotidiennes sur 30 jours (barres).",
          chart: buildRevenueChart("revenue_30d", "Ventes nettes — 30 jours", points30),
        });
      }
    } catch {
      /* skip revenue charts */
    }
  }

  if (menuItems.length > 0) {
    const topByPrice = [...menuItems]
      .sort((a, b) => Number(b.price_cad) - Number(a.price_cad))
      .slice(0, 8);
    catalog.push({
      id: "menu_prices_top",
      description: "Prix des plats les plus chers du menu (barres horizontales).",
      chart: {
        kind: "horizontal_bars",
        id: "menu_prices_top",
        title: "Prix menu — top plats",
        rows: topByPrice.map((item) => ({
          label: item.item_name,
          value: Number(item.price_cad),
        })),
        valueSuffix: " $",
      },
    });
  }

  try {
    const pending = await loadPendingPricingSuggestions(userId);
    const withGain = pending
      .filter((s) => (s.estimated_monthly_gain_cad ?? 0) > 0)
      .slice(0, 8);
    if (withGain.length > 0) {
      catalog.push({
        id: "pricing_suggestions_gain",
        description: "Gain mensuel estimé par suggestion de prix en attente.",
        chart: {
          kind: "horizontal_bars",
          id: "pricing_suggestions_gain",
          title: "Gains estimés — suggestions en attente",
          rows: withGain.map((s) => ({
            label: s.item_name,
            value: Number(s.estimated_monthly_gain_cad ?? 0),
          })),
          valueSuffix: " $/mois",
        },
      });
    }
  } catch {
    /* optional */
  }

  const dishesForVolume = menuItems.slice(0, 4);
  for (const dish of dishesForVolume) {
    try {
      const bundle = await loadDishSalesSeriesBundle({
        userId,
        range: "7d",
        menuItemName: dish.item_name,
      });
      if (!bundle.hasItemSales || bundle.current.every((p) => p.quantity === 0)) {
        continue;
      }
      const labels = bundle.current.map((p) => formatDayLabel(p.day));
      const chartId = `dish_volume_7d:${dish.id}`;
      catalog.push({
        id: chartId,
        description: `Quantités vendues sur 7 jours pour le plat « ${dish.item_name} ».`,
        chart: {
          kind: "multi_line",
          id: chartId,
          title: `Ventes — ${dish.item_name} (7 j)`,
          labels,
          series: [
            {
              id: "current",
              label: "Période actuelle",
              values: bundle.current.map((p) => p.quantity),
            },
            {
              id: "previous",
              label: "Période précédente",
              values: bundle.previous.map((p) => p.quantity),
              dashed: true,
            },
          ],
        },
      });
    } catch {
      /* skip dish */
    }
  }

  if (hasMarketData && menuItems.length > 0) {
    for (const dish of menuItems.slice(0, 5)) {
      const competitors = marketItems
        .filter((m) => matchesDishName(m.item_name, dish.item_name))
        .slice(0, 6);
      if (competitors.length === 0) continue;
      const chartId = `market_compare:${dish.id}`;
      const rows = [
        { label: `Vous — ${dish.item_name}`, value: Number(dish.price_cad) },
        ...competitors.map((c) => ({
          label: `${c.market_restaurant_name} — ${c.item_name}`,
          value: c.price_cad,
        })),
      ];
      catalog.push({
        id: chartId,
        description: `Comparaison de prix marché pour « ${dish.item_name} » vs concurrents scrapés.`,
        chart: {
          kind: "horizontal_bars",
          id: chartId,
          title: `Marché — ${dish.item_name}`,
          rows,
          valueSuffix: " $",
        },
      });
    }
  }

  const catalogMap = new Map(catalog.map((e) => [e.id, e]));

  return {
    snapshot,
    integrationsSnippet,
    marketSnippet,
    chartCatalog: catalog,
    catalogMap,
    hasSalesData,
    hasMarketData,
  };
}

export function formatChartCatalogForPrompt(catalog: ChartCatalogEntry[]): string {
  if (catalog.length === 0) {
    return "(Aucun graphique disponible — données insuffisantes.)";
  }
  return catalog.map((e) => `- id="${e.id}" : ${e.description}`).join("\n");
}
