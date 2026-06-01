import type { ReactNode } from "react";

import { BigStat, SecHeader, Surf, StatsSection } from "@/components/dashboard/stats-premium-ui";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

type RoiCardProps = {
  restaurantProfitCad: number | null;
  monthlyGainCad: number;
  acceptedCount: number;
  subscriptionCad: number;
};

type RoiState =
  | { kind: "no-data"; subscriptionCad: number; restaurantProfitCad: number | null }
  | {
      kind: "ready";
      restaurantProfitCad: number | null;
      monthlyGainCad: number;
      acceptedCount: number;
      subscriptionCad: number;
      ratio: number;
      netRoiCad: number;
    };

function classify({
  monthlyGainCad,
  acceptedCount,
  subscriptionCad,
  restaurantProfitCad,
}: RoiCardProps): RoiState {
  if (acceptedCount === 0 || monthlyGainCad <= 0) {
    return { kind: "no-data", subscriptionCad, restaurantProfitCad };
  }
  return {
    kind: "ready",
    restaurantProfitCad,
    monthlyGainCad,
    acceptedCount,
    subscriptionCad,
    ratio: monthlyGainCad / subscriptionCad,
    netRoiCad: monthlyGainCad - subscriptionCad,
  };
}

export function RoiCard(props: RoiCardProps) {
  const state = classify(props);
  return (
    <StatsSection>
      <SecHeader
        num="02"
        kicker="RestoOs · retour sur abonnement"
        title="Votre ROI"
      />
      {state.kind === "no-data" ? (
        <NoDataState subscriptionCad={state.subscriptionCad} restaurantProfitCad={state.restaurantProfitCad} />
      ) : (
        <ReadyState state={state} />
      )}
    </StatsSection>
  );
}

function RoiLayout({
  heroValue,
  heroHint,
  surfClassName,
  footer,
  children,
}: {
  heroValue: string;
  heroHint?: string;
  surfClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Surf className={surfClassName ?? "p-7"}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <aside className="flex shrink-0 flex-col justify-center lg:min-w-[200px] lg:max-w-[280px] lg:border-r lg:border-border/60 lg:pr-8">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/80">ROI</p>
          <p className="mt-2 font-serif text-[clamp(44px,5vw,60px)] italic leading-none text-primary tabular-nums">
            {heroValue}
          </p>
          {heroHint ? <p className="mt-2 text-[13px] text-muted-foreground">{heroHint}</p> : null}
        </aside>
        <div className="grid flex-1 grid-cols-2 gap-3">{children}</div>
      </div>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </Surf>
  );
}

function NoDataState({
  subscriptionCad,
  restaurantProfitCad,
}: {
  subscriptionCad: number;
  restaurantProfitCad: number | null;
}) {
  return (
    <RoiLayout
      heroValue="—"
      surfClassName="border-dashed p-7"
      footer={
        <>
          <p className="text-sm text-muted-foreground">
            Connectez votre menu et acceptez vos premières suggestions de prix pour calculer votre ROI.
          </p>
          <code className="mt-4 block rounded-lg border border-border bg-popover p-3 text-xs text-muted-foreground">
            ROI net = profit dû aux changements − {cadFormatter.format(subscriptionCad)}
          </code>
        </>
      }
    >
      <BigStat
        label="Profit du restaurant"
        value={restaurantProfitCad != null ? cadFormatter.format(restaurantProfitCad) : "—"}
        hint={restaurantProfitCad == null ? "Importez vos ventes CSV" : "Ventes nettes · période"}
      />
      <BigStat label="Profit dû aux changements" value="—" hint="Acceptez des suggestions de prix" />
      <BigStat label="Coût du logiciel" value={cadFormatter.format(subscriptionCad)} />
      <BigStat label="ROI" value="—" />
    </RoiLayout>
  );
}

function ReadyState({ state }: { state: Extract<RoiState, { kind: "ready" }> }) {
  return (
    <RoiLayout
      heroValue={`${state.ratio.toFixed(1)}×`}
    >
      <BigStat
        label="Profit du restaurant"
        value={
          state.restaurantProfitCad != null
            ? cadFormatter.format(state.restaurantProfitCad)
            : "—"
        }
        hint="Ventes nettes"
      />
      <BigStat
        label="Profit dû aux changements"
        value={`+ ${cadFormatter.format(state.monthlyGainCad)}`}
        accent="emerald"
        hint={`${state.acceptedCount} suggestion${state.acceptedCount > 1 ? "s" : ""} acceptée${state.acceptedCount > 1 ? "s" : ""}`}
      />
      <BigStat label="Coût du logiciel" value={cadFormatter.format(state.subscriptionCad)} />
      <BigStat
        label="ROI"
        value={`+ ${cadFormatter.format(state.netRoiCad)}`}
        accent="emerald"
        hint="gain net · après abonnement"
      />
    </RoiLayout>
  );
}
