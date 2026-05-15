import { NextResponse } from "next/server";

import { buildMenuCsv } from "@/lib/dashboard/menu-csv";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

function safeFilename(name: string): string {
  const cleaned = name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 48);
  return cleaned.length > 0 ? cleaned : "menu";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const snapshot = await getOnboardingSnapshot(user.id);
  if (snapshot.onboarding.onboarding_status !== "completed") {
    return NextResponse.json({ error: "Onboarding incomplet." }, { status: 403 });
  }

  const restaurantName = snapshot.onboarding.restaurant_name ?? "Menu";
  const csv = buildMenuCsv(snapshot.menuItems);
  const filename = `${safeFilename(restaurantName)}-menu.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
