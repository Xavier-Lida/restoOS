import Link from "next/link";
import { BarChart3Icon } from "lucide-react";

import { ClientInvoiceAnalyticsSection } from "@/components/dashboard/client-invoice-analytics-section";
import { MenuChartsClient } from "@/components/dashboard/menu-charts.client";
import { SquareAnalyticsSection } from "@/components/dashboard/square-analytics";
import { Button } from "@/components/ui/button";
import { buildMenuCategoryChartPoints } from "@/lib/dashboard/menu-charts";
import type { RevenueRange } from "@/lib/square/dashboard";
import { profileOptions } from "@/lib/onboarding/constants";
import { getAuthedUser, getOnboardingSnapshot } from "@/lib/onboarding/server";

const mvpSteps = [
  "Onboarding et import des ventes (Square CSV)",
  "Detection et scraping des concurrents",
  "Generation des suggestions de prix",
  "Validation restaurateur puis mise a jour des prix",
  "Export du menu en CSV et QR code",
];

const validRanges: ReadonlyArray<RevenueRange> = ["7d", "30d", "90d"];

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
    "Non defini";
  const averagePrice =
    snapshot.menuItems.length > 0
      ? (
          snapshot.menuItems.reduce((acc, item) => acc + Number(item.price_cad), 0) /
          snapshot.menuItems.length
        ).toFixed(2)
      : "0.00";

  const squareSection = await SquareAnalyticsSection({
    userId: user.id,
    range,
  });

  const clientInvoiceSection = await ClientInvoiceAnalyticsSection({
    userId: user.id,
    range,
  });

  const menuChartPoints = buildMenuCategoryChartPoints(snapshot.menuItems);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Statistiques</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <BarChart3Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Bonjour {snapshot.onboarding.owner_name}
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              Ventes Square, facturation clients (B2B), menu et ROI lorsque les données correspondantes sont
              disponibles. Utilise les onglets 7 / 30 / 90 jours pour les séries temporelles.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Restaurant</p>
          <p className="pt-1 font-medium">{snapshot.onboarding.restaurant_name}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Profil</p>
          <p className="pt-1 font-medium">{profileLabel}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Items menu</p>
          <p className="pt-1 font-medium">{snapshot.menuItems.length}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Prix moyen</p>
          <p className="pt-1 font-medium">{averagePrice} $</p>
        </article>
      </section>

      {squareSection}

      {clientInvoiceSection}

      {menuChartPoints.length > 0 ? <MenuChartsClient data={menuChartPoints} /> : null}

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-medium">Prochaines etapes produit</h2>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
          {mvpSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/integrations/square">Import CSV Square</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/integrations/client-invoices">Factures clients</Link>
        </Button>
      </div>
    </div>
  );
}
