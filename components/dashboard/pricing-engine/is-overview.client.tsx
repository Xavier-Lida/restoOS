"use client";

import { RadialGauge } from "@/components/dashboard/charts/svg-charts";
import { chartTokens as T } from "@/components/dashboard/charts/chart-tokens";
import type { PricingF3DishPoint } from "@/lib/dashboard/pricing-engine/f3-is-insights";
import { cn } from "@/lib/utils";

export type IsDecompositionRow = {
  key: string;
  value: number;
};

type IsOverviewClientProps = {
  avgScore: number;
  delta: number;
  leaderboard: PricingF3DishPoint[];
  decomposition: IsDecompositionRow[];
};

function barColor(value: number): string {
  if (value >= 75) return T.primary;
  if (value >= 60) return T.blue;
  return T.amber;
}

export function IsOverviewClient({ avgScore, delta, leaderboard, decomposition }: IsOverviewClientProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-7 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
      <div className="grid gap-7 lg:grid-cols-12 lg:items-center">
        <div className="flex flex-col items-center lg:col-span-4">
          <RadialGauge score={avgScore} delta={delta} size={168} />
          <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
            Score moyen sur <span className="font-semibold text-foreground">{leaderboard.length}</span> plats
          </p>
        </div>
        <div className="lg:col-span-8">
          <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Décomposition</p>
          <div className="space-y-3">
            {decomposition.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                <div className="w-24 text-[13px] text-muted-foreground">{row.key}</div>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full border border-border bg-popover">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, row.value)}%`, background: barColor(row.value) }}
                  />
                  <div className="absolute left-[70%] top-[-3px] h-3.5 w-px bg-muted-foreground/50" />
                </div>
                <div className="w-8 text-right text-[13px] font-semibold tabular-nums">{Math.round(row.value)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-2 text-[10.5px] text-muted-foreground/80">
            <span className="inline-block h-2.5 w-px bg-muted-foreground/50" />
            benchmark restaurants similaires (proxy)
          </p>
        </div>
      </div>

      <div className="my-6 h-px bg-border/70" />

      <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Leaderboard</p>
      <ul className="space-y-1">
        {leaderboard.map((row, index) => {
          const rank = index + 1;
          const scoreDelta = Math.round(row.tendance * 10) / 10;
          return (
            <li
              key={row.menu_item_id}
              className={cn(
                "flex items-center gap-4 rounded-lg border px-4 py-3",
                row.is_verdict === "mettre_en_avant"
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-popover",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-[12px] font-semibold tabular-nums",
                  rank === 1 ? "bg-amber-400 text-neutral-900" : "bg-muted/40 text-foreground",
                )}
              >
                {rank}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[14px]",
                  row.is_verdict === "mettre_en_avant" && "font-semibold text-primary",
                )}
              >
                {row.item_name}
              </span>
              <div className="h-1 w-[220px] max-w-[30%] overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${Math.min(100, row.is_score)}%` }}
                />
              </div>
              <span className="w-10 text-right text-[15px] font-semibold tabular-nums">
                {row.is_score.toFixed(0)}
              </span>
              <span
                className={cn(
                  "w-10 text-right text-[12px] tabular-nums",
                  scoreDelta > 0 ? "text-primary" : scoreDelta < 0 ? "text-red-400" : "text-muted-foreground",
                )}
              >
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
