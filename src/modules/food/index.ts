// ═══════════════════════════════════════════════════════════
// MODULE BELLA'FOOD — Point d'entrée
// BellaiaApp.tsx importe FoodF via FoodWrapper (dynamic import)
// ═══════════════════════════════════════════════════════════

export { default } from "./FoodF";

export type {
  Produit, Recette, Ingredient, StockItem, Materiel, Consommable,
  CommandeFood, ResultatCalculateur, CategorieRecette, StatutCommande,
} from "./foodTypes";

export {
  FOOD_CATALOGUE, FOOD_CATEGORIES, FOOD_COLORS, FOOD_RECETTES_INIT,
  FOOD_STOCK_INIT, FOOD_MATERIEL_INIT, FOOD_CONSOMMABLES_INIT,
} from "./foodConsts";

export {
  calculerPrix, calculerCoutRecette, rechercherProduitsFood,
  getProduitsVisiblesEvents, genererListeCourses, getAlerteStock,
  fmtPrix, fmtDuree,
} from "./foodUtils";

// Liaison Bella'Events : liste des produits Food visibles depuis Events
export { getProduitsVisiblesEvents as getFoodPourEvents } from "./foodUtils";
