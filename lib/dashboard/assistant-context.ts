import "server-only";

import { profileOptions } from "@/lib/onboarding/constants";
import type { OnboardingSnapshot } from "@/lib/onboarding/types";

const APP_PURPOSE = `RestoPrix aide les restaurateurs au Canada à optimiser leurs prix grâce à l'intelligence concurrentielle, aux suggestions de prix et à l'import de données de ventes (Square, CSV).`;

export function buildAssistantSystemPrompt(params: {
  snapshot: OnboardingSnapshot;
  integrationsSnippet: string;
  marketSnippet: string | null;
}): string {
  const { snapshot, integrationsSnippet, marketSnippet } = params;
  const { onboarding, menuItems } = snapshot;
  const profileLabel =
    profileOptions.find((o) => o.value === onboarding.dominant_profile)?.title ?? "non défini";

  const menuLines = menuItems.slice(0, 80).map((item) => {
    const price = Number(item.price_cad).toFixed(2);
    return `- ${item.category}: ${item.item_name} — ${price} $ CAD`;
  });

  const menuBlock =
    menuLines.length > 0
      ? menuLines.join("\n")
      : "(Aucun item menu enregistré pour le moment.)";

  return [
    `Tu es l'assistant RestoPrix. Réponds en français, de façon concise et actionnable.`,
    ``,
    `## Rôle du produit`,
    APP_PURPOSE,
    ``,
    `## Données restaurateur (source interne — ne pas inventer d'autres faits)`,
    `- Propriétaire: ${onboarding.owner_name ?? "—"}`,
    `- Restaurant: ${onboarding.restaurant_name ?? "—"}`,
    `- Adresse: ${[onboarding.address_line, onboarding.city, onboarding.postal_code].filter(Boolean).join(", ") || "—"}`,
    `- Profil dominant: ${profileLabel}`,
    ``,
    `## Menu (extrait, max 80 lignes)`,
    menuBlock,
    menuItems.length > 80 ? `\n… et ${menuItems.length - 80} autre(s) plat(s) non listés ici.` : "",
    ``,
    `## POS / revenus`,
    integrationsSnippet,
    ``,
    `## Marché / concurrents`,
    marketSnippet ??
      "Les données marché détaillées (scraping concurrentiel) ne sont pas encore branchées à ce compte. Ne prétends pas avoir des prix concurrents précis ; tu peux donner des principes généraux ou demander des précisions.",
    ``,
    `Règles: si une information manque, dis-le. Ne fabrique pas de chiffres de vente ou de prix concurrents.`,
  ].join("\n");
}
