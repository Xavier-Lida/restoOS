"use server";

import { revalidatePath } from "next/cache";

import { assertAdminUser } from "@/lib/admin/server";
import { runMinimalHtmlScrape } from "@/lib/admin/scrape-minimal";
import { actionFail, actionOk, type ActionResult } from "@/lib/form/action-result";

function readRequiredField(formData: FormData, key: string): string | null {
  const value = formData.get(key)?.toString().trim() ?? "";
  return value.length > 0 ? value : null;
}

export async function createScrapeSourceAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertAdminUser();
    const url = readRequiredField(formData, "url");
    if (!url) {
      return actionFail("L’URL est requise.");
    }

    try {
      new URL(url);
    } catch {
      return actionFail("URL invalide.");
    }

    const label = formData.get("label")?.toString().trim() || null;
    const notes = formData.get("notes")?.toString().trim() || null;

    const { data, error } = await supabase
      .from("scrape_sources")
      .insert({
        url,
        label,
        notes,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return actionFail(error?.message ?? "Impossible de créer la source.");
    }

    revalidatePath("/admin/scraping");
    return actionOk("Source créée.", `/admin/scraping/${data.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}

export async function runScrapeFromForm(formData: FormData): Promise<ActionResult> {
  const sourceId = formData.get("source_id")?.toString().trim() ?? "";
  if (!sourceId) {
    return actionFail("source_id manquant.");
  }
  return runScrapeAction(sourceId);
}

export async function runScrapeAction(sourceId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertAdminUser();

    const { data: source, error: sourceError } = await supabase
      .from("scrape_sources")
      .select("id, url, created_by")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError || !source) {
      return actionFail(sourceError?.message ?? "Source introuvable.");
    }

    if (source.created_by !== user.id) {
      return actionFail("Accès refusé pour cette source.");
    }

    const { data: runRow, error: runInsertError } = await supabase
      .from("scrape_runs")
      .insert({
        source_id: sourceId,
        status: "running",
        trigger_type: "manual",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runInsertError || !runRow) {
      return actionFail(runInsertError?.message ?? "Impossible de créer le run.");
    }

    const runId = runRow.id;

    try {
      const { preview, items } = await runMinimalHtmlScrape(source.url);

      if (items.length > 0) {
        const rows = items.map((item, index) => ({
          run_id: runId,
          item_name: item.name,
          category: item.category,
          price_cad: item.price,
          position: index,
          notes: item.notes ?? null,
        }));

        const { error: itemsError } = await supabase.from("scrape_run_items").insert(rows);
        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }

      const { error: finalizeError } = await supabase
        .from("scrape_runs")
        .update({
          status: "success",
          items_found: items.length,
          raw_preview: preview,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", runId);

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      revalidatePath(`/admin/scraping/${sourceId}`);
      revalidatePath("/admin/scraping");
      return actionOk(`Scrape terminé : ${items.length} plat(s) détecté(s).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      await supabase
        .from("scrape_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      revalidatePath(`/admin/scraping/${sourceId}`);
      revalidatePath("/admin/scraping");
      return actionFail(message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue.";
    return actionFail(message);
  }
}
