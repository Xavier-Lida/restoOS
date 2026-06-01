"use client";

import { useState } from "react";

import { SecHeader, StatsSection, Surf, Surf2 } from "@/components/dashboard/stats-premium-ui";
import type { PricingF2DishPoint } from "@/lib/dashboard/pricing-engine/f2-spm-insights";
import { syncStatsUrl } from "@/lib/dashboard/sync-stats-url";
import { cn } from "@/lib/utils";

export type ScrapeCompetitorRow = {
  item_name: string;
  category: string;
  price_cad: number;
};

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

type DishMarketCompareClientProps = {
  menuItems: Array<{ id: string; item_name: string }>;
  dishes: PricingF2DishPoint[];
  competitorItems: ScrapeCompetitorRow[];
  initialDishId: string;
  modeCompetitors: "ok" | "missing";
  urlParams: Record<string, string | undefined>;
};

function matchesDish(competitorName: string, menuItemName: string): boolean {
  const a = competitorName.trim().toLocaleLowerCase("fr-CA");
  const b = menuItemName.trim().toLocaleLowerCase("fr-CA");
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export function DishMarketCompareClient({
  menuItems,
  dishes,
  competitorItems,
  initialDishId,
  modeCompetitors,
  urlParams,
}: DishMarketCompareClientProps) {
  const [selectedDishId, setSelectedDishId] = useState(initialDishId);

  const selectedMenu =
    menuItems.find((item) => item.id === selectedDishId) ?? menuItems[0];
  const dishInsight =
    dishes.find((d) => d.menu_item_id === selectedMenu?.id) ??
    dishes.find((d) => d.item_name === selectedMenu?.item_name);

  const competitorsForDish =
    selectedMenu && competitorItems.length > 0
      ? competitorItems.filter((row) => matchesDish(row.item_name, selectedMenu.item_name))
      : [];

  const handleDishChange = (dishId: string) => {
    setSelectedDishId(dishId);
    syncStatsUrl({ ...urlParams, dish: dishId });
  };

  return (
    <StatsSection>
      <SecHeader
        num="04"
        kicker="Marché · scraping"
        title="Votre plat vs le marché"
        subtitle="Prix et positionnement issus du dernier run de scraping concurrent."
      />

      <Surf className="space-y-5 p-6">
        <label className="flex max-w-md flex-col gap-1.5">
          <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/90">
            Plat à comparer
          </span>
          <select
            className="h-9 rounded-md border border-border bg-popover px-3 text-sm"
            value={selectedMenu?.id ?? ""}
            onChange={(e) => handleDishChange(e.target.value)}
          >
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.item_name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <Surf2 className="p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Votre plat</p>
            {selectedMenu ? (
              <>
                <p className="mt-2 text-[18px] font-semibold">{selectedMenu.item_name}</p>
                <dl className="mt-4 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Prix menu</dt>
                    <dd className="font-semibold tabular-nums">
                      {dishInsight
                        ? cadFormatter.format(dishInsight.price_ttc_cad)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Réf. marché</dt>
                    <dd className="font-semibold tabular-nums">
                      {dishInsight?.ref_marche_cad != null
                        ? cadFormatter.format(dishInsight.ref_marche_cad)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">SPM</dt>
                    <dd
                      className={cn(
                        "font-semibold tabular-nums",
                        dishInsight?.spm_pct != null && dishInsight.spm_pct > 10 && "text-amber-400",
                        dishInsight?.spm_pct != null && dishInsight.spm_pct <= 10 && "text-primary",
                      )}
                    >
                      {dishInsight?.spm_pct != null
                        ? `${dishInsight.spm_pct >= 0 ? "+" : ""}${dishInsight.spm_pct.toFixed(1)} %`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {dishInsight?.spm_reco ? (
                  <p className="mt-4 text-[12px] text-muted-foreground">{dishInsight.spm_reco}</p>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Aucun plat sélectionné.</p>
            )}
          </Surf2>

          <Surf2 className="p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">
              Concurrents · scraping
            </p>
            {modeCompetitors === "missing" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Pas assez de données...
              </p>
            ) : competitorsForDish.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucun article concurrent ne correspond à ce plat pour le dernier run.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border/70">
                {competitorsForDish.map((row, index) => (
                  <li key={`${row.item_name}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{row.item_name}</p>
                      <p className="text-[11px] text-muted-foreground">{row.category}</p>
                    </div>
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                      {cadFormatter.format(row.price_cad)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Surf2>
        </div>
      </Surf>
    </StatsSection>
  );
}
