"use client";

import Link from "next/link";

import type { RevenueRange } from "@/lib/square/dashboard";
import { cn } from "@/lib/utils";

const ranges: Array<{ value: RevenueRange; label: string }> = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

export function StatsPeriodSwitch({ selectedRange }: { selectedRange: RevenueRange }) {
  return (
    <nav
      className="inline-flex items-center rounded-[10px] border border-border bg-popover p-1"
      aria-label="Période"
    >
      {ranges.map((range) => {
        const active = range.value === selectedRange;
        return (
          <Link
            key={range.value}
            href={`/dashboard/stats?range=${range.value}`}
            className={cn(
              "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-medium tabular-nums transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(30,184,84,0.35)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {range.label}
          </Link>
        );
      })}
    </nav>
  );
}
