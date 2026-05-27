import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatsPageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 pb-14">{children}</div>;
}

export function StatsPageHeader({
  ownerName,
  subtitle,
  kicker = "Tableau de bord · 30 derniers jours",
  rightSlot,
}: {
  ownerName: string;
  subtitle: string;
  kicker?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <header>
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">{kicker}</p>
          <h1 className="text-[clamp(34px,4vw,44px)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
            Bonjour{" "}
            <span className="font-serif text-[1.06em] font-normal italic text-primary">{ownerName}</span>
          </h1>
          <p className="max-w-[540px] text-[14.5px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {rightSlot ? <div className="flex shrink-0 flex-col items-end gap-3">{rightSlot}</div> : null}
      </div>
    </header>
  );
}

export function StatsSourceBlock({ children }: { children: ReactNode }) {
  return (
    <div className="text-right">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80">État des sources</p>
      <div className="mt-2 flex flex-col items-end gap-1.5">{children}</div>
    </div>
  );
}

export function StatsChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "emerald" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone === "emerald" && "border-primary/40 bg-primary/10 text-primary",
        tone === "amber" && "border-amber-500/40 bg-amber-500/10 text-amber-400",
        tone === "default" && "border-border bg-popover text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function MetaStrip({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 grid overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_42px_rgba(0,0,0,0.35)] sm:grid-cols-2 xl:grid-cols-4">
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
    <article className="border-b border-border/80 px-6 py-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/90">{label}</p>
      <p className="mt-2 text-[24px] font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p> : null}
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
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-2.5 flex items-center gap-3">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.05em] text-primary tabular-nums">
            {num}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/90">{kicker}</span>
        </div>
        <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">{title}</h2>
        {subtitle ? <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
    </header>
  );
}

export function Surf({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Surf2({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-popover", className)}>{children}</div>
  );
}

export function StatsSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("space-y-5", className)}>{children}</section>;
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
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">{label}</p>
      <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      {delta ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px]">
          <span className={cn("tabular-nums", up ? "text-primary" : "text-red-400")}>{delta}</span>
          <span className="text-muted-foreground/80">vs P-30</span>
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
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground/90">{label}</p>
      <p
        className={cn(
          "mt-1 text-[20px] font-semibold tracking-tight tabular-nums",
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
        tone === "emerald" && "border-primary/40 bg-primary/10 text-primary",
        tone === "amber" && "border-amber-500/40 bg-amber-500/10 text-amber-400",
        tone === "default" && "border-border/80 bg-muted/20 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function StatsFooter({ restaurantName }: { restaurantName: string }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-[11.5px] text-muted-foreground/90">
      <p>Dernière synchronisation · données réelles RestoPrix</p>
      <div className="flex items-center gap-3">
        <span>RestoPrix · Statistiques</span>
        <span className="h-3 w-px bg-border" />
        <span className="text-primary">{restaurantName}</span>
      </div>
    </footer>
  );
}
