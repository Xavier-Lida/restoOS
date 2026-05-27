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

const formatterCad = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

function costColor(kind: "prixNet" | "platCost" | "mo" | "fixe") {
  switch (kind) {
    case "prixNet":
      return "hsl(152 72% 35%)";
    case "platCost":
      return "hsl(25 92% 55%)";
    case "mo":
      return "hsl(45 90% 52%)";
    case "fixe":
      return "hsl(0 78% 58%)";
  }
}

type WaterfallData = {
  dish: string;
  priceNetCad: number;
  platCostCadNeg: number;
  moCadNeg: number;
  fixeCadNeg: number;
};

export function CostWaterfallChart({ dishes }: { dishes: PricingF0F1DishPoint[] }) {
  const chartData: WaterfallData[] = dishes.slice(0, 10).map((d) => ({
    dish: d.item_name,
    priceNetCad: d.prix_net_cad,
    platCostCadNeg: -d.plat_cost_cad_est,
    moCadNeg: -d.mo_cad,
    fixeCadNeg: -d.fixe_cad,
  }));

  return (
    <div className="flex h-96 w-full flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div>
        <p className="text-sm text-muted-foreground">Composition revenus / coûts (F0 + MO/Fixes)</p>
      </div>

      <div className="flex-1">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Aucune donnée pour afficher la composition.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              stackOffset="sign"
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => formatterCad.format(v)}
              />
              <YAxis
                dataKey="dish"
                type="category"
                width={260}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "platCostCadNeg") return [formatterCad.format(-value), "PlatCost"];
                  if (name === "moCadNeg") return [formatterCad.format(-value), "MO"];
                  if (name === "fixeCadNeg") return [formatterCad.format(-value), "Fixes"];
                  if (name === "priceNetCad") return [formatterCad.format(value), "Prix net"];
                  return [formatterCad.format(value), name];
                }}
              />

              {/* Waterfall-like : empilement signé (stackOffset="sign") */}
              <Bar dataKey="priceNetCad" stackId="waterfall" fill={costColor("prixNet")} radius={[2, 2, 2, 2]}>
                {chartData.map((_, idx) => (
                  <Cell key={`pn-${idx}`} fill={costColor("prixNet")} />
                ))}
              </Bar>
              <Bar dataKey="platCostCadNeg" stackId="waterfall" fill={costColor("platCost")}>
                {chartData.map((_, idx) => (
                  <Cell key={`pc-${idx}`} fill={costColor("platCost")} />
                ))}
              </Bar>
              <Bar dataKey="moCadNeg" stackId="waterfall" fill={costColor("mo")}>
                {chartData.map((_, idx) => (
                  <Cell key={`mo-${idx}`} fill={costColor("mo")} />
                ))}
              </Bar>
              <Bar dataKey="fixeCadNeg" stackId="waterfall" fill={costColor("fixe")}>
                {chartData.map((_, idx) => (
                  <Cell key={`fx-${idx}`} fill={costColor("fixe")} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

