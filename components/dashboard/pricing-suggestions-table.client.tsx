"use client";

import { useOptimistic, startTransition } from "react";
import { toast } from "sonner";

import {
  acceptPricingSuggestionAction,
  rejectPricingSuggestionAction,
} from "@/app/dashboard/pricing-suggestions/actions";
import { Button } from "@/components/ui/button";
import type { PricingSuggestionWithMenu } from "@/lib/dashboard/pricing-suggestions";

const cad = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function deltaPct(current: number, suggested: number): string {
  if (!Number.isFinite(current) || current <= 0) return "—";
  const pct = ((suggested - current) / current) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)} %`;
}

export function PricingSuggestionsTable({ rows }: { rows: PricingSuggestionWithMenu[] }) {
  const [optimisticRows, removeOptimistic] = useOptimistic(
    rows,
    (current, id: string) => current.filter((r) => r.id !== id),
  );

  function handleAction(
    id: string,
    action: (fd: FormData) => Promise<{ ok: boolean; message?: string }>,
    successMessage: string,
  ) {
    const fd = new FormData();
    fd.append("suggestion_id", id);
    startTransition(async () => {
      removeOptimistic(id);
      const result = await action(fd);
      if (!result.ok) {
        toast.error(result.message ?? "Une erreur est survenue.");
      } else {
        toast.success(successMessage);
      }
    });
  }

  if (optimisticRows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune suggestion en attente.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left">
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Plat</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Actuel</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggéré</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Écart</th>
            <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gain / mois</th>
            <th className="min-w-[200px] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Note</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {optimisticRows.map((row) => (
            <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{cad.format(row.menu_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums font-medium text-primary">{cad.format(row.suggested_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums">{deltaPct(row.menu_price_cad, row.suggested_price_cad)}</td>
              <td className="px-4 py-3 tabular-nums">
                {row.estimated_monthly_gain_cad != null && Number.isFinite(row.estimated_monthly_gain_cad)
                  ? cad.format(row.estimated_monthly_gain_cad)
                  : "—"}
              </td>
              <td className="max-w-[260px] px-4 py-3 text-muted-foreground" title={row.rationale ?? ""}>
                {row.rationale ? (row.rationale.length > 100 ? `${row.rationale.slice(0, 97)}…` : row.rationale) : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAction(row.id, acceptPricingSuggestionAction, "Prix mis à jour.")}
                  >
                    Accepter
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(row.id, rejectPricingSuggestionAction, "Suggestion refusée.")}
                  >
                    Refuser
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
