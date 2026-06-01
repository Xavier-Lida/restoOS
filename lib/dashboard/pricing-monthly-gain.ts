/** Gain mensuel indicatif : (Δ prix) × quantités vendues sur 30 j (volume constant). */
export function computeMonthlyGainFromQuantity(priceDeltaCad: number, quantitySold30d: number): number | null {
  if (!Number.isFinite(priceDeltaCad) || !Number.isFinite(quantitySold30d) || quantitySold30d <= 0) {
    return null;
  }
  return Math.round(priceDeltaCad * quantitySold30d * 100) / 100;
}
