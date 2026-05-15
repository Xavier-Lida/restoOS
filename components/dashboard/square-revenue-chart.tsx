"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SquareRevenuePoint } from "@/lib/square/dashboard";

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

type SquareRevenueChartProps = {
  data: SquareRevenuePoint[];
};

export function SquareRevenueChart({ data }: SquareRevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Aucune donnee Square recue pour cette periode.
      </div>
    );
  }

  const showTaxes = data.some((p) => p.taxes > 0);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDayTick}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tickFormatter={(value: number) => cadFormatter.format(value)}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            width={80}
          />
          <Tooltip
            formatter={(value: number, name: string) => [cadFormatter.format(value), name]}
            labelFormatter={(label: string) => formatDayTick(label)}
          />
          <Line
            type="monotone"
            dataKey="netSales"
            name="Ventes nettes"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="grossSales"
            name="Ventes brutes"
            stroke="hsl(var(--chart-2, 160 84% 39%))"
            strokeWidth={2}
            dot={false}
          />
          {showTaxes ? (
            <Line
              type="monotone"
              dataKey="taxes"
              name="Taxes"
              stroke="hsl(var(--chart-4, 43 74% 49%))"
              strokeWidth={2}
              dot={false}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
