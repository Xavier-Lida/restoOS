import Link from "next/link";

import { ScrapeSourceForm } from "@/components/admin/scrape-source-form";
import { Button } from "@/components/ui/button";

export default function AdminScrapingNewPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Nouvelle source</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/scraping">Liste</Link>
        </Button>
      </div>

      <ScrapeSourceForm />
    </main>
  );
}
