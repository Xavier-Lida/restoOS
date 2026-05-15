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

const dayFormatter = new Intl.DateTimeFormat("fr-CA", {
  month: "short",
  day: "numeric",
});

function formatDayTick(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return dayFormatter.format(date);
}

type SquareTransactionsChartProps = {
  data: SquareRevenuePoint[];
};

export function SquareTransactionsChart({ data }: SquareTransactionsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Aucune donnée pour cette période.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDayTick}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={44} allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString("fr-CA"), "Transactions"]}
            labelFormatter={(label: string) => formatDayTick(label)}
          />
          <Line
            type="monotone"
            dataKey="transactions"
            name="Transactions"
            stroke="hsl(var(--chart-3, 174 72% 40%))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
