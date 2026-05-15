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

function flashRegenerated(countRaw: string | undefined): FlashPayload {
  const n = countRaw ? Number(countRaw) : 0;
  const text =
    n > 0
      ? `${n} suggestion${n > 1 ? "s" : ""} générée${n > 1 ? "s" : ""}.`
      : "Nouvelles suggestions générées.";
  return { message: text, variant: "success" };
}

const flashMessages: Record<string, { text: string; variant: FlashPayload["variant"] }> = {
  accepted: { text: "Prix du plat mis à jour.", variant: "success" },
  rejected: { text: "Suggestion refusée.", variant: "success" },
  no_suggestions: {
    text: "L'IA n'a renvoyé aucune ligne exploitable. Réessaie ou vérifie que ton menu a des prix distincts par plat.",
    variant: "info",
  },
  filtered: {
    text: "L'IA a répondu, mais aucune suggestion n'a pu être reliée à ton menu (identifiants ou prix identiques). Voir le détail ci-dessous.",
    variant: "info",
  },
};

const errorHints: Record<string, string> = {
  missing_table:
    "Schéma « pricing_suggestions » incomplet ou ancien. Dans Supabase → SQL Editor : ouvre docs/sql/pricing_suggestions_fix_all.sql, colle tout le fichier, Run, puis recharge cette page.",
  missing_ai:
    "La génération nécessite ANTHROPIC_API_KEY sur le serveur Next.js. Ajoute la clé puis réessaie.",
  no_menu: "Ajoute d'abord des plats au menu (page Menu) pour obtenir des suggestions.",
  generation_failed: "La génération IA a échoué. Réessaie dans quelques instants.",
  insert_failed: "Les suggestions ont été générées mais n'ont pas pu être enregistrées en base. Détail ci-dessous.",
  invalid_id: "Action invalide (identifiant manquant).",
  not_found: "Cette suggestion n'existe plus ou n'est plus en attente.",
};

export const maxDuration = 120;

function safeDecodeDetail(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const cad = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function deltaPct(current: number, suggested: number): string {
  if (!Number.isFinite(current) || current <= 0) {
    return "—";
  }
  const pct = ((suggested - current) / current) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)} %`;
}

function buildFlashes(
  status: string | undefined,
  error: string | undefined,
  countRaw: string | undefined,
): FlashPayload[] {
  const out: FlashPayload[] = [];
  if (status === "regenerated") {
    out.push(flashRegenerated(countRaw));
  } else if (status && flashMessages[status]) {
    const f = flashMessages[status]!;
    out.push({ variant: f.variant, message: f.text });
  }
  if (error && errorHints[error]) {
    out.push({ variant: "error", message: errorHints[error] });
  }
  return out;
}

function parseGenerationStats(params: Record<string, string | string[] | undefined>) {
  const num = (key: string): number | null => {
    const raw = params[key];
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (s == null || s === "") {
      return null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  return {
    parsed: num("parsed"),
    kept: num("kept"),
    dropId: num("drop_id"),
    dropDup: num("drop_dup"),
    dropSame: num("drop_same"),
  };
}

function SuggestionTable({ rows }: { rows: PricingSuggestionWithMenu[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune entrée.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Plat</th>
            <th className="px-3 py-2 font-medium">Catégorie</th>
            <th className="px-3 py-2 font-medium">Prix menu</th>
            <th className="px-3 py-2 font-medium">Prix suggéré</th>
            <th className="px-3 py-2 font-medium">Écart</th>
            <th className="px-3 py-2 font-medium">Gain estimé / mois</th>
            <th className="px-3 py-2 font-medium">Confiance</th>
            <th className="min-w-[200px] px-3 py-2 font-medium">Note</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/80 last:border-0">
              <td className="px-3 py-2 font-medium">{row.item_name}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
              <td className="px-3 py-2">{cad.format(row.menu_price_cad)}</td>
              <td className="px-3 py-2">{cad.format(row.suggested_price_cad)}</td>
              <td className="px-3 py-2">{deltaPct(row.menu_price_cad, row.suggested_price_cad)}</td>
              <td className="px-3 py-2">
                {row.estimated_monthly_gain_cad != null && Number.isFinite(row.estimated_monthly_gain_cad)
                  ? cad.format(row.estimated_monthly_gain_cad)
                  : "—"}
              </td>
              <td className="px-3 py-2">
                {row.confidence != null ? `${Math.round(row.confidence * 100)} %` : "—"}
              </td>
              <td className="max-w-[280px] px-3 py-2 text-muted-foreground" title={row.rationale ?? ""}>
                {row.rationale ? (row.rationale.length > 120 ? `${row.rationale.slice(0, 117)}…` : row.rationale) : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <form action={acceptPricingSuggestionAction}>
                    <input type="hidden" name="suggestion_id" value={row.id} />
                    <Button type="submit" size="sm" variant="default">
                      Accepter
                    </Button>
                  </form>
                  <form action={rejectPricingSuggestionAction}>
                    <input type="hidden" name="suggestion_id" value={row.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Refuser
                    </Button>
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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Statut</th>
            <th className="px-3 py-2 font-medium">Plat</th>
            <th className="px-3 py-2 font-medium">Ancien</th>
            <th className="px-3 py-2 font-medium">Suggéré</th>
            <th className="px-3 py-2 font-medium">Gain estimé</th>
            <th className="px-3 py-2 font-medium">Mis à jour</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/80 last:border-0">
              <td className="px-3 py-2 capitalize">{row.status}</td>
              <td className="px-3 py-2 font-medium">{row.item_name}</td>
              <td className="px-3 py-2">{cad.format(row.current_price_cad)}</td>
              <td className="px-3 py-2">{cad.format(row.suggested_price_cad)}</td>
              <td className="px-3 py-2">
                {row.estimated_monthly_gain_cad != null ? cad.format(row.estimated_monthly_gain_cad) : "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(row.updated_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PricingSuggestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await getAuthedUser();
  const params = await searchParams;
  const statusRaw = params.status;
  const errorRaw = params.error;
  const countRaw = params.count;
  const detailRaw = params.detail;
  const status = Array.isArray(statusRaw) ? statusRaw[0] : statusRaw;
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;
  const count = Array.isArray(countRaw) ? countRaw[0] : countRaw;
  const insertDetail = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;
  const genStats = parseGenerationStats(params);
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
    const msg = e instanceof Error ? e.message : "";
    loadError = msg;
  }

  const snapshot = await getOnboardingSnapshot(user.id);
  const hasMenu = snapshot.menuItems.length > 0;
  const aiReady = isAnthropicConfigured();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <FlashToaster flashes={flashes} />
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Tarification</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <SparklesIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Suggestions de prix</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Génère des recommandations à partir de ton menu, de ton profil stratégique et, si disponible, d&apos;un
              indicateur global Square. Accepte une suggestion pour mettre à jour le prix du plat sur ta carte.
            </p>
          </div>
        </div>
      </header>

      {status === "regenerated" ? (
        <Alert>
          <AlertTitle>Suggestions enregistrées</AlertTitle>
          <AlertDescription>
            {count ? `${count} suggestion${Number(count) > 1 ? "s" : ""} en attente ci-dessous.` : "Consulte la liste en attente."}
          </AlertDescription>
        </Alert>
      ) : null}

      {status === "filtered" || status === "no_suggestions" ? (
        <Alert>
          <AlertTitle>
            {status === "filtered" ? "Réponse IA sans suggestion utilisable" : "Aucune suggestion du modèle"}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{flashMessages[status]?.text}</p>
            {genStats.parsed != null && genStats.parsed > 0 ? (
              <ul className="list-inside list-disc text-sm">
                <li>Lignes renvoyées par l&apos;IA : {genStats.parsed}</li>
                <li>Conservées : {genStats.kept ?? 0}</li>
                {(genStats.dropId ?? 0) > 0 ? <li>Plat non reconnu (UUID / nom) : {genStats.dropId}</li> : null}
                {(genStats.dropDup ?? 0) > 0 ? <li>Doublons : {genStats.dropDup}</li> : null}
                {(genStats.dropSame ?? 0) > 0 ? <li>Prix identique au menu : {genStats.dropSame}</li> : null}
              </ul>
            ) : null}
            <p className="text-sm">Les appels Anthropic ont bien eu lieu ; vérifie que les prix du menu ne sont pas tous à 0 $.</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {error === "insert_failed" ? (
        <Alert variant="destructive">
          <AlertTitle>Enregistrement impossible</AlertTitle>
          <AlertDescription>
            {errorHints.insert_failed}
            {insertDetail ? (
              <p className="mt-2 font-mono text-xs break-all">{safeDecodeDetail(insertDetail)}</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Lecture impossible</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!aiReady ? (
        <Alert>
          <AlertTitle>Clé Anthropic manquante</AlertTitle>
          <AlertDescription>{errorHints.missing_ai}</AlertDescription>
        </Alert>
      ) : null}

      {!hasMenu ? (
        <Alert>
          <AlertTitle>Menu vide</AlertTitle>
          <AlertDescription>
            {errorHints.no_menu}{" "}
            <Link href="/dashboard/menu" className="underline underline-offset-4">
              Ouvrir le menu
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Générer ou rafraîchir</h2>
            <p className="text-sm text-muted-foreground">
              Les suggestions en attente sont remplacées à chaque nouvelle génération.
            </p>
          </div>
          <PricingSuggestionsGeneratePanel disabled={!aiReady || !hasMenu} />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-medium">En attente ({pending.length})</h2>
        <SuggestionTable rows={pending} />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-medium">Historique récent</h2>
        <p className="text-sm text-muted-foreground">Dernières décisions (acceptées ou refusées).</p>
        <HistoryTable rows={history} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/menu">Retour au menu</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/stats">Statistiques</Link>
        </Button>
      </div>
    </div>
  );
}
