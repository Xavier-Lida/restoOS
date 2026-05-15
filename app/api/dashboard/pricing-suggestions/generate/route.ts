import { NextResponse } from "next/server";

import {
  pricingGenerationResultToSearchParams,
  runPricingSuggestionsGeneration,
} from "@/lib/dashboard/run-pricing-suggestions-generation";

export const maxDuration = 120;

export async function POST() {
  try {
    const result = await runPricingSuggestionsGeneration();

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        count: result.count,
        redirectTo: `/dashboard/pricing-suggestions?status=regenerated&count=${result.count}`,
      });
    }

    const q = pricingGenerationResultToSearchParams(result);
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
        detail: result.detail,
        stats: result.stats,
        redirectTo: `/dashboard/pricing-suggestions?${q.toString()}`,
      },
      { status: 422 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ ok: false, code: "server_error", message }, { status: 500 });
  }
}
