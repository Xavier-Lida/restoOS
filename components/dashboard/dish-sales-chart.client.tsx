"use client";

import Link from "next/link";
import { useMemo } from "react";

import { MultiLineChart, type MultiLineSeries } from "@/components/dashboard/charts/multi-line-chart";
import { ChartEmpty } from "@/components/dashboard/charts/svg-charts";
import { SecHeader, StatsSection, Surf } from "@/components/dashboard/stats-premium-ui";
import type { DishDailyPoint } from "@/lib/dashboard/dish-sales-series";
import { cn } from "@/lib/utils";

export type DishSalesMenuOption = {
  id: string;
  item_name: string;
};

export type CompareMode = "period" | "dishes";

type DishSalesChartClientProps = {
  menuItems: DishSalesMenuOption[];
  selectedDishId: string;
  compareMode: CompareMode;
  compareDishId: string | null;
  primary: { name: string; current: DishDailyPoint[]; previous: DishDailyPoint[] };
  compareDish: { id: string; name: string; current: DishDailyPoint[] } | null;
  hasItemSales: boolean;
  onDishChange: (dishId: string) => void;
  onCompareModeChange: (mode: CompareMode) => void;
  onCompareDishChange: (compareDishId: string | undefined) => void;
  filtersPending?: boolean;
};

const dayLabel = new Intl.DateTimeFormat("fr-CA", { month: "short", day: "numeric" });

function shortDay(iso: string): string {
  return dayLabel.format(new Date(`${iso}T12:00:00`));
}

export function DishSalesChartClient({
  menuItems,
  selectedDishId,
  compareMode,
  compareDishId,
  primary,
  compareDish,
  hasItemSales,
  onDishChange,
  onCompareModeChange,
  onCompareDishChange,
  filtersPending = false,
}: DishSalesChartClientProps) {
  const chart = useMemo(() => {
    if (primary.current.length === 0) {
      return { labels: [] as string[], series: [] as MultiLineSeries[] };
    }

    const labels = primary.current.map((p) => shortDay(p.day));

    if (compareMode === "period") {
      const prevByIndex = primary.previous.map((p) => p.quantity);
      const prevAligned =
        prevByIndex.length === primary.current.length
          ? prevByIndex
          : primary.current.map((_, i) => primary.previous[i]?.quantity ?? 0);

      return {
        labels,
        series: [
          {
            id: "current",
            label: `${primary.name} · 7 derniers jours`,
            values: primary.current.map((p) => p.quantity),
          },
          {
            id: "previous",
            label: `${primary.name} · 7 jours précédents`,
            values: prevAligned,
            dashed: true,
          },
        ] satisfies MultiLineSeries[],
      };
    }

    const series: MultiLineSeries[] = [
      {
        id: "primary",
        label: primary.name,
        values: primary.current.map((p) => p.quantity),
      },
    ];

    if (compareDish) {
      const byDay = new Map(compareDish.current.map((p) => [p.day, p.quantity]));
      series.push({
        id: "compare",
        label: compareDish.name,
        values: primary.current.map((p) => byDay.get(p.day) ?? 0),
        color: undefined,
        dashed: false,
      });
    }

    return { labels, series };
  }, [compareMode, compareDish, primary]);

  return (
    <StatsSection>
      <SecHeader
        num="03"
        kicker="Ventes · par plat"
        title="Évolution des ventes"
        subtitle="Quantités vendues sur les 7 derniers jours."
      />

      <Surf className={cn("space-y-5 p-6", filtersPending && "opacity-60")}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/90">Plat</span>
            <select
              className="h-9 rounded-md border border-border bg-popover px-3 text-sm"
              value={selectedDishId}
              disabled={filtersPending}
              onChange={(e) => onDishChange(e.target.value)}
            >
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name}
                </option>
              ))}
            </select>
          </label>

          {compareMode === "dishes" ? (
            <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/90">
                Comparer avec
              </span>
              <select
                className="h-9 rounded-md border border-border bg-popover px-3 text-sm"
                value={compareDishId ?? ""}
                disabled={filtersPending}
                onChange={(e) => onCompareDishChange(e.target.value || undefined)}
              >
                <option value="">— Choisir un plat —</option>
                {menuItems
                  .filter((item) => item.id !== selectedDishId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
        </div>

        <nav className="inline-flex rounded-[10px] border border-border bg-popover p-1" aria-label="Mode de comparaison">
          {(
            [
              { value: "period" as const, label: "Même plat · périodes" },
              { value: "dishes" as const, label: "Autres plats" },
            ] as const
          ).map((mode) => {
            const active = compareMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                disabled={filtersPending}
                onClick={() => onCompareModeChange(mode.value)}
                className={cn(
                  "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode.label}
              </button>
            );
          })}
        </nav>

        {!hasItemSales ? (
          <ChartEmpty message="Importez un CSV ventes par article pour voir l'évolution des plats.">
            <Link href="/dashboard/integrations/sales-csv" className="text-primary underline-offset-2 hover:underline">
              Importer un CSV
            </Link>
          </ChartEmpty>
        ) : chart.series.length === 0 || chart.labels.length === 0 ? (
          <ChartEmpty message="Aucune vente pour ce plat sur les 7 derniers jours." />
        ) : (
          <MultiLineChart series={chart.series} labels={chart.labels} />
        )}
      </Surf>
    </StatsSection>
  );
}
