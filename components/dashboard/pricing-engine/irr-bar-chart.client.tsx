"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import type { PricingF0F1DishPoint } from "@/lib/dashboard/pricing-engine/f0f1-insights";

const formatterCad0 = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });

function irrColor(irrVerdict: PricingF0F1DishPoint["irr_verdict"]): string {
  switch (irrVerdict) {
    case "rentable":
      return "hsl(152 72% 35%)";
    case "surveillance":
      return "hsl(45 90% 52%)";
    case "marge_faible":
      return "hsl(25 92% 55%)";
    case "perte":
      return "hsl(0 78% 58%)";
  }
}

export function IRRBarChart({ dishes }: { dishes: PricingF0F1DishPoint[] }) {
  const chartData = dishes.slice(0, 12).map((d) => ({
    dish: d.item_name,
    irrPct: d.irr_pct,
    irrVerdict: d.irr_verdict,
    confidence: d.confidence,
  }));

  return (
    <div className="flex h-96 w-full flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div>
        <p className="text-sm text-muted-foreground">IRR (%) par plat (F1)</p>
      </div>

      <div className="flex-1">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Aucune donnée pour calculer l&apos;IRR.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${formatterCad0.format(v)}%`}
              />
              <YAxis
                dataKey="dish"
                type="category"
                width={240}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "irrPct") return [`${value.toFixed(1)}%`, "IRR"];
                  return [String(value), name];
                }}
                labelFormatter={(label: string) => label}
              />
              <Bar dataKey="irrPct" name="IRR">
                {chartData.map((row, idx) => (
                  <Cell key={`${row.dish}-${idx}`} fill={irrColor(row.irrVerdict)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

