import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import { loadPricingF0F1Insights } from "@/lib/dashboard/pricing-engine/f0f1-insights";
import {
  type F3dPoint,
  type F3dQuadrant,
  MenuEngineeringF3dChart,
} from "@/components/dashboard/pricing-engine/menu-engineering-f3d.client";

function classifyF3d(args: { volume: number; irrPct: number; seuilVolume: number; seuilMarge: number }): F3dQuadrant {
  const { volume, irrPct, seuilVolume, seuilMarge } = args;
  const highVol = volume >= seuilVolume;
  const highMargin = irrPct >= seuilMarge;
  if (highVol && highMargin) return "STAR";
  if (highVol && !highMargin) return "PLOWHORSE";
  if (!highVol && highMargin) return "PUZZLE";
  return "DOG";
}

export async function PricingF3dSection({
  userId,
  menuItems,
  range,
}: {
  userId: string;
  menuItems: MenuItemRecord[];
  range: RevenueRange;
}) {
  const insights = await loadPricingF0F1Insights({ userId, menuItems, range });
  const dishes = insights.dishes;

  const seuilVolume = insights.totals.avgVolumePlat_est * 0.7;
  const seuilMarge =
    dishes.length > 0 ? dishes.reduce((acc, d) => acc + d.irr_pct, 0) / dishes.length : 0;

  const points: F3dPoint[] = dishes.map((d) => ({
    dish: d.item_name,
    xVolumeMonthly: d.volume_mois_est,
    yIrrPct: d.irr_pct,
    priceTtcCad: d.price_ttc_cad,
    quadrant: classifyF3d({
      volume: d.volume_mois_est,
      irrPct: d.irr_pct,
      seuilVolume,
      seuilMarge,
    }),
    confidence: d.confidence,
  }));

  return <MenuEngineeringF3dChart points={points} seuilVolume={seuilVolume} seuilMarge={seuilMarge} />;
}

