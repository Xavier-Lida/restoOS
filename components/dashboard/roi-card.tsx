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

const stateRenderers: Record<RoiState["kind"], (state: RoiState) => React.ReactNode> = {
  "no-data": (state) =>
    state.kind === "no-data" ? <NoDataState subscriptionCad={state.subscriptionCad} /> : null,
  ready: (state) => (state.kind === "ready" ? <ReadyState state={state} /> : null),
};

export function RoiCard(props: RoiCardProps) {
  const state = classify(props);
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">ROI RestoPrix</h2>
        <p className="text-sm text-muted-foreground">
          Gain mensuel estime des suggestions de prix acceptees, divise par le cout de l&apos;abonnement.
        </p>
      </header>
      {stateRenderers[state.kind](state)}
    </section>
  );
}

function NoDataState({ subscriptionCad }: { subscriptionCad: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-4">
      <p className="text-sm text-muted-foreground">
        Connecte ton menu et accepte tes premieres suggestions de prix pour calculer ton ROI.
      </p>
      <code className="rounded-md bg-muted/50 p-3 text-xs">
        ROI = somme(gain_mensuel des suggestions acceptees) / {cadFormatter.format(subscriptionCad)}
      </code>
    </div>
  );
}

function ReadyState({
  state,
}: {
  state: Extract<RoiState, { kind: "ready" }>;
}) {
  const ratioPct = Math.round(state.ratio * 100);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat
        label="Gain mensuel estime"
        value={cadFormatter.format(state.monthlyGainCad)}
      />
      <Stat
        label="Cout abonnement"
        value={cadFormatter.format(state.subscriptionCad)}
      />
      <Stat
        label="Gain net"
        value={cadFormatter.format(state.netGainCad)}
        accent={`x${ratioPct / 100} cout abonnement`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
      {accent ? <span className="text-xs text-muted-foreground">{accent}</span> : null}
    </div>
  );
}
