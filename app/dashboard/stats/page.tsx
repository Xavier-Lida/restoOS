import Link from "next/link";

import { ClientInvoiceAnalyticsSection } from "@/components/dashboard/client-invoice-analytics-section";
import { SquareAnalyticsSection } from "@/components/dashboard/square-analytics";
import { StatsPeriodSwitch } from "@/components/dashboard/stats-period-switch.client";
import {
  MetaCell,
  MetaStrip,
  StatsChip,
  StatsFooter,
  StatsPageHeader,
  StatsPageShell,
  StatsSourceBlock,
} from "@/components/dashboard/stats-premium-ui";
import { Button } from "@/components/ui/button";
import { hasClientInvoices, loadClientInvoiceChartBundle } from "@/lib/dashboard/client-invoice-charts";
import type { RevenueRange } from "@/lib/square/dashboard";
import { hasSquareReports } from "@/lib/square/dashboard";
import { profileOptions } from "@/lib/onboarding/constants";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import { PricingF3dSection } from "@/components/dashboard/pricing-engine/pricing-f3d-section";
import { PricingF2Section } from "@/components/dashboard/pricing-engine/pricing-f2-section";
import { PricingF3Section } from "@/components/dashboard/pricing-engine/pricing-f3-section";
import { PricingF4Section } from "@/components/dashboard/pricing-engine/pricing-f4-section";
import { loadSpmCompetitorRows } from "@/lib/dashboard/pricing-engine/f2-spm-competitors";

const validRanges: ReadonlyArray<RevenueRange> = ["7d", "30d", "90d"];

const rangeLabels: Record<RevenueRange, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
};

function resolveRange(raw: string | string[] | undefined): RevenueRange {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return validRanges.includes(candidate as RevenueRange) ? (candidate as RevenueRange) : "30d";
}

type StatsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardStatsPage({ searchParams }: { searchParams: StatsSearchParams }) {
  const { user } = await getAuthedUser();
  const snapshot = await getOnboardingSnapshot(user.id);
  const params = await searchParams;
  const range = resolveRange(params.range);

  const profileLabel =
    profileOptions.find((option) => option.value === snapshot.onboarding.dominant_profile)?.title ??
    "Non défini";
  const averagePrice =
    snapshot.menuItems.length > 0
      ? snapshot.menuItems.reduce((acc, item) => acc + Number(item.price_cad), 0) / snapshot.menuItems.length
      : 0;

  const invoiceEnabled = await hasClientInvoices(user.id);
  const [squareEnabled, invoiceBundle, spmMeta] = await Promise.all([
    hasSquareReports(user.id),
    invoiceEnabled ? loadClientInvoiceChartBundle(user.id, range) : Promise.resolve(null),
    loadSpmCompetitorRows({
      selfRestaurantName: snapshot.onboarding.restaurant_name ?? "Vous",
      selfAvgPriceCad: averagePrice,
    }),
  ]);

  const squareSection = squareEnabled ? await SquareAnalyticsSection({ userId: user.id, range }) : null;
  const clientInvoiceSection = invoiceEnabled ? await ClientInvoiceAnalyticsSection({ userId: user.id, range }) : null;

  const hasMenu = snapshot.menuItems.length > 0;
  const restaurantName = snapshot.onboarding.restaurant_name ?? "—";

  return (
    <StatsPageShell>
      <StatsPageHeader
        ownerName={snapshot.onboarding.owner_name ?? "vous"}
        subtitle="Vos ventes Square, la facturation B2B, le menu et le ROI RestoPrix, agrégés en une seule lecture. Choisissez la fenêtre temporelle ci-dessus."
        kicker={`Tableau de bord · ${rangeLabels[range]}`}
        rightSlot={
          <>
            <StatsSourceBlock>
              {squareEnabled ? <StatsChip tone="emerald">Square · synchronisé</StatsChip> : null}
              {invoiceEnabled && invoiceBundle ? (
                <StatsChip tone="amber">
                  B2B · {invoiceBundle.invoiceCount} facture{invoiceBundle.invoiceCount > 1 ? "s" : ""} (période)
                </StatsChip>
              ) : (
                <StatsChip tone="amber">B2B · en attente d&apos;import</StatsChip>
              )}
              <StatsChip tone="amber">
                SPM · {Math.min(spmMeta.filledCount, spmMeta.totalSlots)} / {spmMeta.totalSlots} segments
              </StatsChip>
            </StatsSourceBlock>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatsPeriodSwitch selectedRange={range} />
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-border/80 text-[12.5px]">
                <Link href="/dashboard/integrations/square">Exporter</Link>
              </Button>
            </div>
          </>
        }
      />

      <MetaStrip>
        <MetaCell label="Restaurant" value={restaurantName} hint="Québec, QC" />
        <MetaCell label="Profil actif" value={profileLabel} hint="stratégie tarifaire" />
        <MetaCell label="Items menu" value={snapshot.menuItems.length.toLocaleString("fr-CA")} hint="carte active" />
        <MetaCell label="Prix moyen" value={`${averagePrice.toFixed(2)} $`} hint="moyenne catalogue" />
      </MetaStrip>

      {squareSection}

      {hasMenu ? (
        <>
          <PricingF3dSection userId={user.id} menuItems={snapshot.menuItems} range={range} />
          <PricingF4Section
            userId={user.id}
            menuItems={snapshot.menuItems}
            range={range}
            profile={snapshot.onboarding.dominant_profile ?? "securitaire"}
          />
        </>
      ) : null}

      {(clientInvoiceSection || hasMenu) && (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          {clientInvoiceSection}
          {hasMenu ? <PricingF2Section userId={user.id} menuItems={snapshot.menuItems} range={range} compact /> : null}
        </div>
      )}

      {hasMenu ? <PricingF3Section userId={user.id} menuItems={snapshot.menuItems} range={range} /> : null}

      <StatsFooter restaurantName={restaurantName} />
    </StatsPageShell>
  );
}
