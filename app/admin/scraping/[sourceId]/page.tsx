import Link from "next/link";
import { notFound } from "next/navigation";

import { RunScrapeButton } from "@/components/admin/run-scrape-button";
import { assertAdminUser } from "@/lib/admin/server";
import { Button } from "@/components/ui/button";

type SourceRow = {
  id: string;
  url: string;
  label: string | null;
  notes: string | null;
  created_at: string;
};

type RunRow = {
  id: string;
  status: string;
  items_found: number | null;
  error_message: string | null;
  raw_preview: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  item_name: string;
  category: string;
  price_cad: number | null;
  position: number;
  notes: string | null;
};

export default async function AdminScrapingDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { supabase, user } = await assertAdminUser();

  const { data: source, error: sourceError } = await supabase
    .from("scrape_sources")
    .select("id, url, label, notes, created_at, created_by")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError || !source) {
    notFound();
  }

  const src = source as SourceRow & { created_by: string };
  if (src.created_by !== user.id) {
    notFound();
  }

  const { data: runs, error: runsError } = await supabase
    .from("scrape_runs")
    .select(
      "id, status, items_found, error_message, raw_preview, started_at, completed_at, created_at",
    )
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (runsError) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {runsError.message}
        </p>
      </main>
    );
  }

  const runList = (runs ?? []) as RunRow[];
  const latestRun = runList[0];
  const latestSuccessRun = runList.find((run) => run.status === "success");
  const itemsRunId = latestSuccessRun?.id ?? null;
  let latestItems: ItemRow[] = [];

  if (itemsRunId) {
    const { data: items } = await supabase
      .from("scrape_run_items")
      .select("id, item_name, category, price_cad, position, notes")
      .eq("run_id", itemsRunId)
      .order("position", { ascending: true });
    latestItems = (items ?? []) as ItemRow[];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-3">
            <Link href="/admin/scraping">Toutes les sources</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {src.label ?? "Source sans libelle"}
          </h1>
          <p className="mt-1 break-all text-sm text-muted-foreground">{src.url}</p>
          {src.notes ? <p className="mt-2 max-w-2xl text-sm">{src.notes}</p> : null}
        </div>
        <RunScrapeButton sourceId={src.id} />
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium">Dernier run</h2>
        {!latestRun ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucun run pour le moment.</p>
        ) : (
          <div className="mt-4 grid gap-3 text-sm">
            <p>
              <span className="text-muted-foreground">Statut:</span>{" "}
              <span className="font-medium">{latestRun.status}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Items detectes:</span>{" "}
              {latestRun.items_found ?? latestItems.length}
            </p>
            {latestRun.error_message ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                {latestRun.error_message}
              </p>
            ) : null}
            {latestRun.raw_preview ? (
              <details className="rounded-md border bg-muted/50 p-3">
                <summary className="cursor-pointer font-medium">Apercu texte brut</summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                  {latestRun.raw_preview}
                </pre>
              </details>
            ) : null}
          </div>
        )}
      </section>

      {latestItems.length > 0 ? (
        <section className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Items du dernier run reussi</h2>
          <ul className="mt-4 divide-y">
            {latestItems.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                <div>
                  <p className="font-medium">{item.item_name}</p>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                  {item.notes ? (
                    <p className="mt-1 max-w-xl text-xs text-muted-foreground">{item.notes}</p>
                  ) : null}
                </div>
                <p className="text-sm font-medium">
                  {item.price_cad != null ? `${Number(item.price_cad).toFixed(2)} $` : "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium">Historique des runs</h2>
        {runList.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Vide.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Statut</th>
                  <th className="pb-2 pr-4 font-medium">Items</th>
                  <th className="pb-2 font-medium">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {runList.map((run) => (
                  <tr key={run.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(run.created_at).toLocaleString("fr-CA")}
                    </td>
                    <td className="py-2 pr-4">{run.status}</td>
                    <td className="py-2 pr-4">{run.items_found ?? "—"}</td>
                    <td className="max-w-xs truncate py-2 text-muted-foreground">
                      {run.error_message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
