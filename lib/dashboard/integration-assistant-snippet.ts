import "server-only";

import { hasSquareReports } from "@/lib/square/dashboard";

export type IntegrationAssistantContext =
  | { kind: "square-reports-present" }
  | { kind: "no-imported-sales" };

const integrationSnippetHandlers: Record<IntegrationAssistantContext["kind"], () => string> = {
  "square-reports-present": () =>
    "Square : des rapports de ventes (CSV) ont été importés ; des agrégats quotidiens sont disponibles.",
  "no-imported-sales": () =>
    "Aucune donnée de vente importée (Square) pour ce compte dans le contexte de l'assistant.",
};

export function formatIntegrationAssistantSnippet(ctx: IntegrationAssistantContext): string {
  return integrationSnippetHandlers[ctx.kind]();
}

const integrationContextBySquarePresence: Record<"yes" | "no", IntegrationAssistantContext> = {
  yes: { kind: "square-reports-present" },
  no: { kind: "no-imported-sales" },
};

export async function resolveIntegrationAssistantContext(userId: string): Promise<IntegrationAssistantContext> {
  const key = (await hasSquareReports(userId)) ? "yes" : "no";
  return integrationContextBySquarePresence[key];
}
