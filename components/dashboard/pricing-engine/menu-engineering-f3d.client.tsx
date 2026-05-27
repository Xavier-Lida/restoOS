"use client";

import type { ReactElement } from "react";

import { ChartEmpty, MatrixQuadrantChart } from "@/components/dashboard/charts/svg-charts";
import { chartTokens as T } from "@/components/dashboard/charts/chart-tokens";
import { SecHeader, Surf, StatsSection } from "@/components/dashboard/stats-premium-ui";
import type { PricingF0F1DishPoint } from "@/lib/dashboard/pricing-engine/f0f1-insights";
import { cn } from "@/lib/utils";

export type F3dQuadrant = "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";

export type F3dPoint = {
  dish: string;
  xVolumeMonthly: number;
  yIrrPct: number;
  quadrant: F3dQuadrant;
  confidence: PricingF0F1DishPoint["confidence"];
  priceTtcCad: number;
};

const quadrantMeta: Record<
  F3dQuadrant,
  { code: string; label: string; description: string; color: string; accent: string }
> = {
  STAR: {
    code: "STAR",
    label: "Vedettes",
    description: "Pop. + marge ↑ — garder en vitrine",
    color: T.emeraldBright,
    accent: "border-primary/35 bg-primary/8",
  },
  PLOWHORSE: {
    code: "PLOWHORSE",
    label: "Bêtes de somme",
    description: "Pop. ↑ marge ↓ — repricer prudemment",
    color: T.blue,
    accent: "border-sky-500/30 bg-sky-500/8",
  },
  PUZZLE: {
    code: "PUZZLE",
    label: "Énigmes",
    description: "Marge ↑ pop. ↓ — promouvoir",
    color: T.amber,
    accent: "border-amber-500/30 bg-amber-500/8",
  },
  DOG: {
    code: "DOG",
    label: "À surveiller",
    description: "Pop. ↓ marge ↓ — retirer ?",
    color: T.red,
    accent: "border-red-500/30 bg-red-500/8",
  },
};

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

function volumeFormatter(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("fr-CA");
}

export function MenuEngineeringF3dChart({
  points,
  seuilVolume,
  seuilMarge,
}: {
  points: F3dPoint[];
  seuilVolume: number;
  seuilMarge: number;
}) {
  const colorMap: Record<F3dQuadrant, string> = {
    STAR: quadrantMeta.STAR.color,
    PLOWHORSE: quadrantMeta.PLOWHORSE.color,
    PUZZLE: quadrantMeta.PUZZLE.color,
    DOG: quadrantMeta.DOG.color,
  };
  const maxVolume = Math.max(1, ...points.map((p) => p.xVolumeMonthly));
  const maxIrr = Math.max(1, ...points.map((p) => p.yIrrPct));
  const svgPoints = points.map((point) => ({
    x: (point.xVolumeMonthly / maxVolume) * 100,
    y: (point.yIrrPct / maxIrr) * 100,
    r: 5 + Math.min(10, point.xVolumeMonthly / 22),
    color: colorMap[point.quadrant],
  }));
  const counts = points.reduce<Record<F3dQuadrant, number>>(
    (acc, point) => ({ ...acc, [point.quadrant]: acc[point.quadrant] + 1 }),
    { STAR: 0, PLOWHORSE: 0, PUZZLE: 0, DOG: 0 },
  );
  const topItems = [...points].sort((a, b) => b.xVolumeMonthly - a.xVolumeMonthly).slice(0, 6);

  const matrixContent: Record<"empty" | "ready", ReactElement> = {
    empty: <ChartEmpty message="Aucune donnée menu engineering disponible." />,
    ready: <MatrixQuadrantChart points={svgPoints} />,
  };
  const state = points.length === 0 ? "empty" : "ready";

  return (
    <StatsSection>
      <SecHeader
        num="03"
        kicker="F3d · Menu Engineering"
        title="Comment chaque plat performe"
        subtitle="Vue popularité × marge sur 30 jours. La taille du point = volume vendu."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(quadrantMeta) as F3dQuadrant[]).map((key) => (
          <Surf key={key} className={cn("p-4", quadrantMeta[key].accent)}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider" style={{ color: quadrantMeta[key].color }}>
                {quadrantMeta[key].code}
              </span>
              <span className="text-[28px] font-semibold tabular-nums">{counts[key]}</span>
            </div>
            <p className="mt-1 text-[12.5px] font-medium">{quadrantMeta[key].label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{quadrantMeta[key].description}</p>
          </Surf>
        ))}
      </div>

      <Surf className="p-6">
        <div className="grid gap-7 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="min-h-[360px]">{matrixContent[state]}</div>
          </div>
          <div className="lg:col-span-5">
            <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Top items · 30 j</p>
            <ul className="space-y-0">
              {topItems.length === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">—</li>
              ) : (
                topItems.map((item) => (
                  <li
                    key={item.dish}
                    className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: quadrantMeta[item.quadrant].color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{item.dish}</span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                      <span className="text-foreground">{cadFormatter.format(item.priceTtcCad)}</span>
                      {" · "}
                      {volumeFormatter(item.xVolumeMonthly)}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Seuil volume {volumeFormatter(seuilVolume)} · IRR {seuilMarge.toFixed(1)}%
            </p>
          </div>
        </div>
      </Surf>
    </StatsSection>
  );
}
