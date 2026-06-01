"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import { extractSupplierInvoiceWithLlm } from "@/lib/dashboard/extract-supplier-invoice-llm";
import {
  isMissingSupplierInvoicesTableMessage,
  SUPPLIER_INVOICES_STORAGE_BUCKET,
} from "@/lib/dashboard/supplier-invoices";
import {
  SUPPLIER_INVOICE_ALLOWED_MIME_TYPES,
  SUPPLIER_INVOICE_MAX_FILE_BYTES,
} from "@/lib/dashboard/supplier-invoices-constants";
import { getAuthedUser, getOrCreateRestaurant } from "@/lib/onboarding/server";

function sanitizeStorageFileSegment(name: string): string {
  const trimmed = name.trim().slice(0, 180);
  const out = trimmed.replace(/[^\w.\-]+/gu, "_");
  return out.length > 0 ? out : "fichier";
}

function inferredMimeType(file: File): string {
  if (file.type && SUPPLIER_INVOICE_ALLOWED_MIME_TYPES.has(file.type)) {
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
  if (candidate.size > SUPPLIER_INVOICE_MAX_FILE_BYTES) {
    throw new Error(`Fichier trop volumineux (max ${Math.floor(SUPPLIER_INVOICE_MAX_FILE_BYTES / (1024 * 1024))} Mo).`);
  }
  const mime = inferredMimeType(candidate);
  if (!SUPPLIER_INVOICE_ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error("Format non accepté. Utilise un PDF ou une image (PNG, JPEG, WebP).");
  }
  return candidate;
}

export async function uploadSupplierInvoiceAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const restaurant = await getOrCreateRestaurant(user.id);

  if (!isAnthropicConfigured()) {
    redirect("/dashboard/integrations/supplier-invoices?error=missing_ai");
  }

  const file = getUploadedInvoiceFile(formData);
  const mimeType = inferredMimeType(file);
  const buffer = await file.arrayBuffer();
  const uploadBuffer = Buffer.from(new Uint8Array(buffer));
  const extractBuffer = buffer.slice(0);

  let extracted: Awaited<ReturnType<typeof extractSupplierInvoiceWithLlm>>;
  try {
    extracted = await extractSupplierInvoiceWithLlm(extractBuffer, mimeType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("ANTHROPIC_API_KEY")) {
      redirect("/dashboard/integrations/supplier-invoices?error=missing_ai");
    }
    redirect("/dashboard/integrations/supplier-invoices?error=extraction_failed");
  }

  const objectName = `${randomUUID()}_${sanitizeStorageFileSegment(file.name)}`;
  const storagePath = `${user.id}/${objectName}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPPLIER_INVOICES_STORAGE_BUCKET)
    .upload(storagePath, uploadBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    const msg = uploadError.message ?? "";
    if (msg.includes("Bucket not found") || msg.includes("not found")) {
      redirect("/dashboard/integrations/supplier-invoices?error=missing_bucket");
    }
    throw new Error(`Envoi du fichier impossible: ${msg}`);
  }

  const s = extracted.structured;
  const aiExtraction = {
    model: extracted.model,
    confidence: s.confidence,
    warnings: s.warnings ?? [],
    invoice_number: s.invoice_number ?? null,
    supplier_name: s.supplier_name ?? null,
    restaurant_name: s.restaurant_name ?? null,
    invoice_date: s.invoice_date ?? null,
    due_date: s.due_date ?? null,
    currency: s.currency ?? null,
    amount_subtotal_cad: s.amount_subtotal_cad,
    amount_tax_cad: s.amount_tax_cad,
    amount_total_cad: s.amount_total_cad,
    lines: s.lines,
  };

  const { data: invoiceRow, error: insertError } = await supabase
    .from("supplier_invoices")
    .insert({
      restaurant_id: restaurant.id,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: mimeType,
      file_size_bytes: file.size,
      supplier_name: s.supplier_name ?? null,
      invoice_date: s.invoice_date?.slice(0, 10) ?? null,
      amount_total_cad: s.amount_total_cad != null ? Number(s.amount_total_cad) : null,
      notes: null,
      ai_extraction: aiExtraction,
    })
    .select("id")
    .single();

  if (insertError || !invoiceRow) {
    await supabase.storage.from(SUPPLIER_INVOICES_STORAGE_BUCKET).remove([storagePath]);
    const msg = insertError?.message ?? "";
    if (isMissingSupplierInvoicesTableMessage(msg)) {
      redirect("/dashboard/integrations/supplier-invoices?error=missing_table");
    }
    throw new Error(`Enregistrement impossible: ${msg}`);
  }

  const lines = s.lines ?? [];
  if (lines.length > 0) {
    const lineRows = lines.map((line, position) => ({
      invoice_id: invoiceRow.id,
      product_name: line.product_name,
      supplier_sku: line.supplier_sku ?? null,
      category: line.category ?? null,
      quantity: line.quantity ?? null,
      unit: line.unit ?? null,
      unit_price_cad: line.unit_price_cad ?? null,
      line_total_cad: line.line_total_cad ?? null,
      position,
    }));

    const { error: linesError } = await supabase.from("supplier_invoice_lines").insert(lineRows);
    if (linesError) {
      throw new Error(`Lignes fournisseur: ${linesError.message}`);
    }
  }

  revalidatePath("/dashboard/integrations/supplier-invoices");
  revalidatePath("/dashboard/stats");
  redirect("/dashboard/integrations/supplier-invoices?status=imported");
}

export async function deleteSupplierInvoiceAction(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const restaurant = await getOrCreateRestaurant(user.id);
  const id = formData.get("id")?.toString().trim() ?? "";
  if (!id) {
    redirect("/dashboard/integrations/supplier-invoices?error=invalid_id");
  }

  const { data: row } = await supabase
    .from("supplier_invoices")
    .select("storage_path")
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!row?.storage_path) {
    redirect("/dashboard/integrations/supplier-invoices?error=not_found");
  }

  const storagePath = row.storage_path as string;
  await supabase.storage.from(SUPPLIER_INVOICES_STORAGE_BUCKET).remove([storagePath]);
  const { error: delError } = await supabase.from("supplier_invoices").delete().eq("id", id).eq("restaurant_id", restaurant.id);

  if (delError) {
    throw new Error(delError.message);
  }

  revalidatePath("/dashboard/integrations/supplier-invoices");
  redirect("/dashboard/integrations/supplier-invoices?status=deleted");
}
