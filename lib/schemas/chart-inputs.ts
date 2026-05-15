/**
 * Formes **agrégées** attendues en entrée des composants graphiques (Recharts, etc.).
 * Les données brutes viennent des schémas Zod / CSV / Supabase puis sont réduites côté serveur.
 */

/** Série temporelle — ventes POS (Square) déjà stockées par jour. */
export type SquareRevenueChartPoint = {
  day: string;
  netSales: number;
  grossSales: number;
  transactions: number;
  taxes: number;
};

/** Répartition des taxes déclarées sur les factures clients (IA). */
export type ClientInvoiceTaxMixPoint = {
  label: string;
  totalCad: number;
};

/** Menu : prix par catégorie (items onboarding). */
export type MenuCategoryChartPoint = {
  category: string;
  itemCount: number;
  avgPriceCad: number;
  minPriceCad: number;
  maxPriceCad: number;
};

/** Série temporelle — facturation clients (B2B), agrégée à partir des factures parsées. */
export type ClientInvoiceRevenueDailyPoint = {
  day: string;
  totalCad: number;
  invoiceCount: number;
};

/** Top clients — agrégation `client_name` normalisé. */
export type ClientInvoiceByClientPoint = {
  clientKey: string;
  totalCad: number;
  invoiceCount: number;
};

/** Mix des lignes de facture client (description / SKU). */
export type ClientInvoiceLineMixPoint = {
  label: string;
  totalCad: number;
  quantity: number;
};

/** Dépenses fournisseurs par jour (factures fournisseur parsées). */
export type SupplierSpendDailyPoint = {
  day: string;
  spendCad: number;
  documentCount: number;
};

/** Dépenses par catégorie produit (lignes fournisseur). */
export type SupplierCategoryMixPoint = {
  category: string;
  spendCad: number;
};

/** Coût matière théorique par plat (recettes + éventuellement prix d’achat). */
export type RecipeFoodCostByDishPoint = {
  dishKey: string;
  foodCostCad: number | null;
  portionCount: number | null;
};

/** Comparaison menu vs coût recette (jointure manuelle ou fuzzy sur noms). */
export type DishMarginBridgePoint = {
  dishKey: string;
  menuPriceCad: number | null;
  foodCostCad: number | null;
  marginCad: number | null;
  marginPct: number | null;
};

/** Distribution des prix menu par catégorie. */
export type MenuPriceHistogramBin = {
  category: string;
  minCad: number;
  maxCad: number;
  medianCad: number | null;
  itemCount: number;
};

/** Ventes par article (CSV Square détaillé). */
export type SquareItemSalesMixPoint = {
  item: string;
  category: string;
  netSalesCad: number;
  quantity: number;
};

/** ROI RestoPrix : suggestion acceptée → gain mensuel estimé. */
export type PricingRoiSummary = {
  totalMonthlyGainCad: number;
  acceptedCount: number;
  subscriptionCad: number;
};
