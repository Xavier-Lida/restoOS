"use client";

import { chartTokens as T } from "@/components/dashboard/charts/chart-tokens";

type Point = { x: number; y: number };

function buildLinearScale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  const safeMax = domainMax === domainMin ? domainMin + 1 : domainMax;
  const ratio = (rangeMax - rangeMin) / (safeMax - domainMin);
  return (value: number) => rangeMin + (value - domainMin) * ratio;
}

function buildPolyline(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export type MultiLineSeries = {
  id: string;
  label: string;
  values: number[];
  color?: string;
  dashed?: boolean;
};

export function MultiLineChart({
  series,
  labels,
  width = 940,
  height = 240,
}: {
  series: MultiLineSeries[];
  labels: string[];
  width?: number;
  height?: number;
}) {
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const count = Math.max(labels.length, 2);
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const allValues = series.flatMap((s) => s.values);
  const maxY = allValues.length > 0 ? Math.max(...allValues, 1) * 1.08 : 1;
  const step = chartW / Math.max(count - 1, 1);
  const xAt = (index: number) => padL + index * step;
  const yScale = buildLinearScale(0, maxY, padT + chartH, padT);

  const defaultColors = [T.primary, T.blue, T.amber, T.red];

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padT + chartH - chartH * t;
          return (
            <line
              key={`grid-${i}`}
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={T.border}
              strokeOpacity="0.55"
            />
          );
        })}
        {series.map((s, si) => {
          const color = s.color ?? defaultColors[si % defaultColors.length];
          const values = s.values.length > 0 ? s.values : labels.map(() => 0);
          const points: Point[] = values.map((value, index) => ({
            x: xAt(index),
            y: yScale(value),
          }));
          return (
            <g key={s.id}>
              <polyline
                points={buildPolyline(points)}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "6 4" : undefined}
              />
              {points.map((p, pi) => (
                <circle key={`${s.id}-${pi}`} cx={p.x} cy={p.y} r="2.5" fill={color} />
              ))}
            </g>
          );
        })}
        {labels.map((label, index) => (
          <text
            key={`lbl-${index}`}
            x={xAt(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="9.5"
            fill={T.mutedForeground}
          >
            {label}
          </text>
        ))}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-4 text-[12px] text-muted-foreground">
        {series.map((s, si) => {
          const color = s.color ?? defaultColors[si % defaultColors.length];
          return (
            <li key={s.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-5 rounded-full"
                style={{
                  background: color,
                  borderStyle: s.dashed ? "dashed" : "solid",
                }}
              />
              {s.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
