import { NextResponse } from "next/server";
import { z } from "zod";

import { runAssistantReply } from "@/lib/dashboard/assistant-run";
import { buildAssistantSystemPrompt } from "@/lib/dashboard/assistant-context";
import {
  formatIntegrationAssistantSnippet,
  resolveIntegrationAssistantContext,
} from "@/lib/dashboard/integration-assistant-snippet";
import { getOnboardingSnapshot } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { messages } = parsed.data;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return NextResponse.json({ error: "Le dernier message doit être celui de l'utilisateur." }, { status: 400 });
  }

  const snapshot = await getOnboardingSnapshot(user.id);
  if (snapshot.onboarding.onboarding_status !== "completed") {
    return NextResponse.json({ error: "Onboarding incomplet." }, { status: 403 });
  }

  let integrationsSnippet: string;
  try {
    const ctx = await resolveIntegrationAssistantContext(user.id);
    integrationsSnippet = formatIntegrationAssistantSnippet(ctx);
  } catch {
    integrationsSnippet =
      "Intégrations POS : impossible de résumer les données pour le moment (erreur serveur).";
  }

  const system = buildAssistantSystemPrompt({
    snapshot,
    integrationsSnippet,
    marketSnippet: null,
  });

  try {
    const reply = await runAssistantReply({
      system,
      messages,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur.";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
