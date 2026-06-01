import { z } from "zod";

/**
 * Ligne d’export Square « articles » (parseur CSV, pas LLM).
 * Sert à valider / documenter les agrégations pour graphiques (ventes par article, catégorie).
 */
export const squareSaleItemRowSchema = z.object({
  date: z.string(),
  time: z.string(),
  timezone: z.string(),
  category: z.string(),
  item: z.string(),
  quantity: z.number(),
  grossSales: z.number(),
  discounts: z.number(),
  netSales: z.number(),
  taxes: z.number(),
  transactionId: z.string(),
  paymentId: z.string(),
  device: z.string(),
  operator: z.string(),
  paymentMethod: z.string(),
});

export type SquareSaleItemRowValidated = z.infer<typeof squareSaleItemRowSchema>;

/** Résumé journalier issu du parseur CSV (ligne `pos_daily_sales_reports`). */
export const parsedSquareDailySummarySchema = z.object({
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  reportDay: z.string(),
  grossSalesCad: z.number(),
  netSalesCad: z.number(),
  totalSalesCad: z.number(),
  taxesCad: z.number(),
  tipsCad: z.number(),
  paymentsTotalCad: z.number(),
  transactionsCount: z.number(),
  metrics: z.record(z.string(), z.string()),
});

export type ParsedSquareDailySummaryValidated = z.infer<typeof parsedSquareDailySummarySchema>;
