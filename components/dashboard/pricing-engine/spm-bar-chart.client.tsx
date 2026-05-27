"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PricingF2DishPoint } from "@/lib/dashboard/pricing-engine/f2-spm-insights";

function spmColor(verdict: PricingF2DishPoint["spm_verdict"]): string {
  switch (verdict) {
    case "trop_bas":
      return "hsl(0 78% 58%)";
    case "zone_optimal":
      return "hsl(152 72% 35%)";
    case "hors_marche":
      return "hsl(45 90% 52%)";
    default:
      return "hsl(var(--muted-foreground))";
  }
}

const formatterPct = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });

export function SpmBarChart({ dishes }: { dishes: PricingF2DishPoint[] }) {
  const chartData = dishes
    .filter((d) => d.spm_pct != null && d.spm_verdict != null)
    .slice(0, 12)
    .map((d) => ({
      dish: d.item_name,
      spmPct: d.spm_pct as number,
      verdict: d.spm_verdict as PricingF2DishPoint["spm_verdict"],
    }));

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <div>
        <p className="text-sm text-muted-foreground">SPM (%) vs référence marché (F2)</p>
      </div>

      <div className="mt-4 h-[360px] w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            SPM indisponible (pas de concurrents).
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 16, bottom: 8, left: 16 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `${formatterPct.format(v)}%`}
              />
              <YAxis
                dataKey="dish"
                type="category"
                width={240}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <ReferenceLine x={-15} stroke="hsl(0 78% 58%)" strokeDasharray="6 6" />
              <ReferenceLine x={10} stroke="hsl(45 90% 52%)" strokeDasharray="6 6" />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, "SPM"]}
                labelFormatter={(label: string) => label}
              />
              <Bar dataKey="spmPct" name="SPM (%)">
                {chartData.map((row, idx) => (
                  <Cell key={`${row.dish}-${idx}`} fill={spmColor(row.verdict)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Seuils (PDF) : SPM &lt; -15% trop bas ; -15% à +10% zone optimale ; &gt; +10% au-dessus marché.
      </p>
    </div>
  );
}

