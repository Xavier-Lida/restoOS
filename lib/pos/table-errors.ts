export function isMissingPosSalesItemsDailyMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("pos_sales_items_daily") ||
      m.includes("square_sales_items_daily") ||
      m.includes("pos_sale_lines")) &&
    (m.includes("schema cache") || m.includes("does not exist"))
  );
}

export function isMissingPosSaleLinesTableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("pos_sale_lines") || m.includes("pos_import_batches")) &&
    (m.includes("schema cache") || m.includes("does not exist"))
  );
}

export function isMissingPosDailySalesReportsTableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("pos_daily_sales_reports") || m.includes("square_sales_reports")) &&
    (m.includes("schema cache") || m.includes("does not exist"))
  );
}

/** @deprecated use isMissingPosSalesItemsDailyMessage */
export const isMissingSquareSalesItemsTableMessage = isMissingPosSalesItemsDailyMessage;

/** @deprecated use isMissingPosDailySalesReportsTableMessage */
export const isMissingSquareSalesReportsTableMessage = isMissingPosDailySalesReportsTableMessage;
