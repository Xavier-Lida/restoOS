"use server";

import { revalidatePath } from "next/cache";

import { assertAdminUser } from "@/lib/admin/server";
import { runMinimalHtmlScrape } from "@/lib/admin/scrape-minimal";
import { actionFail, actionOk, type ActionResult } from "@/lib/form/action-result";
import type { MarketMenuExtractionLlm } from "@/lib/schemas/market-menu-extraction";

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
      .select("id, url, label, created_by, market_restaurant_id")
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
      const { preview, items, meta, marketItems, restaurantMeta } = await runMinimalHtmlScrape(source.url);

      const restaurantPayload: NonNullable<MarketMenuExtractionLlm["restaurant"]> = {
        cuisine_types: [],
        ...restaurantMeta,
      };
      const displayName =
        restaurantPayload.display_name?.trim() ||
        source.label?.trim() ||
        new URL(source.url).hostname;

      let marketRestaurantId = source.market_restaurant_id as string | null;

      if (!marketRestaurantId) {
        const { data: createdRestaurant, error: restaurantError } = await supabase
          .from("market_restaurants")
          .insert({
            display_name: displayName,
            city: restaurantPayload.city ?? null,
            region: restaurantPayload.region ?? null,
            postal_prefix: restaurantPayload.postal_prefix ?? null,
            cuisine_types: restaurantPayload.cuisine_types ?? [],
            price_tier: restaurantPayload.price_tier ?? null,
            service_style: restaurantPayload.service_style ?? null,
            language: restaurantPayload.language ?? null,
            source_url: source.url,
            last_scraped_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (restaurantError || !createdRestaurant) {
          throw new Error(restaurantError?.message ?? "Impossible de créer le restaurant marché.");
        }

        marketRestaurantId = createdRestaurant.id;

        await supabase
          .from("scrape_sources")
          .update({ market_restaurant_id: marketRestaurantId })
          .eq("id", sourceId);
      } else {
        await supabase
          .from("market_restaurants")
          .update({
            display_name: displayName,
            city: restaurantPayload.city ?? null,
            region: restaurantPayload.region ?? null,
            postal_prefix: restaurantPayload.postal_prefix ?? null,
            cuisine_types: restaurantPayload.cuisine_types ?? [],
            price_tier: restaurantPayload.price_tier ?? null,
            service_style: restaurantPayload.service_style ?? null,
            language: restaurantPayload.language ?? null,
            source_url: source.url,
            last_scraped_at: new Date().toISOString(),
          })
          .eq("id", marketRestaurantId);
      }

      const { data: snapshot, error: snapshotError } = await supabase
        .from("market_menu_snapshots")
        .insert({
          market_restaurant_id: marketRestaurantId,
          scrape_run_id: runId,
        })
        .select("id")
        .single();

      if (snapshotError || !snapshot) {
        throw new Error(snapshotError?.message ?? "Impossible de créer le snapshot menu.");
      }

      const itemCount =
        marketItems.length > 0
          ? marketItems.length
          : items.length;

      if (marketItems.length > 0) {
        const dbRows = marketItems.map((item, index) => ({
          snapshot_id: snapshot.id,
          item_name: item.name,
          normalized_name: item.normalized_name,
          category: item.category,
          price_cad: item.price,
          description: item.description,
          portion_size: item.portion_size,
          protein: item.protein,
          diet_tags: item.diet_tags,
          alcohol: item.alcohol,
          is_special: item.is_special,
          confidence: meta.confidence ?? null,
          raw_excerpt: item.raw_excerpt,
          position: index,
        }));

        const { error: itemsError } = await supabase.from("market_menu_items").insert(dbRows);
        if (itemsError) {
          throw new Error(itemsError.message);
        }
      } else if (items.length > 0) {
        const dbRows = items.map((item, index) => ({
          snapshot_id: snapshot.id,
          item_name: item.name,
          normalized_name: item.name,
          category: item.category,
          price_cad: item.price,
          description: item.notes ?? null,
          portion_size: null,
          protein: null,
          diet_tags: [],
          alcohol: false,
          is_special: false,
          confidence: meta.confidence ?? null,
          raw_excerpt: null,
          position: index,
        }));

        const { error: itemsError } = await supabase.from("market_menu_items").insert(dbRows);
        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }

      const { error: finalizeError } = await supabase
        .from("scrape_runs")
        .update({
          status: "success",
          items_found: itemCount,
          raw_preview: preview,
          completed_at: new Date().toISOString(),
          error_message: null,
          extraction_model: meta.model ?? null,
          extraction_confidence: meta.confidence ?? null,
          extraction_warnings: meta.warnings ?? [],
        })
        .eq("id", runId);

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      revalidatePath(`/admin/scraping/${sourceId}`);
      revalidatePath("/admin/scraping");
      return actionOk(`Scrape terminé : ${itemCount} plat(s) détecté(s).`);
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
