import { WaterfallChart } from "@/components/dashboard/charts/svg-charts";
import { SecHeader, Surf, Surf2, StatsSection } from "@/components/dashboard/stats-premium-ui";

const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

type RoiCardProps = {
  monthlyGainCad: number;
  acceptedCount: number;
  subscriptionCad: number;
};

type RoiState =
  | { kind: "no-data"; subscriptionCad: number }
  | {
      kind: "ready";
      monthlyGainCad: number;
      acceptedCount: number;
      subscriptionCad: number;
      ratio: number;
      netGainCad: number;
    };

function classify({ monthlyGainCad, acceptedCount, subscriptionCad }: RoiCardProps): RoiState {
  if (acceptedCount === 0 || monthlyGainCad <= 0) {
    return { kind: "no-data", subscriptionCad };
  }
  return {
    kind: "ready",
    monthlyGainCad,
    acceptedCount,
    subscriptionCad,
    ratio: monthlyGainCad / subscriptionCad,
    netGainCad: monthlyGainCad - subscriptionCad,
  };
}

export function RoiCard(props: RoiCardProps) {
  const state = classify(props);
  return (
    <StatsSection>
      <SecHeader
        num="02"
        kicker="RestoPrix · retour sur abonnement"
        title="Votre ROI sur 30 jours"
        subtitle="Marge additionnelle attribuée aux décisions RestoPrix après déduction de l'abonnement."
      />
      {state.kind === "no-data" ? <NoDataState subscriptionCad={state.subscriptionCad} /> : <ReadyState state={state} />}
    </StatsSection>
  );
}

function NoDataState({ subscriptionCad }: { subscriptionCad: number }) {
  return (
    <Surf className="border-dashed p-7">
      <p className="text-sm text-muted-foreground">
        Connectez votre menu et acceptez vos premières suggestions de prix pour calculer votre ROI.
      </p>
      <code className="mt-4 block rounded-lg border border-border bg-popover p-3 text-xs text-muted-foreground">
        ROI = somme(gain_mensuel des suggestions acceptées) / {cadFormatter.format(subscriptionCad)}
      </code>
    </Surf>
  );
}

function ReadyState({ state }: { state: Extract<RoiState, { kind: "ready" }> }) {
  const upliftPrice = state.monthlyGainCad * 0.65;
  const upliftMix = state.monthlyGainCad * 0.35;
  return (
    <Surf className="p-7">
      <div className="grid gap-7 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Marge additionnelle nette</p>
          <p className="mt-2 text-[54px] font-semibold leading-none tracking-[-0.03em] text-primary tabular-nums">
            + {cadFormatter.format(state.netGainCad)}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-[30px] italic text-foreground">{state.ratio.toFixed(1)}×</span>
            <span className="text-[13px] text-muted-foreground">multiplicateur sur abonnement</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Surf2 className="px-4 py-3">
              <p className="text-[11px] uppercase text-muted-foreground/90">Abonnement</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums">{cadFormatter.format(state.subscriptionCad)}</p>
            </Surf2>
            <Surf2 className="px-4 py-3">
              <p className="text-[11px] uppercase text-muted-foreground/90">Suggestions</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums">{state.acceptedCount}</p>
            </Surf2>
          </div>
        </div>
        <div className="lg:col-span-7">
          <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/90">Décomposition · waterfall</p>
          <WaterfallChart
            values={[upliftPrice, upliftMix, -state.subscriptionCad, state.netGainCad]}
            labels={["Prix", "Mix", "Abo", "Net 30j"]}
          />
        </div>
      </div>
    </Surf>
  );
}
