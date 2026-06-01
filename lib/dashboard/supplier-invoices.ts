import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getRestaurantIdForUser } from "@/lib/restaurant/resolve";

export type SupplierInvoiceRow = {
  id: string;
  restaurant_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  supplier_name: string | null;
  invoice_date: string | null;
  amount_total_cad: number | null;
  notes: string | null;
  ai_extraction: Record<string, unknown>;
  uploaded_at: string;
};

export async function loadSupplierInvoices(userId: string): Promise<SupplierInvoiceRow[]> {
  const restaurantId = await getRestaurantIdForUser(userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supplier_invoices")
    .select(
      "id, restaurant_id, storage_path, original_filename, mime_type, file_size_bytes, supplier_name, invoice_date, amount_total_cad, notes, ai_extraction, uploaded_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupplierInvoiceRow[];
}

export { SUPPLIER_INVOICES_STORAGE_BUCKET } from "@/lib/dashboard/supplier-invoices-constants";

export function isMissingSupplierInvoicesTableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("supplier_invoices") && (m.includes("schema cache") || m.includes("does not exist"));
}
