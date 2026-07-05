// ═══════════════════════════════════════════════════════════
// MODULE BELLA'FOOD — Index — Partie I
// BellaiaApp.tsx importe FoodF via FoodWrapper (dynamic import)
// ═══════════════════════════════════════════════════════════

export { default } from "./FoodF";

// Types
export type {
  Produit, Recette, Ingredient, StockItem, Materiel, Consommable,
  CommandeFood, ResultatCalculateur, LigneCourses, ImportRecette,
  CategorieRecette, StatutCommande, StatutRecette, SourceImport,
  UniteMesure, ValeursNutritionnelles, Saison,
} from "./foodTypes";

// Constantes
export {
  FOOD_CATALOGUE, FOOD_CATEGORIES, FOOD_COLORS,
  FOOD_RECETTES_INIT, FOOD_STOCK_INIT,
  FOOD_MATERIEL_INIT, FOOD_CONSOMMABLES_INIT,
} from "./foodConsts";

// Utilitaires
export {
  calculerPrix, calculerCoutRecette, calculerTempsTotal,
  rechercherProduitsFood, getProduitsVisiblesEvents,
  genererListeCourses, calculerBudgetCourses,
  getAlerteStock, fmtPrix, fmtDuree,
  analyserTexteRecette, exportCoursesWhatsApp,
} from "./foodUtils";

// API Supabase
export {
  sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete,
  getRecettesFood, creerRecette, majRecette,
  getCommandesFood, creerCommande, majStatutCommande,
  getStocksFood, majStock, getMaterielFood, getConsommablesFood,
} from "./foodApi";

// Liaison Bella'Events
export { getProduitsVisiblesEvents as getFoodPourEvents } from "./foodUtils";
