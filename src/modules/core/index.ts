// ═══════════════════════════════════════════════════════════
// MODULE CORE BELLAÏA — Index complet — LOT V + VII
// src/modules/core/index.ts
// ═══════════════════════════════════════════════════════════

// ── Design tokens ──────────────────────────────────────────
export { BELLAÏA_COLORS, FC, SA, FS, INP_STYLE, BELLAÏA_FONTS } from "./coreDesign";

// ── Types transverses ──────────────────────────────────────
export type {
  // LOT V — Catalogue, Stock, Workflow
  BusinessUnit, StatutProduit,
  CatalogueProduit, CatalogueOption, CatalogueVariante,
  EtapeConfigurateur, ConfigurationProduit,
  StockGlobal, MouvementStock, ReservationStock,
  CategorieStock, NiveauAlerteStock,
  EtapeWorkflow, StatutFacture, StatutPaiement,
  ModePaiement, ModelivraIson, LigneFacture,
  Facture, Paiement, Livraison,
  FournisseurCentral,
  // LOT VII — CRM
  Client, StatutClient, Adresse, TypeAdresse,
  Contact, EntreeHistoriqueClient,
} from "./coreTypes";

export { CONFIGURATEUR_STEPS } from "./coreTypes";

// ── API Supabase central ───────────────────────────────────
export {
  // Catalogue
  getCatalogueProduits, creerProduitCatalogue, majProduitCatalogue,
  // Stock
  getStockGlobal, majStockGlobal, reserverStock, libererReservations,
  // Workflow commercial
  creerFacture, getFactures, enregistrerPaiement,
  // CRM LOT VII
  getClients, getClient, creerClient, majClient,
  rechercherOuCreerClient, getHistoriqueClient,
  ajouterAdresse, ajouterContact,
} from "./coreApi";

// ── Composants ─────────────────────────────────────────────
export { default as CatalogueAdmin }      from "./CatalogueAdmin";
export { default as ProductConfigurator } from "./ProductConfigurator";
export { default as BellaiaStocks }       from "./BellaiaStocks";
export { default as BellaWorkflowF }      from "./BellaWorkflowF";
export { default as ClientCenter }        from "./ClientCenter";
