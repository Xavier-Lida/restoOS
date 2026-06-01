import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { extractMenuItemsWithLlmFromText } from "@/lib/menu/extract-menu-items-llm";
import {
  ONBOARDING_MENU_PDF_BUCKET,
  ONBOARDING_MENU_PDF_MAX_BYTES,
} from "@/lib/onboarding/menu-import-constants";
import { onboardingMenuPdfStorageUploadMessage } from "@/lib/onboarding/menu-pdf-storage-errors";
import { extractPlainTextFromPdfBuffer } from "@/lib/onboarding/menu-pdf";
import { getOrCreateOnboarding } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("url"),
    url: z.string().url(),
  }),
  z.object({
    kind: z.literal("storage"),
    path: z.string().min(3).max(512),
  }),
]);

function assertHttpsPdfUrl(url: URL): void {
  if (url.protocol !== "https:") {
    throw new Error("Seules les URL HTTPS sont acceptées.");
  }
}

async function fetchPdfFromUrl(urlString: string): Promise<ArrayBuffer> {
  const url = new URL(urlString);
  assertHttpsPdfUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "application/pdf,*/*" },
    });
    if (!res.ok) {
      throw new Error(`Téléchargement impossible (${res.status}).`);
    }
    const len = res.headers.get("content-length");
    if (len && Number.parseInt(len, 10) > ONBOARDING_MENU_PDF_MAX_BYTES) {
      throw new Error("Le PDF dépasse la taille maximale autorisée.");
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > ONBOARDING_MENU_PDF_MAX_BYTES) {
      throw new Error("Le PDF dépasse la taille maximale autorisée.");
    }
    return buf;
  } finally {
    clearTimeout(timeout);
  }
}

function assertStoragePathForUser(path: string, userId: string): void {
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) {
    throw new Error("Chemin de stockage invalide.");
  }
  if (!path.toLowerCase().endsWith(".pdf")) {
    throw new Error("Le fichier doit être un PDF (.pdf).");
  }
  if (path.includes("..") || path.includes("//")) {
    throw new Error("Chemin de stockage invalide.");
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const json: unknown = await request.json();
    const body = bodySchema.parse(json);

    let pdfBuffer: ArrayBuffer;
    if (body.kind === "url") {
      pdfBuffer = await fetchPdfFromUrl(body.url);
    } else {
      assertStoragePathForUser(body.path, user.id);
      const { data: fileData, error: dlError } = await supabase.storage
        .from(ONBOARDING_MENU_PDF_BUCKET)
        .download(body.path);
      if (dlError || !fileData) {
        const raw = dlError?.message ?? "Téléchargement du fichier impossible.";
        return NextResponse.json(
          { error: onboardingMenuPdfStorageUploadMessage(raw) },
          { status: 400 },
        );
      }
      pdfBuffer = await fileData.arrayBuffer();
      if (pdfBuffer.byteLength > ONBOARDING_MENU_PDF_MAX_BYTES) {
        return NextResponse.json({ error: "Le PDF est trop volumineux." }, { status: 400 });
      }
    }

    const plainText = await extractPlainTextFromPdfBuffer(pdfBuffer);
    const llm = await extractMenuItemsWithLlmFromText(plainText, "onboarding");

    if (llm.items.length === 0) {
      return NextResponse.json(
        {
          error: "Aucun plat n’a pu être extrait de ce PDF.",
          warnings: llm.warnings,
          confidence: llm.confidence,
        },
        { status: 422 },
      );
    }

    const onboarding = await getOrCreateOnboarding(user.id);

    const { error: delError } = await supabase.from("menu_items").delete().eq("restaurant_id", onboarding.id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    const rows = llm.items.map((item, position) => {
      const priceMissing = item.price == null || Number.isNaN(item.price);
      const priceCad = priceMissing ? 0 : item.price;
      const notesParts = [item.notes];
      if (priceMissing) {
        notesParts.push("Prix non détecté sur le PDF — à confirmer.");
      }
      const notes = notesParts.filter(Boolean).join(" ").trim() || null;

      return {
        restaurant_id: onboarding.id,
        item_name: item.name.slice(0, 500),
        category: item.category.slice(0, 200),
        price_cad: priceCad,
        notes,
        position,
      };
    });

    const { error: insError } = await supabase.from("menu_items").insert(rows);

    if (insError) {
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }

    const { data: insertedItems } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", onboarding.id)
      .order("position", { ascending: true });

    if (insertedItems && insertedItems.length > 0) {
      const { createMenuVersion } = await import("@/lib/restaurant/menu-versions");
      await createMenuVersion({
        supabase,
        restaurantId: onboarding.id,
        source: "pdf_import",
        createdBy: user.id,
        menuItems: insertedItems.map((r) => ({
          id: r.id as string,
          restaurant_id: onboarding.id,
          onboarding_id: onboarding.id,
          item_name: r.item_name as string,
          category: r.category as string,
          price_cad: Number(r.price_cad),
          notes: (r.notes as string | null) ?? null,
          position: Number(r.position),
        })),
      });
    }

    revalidatePath("/onboarding");
    revalidatePath("/onboarding/menu");
    revalidatePath("/onboarding/review");

    return NextResponse.json({
      itemCount: rows.length,
      warnings: llm.warnings,
      confidence: llm.confidence,
      model: llm.model,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide.", details: e.flatten() }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
