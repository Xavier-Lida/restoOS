import "server-only";

import { runLlmDocumentJsonExtraction } from "@/lib/dashboard/llm-document-json-extraction";
import {
  type ClientInvoiceExtractionLlm,
  parseClientInvoiceExtractionLlmJson,
} from "@/lib/schemas/client-invoice-extraction";

const MAX_INVOICE_TEXT_CHARS = 100_000;

const SYSTEM_PROMPT = `Tu extrais des champs structurés à partir de factures (PDF texte, PDF scanné, ou image) émises par un restaurant québécois pour ses clients.
Réponds avec UN SEUL objet JSON UTF-8 valide, sans markdown, sans texte avant ou après le JSON.`;

const JSON_RULES = `Règles :
- amount_total_cad : total TTC en dollars CAD (nombre). Si plusieurs totaux, prendre le total final / solde dû.
- amount_subtotal_cad / amount_tax_cad : sous-total HT et taxes si visibles, sinon null.
- lines : chaque ligne de produit/service facturé (description obligatoire). Quantités et montants null si illisibles.
- tax_lines : une entrée par type de taxe (TPS, TVQ, etc.) si détaillé.
- N'invente pas de montants : null si absent ou ambigu.
- confidence entre 0 et 1.
- warnings : incertitudes (ex. scan flou, montant partiellement masqué).`;

const TEXT_REPAIR_SUFFIX = `IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown, qui respecte exactement le schéma.`;

const VISION_REPAIR_TEXT = `Analyse cette facture client et extrais les champs demandés.

IMPORTANT : Réponds avec UN SEUL objet JSON brut valide, sans markdown.`;

function normalizeInvoiceDate(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/u.test(t)) {
    return t;
  }
  const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/u.exec(t);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = slash[3] ?? "";
    if (a > 12) {
      return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    if (b > 12) {
      return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }
  return null;
}

function buildUserPromptFromText(truncatedText: string): string {
  return `Texte extrait de la facture :
---
${truncatedText}
---

Schéma JSON EXACT :
{
  "confidence": 0.0,
  "warnings": [],
  "invoice_number": "string ou null",
  "client_name": "destinataire facturé ou null",
  "vendor_name": "émetteur / restaurant ou null",
  "invoice_date": "AAAA-MM-JJ ou null",
  "due_date": "AAAA-MM-JJ ou null",
  "currency": "CAD",
  "amount_subtotal_cad": null,
  "amount_tax_cad": null,
  "amount_total_cad": 0.0,
  "amount_paid_cad": null,
  "balance_due_cad": null,
  "po_reference": null,
  "payment_terms": null,
  "tax_lines": [{ "code": null, "label": "TPS", "rate_percent": null, "amount_cad": null }],
  "lines": [{ "line_number": null, "sku": null, "description": "", "quantity": null, "unit": null, "unit_price_cad": null, "discount_cad": null, "tax_cad": null, "line_total_cad": null }]
}

${JSON_RULES}`;
}

const VISION_USER_TEXT = `Analyse cette facture client (image ou PDF) et extrais les champs demandés.

Schéma JSON EXACT :
{
  "confidence": 0.0,
  "warnings": [],
  "invoice_number": "string ou null",
  "client_name": "destinataire facturé ou null",
  "vendor_name": "émetteur / restaurant ou null",
  "invoice_date": "AAAA-MM-JJ ou null",
  "due_date": "AAAA-MM-JJ ou null",
  "currency": "CAD",
  "amount_subtotal_cad": null,
  "amount_tax_cad": null,
  "amount_total_cad": 0.0,
  "amount_paid_cad": null,
  "balance_due_cad": null,
  "po_reference": null,
  "payment_terms": null,
  "tax_lines": [],
  "lines": []
}

${JSON_RULES}`;

export type ClientInvoiceLlmResult = {
  client_label: string | null;
  invoice_date: string | null;
  amount_cad: number | null;
  invoice_number: string | null;
  vendor_name: string | null;
  confidence: number;
  warnings: string[];
  model: string;
  structured: ClientInvoiceExtractionLlm;
};

function toResult(validated: ClientInvoiceExtractionLlm, model: string): ClientInvoiceLlmResult {
  const clientName = validated.client_name?.trim() || null;
  const vendor = validated.vendor_name?.trim() || null;
  const total = validated.amount_total_cad;
  return {
    client_label: clientName,
    invoice_date: normalizeInvoiceDate(validated.invoice_date),
    amount_cad: total,
    invoice_number: validated.invoice_number?.trim() || null,
    vendor_name: vendor,
    confidence: validated.confidence,
    warnings: validated.warnings ?? [],
    model,
    structured: validated,
  };
}

export async function extractClientInvoiceWithLlm(buffer: ArrayBuffer, mimeType: string): Promise<ClientInvoiceLlmResult> {
  const { result, model } = await runLlmDocumentJsonExtraction({
    buffer,
    mimeType,
    systemPrompt: SYSTEM_PROMPT,
    buildUserPromptFromText,
    visionUserText: VISION_USER_TEXT,
    textRepairSuffix: TEXT_REPAIR_SUFFIX,
    visionRepairText: VISION_REPAIR_TEXT,
    parse: parseClientInvoiceExtractionLlmJson,
    maxTextChars: MAX_INVOICE_TEXT_CHARS,
  });
  return toResult(result, model);
}
