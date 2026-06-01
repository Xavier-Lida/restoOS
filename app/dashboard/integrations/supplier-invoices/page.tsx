import { redirect } from "next/navigation";

import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { SupplierInvoicesWorkspace } from "@/components/dashboard/integrations/supplier-invoices-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadSupplierInvoices } from "@/lib/dashboard/supplier-invoices";
import { getAuthedUser } from "@/lib/onboarding/server";

const flashMessages: Record<string, { text: string }> = {
  imported: { text: "Facture fournisseur enregistrée." },
  deleted: { text: "Facture supprimée." },
};

const errorHints: Record<string, string> = {
  missing_table:
    "Applique les migrations Supabase dans supabase/migrations/ (20260601120300_costs_supplier_recipes.sql) puis recharge.",
  missing_bucket: "Le bucket Storage « supplier-invoices » est absent. Réapplique la migration SQL.",
  missing_ai: "ANTHROPIC_API_KEY requis pour l'extraction des factures fournisseur.",
  extraction_failed: "Extraction IA impossible. Réessaie avec un PDF texte ou une image plus nette.",
  duplicate_file: "Ce fichier a déjà été importé.",
  not_found: "Facture introuvable.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SupplierInvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await getAuthedUser();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const flash = status ? flashMessages[status] : null;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const errorMessage = errorCode ? errorHints[errorCode] : null;

  if (status && !flash) {
    redirect("/dashboard/integrations/supplier-invoices");
  }

  if (errorCode && !errorMessage) {
    redirect("/dashboard/integrations/supplier-invoices");
  }

  const flashes: FlashPayload[] = [];
  if (flash) {
    flashes.push({ variant: "success", message: flash.text });
  }
  if (errorMessage) {
    flashes.push({ variant: "error", message: errorMessage });
  }

  let invoices: Awaited<ReturnType<typeof loadSupplierInvoices>> = [];
  let loadError: string | null = null;
  try {
    invoices = await loadSupplierInvoices(user.id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Erreur de chargement.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Factures fournisseur</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importe tes factures d&apos;achat matière pour calculer le coût alimentaire réel par plat.
        </p>
      </div>

      <FlashToaster flashes={flashes} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <SupplierInvoicesWorkspace invoices={invoices} />
    </div>
  );
}
