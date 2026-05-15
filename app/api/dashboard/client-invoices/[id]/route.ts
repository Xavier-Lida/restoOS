import { NextResponse } from "next/server";

import { CLIENT_INVOICES_STORAGE_BUCKET } from "@/lib/dashboard/client-invoices-constants";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: inv, error } = await supabase
    .from("client_invoices")
    .select("storage_path, original_filename")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!inv) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  const storagePath = inv.storage_path as string;
  const { data: signed, error: signError } = await supabase.storage
    .from(CLIENT_INVOICES_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 120);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: signError?.message ?? "Lien de téléchargement indisponible." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
