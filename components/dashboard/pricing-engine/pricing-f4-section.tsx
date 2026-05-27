import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import type { PricingProfile } from "@/lib/pricing-engine/math";
import { SecChip, SecHeader, StatsSection, Surf } from "@/components/dashboard/stats-premium-ui";
import { loadPricingF4Insights, type PricingF4DishDecision } from "@/lib/dashboard/pricing-engine/f4-insights";
import { cn } from "@/lib/utils";

export async function PricingF4Section({
  userId,
  menuItems,
  range,
  profile,
}: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
  profile: PricingProfile;
}) {
  const insights = await loadPricingF4Insights({ userId, menuItems, range, profile });
  const decisions = insights.decisions.slice(0, 12);
  const alertCount =
    insights.actionCounts.C1 + insights.actionCounts.C2 + insights.actionCounts.C3 + insights.actionCounts.GEL;
  const applied = insights.actionCounts.A1;

  return (
    <StatsSection>
      <SecHeader
        num="04"
        kicker="F4 · Repricing"
        title="Alertes & prix proposés"
        subtitle="Pour chaque item : zone plancher → plafond, cible RestoPrix, prix actuel et prix proposé."
        right={
          <>
            {alertCount > 0 ? (
              <SecChip tone="amber">{alertCount} alertes actives</SecChip>
            ) : null}
            <SecChip>
              {applied} / {decisions.length} ajustements
            </SecChip>
          </>
        }
      />

      {insights.competitorMode === "missing" ? (
        <p className="text-sm text-muted-foreground">
          Données concurrents indisponibles : F4 utilise le prix actuel comme approximation marché.
        </p>
      ) : null}

      <Surf className="overflow-hidden">
        <div
          className="grid items-center px-6 py-3 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/90"
          style={{ gridTemplateColumns: "1.6fr 3fr 0.7fr 0.7fr 0.6fr" }}
        >
          <div>Item</div>
          <div>Fourchette plancher / cible / plafond</div>
          <div className="text-right">Actuel</div>
          <div className="text-right">Proposé</div>
          <div className="text-right">Action</div>
        </div>
        {decisions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Aucune suggestion calculée pour le moment.</p>
        ) : (
          decisions.map((d) => <F4Row key={d.menu_item_id} decision={d} />)
        )}
      </Surf>
    </StatsSection>
  );
}

function F4Row({ decision: d }: { decision: PricingF4DishDecision }) {
  const dec = d.decision;
  const min = dec.plancherCad ?? Math.min(dec.currentPriceCad, dec.suggestedPriceCad ?? dec.currentPriceCad);
  const max = dec.plafondCad ?? Math.max(dec.currentPriceCad, dec.suggestedPriceCad ?? dec.currentPriceCad);
  const span = Math.max(0.01, max - min);
  const toPct = (value: number) => ((value - min) / span) * 100;
  const currentPct = toPct(dec.currentPriceCad);
  const proposed = dec.suggestedPriceCad ?? dec.currentPriceCad;
  const proposedPct = toPct(proposed);
  const targetPct = dec.prixCibleCad != null ? toPct(dec.prixCibleCad) : null;
  const delta = proposed - dec.currentPriceCad;
  const up = delta > 0;
  const down = delta < 0;
  const hold = Math.abs(delta) < 0.01 || d.action === "NO_CHANGE" || d.action === "GEL";

  return (
    <div
      className="grid items-center border-t border-border/70 px-6 py-4 text-[13px]"
      style={{ gridTemplateColumns: "1.6fr 3fr 0.7fr 0.7fr 0.6fr" }}
    >
      <div className="pr-3 font-medium">{d.item_name}</div>
      <div className="pr-5">
        <div className="relative h-3.5">
          <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-gradient-to-r from-red-500/30 via-amber-400/30 via-45% to-emerald-400/45 to-55% via-amber-400/30 to-red-500/30" />
          {targetPct != null ? (
            <div
              className="absolute top-0.5 h-2.5 rounded border border-primary/55 bg-primary/25"
              style={{ left: `${Math.max(0, targetPct - 4)}%`, width: "8%" }}
            />
          ) : null}
          <div className="absolute top-0 h-3.5 w-0.5 bg-muted-foreground" style={{ left: `${currentPct}%` }} />
          <div
            className="absolute top-[-2px] h-0 w-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-primary"
            style={{ left: `calc(${proposedPct}% - 5px)` }}
          />
          <div className="absolute top-0.5 h-2 w-0.5 bg-primary" style={{ left: `${proposedPct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] tabular-nums text-muted-foreground/90">
          <span>plancher {min.toFixed(2)} $</span>
          {dec.prixCibleCad != null ? (
            <span className="text-primary">cible {dec.prixCibleCad.toFixed(2)} $</span>
          ) : (
            <span />
          )}
          <span>plafond {max.toFixed(2)} $</span>
        </div>
      </div>
      <div className="text-right tabular-nums">{dec.currentPriceCad.toFixed(2)} $</div>
      <div
        className={cn(
          "text-right font-semibold tabular-nums",
          up && "text-primary",
          down && "text-red-400",
          hold && "text-muted-foreground",
        )}
      >
        {proposed.toFixed(2)} $
      </div>
      <div className="text-right">
        {hold ? (
          <span className="inline-flex rounded-full border border-border/80 px-2 py-0.5 text-[11px] text-muted-foreground">
            tenir
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] tabular-nums",
              up && "border-primary/40 text-primary",
              down && "border-red-500/40 text-red-400",
            )}
          >
            {up ? "↑" : "↓"} {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} $
          </span>
        )}
      </div>
    </div>
  );
}
