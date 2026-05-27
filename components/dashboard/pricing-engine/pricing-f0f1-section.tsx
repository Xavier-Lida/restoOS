import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import { loadPricingF0F1Insights } from "@/lib/dashboard/pricing-engine/f0f1-insights";
import { CostWaterfallChart } from "@/components/dashboard/pricing-engine/cost-waterfall.client";
import { IRRBarChart } from "@/components/dashboard/pricing-engine/irr-bar-chart.client";

export async function PricingF0F1Section({
  userId,
  menuItems,
  range,
}: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
}) {
  const insights = await loadPricingF0F1Insights({ userId, menuItems, range });

  const squareMsg =
    insights.modeSquare === "ok"
      ? "Square : volume estimé (F0/F1 en mode hypothèses)."
      : insights.modeSquare === "missing_square"
        ? "Square : données manquantes. Fixes mensuels & IRR partiellement incomplets."
        : "Square : erreur de lecture. IRR calculée avec fixes=0 pour éviter de masquer l’info.";

  const totalsMsg = `Fixes mensuels (hypothèse): ${insights.totals.totalFixesMensuel.toFixed(0)}$ · Volume mensuel (approx): ${Math.round(insights.totals.totalPlatsVendusMois_est).toLocaleString("fr-CA")}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Santé prix (F0/F1)</h2>
          <p className="text-sm text-muted-foreground">{squareMsg}</p>
          <p className="text-sm text-muted-foreground">{totalsMsg}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IRRBarChart dishes={insights.dishes} />
        <CostWaterfallChart dishes={insights.dishes} />
      </div>
    </section>
  );
}

