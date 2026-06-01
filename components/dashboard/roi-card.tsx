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
  };
}

export function RoiCard(props: RoiCardProps) {
  const state = classify(props);
  return (
    <StatsSection>
      <SecHeader
        num="02"
        kicker="RestoPrix · retour sur abonnement"
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

function NoDataState({
  subscriptionCad,
  restaurantProfitCad,
}: {
  subscriptionCad: number;
  restaurantProfitCad: number | null;
}) {
  return (
    <Surf className="border-dashed p-7">
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="Profit du restaurant"
          value={
            restaurantProfitCad != null ? cadFormatter.format(restaurantProfitCad) : "—"
          }
          hint={restaurantProfitCad == null ? "Importez vos ventes CSV" : "Ventes nettes · période"}
        />
        <BigStat label="Profit dû aux changements" value="—" hint="Acceptez des suggestions de prix" />
        <BigStat label="Coût du logiciel" value={cadFormatter.format(subscriptionCad)} />
        <BigStat label="ROI" value="—" />
      </div>
      <p className="text-sm text-muted-foreground">
        Connectez votre menu et acceptez vos premières suggestions de prix pour calculer votre ROI.
      </p>
      <code className="mt-4 block rounded-lg border border-border bg-popover p-3 text-xs text-muted-foreground">
        ROI = profit dû aux changements / {cadFormatter.format(subscriptionCad)}
      </code>
    </Surf>
  );
}

function ReadyState({ state }: { state: Extract<RoiState, { kind: "ready" }> }) {
  return (
    <Surf className="p-7">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="Profit du restaurant"
          value={
            state.restaurantProfitCad != null
              ? cadFormatter.format(state.restaurantProfitCad)
              : "—"
          }
          hint="Ventes nettes · période (proxy)"
        />
        <BigStat
          label="Profit dû aux changements"
          value={`+ ${cadFormatter.format(state.monthlyGainCad)}`}
          accent="emerald"
          hint={`${state.acceptedCount} suggestion${state.acceptedCount > 1 ? "s" : ""} acceptée${state.acceptedCount > 1 ? "s" : ""}`}
        />
        <BigStat label="Coût du logiciel" value={cadFormatter.format(state.subscriptionCad)} />
        <BigStat label="ROI" value={`${state.ratio.toFixed(1)}×`} accent="emerald" hint="sur l'abonnement" />
      </div>
      <p className="mt-6 text-center font-serif text-[32px] italic text-primary tabular-nums">
        {state.ratio.toFixed(1)}×
      </p>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        retour sur investissement · abonnement RestoPrix
      </p>
    </Surf>
  );
}
