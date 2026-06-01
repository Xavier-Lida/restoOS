import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import {
  acceptPricingSuggestionAction,
  rejectPricingSuggestionAction,
} from "@/app/dashboard/pricing-suggestions/actions";
import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PricingSuggestionsGeneratePanel } from "@/components/dashboard/pricing-suggestions-generate-panel";
import { Button } from "@/components/ui/button";
import { isAnthropicConfigured } from "@/lib/admin/anthropic-env";
import {
  loadPendingPricingSuggestions,
  loadRecentPricingSuggestionHistory,
  type PricingSuggestionWithMenu,
} from "@/lib/dashboard/pricing-suggestions";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

export const maxDuration = 120;

const cad = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function deltaPct(current: number, suggested: number): string {
  if (!Number.isFinite(current) || current <= 0) return "—";
  const pct = ((suggested - current) / current) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)} %`;
}

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

function SuggestionTable({ rows }: { rows: PricingSuggestionWithMenu[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune suggestion en attente.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left">
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Plat</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Actuel</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggéré</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Écart</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gain / mois</th>
            <th className="min-w-[200px] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Note</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{cad.format(row.menu_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums font-medium text-primary">{cad.format(row.suggested_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums">{deltaPct(row.menu_price_cad, row.suggested_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums">
                {row.estimated_monthly_gain_cad != null && Number.isFinite(row.estimated_monthly_gain_cad)
                  ? cad.format(row.estimated_monthly_gain_cad)
                  : "—"}
              </td>
              <td className="max-w-[260px] px-4 py-3 text-muted-foreground" title={row.rationale ?? ""}>
                {row.rationale ? (row.rationale.length > 100 ? `${row.rationale.slice(0, 97)}…` : row.rationale) : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <form action={acceptPricingSuggestionAction}>
                    <input type="hidden" name="suggestion_id" value={row.id} />
                    <Button type="submit" size="sm">Accepter</Button>
                  </form>
                  <form action={rejectPricingSuggestionAction}>
                    <input type="hidden" name="suggestion_id" value={row.id} />
                    <Button type="submit" size="sm" variant="ghost">Refuser</Button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
        <SuggestionTable rows={pending} />
      </section>

      {/* History */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Historique récent</h2>
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}
