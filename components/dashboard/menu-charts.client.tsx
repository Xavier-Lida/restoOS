"use client";

import { HorizontalBars } from "@/components/dashboard/charts/svg-charts";

import type { MenuCategoryChartPoint } from "@/lib/schemas/chart-inputs";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

type MenuChartsClientProps = {
  data: MenuCategoryChartPoint[];
};

export function MenuChartsClient({ data }: MenuChartsClientProps) {
  const chartData = data.map((row) => ({
    ...row,
    categoryShort: row.category.length > 22 ? `${row.category.slice(0, 21)}…` : row.category,
  }));

  return (
    <section className="flex flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Menu (prix par catégorie)</h2>
        <p className="text-sm text-muted-foreground">
          Basé sur les articles enregistrés lors de l&apos;onboarding. Utile pour comparer au mix des ventes Square.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Prix moyen par catégorie</h3>
          <HorizontalBars
            rows={chartData.map((row) => ({ label: row.categoryShort, value: row.avgPriceCad }))}
            valueFormatter={(value) => cadFormatter.format(value)}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Nombre d&apos;articles par catégorie</h3>
          <HorizontalBars
            rows={chartData.map((row) => ({
              label: row.categoryShort,
              value: row.itemCount,
              color: "hsl(var(--chart-2, 160 84% 39%))",
            }))}
            valueFormatter={(value) => Math.round(value).toLocaleString("fr-CA")}
          />
        </div>
      </div>
    </section>
  );
}
