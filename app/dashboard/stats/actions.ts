"use server";

import { loadDishSalesSeriesBundle } from "@/lib/dashboard/dish-sales-series";
import { loadAcceptedSuggestionsGain } from "@/lib/dashboard/pricing-suggestions-stats";
import { getRestoOsSubscriptionCad } from "@/lib/dashboard/subscription-cad";
import { getOnboardingSnapshot, getAuthedUser } from "@/lib/onboarding/server";
import {
  computePeriodDelta,
  hasSquareReports,
  loadSquareDailyRevenue,
  loadSquareDailyRevenuePrevious,
  summarizeSquareRevenue,
  type RevenueRange,
  type SquareRevenuePoint,
  type SquareSummary,
} from "@/lib/square/dashboard";

import type { CompareMode } from "@/components/dashboard/dish-sales-chart.client";
import type { DishDailyPoint } from "@/lib/dashboard/dish-sales-series";

const DISH_CHART_RANGE: RevenueRange = "7d";

export type SalesOverviewPayload = {
  points: SquareRevenuePoint[];
  summary: SquareSummary;
  deltas: {
    netSales: ReturnType<typeof computePeriodDelta>;
    avgDaily: ReturnType<typeof computePeriodDelta>;
    transactions: ReturnType<typeof computePeriodDelta>;
    taxes: ReturnType<typeof computePeriodDelta>;
  };
  suggestions: { totalMonthlyGainCad: number; acceptedCount: number };
  subscriptionCad: number;
};

export type DishSalesChartPayload = {
  selectedDishId: string;
  compareMode: CompareMode;
  compareDishId: string | null;
  primary: {
    name: string;
    current: DishDailyPoint[];
    previous: DishDailyPoint[];
  };
  compareDish: {
    id: string;
    name: string;
    current: DishDailyPoint[];
  } | null;
  hasItemSales: boolean;
};

export async function fetchSalesOverviewAction(range: RevenueRange): Promise<SalesOverviewPayload> {
  const { user } = await getAuthedUser();

  const [points, previousPoints, suggestions] = await Promise.all([
    loadSquareDailyRevenue(user.id, range),
    loadSquareDailyRevenuePrevious(user.id, range),
    loadAcceptedSuggestionsGain(user.id),
  ]);

  const summary = summarizeSquareRevenue(points);
  const previousSummary = summarizeSquareRevenue(previousPoints);

  return {
    points,
    summary,
    deltas: {
      netSales: computePeriodDelta(summary.totalNetSales, previousSummary.totalNetSales),
      avgDaily: computePeriodDelta(summary.averageDailyNet, previousSummary.averageDailyNet),
      transactions: computePeriodDelta(summary.totalTransactions, previousSummary.totalTransactions),
      taxes: computePeriodDelta(summary.totalTaxes, previousSummary.totalTaxes),
    },
    suggestions,
    subscriptionCad: getRestoOsSubscriptionCad(),
  };
}

export async function loadDishSalesChartPayload(args: {
  userId: string;
  menuItemIds: Array<{ id: string; item_name: string }>;
  dishId?: string;
  compareMode?: string;
  compareDishId?: string;
}): Promise<DishSalesChartPayload | null> {
  const { userId, menuItemIds, dishId, compareMode: compareModeRaw, compareDishId } = args;
  if (menuItemIds.length === 0) return null;

  const compareMode: CompareMode = compareModeRaw === "dishes" ? "dishes" : "period";
  const selected = menuItemIds.find((item) => item.id === dishId) ?? menuItemIds[0];

  const primaryBundle = await loadDishSalesSeriesBundle({
    userId,
    range: DISH_CHART_RANGE,
    menuItemName: selected.item_name,
  });

  let compareDish: DishSalesChartPayload["compareDish"] = null;

  if (compareMode === "dishes" && compareDishId) {
    const other = menuItemIds.find((item) => item.id === compareDishId);
    if (other && other.id !== selected.id) {
      const otherBundle = await loadDishSalesSeriesBundle({
        userId,
        range: DISH_CHART_RANGE,
        menuItemName: other.item_name,
      });
      compareDish = {
        id: other.id,
        name: other.item_name,
        current: otherBundle.current,
      };
    }
  }

  const effectiveCompareDishId =
    compareMode === "dishes" ? (compareDish?.id ?? compareDishId ?? null) : null;

  return {
    selectedDishId: selected.id,
    compareMode,
    compareDishId: effectiveCompareDishId,
    primary: {
      name: selected.item_name,
      current: primaryBundle.current,
      previous: primaryBundle.previous,
    },
    compareDish,
    hasItemSales: primaryBundle.hasItemSales,
  };
}

export async function fetchDishSalesChartAction(args: {
  dishId: string;
  compareMode: CompareMode;
  compareDishId?: string | null;
}): Promise<DishSalesChartPayload> {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const menuItems = snapshot.menuItems.map((item) => ({
    id: item.id,
    item_name: item.item_name,
  }));

  const payload = await loadDishSalesChartPayload({
    userId: user.id,
    menuItemIds: menuItems,
    dishId: args.dishId,
    compareMode: args.compareMode,
    compareDishId: args.compareDishId ?? undefined,
  });

  if (!payload) {
    throw new Error("Aucun plat au menu.");
  }

  return payload;
}

export async function hasSquareReportsForUser(): Promise<boolean> {
  const { user } = await getAuthedUser();
  return hasSquareReports(user.id);
}
