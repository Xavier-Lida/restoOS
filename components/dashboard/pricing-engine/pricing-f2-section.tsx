import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import { loadPricingF2Insights } from "@/lib/dashboard/pricing-engine/f2-spm-insights";
import { loadSpmCompetitorRows } from "@/lib/dashboard/pricing-engine/f2-spm-competitors";
import { BigStat, SecHeader, StatsSection, Surf } from "@/components/dashboard/stats-premium-ui";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

export async function PricingF2Section({
  userId,
  menuItems,
  range,
  compact = false,
}: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
  compact?: boolean;
}) {
  const insights = await loadPricingF2Insights({ userId, menuItems, range });
  const dishes = insights.dishes;

  const avgMenuPrice =
    menuItems.length > 0
      ? menuItems.reduce((acc, item) => acc + Number(item.price_cad), 0) / menuItems.length
      : 0;

  const snapshot = await getOnboardingSnapshot(userId);
  const restaurantName = snapshot.onboarding.restaurant_name ?? "Vous";

  const { rows: competitors, filledCount, totalSlots } = await loadSpmCompetitorRows({
    selfRestaurantName: restaurantName,
    selfAvgPriceCad: avgMenuPrice,
  });

  const withSpm = dishes.filter((d) => d.spm_pct != null);
  const marketIndex =
    withSpm.length > 0
      ? withSpm.reduce((acc, d) => acc + (d.spm_pct as number), 0) / withSpm.length
      : 0;
  const selfRank = competitors.findIndex((c) => c.isSelf) + 1;

  if (!compact) {
    return null;
  }

  return (
    <StatsSection>
      <SecHeader
        num="06"
        kicker="F2 · SPM"
        title="Positionnement marché"
        subtitle={
          insights.modeCompetitors === "missing"
            ? "Aucun run concurrent — activez le scraping admin."
            : `${Math.min(filledCount, totalSlots)} / ${totalSlots} segments marché renseignés via scraping.`
        }
      />
      <Surf className="p-6">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <BigStat
            label="Indice"
            value={`${marketIndex >= 0 ? "+" : ""}${marketIndex.toFixed(1)} %`}
            accent="emerald"
          />
          <BigStat label="Rang" value={selfRank > 0 ? `${selfRank} / ${competitors.length}` : "—"} />
          <BigStat label="Prix moyen" value={`${avgMenuPrice.toFixed(2)} $`} />
        </div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">
          Concurrents · {filledCount} / {totalSlots} renseignés
        </p>
        {competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée concurrent disponible.</p>
        ) : (
          <ul>
            {competitors.map((c, index) => (
              <li
                key={`${c.name}-${index}`}
                className={`flex items-center gap-2 border-t border-border/70 py-2.5 first:border-t ${
                  c.isSelf ? "rounded-md border border-primary/35 bg-primary/8 px-2.5" : ""
                }`}
              >
                <span className="w-8 text-[12px] tabular-nums text-muted-foreground">#{index + 1}</span>
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] ${c.isSelf ? "font-semibold text-primary" : ""}`}
                >
                  {c.name}
                  {c.isSelf ? " · vous" : ""}
                </span>
                <span className="w-14 text-right text-[13px] font-semibold tabular-nums">
                  {c.itemCount > 0 ? c.itemCount : "—"}
                </span>
                <span className="w-16 text-right text-[11.5px] tabular-nums text-muted-foreground">
                  {cadFormatter.format(c.avgPriceCad)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {filledCount < totalSlots ? (
          <p className="mt-3 rounded-md border border-dashed border-border/80 py-3 text-center text-[11px] text-muted-foreground">
            {totalSlots - filledCount} concurrent{totalSlots - filledCount > 1 ? "s" : ""} non renseigné
            {totalSlots - filledCount > 1 ? "s" : ""}
          </p>
        ) : null}
      </Surf>
    </StatsSection>
  );
}
