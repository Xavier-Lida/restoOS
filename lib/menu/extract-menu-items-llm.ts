import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { type MinimalScrapeItem } from "@/lib/admin/scrape-types";
import { getAnthropicApiKey, getAnthropicModel } from "@/lib/admin/anthropic-env";

export const MAX_MENU_LLM_INPUT_CHARS = 120_000;

const priceField = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val == null || val === "") {
      return null;
    }
    const n =
      typeof val === "number" ? val : Number.parseFloat(String(val).replace(",", ".").replace(/\s/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 999) {
      return null;
    }
    return n;
  });

const LlmItemSchema = z.object({
  name: z.string().min(1).max(220),
  category: z.string().max(120).nullable().optional(),
  price_cad: priceField,
  description: z.string().max(600).nullable().optional(),
});

const LlmResponseSchema = z.object({
  menu_language: z.string().max(16).optional(),
  confidence: z.coerce.number().min(0).max(1),
  warnings: z.array(z.string().max(500)).max(40).optional(),
  items: z.array(LlmItemSchema).max(400),
});

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  if (fence) {
    return fence[1].trim();
  }
  const inlineFence = /```(?:json)?\s*([\s\S]*?)```/im.exec(trimmed);
  if (inlineFence) {
    return inlineFence[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  throw new Error("Aucun objet JSON trouvé dans la réponse du modèle.");
}

function parseAndValidateLlmJson(raw: string): z.infer<typeof LlmResponseSchema> {
  const jsonText = extractJsonObject(raw);
  const parsed: unknown = JSON.parse(jsonText);
  return LlmResponseSchema.parse(parsed);
}

function toMinimalItems(parsed: z.infer<typeof LlmResponseSchema>): MinimalScrapeItem[] {
  return parsed.items
    .map((row) => ({
      name: row.name.trim(),
      category: (row.category?.trim() || "Autres") || "Autres",
      price: row.price_cad == null || Number.isNaN(row.price_cad) ? null : row.price_cad,
      notes: row.description?.trim() || null,
    }))
    .filter((row) => row.name.length > 0);
}

const SYSTEM_PROMPT_SCRAPE = `Tu es un extracteur expert de menus de restaurants québécois.
Tu reçois du texte brut issu d'une page web ou d'un PDF (souvent bruité : espaces entre lettres, navigation mélangée, colonnes).
Tu dois répondre avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte avant ou après le JSON.`;

const SYSTEM_PROMPT_ONBOARDING = `Tu es un extracteur expert de menus de restaurants québécois.
Le restaurateur t'envoie le texte extrait de son propre fichier PDF de menu.
Tu dois répondre avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte avant ou après le JSON.`;

function buildUserPromptScrape(truncatedText: string): string {
  return `Analyse le texte ci-dessous et extrais les plats / boissons / articles de menu vendus avec un prix (ou prix parfois absent).

Texte:
---
${truncatedText}
---

Schéma JSON EXACT à respecter:
{
  "menu_language": "fr",
  "confidence": 0.0,
  "warnings": [],
  "items": [
    {
      "name": "nom court du plat sans prix dans le nom",
      "category": "catégorie inférée ou null",
      "price_cad": 17.95,
      "description": null
    }
  ]
}

Règles strictes:
- N'invente AUCUN plat : uniquement ce qui est étayé par le texte.
- price_cad est un nombre en dollars CAD (point décimal). Si prix absent ou illisible, mets null.
- Retire du name les prix, codes, puces.
- confidence entre 0 et 1 (certitude globale sur cette extraction).
- Si le texte ne contient pas de menu exploitable, retourne items [] et un warning explicite.
- Limite à 300 items maximum (les plus pertinents en premier si nécessaire).`;
}

function buildUserPromptOnboarding(truncatedText: string): string {
  return `Voici le texte extrait du PDF du menu du restaurant. Extrais les plats, boissons et articles avec prix en dollars CAD lorsque c'est indiqué.

Texte:
---
${truncatedText}
---

Schéma JSON EXACT à respecter:
{
  "menu_language": "fr",
  "confidence": 0.0,
  "warnings": [],
  "items": [
    {
      "name": "nom court du plat sans prix dans le nom",
      "category": "catégorie inférée ou null",
      "price_cad": 17.95,
      "description": null
    }
  ]
}

Règles strictes:
- N'invente AUCUN plat.
- price_cad en dollars CAD ou null si absent.
- confidence entre 0 et 1.
- Si le PDF ne contient pas de texte exploitable (ex. scan image sans OCR), retourne items [] et un warning explicite.
- Limite à 300 items maximum.`;
}

async function callAnthropicOnce(
  client: Anthropic,
  model: string,
  system: string,
  userContent: string,
): Promise<string> {
  const message = await client.messages.create({
    model,
    max_tokens: 16_384,
    temperature: 0.15,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const textParts = message.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""));

  const joined = textParts.join("\n").trim();
  if (!joined) {
    throw new Error("Réponse vide du modèle.");
  }
  return joined;
}

export type MenuLlmExtractionMode = "scrape" | "onboarding";

export type MenuLlmExtractionResult = {
  items: MinimalScrapeItem[];
  confidence: number;
  warnings: string[];
  model: string;
};

export async function extractMenuItemsWithLlmFromText(
  plainText: string,
  mode: MenuLlmExtractionMode,
): Promise<MenuLlmExtractionResult> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquant.");
  }

  const model = getAnthropicModel();
  const truncated =
    plainText.length > MAX_MENU_LLM_INPUT_CHARS
      ? `${plainText.slice(0, MAX_MENU_LLM_INPUT_CHARS)}\n\n[... texte tronqué pour limite API ...]`
      : plainText;

  const system = mode === "onboarding" ? SYSTEM_PROMPT_ONBOARDING : SYSTEM_PROMPT_SCRAPE;
  const userPrompt =
    mode === "onboarding" ? buildUserPromptOnboarding(truncated) : buildUserPromptScrape(truncated);

  const client = new Anthropic({
    apiKey,
    timeout: 120_000,
  });

  let raw: string;
  try {
    raw = await callAnthropicOnce(client, model, system, userPrompt);
  } catch (firstError) {
    const msg = firstError instanceof Error ? firstError.message : "Erreur API";
    throw new Error(`Anthropic : ${msg}`);
  }

  let validated: z.infer<typeof LlmResponseSchema>;
  try {
    validated = parseAndValidateLlmJson(raw);
  } catch {
    const repairPrompt = `${userPrompt}

IMPORTANT : Ta réponse précédente n'était pas un JSON valide ou ne respectait pas le schéma.
Réponds maintenant avec UN SEUL objet JSON brut, sans markdown, qui valide exactement le schéma demandé.`;
    raw = await callAnthropicOnce(client, model, system, repairPrompt);
    validated = parseAndValidateLlmJson(raw);
  }

  return {
    items: toMinimalItems(validated),
    confidence: validated.confidence,
    warnings: validated.warnings ?? [],
    model,
  };
}
