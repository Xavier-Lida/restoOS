import { z } from "zod";

/**
 * Sous-ensemble utile pour graphiques ROI (table `pricing_suggestions`, lecture serveur).
 * Les statuts exacts peuvent évoluer : chaîne large + enum optionnelle connue.
 */
export const pricingSuggestionGraphRowSchema = z.object({
  estimated_monthly_gain_cad: z.union([z.number(), z.string(), z.null()]).transform((v) => {
    if (v == null || v === "") {
      return null;
    }
    if (typeof v === "number") {
      return Number.isFinite(v) ? v : null;
    }
    const n = Number.parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }),
  status: z.string().max(32),
});

export type PricingSuggestionGraphRow = z.infer<typeof pricingSuggestionGraphRowSchema>;
