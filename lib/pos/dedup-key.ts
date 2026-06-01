import { createHash } from "node:crypto";

export function buildPosSaleLineDedupKey(args: {
  restaurantId: string;
  externalTransactionId: string;
  externalPaymentId: string;
  posItemName: string;
  soldAtIso: string | null;
  saleDate: string;
  lineIndex: number;
}): string {
  const parts = [
    args.restaurantId,
    args.externalTransactionId.trim(),
    args.externalPaymentId.trim(),
    args.posItemName.trim().toLowerCase(),
    args.soldAtIso ?? args.saleDate,
    String(args.lineIndex),
  ];
  return createHash("sha256").update(parts.join("\0"), "utf8").digest("hex");
}
