// ═══════════════════════════════════════════════════════════
// MODULE CORE BELLAÏA — LOT V ERP Central
// Point d'entrée unique — exports types, API, composants
// src/modules/core/index.ts
// ═══════════════════════════════════════════════════════════


// ── Design tokens ──────────────────────────────────────────
export { BELLAÏA_COLORS, FC, SA, FS, INP_STYLE, BELLAÏA_FONTS } from "./coreDesign";
// ── Types transverses ──────────────────────────────────────
export type {
  BusinessUnit, StatutProduit,
  CatalogueProduit, CatalogueOption, CatalogueVariante,
  EtapeConfigurateur, ConfigurationProduit,
  StockGlobal, MouvementStock, ReservationStock,
  CategorieStock, NiveauAlerteStock,
  EtapeWorkflow, StatutFacture, StatutPaiement,
  ModePaiement, ModelivraIson, LigneFacture,
  Facture, Paiement, Livraison,
  FournisseurCentral,
} from "./coreTypes";

export { CONFIGURATEUR_STEPS } from "./coreTypes";

// ── API Supabase central ───────────────────────────────────
export {
  getCatalogueProduits,
  creerProduitCatalogue,
  majProduitCatalogue,
  getStockGlobal,
  majStockGlobal,
  reserverStock,
  libererReservations,
  creerFacture,
  getFactures,
  enregistrerPaiement,
} from "./coreApi";

// ── Composants ─────────────────────────────────────────────
export { default as CatalogueAdmin }      from "./CatalogueAdmin";
export { default as ProductConfigurator } from "./ProductConfigurator";
export { default as BellaiaStocks }       from "./BellaiaStocks";
