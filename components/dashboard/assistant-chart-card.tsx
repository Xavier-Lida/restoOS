"use client";

import { MultiLineChart } from "@/components/dashboard/charts/multi-line-chart";
import { ComboBarsLineChart, HorizontalBars } from "@/components/dashboard/charts/svg-charts";
import { Surf } from "@/components/dashboard/stats-premium-ui";
import type { AssistantChart } from "@/lib/schemas/assistant-turn";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

type AssistantChartCardProps = {
  chart: AssistantChart;
};

export function AssistantChartCard({ chart }: AssistantChartCardProps) {
  return (
    <Surf className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium tracking-tight text-foreground">{chart.title}</h3>
      {chart.kind === "revenue_bars" ? (
        <ComboBarsLineChart
          points={chart.points.map((p) => ({
            day: p.day,
            netSales: p.netSales,
            transactions: p.transactions,
          }))}
        />
      ) : null}
      {chart.kind === "multi_line" ? (
        <MultiLineChart series={chart.series} labels={chart.labels} />
      ) : null}
      {chart.kind === "horizontal_bars" ? (
        <HorizontalBars
          rows={chart.rows}
          valueFormatter={(v) => {
            if (chart.valueSuffix === " $/mois") {
              return `${cadFormatter.format(v)}/mois`;
            }
            if (chart.valueSuffix === " $") {
              return cadFormatter.format(v);
            }
            return `${v.toLocaleString("fr-CA")}${chart.valueSuffix ?? ""}`;
          }}
        />
      ) : null}
    </Surf>
  );
}
