import { z } from "zod";

import { buildAssistantSystemPrompt } from "@/lib/dashboard/assistant-context";
import {
  formatChartCatalogForPrompt,
  loadAssistantDataBundle,
} from "@/lib/dashboard/assistant-data-bundle";
import { runAssistantStream } from "@/lib/dashboard/assistant-run";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import type { AssistantSseEvent } from "@/lib/schemas/assistant-turn";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(12_000),
      }),
    )
    .min(1)
    .max(24),
});

function chunk(data: AssistantSseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Requête invalide.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { messages } = parsed.data;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return Response.json({ error: "Le dernier message doit être celui de l'utilisateur." }, { status: 400 });
  }

  const snapshot = await getOnboardingSnapshot(user.id);
  if (snapshot.onboarding.onboarding_status !== "completed") {
    return Response.json({ error: "Onboarding incomplet." }, { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AssistantSseEvent) => controller.enqueue(chunk(event));

      try {
        emit({ phase: "status", message: "Je charge votre menu et vos données…" });

        const bundle = await loadAssistantDataBundle(user.id);

        emit({ phase: "status", message: "J'analyse le contexte RestoOs…" });

        const system = buildAssistantSystemPrompt({
          snapshot: bundle.snapshot,
          integrationsSnippet: bundle.integrationsSnippet,
          marketSnippet: bundle.marketSnippet,
          chartCatalogPrompt: formatChartCatalogForPrompt(bundle.chartCatalog),
          hasSalesData: bundle.hasSalesData,
          hasMarketData: bundle.hasMarketData,
        });

        emit({ phase: "status", message: "Je rédige la réponse…" });

        const done = await runAssistantStream({
          system,
          messages,
          catalogMap: bundle.catalogMap,
          callbacks: {
            onDelta: (text) => emit({ phase: "delta", text }),
          },
        });

        emit({ phase: "done", payload: done });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur serveur.";
        const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
        emit({ phase: "error", message: status === 503 ? message : "Impossible de générer la réponse." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
