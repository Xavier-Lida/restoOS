import Link from "next/link";

import { assertAdminUser } from "@/lib/admin/server";
import { Button } from "@/components/ui/button";

type ScrapeSourceRow = {
  id: string;
  url: string;
  label: string | null;
  created_at: string;
};

export default async function AdminScrapingListPage() {
  const { supabase } = await assertAdminUser();

  const { data: sources, error } = await supabase
    .from("scrape_sources")
    .select("id, url, label, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Erreur Supabase: {error.message}. Verifiez que docs/sql/scrape_admin.sql a ete execute.
        </p>
      </main>
    );
  }

  const rows = (sources ?? []) as ScrapeSourceRow[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scraping manuel</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ajoutez des URLs de menus publics, lancez un run MVP (fetch + extraction heuristique),
            puis consultez les items extraits et le texte brut preview.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/scraping/new">Nouvelle URL</Link>
        </Button>
      </div>

      <section className="mt-8 rounded-lg border bg-card">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Aucune source pour le moment. Ajoutez une URL pour demarrer.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{row.label ?? row.url}</p>
                  <p className="text-sm text-muted-foreground break-all">{row.url}</p>
                  <p className="text-xs text-muted-foreground">
                    Ajoute {new Date(row.created_at).toLocaleString("fr-CA")}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/scraping/${row.id}`}>Ouvrir</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
