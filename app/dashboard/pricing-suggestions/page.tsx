import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PricingSuggestionsGeneratePanel } from "@/components/dashboard/pricing-suggestions-generate-panel";
import { PricingSuggestionsTable } from "@/components/dashboard/pricing-suggestions-table.client";
import { isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import {
  loadPendingPricingSuggestions,
  loadRecentPricingSuggestionHistory,
  type PricingSuggestionWithMenu,
} from "@/lib/dashboard/pricing-suggestions";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import { hasSquareItemSalesInLast30d } from "@/lib/square/menu-item-sales-volume";

export const maxDuration = 120;

const cad = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function buildFlashes(
  status: string | undefined,
  error: string | undefined,
  countRaw: string | undefined,
): FlashPayload[] {
  if (status === "regenerated") {
    const n = countRaw ? Number(countRaw) : 0;
    return [
      {
        variant: "success",
        message: n > 0 ? `${n} suggestion${n > 1 ? "s" : ""} générée${n > 1 ? "s" : ""}.` : "Suggestions générées.",
      },
    ];
  }
  if (status === "accepted") return [{ variant: "success", message: "Prix mis à jour." }];
  if (status === "rejected") return [{ variant: "success", message: "Suggestion refusée." }];
  if (error === "missing_ai") return [{ variant: "error", message: "Clé Anthropic manquante sur le serveur." }];
  if (error === "insert_failed") return [{ variant: "error", message: "Les suggestions n'ont pas pu être enregistrées." }];
  if (error === "generation_failed") return [{ variant: "error", message: "La génération a échoué. Réessaie dans quelques instants." }];
  return [];
}


function HistoryTable({ rows }: { rows: PricingSuggestionWithMenu[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun historique récent.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left">
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Statut</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Plat</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ancien</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggéré</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gain estimé</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
              <td className="px-4 py-3">
                <span
                  className={
                    row.status === "accepted"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {row.status === "accepted" ? "Accepté" : "Refusé"}
                </span>
              </td>
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{cad.format(row.current_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums">{cad.format(row.suggested_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums">
                {row.estimated_monthly_gain_cad != null ? cad.format(row.estimated_monthly_gain_cad) : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(row.updated_at).toLocaleDateString("fr-CA")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PricingSuggestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await getAuthedUser();
  const params = await searchParams;

  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const count = Array.isArray(params.count) ? params.count[0] : params.count;

  const flashes = buildFlashes(status, error, count);

  let pending: PricingSuggestionWithMenu[] = [];
  let history: PricingSuggestionWithMenu[] = [];
  let loadError: string | null = null;

  try {
    [pending, history] = await Promise.all([
      loadPendingPricingSuggestions(user.id),
      loadRecentPricingSuggestionHistory(user.id),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Erreur de chargement.";
  }

  const snapshot = await getOnboardingSnapshot(user.id);
  const hasMenu = snapshot.menuItems.length > 0;
  const aiReady = isAnthropicConfigured();
  const hasItemSalesData = await hasSquareItemSalesInLast30d(user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <FlashToaster flashes={flashes} />

      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <SparklesIcon className="size-4.5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suggestions de prix</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Recommandations IA basées sur ton menu et le marché local.
          </p>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!aiReady ? (
        <Alert>
          <AlertTitle>Configuration manquante</AlertTitle>
          <AlertDescription>La clé Anthropic est absente du serveur.</AlertDescription>
        </Alert>
      ) : null}

      {!hasMenu ? (
        <Alert>
          <AlertTitle>Menu vide</AlertTitle>
          <AlertDescription>
            Ajoute des plats dans{" "}
            <Link href="/dashboard/menu" className="underline underline-offset-4">
              le menu
            </Link>{" "}
            pour obtenir des suggestions.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Generate */}
      <section className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-5 py-4">
        <div>
          <p className="text-sm font-medium">Générer des suggestions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Remplace les suggestions en attente.
          </p>
        </div>
        <PricingSuggestionsGeneratePanel disabled={!aiReady || !hasMenu} />
      </section>

      {/* Pending */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold">En attente</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
              {pending.length}
            </span>
          )}
        </div>
        <PricingSuggestionsTable rows={pending} />
      </section>

      {/* History */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Historique récent</h2>
        <HistoryTable rows={history} />
      </section>

      <footer className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground/90">Comment est calculé le gain / mois ?</p>
        <p className="mt-1.5 leading-relaxed">
          Estimation indicative : (prix suggéré − prix actuel) ×{" "}
          <strong className="font-medium text-foreground/80">quantités vendues sur les 30 derniers jours</strong>,
          issues d&apos;un export caisse avec colonnes Date, Article et Quantité, associées à chaque plat du menu
          (même logique de rapprochement de nom que pour le positionnement marché).
        </p>
        <p className="mt-1.5 leading-relaxed">
          On suppose que le volume reste constant après l&apos;ajustement de prix (pas d&apos;élasticité).
          {!hasItemSalesData ? (
            <>
              {" "}
              Aucune vente par article détectée sur les 30 derniers jours : la colonne gain affiche « — ». Importez un
              CSV détaillé depuis{" "}
              <Link href="/dashboard/integrations/sales-csv" className="font-medium text-primary underline underline-offset-4">
                Import ventes
              </Link>
              .
            </>
          ) : null}
        </p>
      </footer>
    </div>
  );
}
