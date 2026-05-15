import Link from "next/link";
import { redirect } from "next/navigation";
import { Plug } from "lucide-react";

import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getConnectionForUser } from "@/lib/lightspeed/connection";
import { createClient } from "@/lib/supabase/server";
import type { LightspeedConnectionRow } from "@/lib/lightspeed/types";

const statusLabels: Record<LightspeedConnectionRow["status"], string> = {
  active: "Active",
  needs_reauth: "Reconnexion requise",
  revoked: "Révoquée",
};

const flashMessages: Record<string, { tone: "success" | "info" | "error"; text: string }> = {
  connected: {
    tone: "success",
    text: "Connexion Lightspeed réussie. Le backfill de 90 jours est en cours en arrière-plan.",
  },
  disconnected: { tone: "info", text: "Connexion Lightspeed supprimée." },
  syncing: {
    tone: "info",
    text: "Synchronisation déclenchée. Les nouveaux reçus apparaîtront sous quelques minutes.",
  },
};

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "-";
  }
  const date = new Date(iso);
  return date.toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LightspeedIntegrationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const flash = status && flashMessages[status] ? flashMessages[status] : null;

  const connection = await getConnectionForUser(user.id);

  const flashes: FlashPayload[] = [];
  if (flash) {
    flashes.push({ variant: flash.tone, message: flash.text });
  }
  if (errorMessage) {
    flashes.push({ variant: "error", message: errorMessage });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <FlashToaster flashes={flashes} />

      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Intégrations</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Plug className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Lightspeed Restaurant</h1>
            <p className="max-w-2xl text-muted-foreground">
              Connecte ton compte Lightspeed Restaurant L-Series pour importer ton menu et calculer ton chiffre
              d&apos;affaires en temps quasi réel.
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardContent className="pt-6">
          {connection ? (
            <ConnectedState connection={connection} />
          ) : (
            <DisconnectedState />
          )}
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/stats">Retour au tableau de bord</Link>
        </Button>
      </div>
    </main>
  );
}

function DisconnectedState() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Pas encore connecté</h2>
      <p className="text-sm text-muted-foreground">
        Tu seras redirigé vers Lightspeed pour autoriser l&apos;accès. RestoPrix demande uniquement les
        permissions nécessaires (lecture du menu et des reçus).
      </p>
      <form action="/auth/lightspeed/start" method="post">
        <Button type="submit">Connecter Lightspeed</Button>
      </form>
    </div>
  );
}

function ConnectedState({ connection }: { connection: LightspeedConnectionRow }) {
  const lastSync = formatDateTime(connection.last_sync_at);
  const lastBackfill = formatDateTime(connection.last_backfill_at);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" value={statusLabels[connection.status]} />
        <Field label="Environnement" value={connection.environment === "prod" ? "Production" : "Staging"} />
        <Field label="Dernier sync" value={lastSync} />
        <Field label="Backfill 90 j" value={lastBackfill} />
        <Field label="Échecs consécutifs" value={connection.consecutive_failures.toString()} />
        <Field label="Business ID" value={connection.business_id ?? "-"} />
      </div>

      {connection.last_error ? (
        <Alert variant="destructive">
          <AlertTitle>Dernière erreur</AlertTitle>
          <AlertDescription>{connection.last_error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <form action="/auth/lightspeed/sync-now" method="post">
          <Button type="submit">Sync maintenant</Button>
        </form>
        <form action="/auth/lightspeed/start" method="post">
          <Button type="submit" variant="outline">
            Reconnecter
          </Button>
        </form>
        <form action="/auth/lightspeed/disconnect" method="post">
          <Button type="submit" variant="destructive">
            Déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
