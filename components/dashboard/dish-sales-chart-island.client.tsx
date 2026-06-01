"use client";

import { useCallback, useState, useTransition } from "react";

import {
  fetchDishSalesChartAction,
  type DishSalesChartPayload,
} from "@/app/dashboard/stats/actions";
import {
  DishSalesChartClient,
  type CompareMode,
  type DishSalesMenuOption,
} from "@/components/dashboard/dish-sales-chart.client";
import { syncStatsUrl } from "@/lib/dashboard/sync-stats-url";

type DishSalesChartIslandProps = {
  menuItems: DishSalesMenuOption[];
  initialPayload: DishSalesChartPayload;
  urlParams: Record<string, string | undefined>;
};

export function DishSalesChartIsland({
  menuItems,
  initialPayload,
  urlParams,
}: DishSalesChartIslandProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(
    (args: { dishId: string; compareMode: CompareMode; compareDishId?: string | null }) => {
      syncStatsUrl({
        ...urlParams,
        dish: args.dishId,
        compare: args.compareMode,
        compareDish: args.compareMode === "dishes" ? args.compareDishId ?? undefined : undefined,
      });
      startTransition(async () => {
        const next = await fetchDishSalesChartAction({
          dishId: args.dishId,
          compareMode: args.compareMode,
          compareDishId: args.compareDishId,
        });
        setPayload(next);
      });
    },
    [urlParams],
  );

  const handleDishChange = (dishId: string) => {
    refresh({
      dishId,
      compareMode: payload.compareMode,
      compareDishId: payload.compareMode === "dishes" ? payload.compareDishId : undefined,
    });
  };

  const handleCompareModeChange = (compareMode: CompareMode) => {
    refresh({
      dishId: payload.selectedDishId,
      compareMode,
      compareDishId: compareMode === "dishes" ? payload.compareDishId : undefined,
    });
  };

  const handleCompareDishChange = (compareDishId: string | undefined) => {
    refresh({
      dishId: payload.selectedDishId,
      compareMode: "dishes",
      compareDishId,
    });
  };

  return (
    <DishSalesChartClient
      menuItems={menuItems}
      selectedDishId={payload.selectedDishId}
      compareMode={payload.compareMode}
      compareDishId={payload.compareDishId}
      primary={payload.primary}
      compareDish={payload.compareDish}
      hasItemSales={payload.hasItemSales}
      onDishChange={handleDishChange}
      onCompareModeChange={handleCompareModeChange}
      onCompareDishChange={handleCompareDishChange}
      filtersPending={pending}
    />
  );
}
