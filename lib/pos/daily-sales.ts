import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getRestaurantIdForUser } from "@/lib/restaurant/resolve";

export type RevenueRange = "7d" | "30d" | "90d";

export type PosRevenuePoint = {
  day: string;
  netSales: number;
  grossSales: number;
  transactions: number;
  taxes: number;
};

export type PosRevenueSummary = {
  totalNetSales: number;
  totalGrossSales: number;
  totalTransactions: number;
  totalTaxes: number;
  averageDailyNet: number;
};

/** @deprecated alias */
export type SquareRevenuePoint = PosRevenuePoint;

/** @deprecated alias */
export type SquareSummary = PosRevenueSummary;

const rangeToDays: Record<RevenueRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export async function loadPosDailyRevenue(userId: string, range: RevenueRange): Promise<PosRevenuePoint[]> {
  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();
  const days = rangeToDays[range];
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("pos_daily_sales_reports")
    .select("report_day, net_sales_cad, gross_sales_cad, transactions_count, taxes_cad")
    .eq("restaurant_id", restaurantId)
    .gte("report_day", fromDate)
    .order("report_day", { ascending: true });

  if (error) {
    throw new Error(`Read pos_daily_sales_reports failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    day: row.report_day as string,
    netSales: Number(row.net_sales_cad ?? 0),
    grossSales: Number(row.gross_sales_cad ?? 0),
    transactions: Number(row.transactions_count ?? 0),
    taxes: Number(row.taxes_cad ?? 0),
  }));
}

export async function hasPosDailyReports(userId: string): Promise<boolean> {
  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("pos_daily_sales_reports")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Read pos_daily_sales_reports count failed: ${error.message}`);
  }
  return (count ?? 0) > 0;
}

export async function loadPosDailyRevenuePrevious(
  userId: string,
  range: RevenueRange,
): Promise<PosRevenuePoint[]> {
  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();
  const days = rangeToDays[range];
  const periodEnd = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const periodStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
  const fromDate = periodStart.toISOString().slice(0, 10);
  const toDate = periodEnd.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("pos_daily_sales_reports")
    .select("report_day, net_sales_cad, gross_sales_cad, transactions_count, taxes_cad")
    .eq("restaurant_id", restaurantId)
    .gte("report_day", fromDate)
    .lt("report_day", toDate)
    .order("report_day", { ascending: true });

  if (error) {
    throw new Error(`Read pos_daily_sales_reports (previous period) failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    day: row.report_day as string,
    netSales: Number(row.net_sales_cad ?? 0),
    grossSales: Number(row.gross_sales_cad ?? 0),
    transactions: Number(row.transactions_count ?? 0),
    taxes: Number(row.taxes_cad ?? 0),
  }));
}

export type PeriodDelta = {
  pct: number | null;
  label: string;
  up: boolean;
};

export function computePeriodDelta(current: number, previous: number): PeriodDelta {
  if (previous <= 0 || !Number.isFinite(previous)) {
    return { pct: null, label: "—", up: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return {
    pct: rounded,
    label: `${sign}${rounded.toString().replace(".", ",")} %`,
    up: rounded >= 0,
  };
}

export function summarizePosRevenue(points: PosRevenuePoint[]): PosRevenueSummary {
  const totalNetSales = points.reduce((sum, point) => sum + point.netSales, 0);
  const totalGrossSales = points.reduce((sum, point) => sum + point.grossSales, 0);
  const totalTransactions = points.reduce((sum, point) => sum + point.transactions, 0);
  const totalTaxes = points.reduce((sum, point) => sum + point.taxes, 0);

  return {
    totalNetSales,
    totalGrossSales,
    totalTransactions,
    totalTaxes,
    averageDailyNet: points.length > 0 ? totalNetSales / points.length : 0,
  };
}

/** @deprecated */
export const loadSquareDailyRevenue = loadPosDailyRevenue;
/** @deprecated */
export const hasSquareReports = hasPosDailyReports;
/** @deprecated */
export const loadSquareDailyRevenuePrevious = loadPosDailyRevenuePrevious;
/** @deprecated */
export const summarizeSquareRevenue = summarizePosRevenue;
