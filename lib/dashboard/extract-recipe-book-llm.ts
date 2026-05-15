import "server-only";

import { runLlmDocumentJsonExtraction } from "@/lib/dashboard/llm-document-json-extraction";
import {
  type RecipeBookExtractionLlm,
  parseRecipeBookExtractionLlmJson,
} from "@/lib/schemas/recipe-book-extraction";

const MAX_TEXT_CHARS = 120_000;

const SYSTEM_PROMPT = `Tu extrais des fiches techniques / recettes de cuisine à partir d'un PDF texte, PDF scanné ou image.
Réponds avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte avant ou après le JSON.`;

const JSON_RULES = `Règles :
- recipes : une entrée par plat / préparation identifiable.
- ingredients : uniquement ce qui est étayé par le document. Pas d'invention.
- unit_cost_cad : seulement si un prix d'achat est indiqué sur la fiche, sinon null.
- confidence entre 0 et 1.
- warnings : incertitudes (pages manquantes, unités ambiguës).`;

const TEXT_REPAIR_SUFFIX = `IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown, qui respecte exactement le schéma.`;

const VISION_REPAIR_TEXT = `Extrais les recettes demandées.

IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown.`;

function buildUserPromptFromText(truncatedText: string): string {
  return `Document (texte extrait) :
---
${truncatedText}
---

Schéma JSON EXACT :
{
  "confidence": 0.0,
  "warnings": [],
  "document_language": "fr",
  "recipes": [
    {
      "dish_name": "",
      "category": null,
      "yield_description": null,
      "portions_count": null,
      "ingredients": [
        { "name": "", "quantity": null, "unit": null, "unit_cost_cad": null, "note": null }
      ]
    }
  ]
}

${JSON_RULES}`;
}

const VISION_USER_TEXT = `Analyse ce document de recettes / fiches techniques.

Schéma JSON EXACT :
{
  "confidence": 0.0,
  "warnings": [],
  "document_language": "fr",
  "recipes": [
    {
      "dish_name": "",
      "category": null,
      "yield_description": null,
      "portions_count": null,
      "ingredients": []
    }
  ]
}

${JSON_RULES}`;

export type RecipeBookLlmResult = {
  model: string;
  structured: RecipeBookExtractionLlm;
};

export async function extractRecipeBookWithLlm(buffer: ArrayBuffer, mimeType: string): Promise<RecipeBookLlmResult> {
  const { result, model } = await runLlmDocumentJsonExtraction({
    buffer,
    mimeType,
    systemPrompt: SYSTEM_PROMPT,
    buildUserPromptFromText,
    visionUserText: VISION_USER_TEXT,
    textRepairSuffix: TEXT_REPAIR_SUFFIX,
    visionRepairText: VISION_REPAIR_TEXT,
    parse: parseRecipeBookExtractionLlmJson,
    maxTextChars: MAX_TEXT_CHARS,
  });
  return { model, structured: result };
}
