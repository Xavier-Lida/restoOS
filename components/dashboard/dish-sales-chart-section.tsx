import type { MenuItemRecord } from "@/lib/onboarding/types";
import { loadDishSalesChartPayload } from "@/app/dashboard/stats/actions";

import { DishSalesChartIsland } from "@/components/dashboard/dish-sales-chart-island.client";

type DishSalesChartSectionProps = {
  userId: string;
  menuItems: MenuItemRecord[];
  dishId?: string;
  compareMode?: string;
  compareDishId?: string;
  urlParams: Record<string, string | undefined>;
};

export async function DishSalesChartSection({
  userId,
  menuItems,
  dishId,
  compareMode,
  compareDishId,
  urlParams,
}: DishSalesChartSectionProps) {
  if (menuItems.length === 0) {
    return null;
  }

  const menuOptions = menuItems.map((item) => ({ id: item.id, item_name: item.item_name }));
  const initialPayload = await loadDishSalesChartPayload({
    userId,
    menuItemIds: menuOptions,
    dishId,
    compareMode,
    compareDishId,
  });

  if (!initialPayload) {
    return null;
  }

  return (
    <DishSalesChartIsland
      menuItems={menuOptions}
      initialPayload={initialPayload}
      urlParams={urlParams}
    />
  );
}
