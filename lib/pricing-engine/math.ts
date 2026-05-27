export type PricingProfile = "dominant" | "securitaire" | "chasseur";

export type PricingEngineDefaults = {
  // Frais POS & TVA (Québec restauration)
  tvaQcDivisor: number; // TPS 5% + TVQ 9.975% => TTC / 1.14975
  tauxPOS: number; // part variable PayFacto
  fraisFixePOS: number; // part fixe PayFacto

  // Main d'oeuvre (batch cooking)
  tauxHoraire: number;
  tempsBatchHours: number;
  portionsBatch: number;
  economieBatch: number; // 0-0.5
  occupationCuisine: number; // 1.0 normal, 1.2 rush

  // Fixes mensuels (loyer, énergie, etc.)
  totalFixesMensuel: number;

  // Estimation coût matière si données recettes/factures manquantes.
  // Hypothèse simple : PlatCost = PrixNet * foodCostPct.
  foodCostPctDefault: number; // 0-1
  foodCostPctByCategoryKeyword: Array<{ keyword: RegExp; pct: number }>;
};

export const DEFAULT_PRICING_ENGINE: PricingEngineDefaults = {
  tvaQcDivisor: 1.14975,
  tauxPOS: 0.026,
  fraisFixePOS: 0.1,

  // Valeurs prudentes (au lieu de paramètres utilisateurs non encore implémentés)
  tauxHoraire: 18,
  tempsBatchHours: 0.25,
  portionsBatch: 1,
  economieBatch: 0.1,
  occupationCuisine: 1.0,

  totalFixesMensuel: 1000,

  foodCostPctDefault: 0.35,
  foodCostPctByCategoryKeyword: [
    { keyword: /viande|steak|bœuf|porc|agneau/iu, pct: 0.38 },
    { keyword: /poisson|fruits.?de.?mer|saumon|crevette|cabillaud/iu, pct: 0.37 },
    { keyword: /volaille|poulet|dinde/iu, pct: 0.34 },
    { keyword: /légume|legume|herbe|salade/iu, pct: 0.26 },
    { keyword: /dessert|gateau|tarte/iu, pct: 0.32 },
    { keyword: /sauce|cr%C3%A8me|creme/iu, pct: 0.28 },
  ],
};

export type PrixNetResult = {
  prixHT: number;
  fraisPOS: number;
  prixNet: number;
};

export function computePrixNet(prixTTC: number, defaults: PricingEngineDefaults): PrixNetResult {
  const prixHT = prixTTC / defaults.tvaQcDivisor;
  const fraisPOS = prixTTC * defaults.tauxPOS + defaults.fraisFixePOS;
  const prixNet = prixHT - fraisPOS;
  return { prixHT, fraisPOS, prixNet };
}

export function estimateFoodCostPctByCategory(category: string, defaults: PricingEngineDefaults): number {
  const normalized = category.trim();
  for (const entry of defaults.foodCostPctByCategoryKeyword) {
    if (entry.keyword.test(normalized)) {
      return entry.pct;
    }
  }
  return defaults.foodCostPctDefault;
}

export type MoResult = {
  tempsUnitHours: number;
  facteurEchelle: number;
  moCad: number;
};

export function computeMo(defaults: PricingEngineDefaults): MoResult {
  const portionsBatch = Math.max(1, defaults.portionsBatch);
  const tempsUnitHours = defaults.tempsBatchHours / portionsBatch;
  const facteurEchelle = Math.max(
    0.6,
    1 - defaults.economieBatch * Math.log10(portionsBatch),
  );
  const moCad =
    defaults.tauxHoraire * tempsUnitHours * defaults.occupationCuisine * facteurEchelle;
  return { tempsUnitHours, facteurEchelle, moCad };
}

export type FixesResult = {
  fixeMoyenne: number;
  moyenneVolumeTousPlats: number;
  facteurCharge: number; // 0.5-3.0
  fixeCad: number;
};

export function computeFixeByVolume(args: {
  totalFixesMensuel: number;
  totalPlatsVendusMois: number;
  volumePlat: number;
  moyenneVolumeTousPlats: number;
}): FixesResult {
  const { totalFixesMensuel, totalPlatsVendusMois, volumePlat, moyenneVolumeTousPlats } = args;
  if (totalPlatsVendusMois <= 0 || !Number.isFinite(totalPlatsVendusMois)) {
    return {
      fixeMoyenne: 0,
      moyenneVolumeTousPlats: Math.max(0, moyenneVolumeTousPlats),
      facteurCharge: 1,
      fixeCad: 0,
    };
  }

  const fixeMoyenne = totalFixesMensuel / totalPlatsVendusMois;
  const safeVolumePlat = Math.max(0.000001, volumePlat);
  const partVolumePlat = safeVolumePlat / Math.max(0.000001, moyenneVolumeTousPlats);
  const facteurCharge = Math.max(0.5, Math.min(3.0, 1 / partVolumePlat));
  const fixeCad = fixeMoyenne * facteurCharge;
  return { fixeMoyenne, moyenneVolumeTousPlats, facteurCharge, fixeCad };
}

export type IRRResult = {
  irrPct: number;
  verdict: "rentable" | "surveillance" | "marge_faible" | "perte";
};

export function irrVerdict(irrPct: number): IRRResult["verdict"] {
  if (irrPct >= 65) return "rentable";
  if (irrPct >= 45) return "surveillance";
  if (irrPct >= 30) return "marge_faible";
  return "perte";
}

export function computeIrr(args: {
  prixNet: number;
  platCostCad: number;
  moCad: number;
  fixeCad: number;
}): IRRResult {
  const { prixNet, platCostCad, moCad, fixeCad } = args;
  const denom = Math.max(0.000001, prixNet);
  const irrPct = ((prixNet - platCostCad - moCad - fixeCad) / denom) * 100;
  return { irrPct, verdict: irrVerdict(irrPct) };
}

