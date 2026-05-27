import { ComboBarsLineChart, Sparkline } from "@/components/dashboard/charts/svg-charts";
import { chartTokens as T } from "@/components/dashboard/charts/chart-tokens";
import { KpiCard, SecChip, SecHeader, StatsSection, Surf } from "@/components/dashboard/stats-premium-ui";
import type { PeriodDelta, SquareRevenuePoint, SquareSummary } from "@/lib/square/dashboard";
import type { RevenueRange } from "@/lib/square/dashboard";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const dayFormatter = new Intl.DateTimeFormat("fr-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type SquareRevenueCardProps = {
  data: SquareRevenuePoint[];
  summary: SquareSummary;
  selectedRange: RevenueRange;
  deltas: {
    netSales: PeriodDelta;
    avgDaily: PeriodDelta;
    transactions: PeriodDelta;
    taxes: PeriodDelta;
  };
};

const rangeChartTitle: Record<RevenueRange, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
};

function formatDayRange(points: SquareRevenuePoint[]): string | null {
  if (points.length === 0) return null;
  const first = points[0].day;
  const last = points[points.length - 1].day;
  const fmt = (d: string) => dayFormatter.format(new Date(`${d}T12:00:00`));
  return `${fmt(first)} → ${fmt(last)}`;
}

function bestWorstDay(points: SquareRevenuePoint[]) {
  if (points.length === 0) return { best: null, worst: null };
  let best = points[0];
  let worst = points[0];
  for (const p of points) {
    if (p.netSales > best.netSales) best = p;
    if (p.netSales < worst.netSales) worst = p;
  }
  return { best, worst };
}

export function SquareRevenueCard({ data, summary, selectedRange, deltas }: SquareRevenueCardProps) {
  const labels = data.map((_, index) => `j${index + 1}`);
  const { best, worst } = bestWorstDay(data);
  const dayRange = formatDayRange(data);
  const avgBasket =
    summary.totalTransactions > 0 ? summary.totalNetSales / summary.totalTransactions : 0;
  const headerDelta = deltas.netSales.pct != null ? deltas.netSales : null;

  return (
    <StatsSection>
      <SecHeader
        num="01"
        kicker="Square · point de vente"
        title="Ventes Square"
        subtitle="Importé depuis vos rapports CSV Square. Comparé à la période précédente de même durée."
        right={
          headerDelta ? (
            <SecChip tone={headerDelta.up ? "emerald" : "default"}>
              {headerDelta.up ? "↑" : "↓"} {headerDelta.label} vs P-30
            </SecChip>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventes nettes"
          value={cadFormatter.format(summary.totalNetSales)}
          delta={deltas.netSales.pct != null ? deltas.netSales.label : undefined}
          up={deltas.netSales.up}
          spark={<Sparkline values={data.map((row) => row.netSales)} id="sq-net" color={T.primary} />}
        />
        <KpiCard
          label="Moyenne / jour"
          value={cadFormatter.format(summary.averageDailyNet)}
          delta={deltas.avgDaily.pct != null ? deltas.avgDaily.label : undefined}
          up={deltas.avgDaily.up}
          spark={<Sparkline values={data.map((row) => row.netSales)} id="sq-avg" color={T.primary} />}
        />
        <KpiCard
          label="Transactions"
          value={summary.totalTransactions.toLocaleString("fr-CA")}
          delta={deltas.transactions.pct != null ? deltas.transactions.label : undefined}
          up={deltas.transactions.up}
          spark={<Sparkline values={data.map((row) => row.transactions)} id="sq-tx" color={T.blue} />}
        />
        <KpiCard
          label="Taxes (période)"
          value={cadFormatter.format(summary.totalTaxes)}
          delta={deltas.taxes.pct != null ? deltas.taxes.label : undefined}
          up={deltas.taxes.up}
          spark={<Sparkline values={data.map((row) => row.taxes)} id="sq-tax" color={T.mutedForeground} />}
        />
      </div>

      <Surf className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-medium">Ventes & volume sur {rangeChartTitle[selectedRange]}</h3>
            {dayRange ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{dayRange} · America/Montreal</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] bg-primary shadow-[0_0_10px_rgba(30,184,84,0.45)]" />
              Montants encaissés ($)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: T.blue }} />
              Transactions
            </span>
          </div>
        </div>
        <ComboBarsLineChart bars={data.map((row) => row.netSales)} line={data.map((row) => row.transactions)} labels={labels} />
        {data.length > 0 ? (
          <div className="mt-4 grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            {best ? (
              <div>
                <span className="text-muted-foreground/70">Meilleur jour</span>
                {" · "}
                <span className="tabular-nums text-foreground">{cadFormatter.format(best.netSales)}</span>
              </div>
            ) : null}
            {worst ? (
              <div>
                <span className="text-muted-foreground/70">Pire jour</span>
                {" · "}
                <span className="tabular-nums text-foreground">{cadFormatter.format(worst.netSales)}</span>
              </div>
            ) : null}
            <div>
              <span className="text-muted-foreground/70">Panier moyen</span>
              {" · "}
              <span className="tabular-nums text-foreground">{cadFormatter.format(avgBasket)}</span>
            </div>
            <div className="lg:text-right">
              <span className="text-muted-foreground/70">Source</span>
              {" · "}
              <span>Square CSV</span>
            </div>
          </div>
        ) : null}
      </Surf>
    </StatsSection>
  );
}
