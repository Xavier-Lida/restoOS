import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import { IsOverviewClient } from "@/components/dashboard/pricing-engine/is-overview.client";
import { SecHeader, StatsSection } from "@/components/dashboard/stats-premium-ui";
import { loadPricingF3Insights } from "@/lib/dashboard/pricing-engine/f3-is-insights";

function buildDecomposition(dishes: Awaited<ReturnType<typeof loadPricingF3Insights>>["dishes"]) {
  if (dishes.length === 0) {
    return [
      { key: "Prix", value: 0 },
      { key: "Marge", value: 0 },
      { key: "Volume", value: 0 },
      { key: "Tendance", value: 0 },
      { key: "Élasticité", value: 0 },
    ];
  }
  const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
  const avgIrr = dishes.reduce((s, d) => s + d.irr_pct, 0) / dishes.length;
  const avgVol = dishes.reduce((s, d) => s + d.volume_mois_est, 0) / dishes.length;
  const maxVol = Math.max(1, ...dishes.map((d) => d.volume_mois_est));
  const avgTrend = dishes.reduce((s, d) => s + d.tendance, 0) / dishes.length;
  const avgElastic = dishes.reduce((s, d) => s + d.elasticite, 0) / dishes.length;
  return [
    { key: "Prix", value: clamp100(50 + avgIrr * 0.5) },
    { key: "Marge", value: clamp100(avgIrr) },
    { key: "Volume", value: clamp100((avgVol / maxVol) * 100) },
    { key: "Tendance", value: clamp100(50 + avgTrend * 25) },
    { key: "Élasticité", value: clamp100(100 - Math.abs(avgElastic) * 20) },
  ];
}

export async function PricingF3Section({
  userId,
  menuItems,
  range,
}: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
}) {
  const insights = await loadPricingF3Insights({ userId, menuItems, range });
  const avgScore =
    insights.dishes.length > 0
      ? insights.dishes.reduce((sum, dish) => sum + dish.is_score, 0) / insights.dishes.length
      : 0;
  const leaderboard = [...insights.dishes].sort((a, b) => b.is_score - a.is_score).slice(0, 5);
  const decomposition = buildDecomposition(insights.dishes);

  const counts = {
    mettre_en_avant: insights.dishes.filter((d) => d.is_verdict === "mettre_en_avant").length,
    maintenir: insights.dishes.filter((d) => d.is_verdict === "maintenir").length,
    reVoir_ou_retirer: insights.dishes.filter((d) => d.is_verdict === "revoir_ou_retirer").length,
  };

  return (
    <StatsSection>
      <SecHeader
        num="07"
        kicker="F3 · Index Stratégique"
        title="Score composite & leaderboard"
        subtitle={`Synthèse prix, marge, volume, tendance et élasticité.${
          insights.hasFourWeeksTrend ? "" : " Tendance limitée : lissage réduit."
        }`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-popover px-4 py-3">
          <p className="text-sm font-medium">Mettre en avant</p>
          <p className="pt-1 text-2xl font-semibold tabular-nums">{counts.mettre_en_avant}</p>
        </div>
        <div className="rounded-lg border border-border bg-popover px-4 py-3">
          <p className="text-sm font-medium">Maintenir</p>
          <p className="pt-1 text-2xl font-semibold tabular-nums">{counts.maintenir}</p>
        </div>
        <div className="rounded-lg border border-border bg-popover px-4 py-3">
          <p className="text-sm font-medium">Revoir / retrait</p>
          <p className="pt-1 text-2xl font-semibold tabular-nums">{counts.reVoir_ou_retirer}</p>
        </div>
      </div>

      <IsOverviewClient
        avgScore={avgScore}
        delta={Math.round(avgScore * 0.08)}
        leaderboard={leaderboard}
        decomposition={decomposition}
      />
    </StatsSection>
  );
}
