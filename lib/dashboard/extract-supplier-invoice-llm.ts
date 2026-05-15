import "server-only";

import { runLlmDocumentJsonExtraction } from "@/lib/dashboard/llm-document-json-extraction";
import {
  type SupplierInvoiceExtractionLlm,
  parseSupplierInvoiceExtractionLlmJson,
} from "@/lib/schemas/supplier-invoice-extraction";

const MAX_TEXT_CHARS = 100_000;

const SYSTEM_PROMPT = `Tu extrais des champs structurés à partir de factures ou bons de livraison **fournisseur → restaurant** (achats matières, équipement alimentaire), au Québec.
Réponds avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte avant ou après le JSON.`;

const JSON_RULES = `Règles :
- supplier_name : nom du fournisseur / distributeur (vendeur).
- restaurant_name : nom du restaurant acheteur si visible.
- amount_total_cad : total TTC ou montant principal dû en CAD.
- lines : produits / articles achetés avec quantités et montants si visibles.
- N'invente pas de montants : null si absent ou ambigu.
- confidence entre 0 et 1.
- warnings : incertitudes.`;

const TEXT_REPAIR_SUFFIX = `IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown, qui respecte exactement le schéma.`;

const VISION_REPAIR_TEXT = `Analyse ce document d'achat fournisseur.

IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown.`;

function buildUserPromptFromText(truncatedText: string): string {
  return `Texte extrait du document :
---
${truncatedText}
---

Schéma JSON EXACT :
{
  "confidence": 0.0,
  "warnings": [],
  "invoice_number": null,
  "supplier_name": null,
  "restaurant_name": null,
  "invoice_date": "AAAA-MM-JJ ou null",
  "due_date": null,
  "currency": "CAD",
  "amount_subtotal_cad": null,
  "amount_tax_cad": null,
  "amount_total_cad": null,
  "lines": [
    {
      "product_name": "",
      "supplier_sku": null,
      "category": null,
      "quantity": null,
      "unit": null,
      "unit_price_cad": null,
      "line_total_cad": null
    }
  ]
}

${JSON_RULES}`;
}

const VISION_USER_TEXT = `Analyse cette facture ou ce bon de livraison **fournisseur** (achat restaurant).

Schéma JSON EXACT :
{
  "confidence": 0.0,
  "warnings": [],
  "invoice_number": null,
  "supplier_name": null,
  "restaurant_name": null,
  "invoice_date": null,
  "due_date": null,
  "currency": "CAD",
  "amount_subtotal_cad": null,
  "amount_tax_cad": null,
  "amount_total_cad": null,
  "lines": []
}

${JSON_RULES}`;

export type SupplierInvoiceLlmResult = {
  model: string;
  structured: SupplierInvoiceExtractionLlm;
};

export async function extractSupplierInvoiceWithLlm(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<SupplierInvoiceLlmResult> {
  const { result, model } = await runLlmDocumentJsonExtraction({
    buffer,
    mimeType,
    systemPrompt: SYSTEM_PROMPT,
    buildUserPromptFromText,
    visionUserText: VISION_USER_TEXT,
    textRepairSuffix: TEXT_REPAIR_SUFFIX,
    visionRepairText: VISION_REPAIR_TEXT,
    parse: parseSupplierInvoiceExtractionLlmJson,
    maxTextChars: MAX_TEXT_CHARS,
  });
  return { model, structured: result };
}
