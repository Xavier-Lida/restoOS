"use client";

import { BigStat, SecHeader, StatsSection, Surf } from "@/components/dashboard/stats-premium-ui";

import type { ClientInvoiceChartBundle } from "@/lib/dashboard/client-invoice-charts";
import type { RevenueRange } from "@/lib/square/dashboard";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

type ClientInvoiceChartsClientProps = {
  bundle: ClientInvoiceChartBundle;
  selectedRange: RevenueRange;
  compact?: boolean;
};

function clientInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientInvoiceChartsClient({ bundle, compact = false }: ClientInvoiceChartsClientProps) {
  const { byClient, invoiceCount, totalCad } = bundle;
  const avgPerInvoice = invoiceCount > 0 ? totalCad / invoiceCount : 0;

  if (compact) {
    return (
      <StatsSection>
        <SecHeader
          num="05"
          kicker="B2B · facturation"
          title="Clients & factures"
          subtitle="Montants issus des factures importées et analysées sur la période."
        />
        <Surf className="p-6">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <BigStat label="Factures" value={String(invoiceCount)} />
            <BigStat label="Montant" value={cadFormatter.format(totalCad)} accent="emerald" />
            <BigStat
              label="Panier moyen"
              value={cadFormatter.format(avgPerInvoice)}
              accent="amber"
            />
          </div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Top clients</p>
          {byClient.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun client identifié sur la période.</p>
          ) : (
            <ul>
              {byClient.slice(0, 6).map((client) => (
                <li
                  key={client.clientKey}
                  className="flex items-center gap-3 border-t border-border/70 py-2.5 first:border-t"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-popover text-[11px] font-semibold text-muted-foreground">
                    {clientInitials(client.clientKey)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{client.clientKey}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {client.invoiceCount} facture{client.invoiceCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-[14px] font-semibold tabular-nums">
                    {cadFormatter.format(client.totalCad)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Surf>
      </StatsSection>
    );
  }

  return (
    <StatsSection>
      <SecHeader num="05" kicker="B2B · facturation" title="Clients & factures" />
      <Surf className="p-6">
        <div className="grid grid-cols-3 gap-3">
          <BigStat label="Factures" value={String(invoiceCount)} />
          <BigStat label="Montant" value={cadFormatter.format(totalCad)} accent="emerald" />
          <BigStat label="Panier moyen" value={cadFormatter.format(avgPerInvoice)} />
        </div>
      </Surf>
    </StatsSection>
  );
}
