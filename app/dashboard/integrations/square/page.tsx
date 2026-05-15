import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload } from "lucide-react";

import { uploadSquareSalesReportAction } from "@/app/dashboard/integrations/square/actions";
import { FlashToaster, type FlashPayload } from "@/components/flash-toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getAuthedUser } from "@/lib/onboarding/server";

const flashMessages: Record<string, { text: string }> = {
  imported: {
    text: "Rapport Square importé. Les graphiques sont visibles dans Statistiques.",
  },
};

const errorHints: Record<string, string> = {
  missing_table:
    "La table square_sales_reports n'existe pas encore sur ton projet Supabase. Dans le dashboard Supabase : SQL Editor → colle tout le fichier docs/sql/square_supabase.sql (ou exécute la migration supabase/migrations/20260507183000_square_sales_reports.sql avec le CLI) → Run. Recharge cette page puis réessaie l'upload.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SquareIntegrationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAuthedUser();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const flash = status ? flashMessages[status] : null;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const schemaHint = errorCode ? errorHints[errorCode] : null;

  if (status && !flash) {
    redirect("/dashboard/integrations/square");
  }

  if (errorCode && !schemaHint) {
    redirect("/dashboard/integrations/square");
  }

  const flashes: FlashPayload[] = [];
  if (flash) {
    flashes.push({ variant: "success", message: flash.text });
  }
  if (errorCode === "missing_table") {
    flashes.push({
      variant: "error",
      message:
        "Schéma Supabase incomplet : la table square_sales_reports est absente. Voir les instructions ci-dessous.",
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <FlashToaster flashes={flashes} />

      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Intégrations</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Upload className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Square CSV</h1>
            <p className="max-w-2xl text-muted-foreground">
              Importe un CSV Square : récapitulatif des ventes (deux colonnes) ou export détaillé des articles
              (colonnes Date, Ventes nettes, etc., y compris en français). Les ventes détaillées sont agrégées par
              jour pour les graphiques.
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
          <CardTitle>Importer un rapport</CardTitle>
          <CardDescription>
            Exemples : <code className="text-foreground">recapitulatif-ventes-YYYY-MM-DD-YYYY-MM-DD.csv</code> ou
            export des ventes par article (jusqu&apos;à environ 25 Mo).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadSquareSalesReportAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="square-report-file">Fichier CSV</Label>
              <input
                id="square-report-file"
                type="file"
                name="report"
                accept=".csv,text/csv"
                required
                className="max-w-lg rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5"
              />
            </div>
            <div>
              <Button type="submit">Uploader le CSV</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/stats">Voir les statistiques</Link>
        </Button>
      </div>
    </main>
  );
}
