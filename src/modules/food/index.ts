// ═══════════════════════════════════════════════════════════
// MODULE BELLA'FOOD — Index complet — Parties I + II + III + IV
// BellaiaApp.tsx importe FoodF via FoodWrapper (dynamic import)
// ═══════════════════════════════════════════════════════════

export { default } from "./FoodF";

// ── Types (toutes parties) ─────────────────────────────────
export type {
  // I & II
  Produit, Recette, Ingredient, StockItem, Materiel, Consommable,
  CommandeFood, ResultatCalculateur, LigneCourses, ImportRecette,
  CategorieRecette, StatutCommande, StatutRecette, SourceImport,
  UniteMesure, ValeursNutritionnelles, Saison,
  Menu, LigneMenu, TypeMenu, StatutMenu,
  TacheProduction, JourProduction, PlanningProduction,
  DevisFood, LigneDevisFood, StatutDevisFood,
  CriteresRecherche, TypeFiche,
  // III
  Fournisseur, Achat, LigneAchat, StatutAchat, BonCommandeFournisseur,
  LigneInventaire, Inventaire, Lot,
  Production, StatutProduction, LigneIngredientProduction,
  RelevéTemperature, FicheNettoyage, TraçabiliteProduit,
  Alerte, TypeAlerte, NiveauAlerte,
  // IV
  VersionRecette, TypeVersion,
  ProductionReelle, StatutProductionReelle,
  Perte, TypePerte,
  Etiquette, FormatEtiquette, MentionEtiquette,
  PrevisionAchat, Recommandation,
} from "./foodTypes";

// ── Constantes ─────────────────────────────────────────────
export {
  FOOD_CATALOGUE, FOOD_CATEGORIES, FOOD_COLORS,
  FOOD_RECETTES_INIT, FOOD_STOCK_INIT,
  FOOD_MATERIEL_INIT, FOOD_CONSOMMABLES_INIT,
  FOOD_FOURNISSEURS_INIT, HACCP_SEUILS, ALERTE_CONFIG,
} from "./foodConsts";

// ── Utilitaires ────────────────────────────────────────────
export {
  calculerPrix, calculerCoutRecette, calculerTempsTotal,
  rechercherProduitsFood, getProduitsVisiblesEvents,
  genererListeCourses, calculerBudgetCourses,
  getAlerteStock, fmtPrix, fmtDuree,
  analyserTexteRecette, exportCoursesWhatsApp,
  rechercherRecettes, genererPlanningProduction,
  genererFicheHTML, calculerTotauxDevis,
  calculerTotauxAchat, construireLigneAchat,
  genererAlertesStock, genererAlertesDLC, genBonCommandeHTML,
} from "./foodUtils";

// ── API Supabase ───────────────────────────────────────────
export {
  sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete,
  getRecettesFood, creerRecette, majRecette,
  getCommandesFood, creerCommande, majStatutCommande,
  getStocksFood, majStock, getMaterielFood, getConsommablesFood,
} from "./foodApi";

// ── Liaison Bella'Events ───────────────────────────────────
export { getProduitsVisiblesEvents as getFoodPourEvents } from "./foodUtils";
