"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, PlayIcon } from "lucide-react";

import { runScrapeFromForm } from "@/app/admin/scraping/actions";
import { Button } from "@/components/ui/button";

type RunScrapeButtonProps = {
  sourceId: string;
};

export function RunScrapeButton({ sourceId }: RunScrapeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="shrink-0"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const fd = new FormData();
          fd.set("source_id", sourceId);
          const result = await runScrapeFromForm(fd);
          if (!result.ok) {
            toast.error(result.message);
            await router.refresh();
            return;
          }
          if (result.message) {
            toast.success(result.message);
          }
          await router.refresh();
        });
      }}
    >
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
            Scraping…
          </>
        ) : (
          <>
            <PlayIcon data-icon="inline-start" />
            Lancer un scrape
          </>
        )}
      </Button>
    </form>
  );
}
