import { ClientInvoiceAnalyticsSection } from "@/components/dashboard/client-invoice-analytics-section";
import { SquareAnalyticsSection } from "@/components/dashboard/square-analytics";
import { StatsPeriodSwitch } from "@/components/dashboard/stats-period-switch.client";
import {
  MetaCell,
  MetaStrip,
  StatsFooter,
  StatsPageHeader,
  StatsPageShell,
} from "@/components/dashboard/stats-premium-ui";
import { hasClientInvoices, loadClientInvoiceChartBundle } from "@/lib/dashboard/client-invoice-charts";
import type { RevenueRange } from "@/lib/square/dashboard";
import { hasSquareReports } from "@/lib/square/dashboard";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";
import { PricingF3dSection } from "@/components/dashboard/pricing-engine/pricing-f3d-section";
import { PricingF2Section } from "@/components/dashboard/pricing-engine/pricing-f2-section";
import { PricingF3Section } from "@/components/dashboard/pricing-engine/pricing-f3-section";
import { PricingF4Section } from "@/components/dashboard/pricing-engine/pricing-f4-section";
import { loadSpmCompetitorRows } from "@/lib/dashboard/pricing-engine/f2-spm-competitors";

const validRanges: ReadonlyArray<RevenueRange> = ["7d", "30d", "90d"];

const rangeLabels: Record<RevenueRange, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
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
        kicker={`Tableau de bord · ${rangeLabels[range]}`}
        rightSlot={<StatsPeriodSwitch selectedRange={range} />}
      />

      <MetaStrip>
        <MetaCell label="Restaurant" value={restaurantName} />
        <MetaCell
          label="Items au menu"
          value={snapshot.menuItems.length.toLocaleString("fr-CA")}
        />
        <MetaCell
          label="Prix moyen"
          value={`${averagePrice.toFixed(2)} $`}
        />
        <MetaCell
          label="Segments SPM"
          value={`${Math.min(spmMeta.filledCount, spmMeta.totalSlots)} / ${spmMeta.totalSlots}`}
        />
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
          {hasMenu ? (
            <PricingF2Section userId={user.id} menuItems={snapshot.menuItems} range={range} compact />
          ) : null}
        </div>
      )}

      {hasMenu ? (
        <PricingF3Section userId={user.id} menuItems={snapshot.menuItems} range={range} />
      ) : null}

      <StatsFooter restaurantName={restaurantName} />
    </StatsPageShell>
  );
}
