import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MenuItemRecord } from "@/lib/onboarding/types";
import type { RevenueRange } from "@/lib/square/dashboard";
import { loadSquareDailyRevenue, type SquareRevenuePoint } from "@/lib/square/dashboard";
import { loadPricingF0F1Insights, type PricingF0F1DishPoint } from "@/lib/dashboard/pricing-engine/f0f1-insights";

export type IsVerdict = "mettre_en_avant" | "maintenir" | "revoir_ou_retirer";

export type PricingF3DishPoint = PricingF0F1DishPoint & {
  volume_week_latest_est: number;
  tendance: number;
  elasticite: number;
  is_score: number;
  is_verdict: IsVerdict;
  sunday_suggestion: string;
};

export type PricingF3Insights = {
  range: RevenueRange;
  dishes: PricingF3DishPoint[];
  hasFourWeeksTrend: boolean;
  generatedAt: string;
};

const PoidsHist = 0.3;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function irrToIsVerdict(isScore: number): IsVerdict {
  if (isScore >= 75) return "mettre_en_avant";
  if (isScore >= 40) return "maintenir";
  return "revoir_ou_retirer";
}

function sundaySuggestionLabel(verdict: IsVerdict): string {
  if (verdict === "mettre_en_avant") return "Mettre en avant (dimanche)";
  if (verdict === "maintenir") return "Maintenir (optimiser si besoin)";
  return "Revoir : prix/coût/recette (ou retrait)";
}

export async function loadPricingF3Insights(args: { userId: string; menuItems: MenuItemRecord[]; range: RevenueRange }) {
  const { userId, menuItems, range } = args;

  const base = await loadPricingF0F1Insights({ userId, menuItems, range });
  const dishesBase = base.dishes;

  const supabase = await createClient();
  const now = new Date();
  const from28dIso = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

  // Prix ancienne/nouvelle (approx) via dernière suggestion acceptée sur 28j.
  type PriceChange = { prixAncien: number; prixApres: number; updated_at: string };
  const priceChangeByDish = new Map<string, PriceChange>();

  try {
    const { data, error } = await supabase
      .from("pricing_suggestions")
      .select("menu_item_id,current_price_cad,suggested_price_cad,status,updated_at")
      .eq("user_id", userId)
      .in("status", ["accepted", "rejected"])
      .gte("updated_at", from28dIso);

    if (!error && data) {
      const rows = data as Array<Record<string, unknown>>;
      // Keep last update per dish.
      for (const row of rows) {
        const dishId = String(row.menu_item_id ?? "");
        const status = String(row.status ?? "");
        if (!dishId) continue;
        if (status !== "accepted") continue; // only treat accepted as actual price change.
        const prixAncien = Number(row.current_price_cad ?? 0);
        const prixApres = Number(row.suggested_price_cad ?? 0);
        const updatedAt = String(row.updated_at ?? "");
        if (!updatedAt) continue;
        const existing = priceChangeByDish.get(dishId);
        if (!existing || updatedAt > existing.updated_at) {
          priceChangeByDish.set(dishId, { prixAncien, prixApres, updated_at: updatedAt });
        }
      }
    }
  } catch {
    // Silently ignore: elasticité uniquement si on a l'historique
  }

  let points: SquareRevenuePoint[] = [];
  try {
    points = await loadSquareDailyRevenue(userId, range);
  } catch {
    points = [];
  }

  const daily = points
    .map((p) => ({ date: new Date(`${p.day}T12:00:00`), transactions: p.transactions }))
    .filter((x) => Number.isFinite(x.date.getTime()));

  daily.sort((a, b) => a.date.getTime() - b.date.getTime());
  const sumPrices = dishesBase.reduce((acc, d) => acc + d.price_ttc_cad, 0) || 1;

  const lastDay = daily.length > 0 ? daily[daily.length - 1].date : new Date();
  const totalWeekTransactions = (weekIndex: number) => {
    // weekIndex=0 => dernière semaine (7 jours), 1 => précédente, etc.
    const end = new Date(lastDay);
    end.setDate(end.getDate() - weekIndex * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    return daily
      .filter((d) => d.date.getTime() >= start.getTime() && d.date.getTime() <= end.getTime())
      .reduce((acc, d) => acc + d.transactions, 0);
  };

  const vWeek0 = totalWeekTransactions(0);
  const vWeek1 = totalWeekTransactions(1);
  const vWeek2 = totalWeekTransactions(2);

  const hasFourWeeksTrend = daily.length >= 28;

  const tendancesByBase = (vCurrent: number, vPrev: number, vPrev2?: number) => {
    const hasPrev = vPrev > 0 && Number.isFinite(vPrev);
    const hasPrev2 = vPrev2 != null && vPrev2 > 0;

    const tendBrute = hasPrev ? (vCurrent - vPrev) / vPrev : 0;
    if (!hasPrev2 || !hasFourWeeksTrend) {
      const t = 1 + Math.max(0, tendBrute * 0.25);
      return t;
    }

    const tendNminus1 = vPrev2 != null && vPrev2 > 0 ? (vPrev - vPrev2) / vPrev2 : 0;
    const tendLiss = tendBrute * (1 - PoidsHist) + tendNminus1 * PoidsHist;
    return 1 + Math.max(0, tendLiss * 0.5);
  };

  const ventesMax = Math.max(
    ...dishesBase.map((d) => {
      const vJ = (vWeek0 * d.price_ttc_cad) / sumPrices;
      return vJ;
    }),
  );

  const dishesComputed: PricingF3DishPoint[] = dishesBase.map((dish) => {
    const volume_week_latest_est = (vWeek0 * dish.price_ttc_cad) / sumPrices;
    const volume_prev_week_est = (vWeek1 * dish.price_ttc_cad) / sumPrices;
    const volume_prev2_week_est = (vWeek2 * dish.price_ttc_cad) / sumPrices;

    const tendance = tendancesByBase(vWeek0 * (dish.price_ttc_cad / sumPrices), vWeek1 * (dish.price_ttc_cad / sumPrices), volume_prev2_week_est);

    // Elasticité (approx) : si on a une suggestion acceptée récente, on calcule un proxy via variations estimées.
    const priceChange = priceChangeByDish.get(dish.menu_item_id);
    let elasticite = 1;
    if (priceChange && priceChange.prixAncien > 0) {
      const deltaPrixPct = (priceChange.prixApres - priceChange.prixAncien) / priceChange.prixAncien;
      const denomVol = Math.max(1, volume_prev_week_est);
      const deltaVolPct = (volume_week_latest_est - volume_prev_week_est) / denomVol;
      const elasticiteMesuree = deltaPrixPct !== 0 ? deltaVolPct / deltaPrixPct : 0;
      const sensibiliteClient = clamp(Math.abs(elasticiteMesuree), 0.3, 2.5);
      elasticite = 1 - deltaPrixPct * sensibiliteClient;
    }

    return {
      ...dish,
      volume_week_latest_est,
      tendance,
      elasticite,
      is_score: 0, // to set after normalization
      is_verdict: "maintenir",
      sunday_suggestion: "",
    };
  });

  const isMax = Math.max(...dishesComputed.map((d) => {
    const irrFactor = Math.max(0, d.irr_pct / 100);
    const venteFactor = ventesMax > 0 ? d.volume_week_latest_est / ventesMax : 0;
    return venteFactor * irrFactor * d.prix_net_cad * d.tendance * d.elasticite;
  }));

  const finalDishes = dishesComputed.map((d) => {
    const irrFactor = Math.max(0, d.irr_pct / 100);
    const venteFactor = ventesMax > 0 ? d.volume_week_latest_est / ventesMax : 0;
    const isBrut = venteFactor * irrFactor * d.prix_net_cad * d.tendance * d.elasticite;
    const is_score = isMax > 0 ? (isBrut / isMax) * 100 : 0;
    const is_verdict = irrToIsVerdict(is_score);
    return {
      ...d,
      is_score,
      is_verdict,
      sunday_suggestion: sundaySuggestionLabel(is_verdict),
    };
  });

  finalDishes.sort((a, b) => b.is_score - a.is_score);

  return {
    range,
    dishes: finalDishes,
    hasFourWeeksTrend,
    generatedAt: new Date().toISOString(),
  } satisfies PricingF3Insights;
}

