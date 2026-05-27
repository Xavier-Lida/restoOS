"use client";

import type { ReactNode } from "react";

import { chartTokens as T } from "@/components/dashboard/charts/chart-tokens";

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildLinearScale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  const safeMax = domainMax === domainMin ? domainMin + 1 : domainMax;
  const ratio = (rangeMax - rangeMin) / (safeMax - domainMin);
  return (value: number) => rangeMin + (value - domainMin) * ratio;
}

function buildPolyline(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function buildArea(points: Point[], baseY: number): string {
  const line = buildPolyline(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${first.x.toFixed(1)},${baseY.toFixed(1)} ${line} ${last.x.toFixed(1)},${baseY.toFixed(1)}`;
}

function maxOf(values: number[]): number {
  return values.length > 0 ? Math.max(...values) : 1;
}

function minOf(values: number[]): number {
  return values.length > 0 ? Math.min(...values) : 0;
}

export function Sparkline({
  values,
  width = 220,
  height = 34,
  color = T.primary,
  id,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  id: string;
}) {
  const safe = values.length > 1 ? values : [0, 0];
  const min = minOf(safe);
  const max = maxOf(safe);
  const x = buildLinearScale(0, safe.length - 1, 0, width);
  const y = buildLinearScale(min, max, height - 3, 3);
  const points = safe.map((v, i) => ({ x: x(i), y: y(v) }));
  const last = points[points.length - 1];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={buildArea(points, height)} fill={`url(#spark-${id})`} />
      <polyline points={buildPolyline(points)} fill="none" stroke={color} strokeWidth="1.7" />
      <circle cx={last.x} cy={last.y} r="2.4" fill={color} />
    </svg>
  );
}

export function ComboBarsLineChart({
  bars,
  line,
  width = 940,
  height = 230,
  barColor = T.primary,
  lineColor = T.blue,
  labels,
}: {
  bars: number[];
  line: number[];
  width?: number;
  height?: number;
  barColor?: string;
  lineColor?: string;
  labels: string[];
}) {
  const padL = 38;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const count = Math.max(bars.length, 2);
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const maxBar = maxOf(bars) * 1.08;
  const maxLine = maxOf(line) * 1.08;
  const step = chartW / count;
  const barW = Math.max(4, step - 3);
  const yBar = buildLinearScale(0, maxBar, padT + chartH, padT);
  const yLine = buildLinearScale(0, maxLine, padT + chartH, padT);
  const points = line.map((value, index) => ({
    x: padL + index * step + barW / 2,
    y: yLine(value),
  }));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="combo-bar-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={barColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={barColor} stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + chartH - chartH * t;
        return (
          <g key={`grid-${i}`}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke={T.border}
              strokeDasharray={i === 0 ? "0" : "2 4"}
              opacity={i === 0 ? 0.6 : 0.4}
            />
            <text x={2} y={y + 3} fontSize="9" fill={T.mutedForeground}>
              {Math.round(maxBar * t).toLocaleString("fr-CA")} $
            </text>
          </g>
        );
      })}
      {bars.map((value, index) => {
        const x = padL + index * step;
        const y = yBar(value);
        return (
          <rect
            key={`bar-${index}`}
            x={x}
            y={y}
            width={barW}
            height={Math.max(1, padT + chartH - y)}
            rx="1.8"
            fill="url(#combo-bar-gradient)"
            opacity={index === bars.length - 1 ? 1 : 0.92}
          />
        );
      })}
      <polyline points={buildPolyline(points)} fill="none" stroke={lineColor} strokeWidth="1.7" opacity="0.92" />
      {points.map((point, index) =>
        index % Math.max(1, Math.floor(points.length / 8)) === 0 ? (
          <circle key={`dot-${index}`} cx={point.x} cy={point.y} r="2" fill={lineColor} />
        ) : null,
      )}
      {labels.map((label, index) => {
        if (index % Math.max(1, Math.floor(labels.length / 6)) !== 0 && index !== labels.length - 1) {
          return null;
        }
        return (
          <text
            key={`label-${index}`}
            x={padL + index * step + barW / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="9"
            fill={T.mutedForeground}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function WaterfallChart({
  values,
  labels,
  width = 540,
  height = 220,
}: {
  values: number[];
  labels: string[];
  width?: number;
  height?: number;
}) {
  const padL = 8;
  const padR = 8;
  const padB = 32;
  const padT = 12;
  const positiveSum = values.filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const max = Math.max(positiveSum, Math.abs(values[values.length - 1] ?? 0), 1) * 1.15;
  const scale = (v: number) => (v / max) * (height - padT - padB);
  const barW = (width - padL - padR) / values.length - 14;
  let running = 0;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = height - padB - t * (height - padT - padB);
        return (
          <line
            key={`wf-grid-${i}`}
            x1={padL}
            x2={width - padR}
            y1={y}
            y2={y}
            stroke={T.border}
            strokeDasharray={i === 0 ? "0" : "2 3"}
            opacity={i === 0 ? 0.6 : 0.4}
          />
        );
      })}
      {values.map((value, index) => {
        const isTotal = index === values.length - 1;
        const isNeg = value < 0;
        const x = padL + index * (barW + 14) + 7;
        let y: number;
        let barH: number;
        if (isTotal) {
          y = height - padB - scale(value);
          barH = scale(value);
        } else if (isNeg) {
          y = height - padB - scale(running);
          barH = scale(-value);
          running += value;
        } else {
          y = height - padB - scale(running + value);
          barH = scale(value);
          running += value;
        }
        const fill = isTotal ? T.primary : isNeg ? T.destructive : T.emeraldBright;
        const labelValue = `${value > 0 ? "+" : ""}${Math.round(value).toLocaleString("fr-CA")} $`;
        return (
          <g key={`wf-${index}`}>
            <rect x={x} y={y} width={barW} height={Math.max(2, barH)} rx="3" fill={fill} opacity={isTotal ? 1 : 0.9} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={fill}>
              {labelValue}
            </text>
            <text x={x + barW / 2} y={height - padB + 14} textAnchor="middle" fontSize="10.5" fill={T.mutedForeground}>
              {labels[index]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MatrixQuadrantChart({
  points,
  width = 500,
  height = 340,
}: {
  points: Array<{ x: number; y: number; r: number; color: string }>;
  width?: number;
  height?: number;
}) {
  const pad = 32;
  const x = buildLinearScale(0, 100, pad, width - pad);
  const y = buildLinearScale(0, 100, height - pad, pad);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect x={pad / 2} y={pad / 2} width={width / 2 - pad / 2} height={height / 2 - pad / 2} fill="rgba(217,154,74,0.05)" />
      <rect x={width / 2} y={pad / 2} width={width / 2 - pad / 2} height={height / 2 - pad / 2} fill="rgba(62,180,137,0.05)" />
      <rect x={pad / 2} y={height / 2} width={width / 2 - pad / 2} height={height / 2 - pad / 2} fill="rgba(217,106,106,0.05)" />
      <rect x={width / 2} y={height / 2} width={width / 2 - pad / 2} height={height / 2 - pad / 2} fill="rgba(106,168,217,0.05)" />
      <line x1={width / 2} y1={pad / 2} x2={width / 2} y2={height - pad / 2} stroke={T.border} strokeDasharray="2 4" />
      <line x1={pad / 2} y1={height / 2} x2={width - pad / 2} y2={height / 2} stroke={T.border} strokeDasharray="2 4" />
      <text x={width - 12} y={22} textAnchor="end" fill={T.emeraldBright} fontSize="11" fontWeight="600" opacity="0.85">
        ★ STAR
      </text>
      <text x={14} y={22} fill={T.amber} fontSize="11" fontWeight="600" opacity="0.85">
        ? PUZZLE
      </text>
      <text x={width - 12} y={height - 10} textAnchor="end" fill={T.blue} fontSize="11" fontWeight="600" opacity="0.85">
        PLOWHORSE
      </text>
      <text x={14} y={height - 10} fill={T.red} fontSize="11" fontWeight="600" opacity="0.85">
        DOG
      </text>
      <text x={width - pad / 2} y={height / 2 - 6} textAnchor="end" fill={T.mutedForeground} fontSize="9.5">
        popularité →
      </text>
      <text x={width / 2 + 6} y={pad / 2 + 10} fill={T.mutedForeground} fontSize="9.5">
        ↑ marge
      </text>
      {points.map((point, index) => (
        <g key={`m-${index}`}>
          <circle cx={x(point.x)} cy={y(point.y)} r={point.r + 4} fill={point.color} opacity="0.18" />
          <circle cx={x(point.x)} cy={y(point.y)} r={point.r} fill={point.color} opacity="0.82" />
          <circle cx={x(point.x)} cy={y(point.y)} r={point.r} fill="none" stroke={point.color} strokeOpacity="0.95" />
        </g>
      ))}
    </svg>
  );
}

export function HorizontalBars({
  rows,
  width = 460,
  rowHeight = 30,
  valueFormatter,
}: {
  rows: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  rowHeight?: number;
  valueFormatter: (value: number) => string;
}) {
  const height = rows.length * rowHeight + 10;
  const labelW = 146;
  const chartW = width - labelW - 72;
  const max = maxOf(rows.map((r) => r.value)) || 1;
  const x = buildLinearScale(0, max, 0, chartW);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {rows.map((row, index) => {
        const y = index * rowHeight + 8;
        const w = clamp(x(row.value), 2, chartW);
        const fill = row.color ?? T.primary;
        return (
          <g key={`${row.label}-${index}`}>
            <text x={0} y={y + 12} fontSize="10.5" fill={T.mutedForeground}>
              {row.label}
            </text>
            <rect x={labelW} y={y} width={chartW} height={10} rx="5" fill={T.muted} opacity="0.35" />
            <rect x={labelW} y={y} width={w} height={10} rx="5" fill={fill} opacity="0.92" />
            <text x={labelW + chartW + 6} y={y + 10} fontSize="10.5" fill={T.foreground}>
              {valueFormatter(row.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RadialGauge({
  score,
  delta,
  size = 168,
}: {
  score: number;
  delta: number;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arcBg = c * 0.75;
  const arc = (clamp(score, 0, 100) / 100) * arcBg;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(135deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={T.popover}
          strokeWidth={stroke}
          strokeDasharray={`${arcBg} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={T.primary}
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[52px] font-semibold leading-none tracking-tight text-primary tabular-nums">
          {Math.round(score)}
        </span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">/ 100</span>
        <span className="mt-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary tabular-nums">
          {delta > 0 ? `+${delta}` : delta} pts
        </span>
      </div>
    </div>
  );
}

export function ChartEmpty({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-border/70 text-center text-sm text-muted-foreground">
      {children ?? message}
    </div>
  );
}
