import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

import { deleteClientInvoiceAction, uploadClientInvoiceAction } from "@/app/dashboard/integrations/client-invoices/actions";
import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadClientInvoices, type ClientInvoiceRow } from "@/lib/dashboard/client-invoices";
import { getAuthedUser } from "@/lib/onboarding/server";

const flashMessages: Record<string, { text: string }> = {
  uploaded: { text: "Facture enregistrée." },
  deleted: { text: "Facture supprimée." },
};

const errorHints: Record<string, string> = {
  missing_table:
    "La table client_invoices n'existe pas encore. Dans Supabase : SQL Editor → exécute docs/sql/client_invoices.sql (ou les migrations supabase/migrations/20260515140000_client_invoices.sql puis 20260515160000_client_invoices_ai_extraction.sql) → Run, puis recharge cette page.",
  missing_bucket:
    "Le bucket Storage « client-invoices » est absent. Réapplique la migration / script SQL (section Storage) puis réessaie l'envoi.",
  missing_ai_column:
    "La colonne ai_extraction est absente. Exécute la migration supabase/migrations/20260515160000_client_invoices_ai_extraction.sql (ou la fin de docs/sql/client_invoices.sql) dans le SQL Editor Supabase.",
  missing_ai:
    "L'extraction automatique nécessite la variable d'environnement ANTHROPIC_API_KEY sur le serveur Next.js (même clé que pour l'import menu). Sans clé, l'upload est désactivé.",
  extraction_failed:
    "L'extraction IA n'a pas pu lire la facture (fichier illisible, format inattendu, ou erreur API). Réessaie avec un PDF texte, un scan plus net, ou une image plus contrastée.",
  not_found: "Cette facture n'existe plus ou ne t'appartient pas.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} o`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} Ko`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-CA", { dateStyle: "medium" });
}

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });
}

function formatConfidence(row: ClientInvoiceRow): string {
  const c = row.ai_extraction.confidence;
  if (typeof c !== "number" || Number.isNaN(c)) {
    return "—";
  }
  return `${Math.round(Math.min(1, Math.max(0, c)) * 100)} %`;
}

function confidenceTitle(row: ClientInvoiceRow): string {
  const w = row.ai_extraction.warnings;
  if (w && w.length > 0) {
    return w.join("\n");
  }
  return "Confiance estimée du modèle sur l'extraction";
}

function InvoiceTable({ rows }: { rows: ClientInvoiceRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Fichier</th>
            <th className="px-3 py-2 font-medium">Client / réf.</th>
            <th className="px-3 py-2 font-medium">Date facture</th>
            <th className="px-3 py-2 font-medium">Montant</th>
            <th className="px-3 py-2 font-medium">IA</th>
            <th className="px-3 py-2 font-medium">Ajoutée le</th>
            <th className="px-3 py-2 font-medium">Taille</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/80 last:border-0">
              <td className="max-w-[220px] truncate px-3 py-2 font-medium" title={row.original_filename}>
                {row.original_filename}
              </td>
              <td className="max-w-[160px] truncate px-3 py-2" title={row.client_label ?? ""}>
                {row.client_label ?? "—"}
              </td>
              <td className="px-3 py-2">{formatDisplayDate(row.invoice_date)}</td>
              <td className="px-3 py-2">
                {row.amount_cad !== null && row.amount_cad !== undefined
                  ? `${row.amount_cad.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
                  : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={confidenceTitle(row)}>
                {formatConfidence(row)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatUploadedAt(row.uploaded_at)}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatBytes(row.file_size_bytes)}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={`/api/dashboard/client-invoices/${row.id}`} target="_blank" rel="noopener noreferrer">
                      Télécharger
                    </a>
                  </Button>
                  <form action={deleteClientInvoiceAction}>
                    <input type="hidden" name="invoice_id" value={row.id} />
                    <Button type="submit" variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      Supprimer
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

export default async function ClientInvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await getAuthedUser();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const flash = status ? flashMessages[status] : null;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const errorMessage = errorCode ? errorHints[errorCode] : null;

  if (status && !flash) {
    redirect("/dashboard/integrations/client-invoices");
  }

  if (errorCode && !errorMessage) {
    redirect("/dashboard/integrations/client-invoices");
  }

  const flashes: FlashPayload[] = [];
  if (flash) {
    flashes.push({ variant: "success", message: flash.text });
  }
  if (errorCode === "missing_table" || errorCode === "missing_bucket" || errorCode === "missing_ai_column") {
    flashes.push({
      variant: "error",
      message: "Configuration incomplète. Voir le message détaillé ci-dessous.",
    });
  }
  if (errorCode === "missing_ai" || errorCode === "extraction_failed") {
    flashes.push({
      variant: "error",
      message: errorMessage ?? "Erreur",
    });
  }
  if (errorCode === "not_found") {
    flashes.push({ variant: "error", message: errorHints.not_found });
  }

  let invoices: ClientInvoiceRow[] = [];
  let listError: string | null = null;
  try {
    invoices = await loadClientInvoices(user.id);
  } catch (e) {
    listError = e instanceof Error ? e.message : "Impossible de charger la liste.";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <FlashToaster flashes={flashes} />

      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Intégrations</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <FileText className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Factures clients</h1>
            <p className="max-w-2xl text-muted-foreground">
              Envoie un PDF ou une image de facture : le texte est analysé par un modèle Claude (Anthropic) pour remplir
              automatiquement client, date, montant TTC et métadonnées. Variable serveur{" "}
              <code className="text-foreground">ANTHROPIC_API_KEY</code> requise.
            </p>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>
            {errorCode === "missing_table" || errorCode === "missing_bucket" || errorCode === "missing_ai_column"
              ? "Configuration requise"
              : "Extraction IA"}
          </AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {listError ? (
        <Alert variant="destructive">
          <AlertTitle>Liste indisponible</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ajouter une facture</CardTitle>
          <CardDescription>
            PDF ou image (PNG, JPEG, WebP), max. 20&nbsp;Mo. Les champs sont déduits automatiquement du document (IA).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadClientInvoiceAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-invoice-file">Fichier</Label>
              <Input
                id="client-invoice-file"
                type="file"
                name="invoice"
                required
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                className="max-w-lg cursor-pointer"
              />
            </div>
            <div>
              <Button type="submit">Analyser et enregistrer</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures enregistrées</CardTitle>
          <CardDescription>Télécharge ou supprime une pièce jointe.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceTable rows={invoices} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/stats">Statistiques</Link>
        </Button>
      </div>
    </main>
  );
}
