"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { createScrapeSourceAction } from "@/app/admin/scraping/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export function ScrapeSourceForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setError(null);
        startTransition(async () => {
          const fd = new FormData(form);
          const result = await createScrapeSourceAction(fd);
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          if (result.message) {
            toast.success(result.message);
          }
          if (result.redirectTo) {
            router.push(result.redirectTo);
          }
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="url">URL du menu ou du site</Label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          disabled={isPending}
          placeholder="https://restaurant.example/menu ou .pdf"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Libellé (optionnel)</Label>
        <Input
          id="label"
          name="label"
          type="text"
          disabled={isPending}
          placeholder="Bistro X — menu web"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes internes (optionnel)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          disabled={isPending}
          placeholder="Contexte pour votre équipe…"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
        <Button asChild variant="outline" type="button" disabled={isPending}>
          <Link href="/admin/scraping">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
