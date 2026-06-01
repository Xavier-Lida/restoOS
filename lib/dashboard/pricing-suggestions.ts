import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PricingSuggestionStatus = "pending" | "accepted" | "rejected";

export type PricingSuggestionRow = {
  id: string;
  user_id: string;
  menu_item_id: string;
  current_price_cad: number;
  suggested_price_cad: number;
  rationale: string | null;
  estimated_monthly_gain_cad: number | null;
  confidence: number | null;
  model: string | null;
  status: PricingSuggestionStatus;
  created_at: string;
  updated_at: string;
};

export type PricingSuggestionWithMenu = PricingSuggestionRow & {
  item_name: string;
  category: string;
  menu_price_cad: number;
};

function readPriceCad(row: Record<string, unknown>, cadKey: string, legacyKey: string): number {
  const cad = row[cadKey];
  if (cad !== null && cad !== undefined) {
    return Number(cad);
  }
  const legacy = row[legacyKey];
  if (legacy !== null && legacy !== undefined) {
    return Number(legacy);
  }
  return 0;
}

function mapRow(row: Record<string, unknown>): PricingSuggestionRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    menu_item_id: row.menu_item_id as string,
    current_price_cad: readPriceCad(row, "current_price_cad", "current_price"),
    suggested_price_cad: readPriceCad(row, "suggested_price_cad", "suggested_price"),
    rationale: (row.rationale as string | null) ?? null,
    estimated_monthly_gain_cad:
      row.estimated_monthly_gain_cad !== null && row.estimated_monthly_gain_cad !== undefined
        ? Number(row.estimated_monthly_gain_cad)
        : null,
    confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : null,
    model: (row.model as string | null) ?? null,
    status: row.status as PricingSuggestionStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const PRICING_SUGGESTION_SELECT =
  "id, user_id, menu_item_id, current_price_cad, suggested_price_cad, rationale, estimated_monthly_gain_cad, confidence, model, status, created_at, updated_at";

const PRICING_SUGGESTION_SELECT_WITH_LEGACY = `${PRICING_SUGGESTION_SELECT}, current_price, suggested_price`;

export async function loadPendingPricingSuggestions(userId: string): Promise<PricingSuggestionWithMenu[]> {
  const supabase = await createClient();
  let rows: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;

  const withLegacy = await supabase
    .from("pricing_suggestions")
    .select(PRICING_SUGGESTION_SELECT_WITH_LEGACY)
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  rows = (withLegacy.data ?? []) as Record<string, unknown>[];
  error = withLegacy.error;

  if (error && isUnknownPricingColumnMessage(error.message)) {
    const fallback = await supabase
      .from("pricing_suggestions")
      .select(PRICING_SUGGESTION_SELECT)
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    rows = (fallback.data ?? []) as Record<string, unknown>[];
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Lecture suggestions de prix impossible: ${error.message}`);
  }

  const suggestions = rows.map((r) => mapRow(r));
  return attachMenuLabels(supabase, suggestions);
}

const HISTORY_LIMIT = 25;

export async function loadRecentPricingSuggestionHistory(
  userId: string,
): Promise<PricingSuggestionWithMenu[]> {
  const supabase = await createClient();
  let rows: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;

  const withLegacy = await supabase
    .from("pricing_suggestions")
    .select(PRICING_SUGGESTION_SELECT_WITH_LEGACY)
    .eq("user_id", userId)
    .in("status", ["accepted", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  rows = (withLegacy.data ?? []) as Record<string, unknown>[];
  error = withLegacy.error;

  if (error && isUnknownPricingColumnMessage(error.message)) {
    const fallback = await supabase
      .from("pricing_suggestions")
      .select(PRICING_SUGGESTION_SELECT)
      .eq("user_id", userId)
      .in("status", ["accepted", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    rows = (fallback.data ?? []) as Record<string, unknown>[];
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Lecture historique suggestions impossible: ${error.message}`);
  }

  const suggestions = rows.map((r) => mapRow(r));
  return attachMenuLabels(supabase, suggestions);
}

async function attachMenuLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  suggestions: PricingSuggestionRow[],
): Promise<PricingSuggestionWithMenu[]> {
  if (suggestions.length === 0) {
    return [];
  }
  const ids = [...new Set(suggestions.map((s) => s.menu_item_id))];
  const { data: items, error } = await supabase
    .from("menu_items")
    .select("id, item_name, category, price_cad")
    .in("id", ids);

  if (error) {
    throw new Error(`Lecture menu pour suggestions impossible: ${error.message}`);
  }

  const byId = new Map((items ?? []).map((it) => [it.id as string, it as { item_name: string; category: string; price_cad: number }]));

  return suggestions.map((base) => {
    const mi = byId.get(base.menu_item_id);
    return {
      ...base,
      item_name: mi?.item_name ?? "—",
      category: mi?.category ?? "—",
      menu_price_cad: mi != null ? Number(mi.price_cad) : base.current_price_cad,
    };
  });
}

export type PricingSuggestionInsertRow = {
  user_id: string;
  restaurant_id: string;
  menu_item_id: string;
  current_price_cad: number;
  suggested_price_cad: number;
  rationale: string;
  estimated_monthly_gain_cad: number | null;
  confidence: number;
  model: string;
  status: "pending";
};

function isUnknownPricingColumnMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("pricing_suggestions") &&
    m.includes("column") &&
    (m.includes("does not exist") || m.includes("schema cache"))
  );
}

/** Insère en remplissant aussi current_price / suggested_price si le schéma legacy les exige encore. */
export async function insertPricingSuggestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PricingSuggestionInsertRow[],
): Promise<void> {
  const withLegacy = rows.map((row) => ({
    ...row,
    current_price: row.current_price_cad,
    suggested_price: row.suggested_price_cad,
  }));

  let { error } = await supabase.from("pricing_suggestions").insert(withLegacy);

  if (error && isUnknownPricingColumnMessage(error.message)) {
    ({ error } = await supabase.from("pricing_suggestions").insert(rows));
  }

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePendingPricingSuggestionsForUser(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_suggestions").delete().eq("user_id", userId).eq("status", "pending");

  if (error) {
    throw new Error(`Suppression des suggestions en attente impossible: ${error.message}`);
  }
}

export function isMissingPricingSuggestionsTableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("pricing_suggestions") &&
    (m.includes("schema cache") ||
      m.includes("does not exist") ||
      m.includes("undefined table") ||
      (m.includes("column") && m.includes("does not exist")))
  );
}

/** Ancien schéma : colonnes current_price / suggested_price au lieu de *_cad. */
export function isLegacyPricingSuggestionsColumnMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("pricing_suggestions") &&
    m.includes("null value") &&
    (m.includes("current_price") || m.includes("suggested_price"))
  );
}
