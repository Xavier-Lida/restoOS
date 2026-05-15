"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import {
  CLIENT_INVOICE_ALLOWED_MIME_TYPES,
  CLIENT_INVOICE_MAX_FILE_BYTES,
  CLIENT_INVOICES_STORAGE_BUCKET,
} from "@/lib/dashboard/client-invoices-constants";
import { extractClientInvoiceWithLlm } from "@/lib/dashboard/extract-client-invoice-llm";
import { CLIENT_INVOICE_AI_EXTRACTION_VERSION } from "@/lib/schemas";
import { getAuthedUser } from "@/lib/onboarding/server";

function sanitizeStorageFileSegment(name: string): string {
  const trimmed = name.trim().slice(0, 180);
  const out = trimmed.replace(/[^\w.\-]+/gu, "_");
  return out.length > 0 ? out : "fichier";
}

function inferredMimeType(file: File): string {
  if (file.type && CLIENT_INVOICE_ALLOWED_MIME_TYPES.has(file.type)) {
    return file.type;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (n.endsWith(".png")) {
    return "image/png";
  }
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (n.endsWith(".webp")) {
    return "image/webp";
  }
  return file.type || "application/octet-stream";
}

function getUploadedInvoiceFile(formData: FormData): File {
  const candidate = formData.get("invoice");
  if (!(candidate instanceof File)) {
    throw new Error("Aucun fichier reçu.");
  }
  if (candidate.size === 0) {
    throw new Error("Fichier vide.");
  }
  if (candidate.size > CLIENT_INVOICE_MAX_FILE_BYTES) {
    throw new Error(`Fichier trop volumineux (max ${Math.floor(CLIENT_INVOICE_MAX_FILE_BYTES / (1024 * 1024))} Mo).`);
  }
  const mime = inferredMimeType(candidate);
  if (!CLIENT_INVOICE_ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error("Format non accepté. Utilise un PDF ou une image (PNG, JPEG, WebP).");
  }
  return candidate;
}

export async function uploadClientInvoiceAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();

  if (!isAnthropicConfigured()) {
    redirect("/dashboard/integrations/client-invoices?error=missing_ai");
  }

  const file = getUploadedInvoiceFile(formData);
  const mimeType = inferredMimeType(file);
  const buffer = await file.arrayBuffer();
  /** Copie immédiate : pdf-parse peut détacher l'ArrayBuffer passé à l'extraction IA. */
  const uploadBuffer = Buffer.from(new Uint8Array(buffer));
  const extractBuffer = buffer.slice(0);

  let extracted: Awaited<ReturnType<typeof extractClientInvoiceWithLlm>>;
  try {
    extracted = await extractClientInvoiceWithLlm(extractBuffer, mimeType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("ANTHROPIC_API_KEY")) {
      redirect("/dashboard/integrations/client-invoices?error=missing_ai");
    }
    redirect("/dashboard/integrations/client-invoices?error=extraction_failed");
  }

  const objectName = `${randomUUID()}_${sanitizeStorageFileSegment(file.name)}`;
  const storagePath = `${user.id}/${objectName}`;

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_INVOICES_STORAGE_BUCKET)
    .upload(storagePath, uploadBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    const msg = uploadError.message ?? "";
    if (msg.includes("Bucket not found") || msg.includes("not found")) {
      redirect("/dashboard/integrations/client-invoices?error=missing_bucket");
    }
    throw new Error(`Envoi du fichier impossible: ${msg}`);
  }

  const s = extracted.structured;
  const aiExtraction = {
    v: CLIENT_INVOICE_AI_EXTRACTION_VERSION,
    model: extracted.model,
    confidence: s.confidence,
    warnings: s.warnings ?? [],
    invoice_number: s.invoice_number ?? null,
    vendor_name: s.vendor_name ?? null,
    client_name: s.client_name ?? null,
    due_date: s.due_date ?? null,
    currency: s.currency ?? null,
    amount_subtotal_cad: s.amount_subtotal_cad,
    amount_tax_cad: s.amount_tax_cad,
    amount_total_cad: s.amount_total_cad,
    amount_paid_cad: s.amount_paid_cad,
    balance_due_cad: s.balance_due_cad,
    po_reference: s.po_reference ?? null,
    payment_terms: s.payment_terms ?? null,
    tax_lines: s.tax_lines,
    lines: s.lines,
  };

  const { error: insertError } = await supabase.from("client_invoices").insert({
    user_id: user.id,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: mimeType,
    file_size_bytes: file.size,
    client_label: extracted.client_label,
    invoice_date: extracted.invoice_date,
    amount_cad: extracted.amount_cad,
    notes: null,
    ai_extraction: aiExtraction,
  });

  if (insertError) {
    await supabase.storage.from(CLIENT_INVOICES_STORAGE_BUCKET).remove([storagePath]);
    const msg = insertError.message ?? "";
    if (msg.includes("client_invoices") && (msg.includes("schema cache") || msg.includes("does not exist"))) {
      redirect("/dashboard/integrations/client-invoices?error=missing_table");
    }
    if (msg.toLowerCase().includes("ai_extraction")) {
      redirect("/dashboard/integrations/client-invoices?error=missing_ai_column");
    }
    throw new Error(`Enregistrement impossible: ${msg}`);
  }

  revalidatePath("/dashboard/integrations/client-invoices");
  redirect("/dashboard/integrations/client-invoices?status=uploaded");
}

export async function deleteClientInvoiceAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const rawId = formData.get("invoice_id");
  if (typeof rawId !== "string" || !/^[0-9a-f-]{36}$/iu.test(rawId.trim())) {
    throw new Error("Identifiant de facture invalide.");
  }
  const id = rawId.trim();

  const { data: row, error: fetchError } = await supabase
    .from("client_invoices")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!row) {
    redirect("/dashboard/integrations/client-invoices?error=not_found");
  }

  const storagePath = row.storage_path as string;
  await supabase.storage.from(CLIENT_INVOICES_STORAGE_BUCKET).remove([storagePath]);
  const { error: delError } = await supabase.from("client_invoices").delete().eq("id", id).eq("user_id", user.id);

  if (delError) {
    throw new Error(delError.message);
  }

  revalidatePath("/dashboard/integrations/client-invoices");
  redirect("/dashboard/integrations/client-invoices?status=deleted");
}
