import { z } from "zod";

import { parseAmount } from "@/lib/square/sale-items-csv";

/** Montant monétaire CAD : nombre, chaîne localisée, ou null si absent / ambigu. */
export const cadAmountNullable = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val == null || val === "") {
      return null;
    }
    if (typeof val === "number") {
      return Number.isFinite(val) ? val : null;
    }
    const n = parseAmount(String(val));
    return Number.isFinite(n) ? n : null;
  });

/** Quantité ≥ 0 (ingrédients, lignes de facture). */
export const quantityNullable = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val == null || val === "") {
      return null;
    }
    if (typeof val === "number") {
      return Number.isFinite(val) && val >= 0 ? val : null;
    }
    const t = String(val).replaceAll("\u00A0", "").replaceAll(/\s+/gu, "").replace(",", ".");
    const n = Number.parseFloat(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

export const confidenceField = z.coerce.number().min(0).max(1);

export const warningsField = z.array(z.string().max(500)).max(40).optional();
