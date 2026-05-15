"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 48, left: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="categoryShort" tick={{ fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={52} />
                <YAxis tickFormatter={(v: number) => cadFormatter.format(v)} width={72} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => cadFormatter.format(v)}
                  labelFormatter={(_, p) => {
                    const pl = p?.[0]?.payload as MenuCategoryChartPoint | undefined;
                    return pl?.category ?? "";
                  }}
                />
                <Bar dataKey="avgPriceCad" name="Prix moyen" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Nombre d&apos;articles par catégorie</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 48, left: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="categoryShort" tick={{ fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={52} />
                <YAxis allowDecimals={false} width={36} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v, "Articles"]}
                  labelFormatter={(_, p) => {
                    const pl = p?.[0]?.payload as MenuCategoryChartPoint | undefined;
                    return pl?.category ?? "";
                  }}
                />
                <Bar dataKey="itemCount" name="Articles" fill="hsl(var(--chart-2, 160 84% 39%))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
