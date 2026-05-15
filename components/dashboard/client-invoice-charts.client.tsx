"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ClientInvoiceChartBundle } from "@/lib/dashboard/client-invoice-charts";
import type { RevenueRange } from "@/lib/square/dashboard";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const dayFormatter = new Intl.DateTimeFormat("fr-CA", {
  month: "short",
  day: "numeric",
});

function formatDayTick(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return dayFormatter.format(date);
}

function truncLabel(s: string, max = 36): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 84% 39%))",
  "hsl(var(--chart-3, 174 72% 40%))",
  "hsl(var(--chart-4, 43 74% 49%))",
  "hsl(var(--chart-5, 27 87% 55%))",
  "hsl(var(--chart-other, 150 20% 45%))",
];

type ClientInvoiceChartsClientProps = {
  bundle: ClientInvoiceChartBundle;
  selectedRange: RevenueRange;
};

const ranges: Array<{ value: RevenueRange; label: string }> = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

export function ClientInvoiceChartsClient({ bundle, selectedRange }: ClientInvoiceChartsClientProps) {
  const { daily, byClient, lineMix, taxMix, invoiceCount, totalCad } = bundle;
  const hasDaily = daily.length > 0;
  const hasLines = lineMix.some((r) => r.totalCad > 0);
  const hasTaxes = taxMix.some((r) => r.totalCad > 0);

  return (
    <section className="flex flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Facturation clients (B2B)</h2>
          <p className="text-sm text-muted-foreground">
            Données issues des factures importées et analysées (montants, lignes, taxes lorsque présentes).
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Factures (période)" value={String(invoiceCount)} />
        <Stat label="Total facturé" value={cadFormatter.format(totalCad)} />
        <Stat label="CA moyen / facture" value={cadFormatter.format(invoiceCount > 0 ? totalCad / invoiceCount : 0)} />
      </div>

      <div className="grid gap-8">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">CA et volume par jour</h3>
          {hasDaily ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatDayTick}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    yAxisId="cad"
                    tickFormatter={(v: number) => cadFormatter.format(v)}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={76}
                  />
                  <YAxis
                    yAxisId="count"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={36}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "totalCad" ? [cadFormatter.format(value), "CA"] : [value, "Factures"]
                    }
                    labelFormatter={(label: string) => formatDayTick(label)}
                  />
                  <Bar yAxisId="count" dataKey="invoiceCount" name="Nombre de factures" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line
                    yAxisId="cad"
                    type="monotone"
                    dataKey="totalCad"
                    name="CA ($)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="Aucune facture dans cette période." />
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Top clients</h3>
            {byClient.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byClient.map((r) => ({ ...r, clientKey: truncLabel(r.clientKey, 32) }))}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v: number) => cadFormatter.format(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="clientKey" width={108} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => cadFormatter.format(v)} />
                    <Bar dataKey="totalCad" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Pas encore de clients identifiés." />
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Articles / services facturés</h3>
            {hasLines ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lineMix.map((r) => ({ ...r, label: truncLabel(r.label, 40) }))}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v: number) => cadFormatter.format(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => cadFormatter.format(v)} />
                    <Bar dataKey="totalCad" fill="hsl(var(--chart-2, 160 84% 39%))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Aucune ligne détaillée (réimporte avec l’analyse enrichie ou ajoute des factures avec lignes)." />
            )}
          </div>
        </div>

        {hasTaxes ? (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Taxes déclarées (factures)</h3>
            <div className="h-56 w-full max-w-xl">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxMix} margin={{ top: 8, right: 16, bottom: 40, left: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis tickFormatter={(v: number) => cadFormatter.format(v)} width={72} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => cadFormatter.format(v)} />
                  <Bar dataKey="totalCad" name="Montant" radius={[4, 4, 0, 0]}>
                    {taxMix.map((row, i) => (
                      <Cell key={`${row.label}-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
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

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
