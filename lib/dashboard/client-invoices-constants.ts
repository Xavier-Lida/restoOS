export const CLIENT_INVOICES_STORAGE_BUCKET = "client-invoices" as const;

/** Max upload size for a single invoice file (bytes). */
export const CLIENT_INVOICE_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const CLIENT_INVOICE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
