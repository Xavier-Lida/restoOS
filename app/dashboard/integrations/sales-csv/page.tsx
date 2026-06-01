import { redirect } from "next/navigation";

import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { SalesCsvDropzone } from "@/components/dashboard/integrations/sales-csv-dropzone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthedUser } from "@/lib/onboarding/server";

const errorHints: Record<string, string> = {
  missing_table:
    "Schéma incomplet : applique les migrations dans supabase/migrations/ (20260601120200_pos_sales.sql) via Supabase CLI ou SQL Editor.",
  missing_items_table:
    "Tables POS absentes : applique supabase/migrations/20260601120200_pos_sales.sql puis réessaie.",
  duplicate_file: "Ce fichier CSV a déjà été importé (même empreinte). Utilise un export plus récent si besoin.",
};

function buildImportFlash(newCount: number, updatedCount: number, itemsCount: number): string {
  const parts: string[] = [];
  if (newCount > 0) {
    parts.push(`${newCount} nouveau${newCount > 1 ? "x" : ""} jour${newCount > 1 ? "s" : ""} importé${newCount > 1 ? "s" : ""}`);
  }
  if (updatedCount > 0) {
    parts.push(`${updatedCount} jour${updatedCount > 1 ? "s" : ""} mis à jour (données déjà existantes)`);
  }
  if (itemsCount > 0) {
    parts.push(
      `${itemsCount} ligne${itemsCount > 1 ? "s" : ""} article${itemsCount > 1 ? "s" : ""} (quantités par plat) enregistrée${itemsCount > 1 ? "s" : ""}`,
    );
  }
  if (parts.length === 0) {
    return "CSV importé. Les graphiques sont visibles dans Statistiques.";
  }
  return `${parts.join(", ")}. Les graphiques sont visibles dans Statistiques.`;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SalesCsvPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAuthedUser();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const schemaHint = errorCode ? errorHints[errorCode] : null;

  if (status && status !== "imported") {
    redirect("/dashboard/integrations/sales-csv");
  }

  if (errorCode && !schemaHint) {
    redirect("/dashboard/integrations/sales-csv");
  }

  const flashes: FlashPayload[] = [];
  if (status === "imported") {
    const newCount = typeof params.new === "string" ? Number(params.new) : 0;
    const updatedCount = typeof params.updated === "string" ? Number(params.updated) : 0;
    const itemsCount = typeof params.items === "string" ? Number(params.items) : 0;
    flashes.push({ variant: "success", message: buildImportFlash(newCount, updatedCount, itemsCount) });
    if (updatedCount > 0) {
      flashes.push({
        variant: "warning",
        message: `${updatedCount} jour${updatedCount > 1 ? "s" : ""} déjà présent${updatedCount > 1 ? "s" : ""} ont été écrasés avec les nouvelles données.`,
      });
    }
  }
  if (errorCode === "missing_table") {
    flashes.push({
      variant: "error",
      message:
        "Schéma Supabase incomplet : la table pos_daily_sales_reports est absente. Voir les instructions ci-dessous.",
    });
  }
  if (errorCode === "missing_items_table") {
    flashes.push({
      variant: "error",
      message:
        "Schéma Supabase incomplet : pos_sale_lines ou pos_sales_items_daily est absent. Voir les instructions ci-dessous.",
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <FlashToaster flashes={flashes} />

      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Import CSV des ventes</h1>
            <p className="max-w-2xl text-muted-foreground">
              Importe un export CSV de ton logiciel de caisse (récap journalier ou lignes par article).
              Le fichier est analysé automatiquement pour alimenter les statistiques et le gain mensuel des suggestions de prix.
            </p>
          </div>
        </div>
      </header>

      {schemaHint ? (
        <Alert variant="destructive">
          <AlertTitle>Configuration Supabase</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{schemaHint}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Importer un CSV</CardTitle>
          <CardDescription>
            Accepte les exports journaliers ou détaillés par article (Date, Article, Quantité) pour alimenter
            les graphiques et le gain mensuel des suggestions de prix. Jusqu&apos;à environ 25 Mo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SalesCsvDropzone />
        </CardContent>
      </Card>
    </main>
  );
}
