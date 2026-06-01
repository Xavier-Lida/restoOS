export const SUPPLIER_INVOICES_STORAGE_BUCKET = "supplier-invoices";

export const SUPPLIER_INVOICE_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const SUPPLIER_INVOICE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
