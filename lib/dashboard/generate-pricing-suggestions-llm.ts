import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getAnthropicApiKey, getAnthropicModel } from "@/lib/admin/anthropic-env";
import { profileOptions } from "@/lib/onboarding/constants";
import type { ProfileValue } from "@/lib/onboarding/types";
import { extractJsonObject } from "@/lib/schemas/llm-json";

const MAX_SUGGESTIONS = 40;

const suggestionItemSchema = z.object({
  menu_item_id: z.string().max(80),
  item_name: z.string().max(220).optional().nullable(),
  suggested_price_cad: z.coerce.number().positive().max(9999),
  rationale: z.string().max(800),
  estimated_monthly_gain_cad: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") {
        return null;
      }
      const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    }),
  confidence: z.coerce.number().min(0).max(1),
});

const llmResponseSchema = z.object({
  suggestions: z.array(suggestionItemSchema).max(MAX_SUGGESTIONS),
});

export type MenuItemForPricing = {
  id: string;
  item_name: string;
  category: string;
  price_cad: number;
};

export type PricingSquareContext = {
  hasSquare: boolean;
  totalNetSales30d: number;
  menuItemCount: number;
};

export type ValidatedPricingSuggestion = {
  menu_item_id: string;
  current_price_cad: number;
  suggested_price_cad: number;
  rationale: string;
  estimated_monthly_gain_cad: number | null;
  confidence: number;
};

const SYSTEM_PROMPT = `Tu es un conseiller en tarification pour restaurants au Québec.
Tu proposes des ajustements de prix réalistes à partir du menu fourni, du profil stratégique du restaurateur, et éventuellement d'un indicateur global des ventes POS (Square) — sans données concurrentes détaillées.
Réponds avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte avant ou après le JSON.
Ne propose pas deux lignes pour le même menu_item_id. Chaque menu_item_id doit figurer au plus une fois.
menu_item_id : copie EXACTEMENT le champ menu_item_id du JSON menu (UUID). Ne invente pas d'identifiant.
item_name : optionnel, doit correspondre au nom du plat si tu l'inclus.`;

function buildUserPrompt(params: {
  menuItems: MenuItemForPricing[];
  profileTitle: string | null;
  profileGuidance: string | null;
  square: PricingSquareContext | null;
}): string {
  const menuJson = JSON.stringify(
    params.menuItems.map((m) => ({
      menu_item_id: m.id,
      item_name: m.item_name,
      category: m.category,
      price_cad: m.price_cad,
    })),
    null,
    2,
  );

  const squareBlock =
    params.square && params.square.hasSquare
      ? `Indicateur global ventes (30 derniers jours, Square, chiffre indicatif) :
- Ventes nettes totales sur la période : ${params.square.totalNetSales30d.toFixed(2)} $ CAD
- Nombre d'articles au menu (contexte) : ${params.square.menuItemCount}
`
      : `Aucun import Square récent exploitable pour ce compte : base-toi sur le menu et le profil uniquement.
`;

  return `Menu (JSON) — chaque entrée a un menu_item_id stable :
${menuJson}

Profil restaurateur :
- Titre : ${params.profileTitle ?? "non défini"}
- Orientation : ${params.profileGuidance ?? "non précisée"}

${squareBlock}

Consignes :
- Propose uniquement des changements de prix que tu juges utiles (pas besoin de couvrir tous les plats).
- Maximum ${MAX_SUGGESTIONS} suggestions.
- suggested_price_cad : nombre en dollars CAD, cohérent avec le type de plat et la catégorie.
- estimated_monthly_gain_cad : estimation grossière du gain mensuel en $ CAD si le restaurateur applique ce prix (hypothèses modestes, ou null si trop incertain).
- confidence : entre 0 et 1.
- rationale : 1 à 3 phrases en français, sans chiffres concurrents inventés.

Schéma JSON EXACT :
{
  "suggestions": [
    {
      "menu_item_id": "uuid-exact-du-menu",
      "item_name": "nom du plat (optionnel)",
      "suggested_price_cad": 0.0,
      "rationale": "",
      "estimated_monthly_gain_cad": null,
      "confidence": 0.0
    }
  ]
}`;
}

function parseLlmResponse(raw: string): z.infer<typeof llmResponseSchema> {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return llmResponseSchema.parse(parsed);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function validateSuggestionsAgainstMenu(
  raw: z.infer<typeof llmResponseSchema>,
  menuItems: MenuItemForPricing[],
): { suggestions: ValidatedPricingSuggestion[]; stats: PricingSuggestionFilterStats } {
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  const byName = new Map(menuItems.map((m) => [normalizeItemName(m.item_name), m]));
  const seen = new Set<string>();
  const out: ValidatedPricingSuggestion[] = [];
  const stats: PricingSuggestionFilterStats = {
    parsedFromModel: raw.suggestions.length,
    kept: 0,
    droppedUnknownItem: 0,
    droppedDuplicate: 0,
    droppedSamePrice: 0,
  };

  for (const row of raw.suggestions) {
    const item = resolveMenuItem(row, byId, byName);
    if (!item) {
      stats.droppedUnknownItem += 1;
      continue;
    }
    if (seen.has(item.id)) {
      stats.droppedDuplicate += 1;
      continue;
    }
    const current = roundMoney(item.price_cad);
    const suggested = roundMoney(row.suggested_price_cad);
    if (Math.abs(suggested - current) < 0.01) {
      stats.droppedSamePrice += 1;
      continue;
    }
    seen.add(item.id);
    out.push({
      menu_item_id: item.id,
      current_price_cad: current,
      suggested_price_cad: suggested,
      rationale: row.rationale.trim(),
      estimated_monthly_gain_cad: row.estimated_monthly_gain_cad,
      confidence: row.confidence,
    });
    stats.kept += 1;
  }
  return { suggestions: out, stats };
}

function profileCopy(profile: ProfileValue | null): { title: string | null; guidance: string | null } {
  if (!profile) {
    return { title: null, guidance: null };
  }
  const opt = profileOptions.find((o) => o.value === profile);
  return {
    title: opt?.title ?? null,
    guidance: opt?.guidance ?? null,
  };
}

export type GeneratePricingSuggestionsInput = {
  menuItems: MenuItemForPricing[];
  dominantProfile: ProfileValue | null;
  square: PricingSquareContext | null;
};

export type PricingSuggestionFilterStats = {
  parsedFromModel: number;
  kept: number;
  droppedUnknownItem: number;
  droppedDuplicate: number;
  droppedSamePrice: number;
};

export type GeneratePricingSuggestionsResult = {
  suggestions: ValidatedPricingSuggestion[];
  model: string;
  stats: PricingSuggestionFilterStats;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function normalizeItemName(value: string): string {
  return value.trim().toLocaleLowerCase("fr-CA");
}

function resolveMenuItem(
  row: { menu_item_id: string; item_name?: string | null },
  byId: Map<string, MenuItemForPricing>,
  byName: Map<string, MenuItemForPricing>,
): MenuItemForPricing | null {
  const id = row.menu_item_id.trim();
  if (UUID_RE.test(id)) {
    const hit = byId.get(id);
    if (hit) {
      return hit;
    }
  }
  const nameCandidates = [row.item_name, row.menu_item_id].filter((v): v is string => Boolean(v?.trim()));
  for (const candidate of nameCandidates) {
    const hit = byName.get(normalizeItemName(candidate));
    if (hit) {
      return hit;
    }
  }
  return null;
}

export async function generatePricingSuggestionsWithLlm(
  input: GeneratePricingSuggestionsInput,
): Promise<GeneratePricingSuggestionsResult> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquant.");
  }
  const emptyStats: PricingSuggestionFilterStats = {
    parsedFromModel: 0,
    kept: 0,
    droppedUnknownItem: 0,
    droppedDuplicate: 0,
    droppedSamePrice: 0,
  };

  if (input.menuItems.length === 0) {
    return { suggestions: [], model: getAnthropicModel(), stats: emptyStats };
  }

  const model = getAnthropicModel();
  const client = new Anthropic({ apiKey, timeout: 180_000 });
  const { title, guidance } = profileCopy(input.dominantProfile);

  const userContent = buildUserPrompt({
    menuItems: input.menuItems,
    profileTitle: title,
    profileGuidance: guidance,
    square: input.square,
  });

  const run = async (suffix: string): Promise<string> => {
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: suffix ? `${userContent}\n\n${suffix}` : userContent }],
    });
    const textParts = message.content
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""));
    const joined = textParts.join("\n").trim();
    if (!joined) {
      throw new Error("Réponse vide du modèle.");
    }
    return joined;
  };

  let raw = await run("");
  let parsed: z.infer<typeof llmResponseSchema>;
  try {
    parsed = parseLlmResponse(raw);
  } catch {
    raw = await run(
      "IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown, respectant exactement le schéma demandé.",
    );
    parsed = parseLlmResponse(raw);
  }

  const { suggestions, stats } = validateSuggestionsAgainstMenu(parsed, input.menuItems);
  return { suggestions, model, stats };
}
