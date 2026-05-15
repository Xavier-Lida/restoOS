import Link from "next/link";

import { SquareRevenueChart } from "@/components/dashboard/square-revenue-chart";
import { SquareTransactionsChart } from "@/components/dashboard/square-transactions-chart";
import type { RevenueRange, SquareRevenuePoint, SquareSummary } from "@/lib/square/dashboard";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const ranges: Array<{ value: RevenueRange; label: string }> = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

type SquareRevenueCardProps = {
  data: SquareRevenuePoint[];
  summary: SquareSummary;
  selectedRange: RevenueRange;
};

export function SquareRevenueCard({ data, summary, selectedRange }: SquareRevenueCardProps) {
  return (
    <section className="flex flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Ventes Square (CSV)</h2>
          <p className="text-sm text-muted-foreground">
            Donnees importees depuis les rapports de ventes Square.
          </p>
        </div>
        <nav className="flex gap-2">
          {ranges.map((range) => (
            <Link
              key={range.value}
              href={`/dashboard/stats?range=${range.value}`}
              data-active={range.value === selectedRange}
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
            >
              {range.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ventes nettes" value={cadFormatter.format(summary.totalNetSales)} />
        <Stat label="Moyenne / jour" value={cadFormatter.format(summary.averageDailyNet)} />
        <Stat label="Transactions" value={summary.totalTransactions.toLocaleString("fr-CA")} />
        <Stat label="Taxes (période)" value={cadFormatter.format(summary.totalTaxes)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Montants encaissés</h3>
          <SquareRevenueChart data={data} />
        </div>
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Volume (transactions)</h3>
          <SquareTransactionsChart data={data} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
