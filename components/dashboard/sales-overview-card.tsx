import type { ReactNode } from "react";

import { ComboBarsLineChart, Sparkline } from "@/components/dashboard/charts/svg-charts";
import { chartTokens as T } from "@/components/dashboard/charts/chart-tokens";
import { StatsPeriodSwitch } from "@/components/dashboard/stats-period-switch.client";
import { KpiCard, SecHeader, StatsSection, Surf } from "@/components/dashboard/stats-premium-ui";
import type { SquareRevenuePoint, SquareSummary } from "@/lib/square/dashboard";
import type { RevenueRange } from "@/lib/square/dashboard";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

type SalesOverviewCardProps = {
  data: SquareRevenuePoint[];
  summary: SquareSummary;
  selectedRange: RevenueRange;
  onRangeChange: (range: RevenueRange) => void;
  rangePending?: boolean;
};

const rangeChartTitle: Record<RevenueRange, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
};

export function SalesOverviewCard({
  data,
  summary,
  selectedRange,
  onRangeChange,
  rangePending = false,
}: SalesOverviewCardProps) {
  const headerRight: ReactNode = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatsPeriodSwitch
        selectedRange={selectedRange}
        onRangeChange={onRangeChange}
        disabled={rangePending}
      />
    </div>
  );

  return (
    <StatsSection>
      <SecHeader
        num="01"
        kicker="Ventes · point de vente"
        title="Performance des ventes"
        right={headerRight}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventes nettes"
          value={cadFormatter.format(summary.totalNetSales)}
          spark={<Sparkline values={data.map((row) => row.netSales)} id="sales-net" color={T.primary} />}
        />
        <KpiCard
          label="Moyenne / jour"
          value={cadFormatter.format(summary.averageDailyNet)}
          spark={<Sparkline values={data.map((row) => row.netSales)} id="sales-avg" color={T.primary} />}
        />
        <KpiCard
          label="Transactions"
          value={summary.totalTransactions.toLocaleString("fr-CA")}
          spark={<Sparkline values={data.map((row) => row.transactions)} id="sales-tx" color={T.blue} />}
        />
        <KpiCard
          label="Taxes (période)"
          value={cadFormatter.format(summary.totalTaxes)}
          spark={<Sparkline values={data.map((row) => row.transactions)} id="sales-tax" color={T.mutedForeground} />}
        />
      </div>

      <Surf className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-[15px] font-medium">
            Ventes & volume sur {rangeChartTitle[selectedRange]}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="size-2.5 rounded-[2px] bg-primary shadow-[0_0_10px_rgba(30,184,84,0.45)]" />
            Montants encaissés ($)
          </span>
        </div>
        <ComboBarsLineChart
          points={data.map((row) => ({
            day: row.day,
            netSales: row.netSales,
            transactions: row.transactions,
          }))}
          xLabels={selectedRange === "7d" && data.length <= 14 ? "weekday" : "none"}
        />
      </Surf>
    </StatsSection>
  );
}
