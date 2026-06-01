import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatsPageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 pb-14">{children}</div>;
}

export function StatsPageHeader({
  ownerName,
  kicker = "Tableau de bord",
  rightSlot,
}: {
  ownerName: string;
  subtitle?: string;
  kicker?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-6">
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          {kicker}
        </p>
        <h1 className="text-[clamp(28px,3.5vw,38px)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Bonjour{" "}
          <span className="font-serif text-[1.06em] font-normal italic text-primary">{ownerName}</span>
        </h1>
      </div>
      {rightSlot ? (
        <div className="flex shrink-0 flex-col items-end gap-2">{rightSlot}</div>
      ) : null}
    </header>
  );
}

export function MetaStrip({ children }: { children: ReactNode }) {
  return (
    <section className="grid overflow-hidden rounded-xl border border-border/70 bg-card sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </section>
  );
}

export function MetaCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="border-b border-border/60 px-5 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/80">{label}</p>
      <p className="mt-1.5 text-[22px] font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[11.5px] text-muted-foreground/70">{hint}</p> : null}
    </article>
  );
}

export function SecHeader({
  num,
  kicker,
  title,
  subtitle,
  right,
}: {
  num: string;
  kicker: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.05em] text-primary tabular-nums">
            {num}
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/80">{kicker}</span>
        </div>
        <h2 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.02em]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed text-muted-foreground/90">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
    </header>
  );
}

export function Surf({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-card shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Surf2({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-popover", className)}>{children}</div>
  );
}

export function StatsSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("space-y-4", className)}>{children}</section>;
}

export function KpiCard({
  label,
  value,
  delta,
  up = true,
  spark,
}: {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  spark: ReactNode;
}) {
  return (
    <Surf className="p-5">
      <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/80">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      {delta ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px]">
          <span className={cn("tabular-nums", up ? "text-primary" : "text-red-400")}>{delta}</span>
          <span className="text-muted-foreground/70">vs P-30</span>
        </p>
      ) : null}
      <div className="mt-3">{spark}</div>
    </Surf>
  );
}

export function BigStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber" | "default";
}) {
  return (
    <Surf2 className="px-4 py-3">
      <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground/80">{label}</p>
      <p
        className={cn(
          "mt-1 text-[19px] font-semibold tracking-tight tabular-nums",
          accent === "emerald" && "text-primary",
          accent === "amber" && "text-amber-400",
          accent === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
    </Surf2>
  );
}

export function SecChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "emerald" | "amber" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums",
        tone === "emerald" && "border-primary/30 bg-primary/8 text-primary",
        tone === "amber" && "border-amber-500/30 bg-amber-500/8 text-amber-400",
        tone === "default" && "border-border/70 bg-muted/20 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

// Legacy exports kept for compatibility with existing sections
export function StatsChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "emerald" | "amber";
}) {
  return <SecChip tone={tone}>{children}</SecChip>;
}

export function StatsSourceBlock({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function StatsFooter({ restaurantName }: { restaurantName: string }) {
  return (
    <footer className="flex items-center justify-between border-t border-border/50 pt-5 text-[11px] text-muted-foreground/60">
      <span>Données réelles · RestoPrix</span>
      <span className="text-primary/80">{restaurantName}</span>
    </footer>
  );
}
