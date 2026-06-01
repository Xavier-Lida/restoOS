import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicApiKey, getAnthropicModel, isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import {
  parsePosSalesCsvExtractionLlmJson,
  type PosSalesCsvExtractionLlm,
} from "@/lib/schemas/pos-sales-csv-extraction";

export const MAX_CSV_SAMPLE_CHARS = 80_000;

const SYSTEM_PROMPT = `Tu es un extracteur de données de ventes pour restaurants (export CSV de caisse / POS).
Le format varie selon le fournisseur (Square, Lightspeed, TouchBistro, etc.).
Réponds avec UN SEUL objet JSON UTF-8 valide, sans markdown.`;

function buildUserPrompt(csvSample: string, filename: string): string {
  return `Fichier : ${filename}

Extrait du CSV (en-têtes + lignes) :
---
${csvSample}
---

Schéma JSON EXACT :
{
  "pos_vendor_hint": null,
  "confidence": 0.0,
  "warnings": [],
  "sale_lines": [
    {
      "sale_date": "2026-05-01",
      "sale_time": "14:30:00",
      "item_name": "Poutine",
      "category": "Plats",
      "quantity": 2,
      "gross_sales_cad": 24.0,
      "discounts_cad": 0,
      "net_sales_cad": 24.0,
      "taxes_cad": 3.6,
      "transaction_id": "T123",
      "payment_id": "P456",
      "device": null,
      "operator": null,
      "payment_method": null
    }
  ],
  "daily_summaries": [
    {
      "report_day": "2026-05-01",
      "gross_sales_cad": 1000,
      "net_sales_cad": 950,
      "total_sales_cad": 950,
      "taxes_cad": 120,
      "tips_cad": 50,
      "payments_total_cad": 1000,
      "transactions_count": 42
    }
  ]
}

Règles :
- sale_date au format YYYY-MM-DD (obligatoire par ligne).
- Montants en CAD : nombres purs (retire $, espaces, remplace virgule par point). null si absent.
- Une entrée sale_lines par ligne de vente article (pas les lignes de totaux journaliers seuls).
- daily_summaries : agrégats par jour si déductibles du fichier, sinon [].
- N'invente pas de lignes : uniquement ce qui est dans le CSV.
- confidence entre 0 et 1.
- Mapping colonnes Square Canada : "Prix net" → net_sales_cad, "Montant brut" → gross_sales_cad, "TPS"+"TVQ" → taxes_cad (somme des deux), "ID Transaction" → transaction_id, "ID Paiement" → payment_id, "Caisse" → device, "Montant de remise" → discounts_cad.
- Si les en-têtes semblent corrompus (caractères √, ©, ¥ à la place d'accents) : déduis le sens depuis le contexte (données, types de valeurs).`;
}

export type PosSalesCsvLlmResult = {
  extraction: PosSalesCsvExtractionLlm;
  model: string;
  method: "llm";
};

export function sampleCsvForLlm(content: string, maxChars = MAX_CSV_SAMPLE_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }
  const head = content.slice(0, Math.floor(maxChars * 0.85));
  const tail = content.slice(-Math.floor(maxChars * 0.1));
  return `${head}\n\n[... tronqué ...]\n\n${tail}`;
}

export async function extractPosSalesCsvWithLlm(
  content: string,
  filename: string,
): Promise<PosSalesCsvLlmResult | null> {
  if (!isAnthropicConfigured()) {
    return null;
  }

  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  const model = getAnthropicModel();
  const sample = sampleCsvForLlm(content);

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(sample, filename) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse LLM vide.");
  }

  const extraction = parsePosSalesCsvExtractionLlmJson(textBlock.text);
  return { extraction, model, method: "llm" };
}
