/**
 * Schémas Zod et types pour alimenter les graphiques du tableau de bord.
 * Sources : CSV Square, factures (client / fournisseur), recettes, menu (LLM Anthropic), pricing_suggestions.
 */

export * from "@/lib/schemas/chart-inputs";
export * from "@/lib/schemas/client-invoice-extraction";
export * from "@/lib/schemas/fields";
export * from "@/lib/schemas/llm-json";
export * from "@/lib/schemas/menu-price-book-extraction";
export * from "@/lib/schemas/pricing-roi";
export * from "@/lib/schemas/recipe-book-extraction";
export * from "@/lib/schemas/square-sales-types";
export * from "@/lib/schemas/supplier-invoice-extraction";

/** Version du paquet JSON `ai_extraction` côté factures clients (migrations logiques). */
export const CLIENT_INVOICE_AI_EXTRACTION_VERSION = 2 as const;
