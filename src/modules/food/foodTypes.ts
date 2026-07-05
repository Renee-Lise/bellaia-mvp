// ═══════════════════════════════════════════════════════════
// TYPES — Module Bella'Food — Partie I (fondations complètes)
// ═══════════════════════════════════════════════════════════

// ── Enums de base ──────────────────────────────────────────
export type CategorieRecette =
  | "entree" | "soupe" | "salade" | "viande" | "poisson" | "fruits_de_mer"
  | "poulet" | "boeuf" | "agneau" | "accompagnement" | "riz" | "pates"
  | "burger" | "sandwich" | "street_food" | "sauce"
  | "dessert" | "glace" | "patisserie" | "cake" | "cupcake" | "entremet"
  | "macaron" | "viennoiserie" | "pain" | "brunch"
  | "boisson" | "cocktail" | "mocktail" | "jus" | "smoothie" | "the_glace"
  | "buffet" | "traiteur" | "repas_creole" | "repas_guyanais"
  | "mariage" | "baby_shower" | "anniversaire" | "autre";

export type StatutRecette =
  | "brouillon" | "testee" | "validee" | "a_ameliorer" | "archivee";

export type StatutImport =
  | "brouillon" | "en_cours" | "complete" | "a_verifier" | "valide";

export type SourceImport =
  | "photo" | "capture_ecran" | "pdf" | "document" | "texte"
  | "video" | "pinterest" | "instagram" | "facebook" | "tiktok"
  | "lien" | "manuel" | "ia";

export type EtatMateriel = "neuf" | "bon" | "a_remplacer" | "manquant";
export type PrioriteAchat = "urgent" | "utile" | "plus_tard";
export type StatutStock = "disponible" | "faible" | "rupture";

export type UniteMesure =
  | "g" | "kg" | "mg"
  | "ml" | "L" | "cl"
  | "piece" | "unite" | "tranche" | "bouquet"
  | "boite" | "sachet" | "pot" | "bouteille"
  | "cuillere_cafe" | "cuillere_soupe" | "tasse"
  | "pincee" | "goutte" | "portion";

export type StatutCommande =
  | "demande_recue" | "devis_envoye" | "acompte_recu"
  | "confirme" | "en_production" | "pret" | "livre" | "annule";

export type Saison = "printemps" | "ete" | "automne" | "hiver" | "toute_saison";

// ── Ingrédient ─────────────────────────────────────────────
export interface Ingredient {
  id: string;
  nom: string;
  quantite: number;
  unite: UniteMesure;
  coutUnitaire?: number;
  coutTotal?: number;
  allergene?: boolean;
  categorie?: string;
  notes?: string;
}

// ── Valeurs nutritionnelles ────────────────────────────────
export interface ValeursNutritionnelles {
  calories?: number;          // kcal / portion
  proteines?: number;         // g
  glucides?: number;          // g
  lipides?: number;           // g
  fibres?: number;            // g
  sel?: number;               // g
  sucres?: number;            // g
  source?: string;
}

// ── Recette complète ───────────────────────────────────────
export interface Recette {
  id: string;
  nom: string;

  // Médias
  photo?: string;
  galerie?: string[];         // URLs ou base64
  video?: string;

  // Classification
  categorie: CategorieRecette;
  sousCat?: string;
  tags?: string[];
  couleurDominante?: string;  // ex: "#c9a96e"
  saison?: Saison;
  feteAssociee?: string;      // "Noël", "Pâques", etc.
  paysOrigine?: string;
  langue?: string;            // "fr", "en", "ht"
  auteur?: string;

  // Temps
  tempsPrepa: number;         // minutes
  tempsCuisson: number;       // minutes
  tempsRepos?: number;        // minutes
  tempsTotal?: number;        // calculé automatiquement

  // Cuisson
  temperature?: number;       // °C
  modeCuisson?: string;       // "four", "vapeur", "friture", etc.

  // Composition
  difficulte: 1 | 2 | 3 | 4 | 5;
  nbParts: number;
  ingredients: Ingredient[];
  etapes: string[];
  astuces?: string[];
  variantes?: string[];
  accompagnements?: string[];
  allergenes?: string[];
  conservation?: string;

  // Nutrition
  nutritionnel?: ValeursNutritionnelles;

  // Pâtisserie spécifique
  diametre?: string;
  base?: string;
  creme?: string;
  ganache?: string;
  insert?: string;
  topping?: string;
  theme?: string;
  supplement?: number;

  // Économique
  coutMatiere?: number;
  coutConsommables?: number;
  prixRevient?: number;
  prixConseille?: number;
  prixPremium?: number;
  margeEstimee?: number;
  tempsProduction?: number;   // minutes de travail actif

  // Métadonnées
  statut: StatutRecette;
  dateImport?: string;
  source?: string;            // URL ou description de la source
  sourceType?: SourceImport;
  notes?: string;
  epices?: string[];
  proteines?: string[];
}

// ── Produit catalogue ──────────────────────────────────────
export interface Produit {
  id: string;
  nom: string;
  categorie: CategorieRecette;
  sousCat?: string;
  description?: string;
  prix: number | null;
  unite?: string;
  tempsPrepa?: number;
  tempsTotal?: number;
  recetteId?: string;
  disponible: boolean;
  photo?: string;
  allergenes?: string[];
  visibleEvents?: boolean;
  tags?: string[];
  notes?: string;
}

// ── Stock matières premières ───────────────────────────────
export interface StockItem {
  id: string;
  nom: string;
  categorie: string;
  fournisseur?: string;
  prixAchat?: number;
  qteAchetee?: number;
  unite: UniteMesure;
  prixUnitaire?: number;
  qteRestante: number;
  seuilAlerte: number;
  seuilCritique?: number;
  lot?: string;
  dateAchat?: string;
  dlc?: string;
  ddm?: string;
  historiquePrix?: { date: string; prix: number }[];
  notes?: string;
}

// ── Matériel ───────────────────────────────────────────────
export interface Materiel {
  id: string;
  nom: string;
  categorie: string;
  photo?: string;
  qteDispo: number;
  etat: EtatMateriel;
  prixAchat?: number;
  fournisseur?: string;
  dateAchat?: string;
  utilite?: string;
  recettesAssociees?: string[];
  priorite: PrioriteAchat;
  notes?: string;
}

// ── Consommable ────────────────────────────────────────────
export interface Consommable {
  id: string;
  nom: string;
  categorie: string;
  photo?: string;
  qteDispo: number;
  qteParProduit?: number;
  prixAchat?: number;
  coutUnitaire?: number;
  fournisseur?: string;
  seuilAlerte: number;
  seuilCritique?: number;
  statut: StatutStock;
  utilisation?: string;
  notes?: string;
}

// ── Import recette ─────────────────────────────────────────
export interface ImportRecette {
  id: string;
  source: SourceImport;
  urlSource?: string;
  contenuBrut?: string;
  statut: StatutImport;
  dateImport: string;
  recetteDetectee?: Partial<Recette>;
  champsDetectes?: string[];
  champsManquants?: string[];
  notes?: string;
}

// ── Ligne liste de courses ─────────────────────────────────
export interface LigneCourses {
  ingredientId: string;
  nom: string;
  quantiteNecessaire: number;
  quantiteEnStock: number;
  quantiteAacheter: number;
  unite: UniteMesure;
  prixEstime?: number;
  fournisseurSuggere?: string;
  recettes?: string[];        // noms des recettes concernées
}

// ── Commande Food ──────────────────────────────────────────
export interface CommandeFood {
  id: string;
  reference?: string;
  client: string;
  tel: string;
  dateCommande: string;
  dateLivraison?: string;
  produit: string;
  nbParts?: number;
  saveur?: string;
  theme?: string;
  options?: string;
  supplements?: string;
  allergies?: string;
  contraintesAlimentaires?: string;
  prixCalcule?: number;
  acompte?: number;
  solde?: number;
  paiement?: string;
  statut: StatutCommande;
  notes?: string;
}

// ── Calculateur ────────────────────────────────────────────
export interface ResultatCalculateur {
  coutMatiere: number;
  coutConsommables: number;
  coutEmballage: number;
  coutDecoration: number;
  coutMainOeuvre: number;
  coutLivraison: number;
  coutCharges: number;
  coutTotal: number;
  margeSouhaitee: number;
  supplement: number;
  remise: number;
  prixMinConseille: number;
  prixVenteConseille: number;
  margeBrute: number;
  tauxMarge: number;
  beneficeEstime: number;
  acompte: number;
  solde: number;
}
