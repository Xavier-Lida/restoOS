import type { PricingProfile } from "@/lib/pricing-engine/math";
import { DEFAULT_PRICING_ENGINE } from "@/lib/pricing-engine/math";

export type F4ActionCode = "C1" | "C2" | "C3" | "O1" | "A1" | "GEL" | "NO_CHANGE";

export type F4Decision = {
  action: F4ActionCode;
  currentPriceCad: number;
  suggestedPriceCad: number | null;

  // Pour diagnostic UX
  plancherCad: number | null;
  plafondCad: number | null;
  prixCibleCad: number | null;
  prixFinalCad: number | null;
  irrPct: number;
  spmPct: number | null;
  marginVouluePct: number;
  refMarcheCad: number | null;
  nbAjustements28j: number;
};

export type F4Defaults = {
  margeMin: number; // pour plancher (1+margeMin)
  margeVoulue: number; // pour O1 et seuil IRR
  ecartChoisiChasseur: number; // 5/10/15%
  deltaMaxHaussePct: number; // +8%
  deltaMaxBaissePct: number; // -5%
  gelAjustements28j: number; // >=3
  irrMinPourSuggestion: number; // IRR < 30% => C2
};

const DEFAULT_F4: F4Defaults = {
  margeMin: 0.3,
  margeVoulue: 0.35,
  ecartChoisiChasseur: 0.1,
  deltaMaxHaussePct: 0.08,
  deltaMaxBaissePct: 0.05,
  gelAjustements28j: 3,
  irrMinPourSuggestion: 30,
};

function plafondMultiplier(profile: PricingProfile): number {
  switch (profile) {
    case "dominant":
      return 1.2;
    case "chasseur":
      return 0.95;
    case "securitaire":
      return 1.1;
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeF4Decision(args: {
  profile: PricingProfile;
  currentPriceCad: number;
  refMarcheCad: number | null;
  spmPct: number | null;
  platCostCad: number;
  moCad: number;
  fixeCad: number;
  irrPct: number;
  nbAjustements28j: number;
  costDeltaSupplierPct: number; // proxy pour C3 (0 si non disponible)
  defaults?: Partial<F4Defaults>;
}): F4Decision {
  const defaults: F4Defaults = { ...DEFAULT_F4, ...(args.defaults ?? {}) };

  const tva = DEFAULT_PRICING_ENGINE.tvaQcDivisor;
  const { profile } = args;
  const refMarcheCad = args.refMarcheCad ?? args.currentPriceCad;

  const composantCad = args.platCostCad + args.moCad + args.fixeCad;
  const plancherCad = composantCad * tva * (1 + defaults.margeMin);
  const plafondCad = refMarcheCad * plafondMultiplier(profile);

  if (!Number.isFinite(plancherCad) || !Number.isFinite(plafondCad) || plafondCad <= 0) {
    return {
      action: "C1",
      currentPriceCad: args.currentPriceCad,
      suggestedPriceCad: null,
      plancherCad,
      plafondCad,
      prixCibleCad: null,
      prixFinalCad: null,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  // C1 : plancher irrefraggable => si dépasse plafond, plat suspendu.
  if (plancherCad > plafondCad) {
    return {
      action: "C1",
      currentPriceCad: args.currentPriceCad,
      suggestedPriceCad: null,
      plancherCad: roundMoney(plancherCad),
      plafondCad: roundMoney(plafondCad),
      prixCibleCad: null,
      prixFinalCad: null,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  // C2 : perte réelle.
  if (args.irrPct < defaults.irrMinPourSuggestion) {
    return {
      action: "C2",
      currentPriceCad: args.currentPriceCad,
      suggestedPriceCad: null,
      plancherCad: roundMoney(plancherCad),
      plafondCad: roundMoney(plafondCad),
      prixCibleCad: null,
      prixFinalCad: null,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  // C3 : delta coût fournisseur (non disponible dans l’app actuelle => proxy = 0)
  if (args.costDeltaSupplierPct >= 0.15) {
    return {
      action: "C3",
      currentPriceCad: args.currentPriceCad,
      suggestedPriceCad: null,
      plancherCad: roundMoney(plancherCad),
      plafondCad: roundMoney(plafondCad),
      prixCibleCad: null,
      prixFinalCad: null,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  // Gel : trop d’ajustements récents.
  if (args.nbAjustements28j >= defaults.gelAjustements28j) {
    return {
      action: "GEL",
      currentPriceCad: args.currentPriceCad,
      suggestedPriceCad: args.currentPriceCad,
      plancherCad: roundMoney(plancherCad),
      plafondCad: roundMoney(plafondCad),
      prixCibleCad: null,
      prixFinalCad: args.currentPriceCad,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  // PrixCible selon profil.
  let prixCibleCad: number;
  switch (profile) {
    case "dominant":
      prixCibleCad = plafondCad * 0.98;
      break;
    case "securitaire":
      prixCibleCad = (composantCad / (1 - defaults.margeVoulue)) * tva;
      break;
    case "chasseur":
      prixCibleCad = refMarcheCad * (1 - defaults.ecartChoisiChasseur);
      break;
  }

  // O1 : opportunité silencieuse (notification, sans changement de prix).
  if (args.currentPriceCad < prixCibleCad && args.irrPct > defaults.margeVoulue * 100) {
    return {
      action: "O1",
      currentPriceCad: args.currentPriceCad,
      suggestedPriceCad: null,
      plancherCad: roundMoney(plancherCad),
      plafondCad: roundMoney(plafondCad),
      prixCibleCad: roundMoney(prixCibleCad),
      prixFinalCad: null,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  const deltaMaxHausse = args.currentPriceCad * defaults.deltaMaxHaussePct;
  const deltaMaxBaisse = args.currentPriceCad * defaults.deltaMaxBaissePct;

  const prixBorné = Math.max(
    args.currentPriceCad - deltaMaxBaisse,
    Math.min(args.currentPriceCad + deltaMaxHausse, prixCibleCad),
  );

  const prixFinalCad = Math.max(plancherCad, Math.min(plafondCad, prixBorné));
  const prixFinalArr = roundMoney(prixFinalCad);
  const courantArr = roundMoney(args.currentPriceCad);

  if (prixFinalArr === courantArr) {
    return {
      action: "NO_CHANGE",
      currentPriceCad: courantArr,
      suggestedPriceCad: courantArr,
      plancherCad: roundMoney(plancherCad),
      plafondCad: roundMoney(plafondCad),
      prixCibleCad: roundMoney(prixCibleCad),
      prixFinalCad: prixFinalArr,
      irrPct: args.irrPct,
      spmPct: args.spmPct,
      marginVouluePct: defaults.margeVoulue * 100,
      refMarcheCad,
      nbAjustements28j: args.nbAjustements28j,
    };
  }

  return {
    action: "A1",
    currentPriceCad: courantArr,
    suggestedPriceCad: prixFinalArr,
    plancherCad: roundMoney(plancherCad),
    plafondCad: roundMoney(plafondCad),
    prixCibleCad: roundMoney(prixCibleCad),
    prixFinalCad: prixFinalArr,
    irrPct: args.irrPct,
    spmPct: args.spmPct,
    marginVouluePct: defaults.margeVoulue * 100,
    refMarcheCad,
    nbAjustements28j: args.nbAjustements28j,
  };
}

