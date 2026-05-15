export type SquareSalesReportRow = {
  id: string;
  user_id: string;
  source_filename: string;
  period_start: string | null;
  period_end: string | null;
  report_day: string;
  gross_sales_cad: number;
  net_sales_cad: number;
  total_sales_cad: number;
  taxes_cad: number;
  tips_cad: number;
  payments_total_cad: number;
  transactions_count: number;
  payload: Record<string, string>;
  uploaded_at: string;
  updated_at: string;
};
