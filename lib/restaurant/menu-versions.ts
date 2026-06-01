import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MenuItemRecord, MenuVersionSource } from "@/lib/restaurant/types";

export async function createMenuVersion(args: {
  supabase: SupabaseClient;
  restaurantId: string;
  source: MenuVersionSource;
  createdBy: string | null;
  menuItems: MenuItemRecord[];
}): Promise<string> {
  const { data: version, error: versionError } = await args.supabase
    .from("menu_versions")
    .insert({
      restaurant_id: args.restaurantId,
      source: args.source,
      created_by: args.createdBy,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    throw new Error(versionError?.message ?? "Impossible de créer la version du menu.");
  }

  if (args.menuItems.length === 0) {
    return version.id;
  }

  const rows = args.menuItems.map((item) => ({
    menu_version_id: version.id,
    menu_item_id: item.id,
    item_name: item.item_name,
    category: item.category,
    price_cad: item.price_cad,
    notes: item.notes,
    position: item.position,
  }));

  const { error: itemsError } = await args.supabase.from("menu_version_items").insert(rows);
  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return version.id;
}
