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

// ═══════════════════════════════════════════════════════════
// TYPES Partie II — Production & Gestion
// ═══════════════════════════════════════════════════════════

// ── Menu ────────────────────────────────────────────────────
export type TypeMenu =
  | "buffet" | "cocktail" | "brunch" | "anniversaire" | "mariage"
  | "communion" | "bapteme" | "baby_shower" | "repas_creole"
  | "repas_guyanais" | "repas_local" | "entreprise" | "enfant" | "premium";

export type StatutMenu = "brouillon" | "valide" | "archive";

export interface LigneMenu {
  produitId: string;
  nom: string;
  categorie: string;
  qte: number;
  unite: string;
  prixUnitaire: number | null;
  totalEstime: number | null;
}

export interface Menu {
  id: string;
  nom: string;
  type: TypeMenu;
  nbPersonnes: number;
  lignes: LigneMenu[];
  coutEstime?: number;
  prixEstime?: number;
  marge?: number;
  notes?: string;
  statut: StatutMenu;
  dateCreation: string;
}

// ── Planning de production ──────────────────────────────────
export type JourProduction = "J-3" | "J-2" | "J-1" | "JourJ";

export interface TacheProduction {
  id: string;
  jour: JourProduction;
  heure?: string;           // "08:00"
  description: string;
  dureeMin: number;         // minutes
  type: "preparation" | "repos" | "cuisson" | "refroidissement" | "montage" | "decoration" | "conditionnement" | "livraison" | "autre";
  recetteId?: string;
  materiel?: string[];
  ingredients?: { nom: string; quantite: number; unite: string }[];
  consommables?: string[];
  faite: boolean;
}

export interface PlanningProduction {
  id: string;
  commandeId: string;
  nomCommande: string;
  dateLivraison: string;
  taches: TacheProduction[];
  notesFondatrice?: string;
  alerte?: string;
}

// ── Devis Food ──────────────────────────────────────────────
export type StatutDevisFood =
  | "brouillon" | "envoye" | "accepte" | "refuse" | "expire" | "commande";

export interface LigneDevisFood {
  id: string;
  libelle: string;
  type: "produit" | "recette" | "menu" | "option" | "supplement" | "consommable" | "livraison" | "remise";
  qte: number;
  unite: string;
  prixUnitaire: number | null;
  total: number | null;
  source?: string;
  note?: string;
}

export interface DevisFood {
  id: string;
  reference: string;        // DEVF-2026-NNNN
  client: string;
  tel: string;
  email?: string;
  lignes: LigneDevisFood[];
  conditions: string;
  dateCreation: string;
  dateValidite: string;
  acomptePct: number;
  statut: StatutDevisFood;
  notes?: string;
  commandeId?: string;
}

// ── Critères de recherche recettes ──────────────────────────
export interface CriteresRecherche {
  texte?: string;
  categorie?: string;
  difficulteMax?: number;
  tempsMaxMin?: number;
  nbParts?: number;
  allergenes?: string[];     // à exclure
  saison?: string;
  motsCles?: string[];
  budgetMax?: number;
}

// ── Fiche exportable ────────────────────────────────────────
export type TypeFiche =
  | "cuisine" | "laboratoire" | "haccp" | "reseaux" | "impression";

// ═══════════════════════════════════════════════════════════
// TYPES Partie III — Production, Achats, HACCP, Alertes
// ═══════════════════════════════════════════════════════════

// ── Fournisseur ────────────────────────────────────────────
export interface Fournisseur {
  id: string;
  nom: string;
  logo?: string;
  tel?: string;
  email?: string;
  siteInternet?: string;
  adresse?: string;
  contact?: string;
  categoriesVendues?: string[];
  delaiMoyen?: number;          // jours
  minimumCommande?: number;     // €
  note?: number;                // /5
  notes?: string;
  actif: boolean;
  createdAt?: string;
}

// ── Achat ──────────────────────────────────────────────────
export type StatutAchat =
  | "brouillon" | "envoye" | "confirme" | "recu" | "annule";

export interface LigneAchat {
  id: string;
  produit: string;
  stockItemId?: string;
  categorie?: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  tva: number;           // % ex: 5.5 / 10 / 20
  totalHT: number;
  totalTTC: number;
}

export interface Achat {
  id: string;
  reference: string;     // ACH-2026-NNNN
  fournisseurId?: string;
  fournisseurNom: string;
  date: string;
  dateReception?: string;
  facture?: string;      // référence facture
  categorie?: string;
  lignes: LigneAchat[];
  totalHT: number;
  totalTTC: number;
  statut: StatutAchat;
  observations?: string;
}

// ── Bon de commande fournisseur ────────────────────────────
export type StatutBonCommande =
  | "brouillon" | "envoye" | "confirme" | "recu" | "annule";

export interface BonCommandeFournisseur {
  id: string;
  reference: string;     // BCF-2026-NNNN
  fournisseurId?: string;
  fournisseurNom: string;
  date: string;
  lignes: LigneAchat[];
  totalHT: number;
  statut: StatutBonCommande;
  notes?: string;
}

// ── Inventaire ─────────────────────────────────────────────
export interface LigneInventaire {
  stockItemId: string;
  nom: string;
  unite: string;
  stockTheorique: number;
  stockReel: number;
  ecart: number;
  justification?: string;
}

export interface Inventaire {
  id: string;
  date: string;
  type: "complet" | "tournant" | "ponctuel";
  operateur?: string;
  lignes: LigneInventaire[];
  statut: "en_cours" | "valide" | "archive";
  notes?: string;
}

// ── Lot ingredient ─────────────────────────────────────────
export interface Lot {
  id: string;
  stockItemId: string;
  nomIngredient: string;
  numeroLot: string;
  dlc?: string;
  ddm?: string;
  dateReception: string;
  dateOuverture?: string;
  dateFinUtilisation?: string;
  quantiteInitiale: number;
  quantiteRestante: number;
  unite: string;
  fournisseurId?: string;
  notes?: string;
}

// ── Production ─────────────────────────────────────────────
export type StatutProduction =
  | "prevue" | "en_preparation" | "cuisson" | "decoration" | "terminee" | "livree";

export interface LigneIngredientProduction {
  ingredientId: string;
  nom: string;
  quantite: number;
  unite: string;
  lotId?: string;
  numeroLot?: string;
}

export interface Production {
  id: string;
  numero: string;        // PROD-2026-NNNN
  recetteId?: string;
  recetteNom: string;
  date: string;
  operateur?: string;
  quantite: number;      // nombre de pièces / portions produites
  dureeMin?: number;
  materiel?: string[];
  ingredients: LigneIngredientProduction[];
  lotsUtilises?: string[];
  statut: StatutProduction;
  observations?: string;
  photos?: string[];
  commandeId?: string;
}

// ── HACCP ──────────────────────────────────────────────────
export interface RelevéTemperature {
  id: string;
  zone: "chambre_froide" | "congelateur" | "laboratoire" | "transport" | "autre";
  temperature: number;   // °C
  dateHeure: string;
  operateur: string;
  conforme: boolean;
  action?: string;       // action corrective si non conforme
}

export interface FicheNettoyage {
  id: string;
  zone: string;
  date: string;
  heure: string;
  operateur: string;
  produitUtilise?: string;
  valide: boolean;
  signature?: string;
  observations?: string;
}

export interface TraçabiliteProduit {
  id: string;
  productionId?: string;
  recetteNom: string;
  dateProduction: string;
  lotsIngredients: { lot: string; ingredient: string }[];
  operateur: string;
  temperatureCuisson?: number;
  temperatureConservation?: number;
  dlc?: string;
  observations?: string;
}

// ── Alerte ─────────────────────────────────────────────────
export type TypeAlerte =
  | "stock_faible" | "rupture" | "dlc_proche" | "ddm_proche"
  | "temperature" | "production_oubliee" | "commande_retard"
  | "fournisseur_retard" | "info";

export type NiveauAlerte = "critique" | "attention" | "info";

export interface Alerte {
  id: string;
  type: TypeAlerte;
  niveau: NiveauAlerte;
  titre: string;
  message: string;
  date: string;
  lue: boolean;
  entiteId?: string;     // id du stock, production, etc.
  entiteType?: string;   // "stock", "production", "commande"
}

// ═══════════════════════════════════════════════════════════
// TYPES Partie IV — Versions, Pertes, Analytics, Étiquettes
// ═══════════════════════════════════════════════════════════

// ── Version de recette ─────────────────────────────────────
export type TypeVersion =
  | "originale" | "economique" | "premium" | "evenementielle"
  | "sans_lactose" | "sans_gluten" | "enfant" | "grande_quantite"
  | "version_test" | "validee";

export interface VersionRecette {
  id: string;
  recetteId: string;
  recetteNom: string;
  typeVersion: TypeVersion;
  nomVersion: string;
  ingredients: Ingredient[];
  coutMatiere: number;
  coutConsommables: number;
  tempsProduction: number;    // minutes
  prixConseille: number | null;
  prixPremium: number | null;
  margeEstimee: number | null;
  notes?: string;
  statut: "brouillon" | "test" | "validee" | "archivee";
  dateCreation: string;
  dateValidation?: string;
}

// ── Production réelle ──────────────────────────────────────
export type StatutProductionReelle =
  | "prevue" | "en_cours" | "terminee" | "annulee" | "non_conforme";

export interface ProductionReelle {
  id: string;
  reference: string;         // PROD-2026-XXXXXX
  recetteId?: string;
  recetteNom: string;
  versionId?: string;
  versionNom?: string;
  quantitePrevue: number;
  quantiteReelle?: number;
  pertes?: number;
  operateur?: string;
  date: string;
  heureDebut?: string;
  heureFin?: string;
  dureeReelleMin?: number;
  lotsUtilises?: string[];
  materielUtilise?: string[];
  consommablesUtilises?: string[];
  observations?: string;
  statut: StatutProductionReelle;
  commandeId?: string;
}

// ── Perte ──────────────────────────────────────────────────
export type TypePerte =
  | "casse" | "erreur_production" | "produit_jete" | "dlc_depassee"
  | "ddm_depassee" | "perte_cuisson" | "perte_decoration"
  | "erreur_commande" | "retour_client" | "non_conformite";

export interface Perte {
  id: string;
  date: string;
  produit: string;
  recetteId?: string;
  quantite: number;
  unite: string;
  coutEstime: number;
  cause: TypePerte;
  description?: string;
  responsable?: string;
  photo?: string;
  actionCorrective?: string;
  statut: "ouverte" | "traitee" | "archivee";
}

// ── Étiquette produit ──────────────────────────────────────
export type FormatEtiquette =
  | "petit" | "moyen" | "boite" | "bouteille" | "pot_glace";

export type MentionEtiquette = "interne" | "client" | "livraison";

export interface Etiquette {
  id: string;
  nomProduit: string;
  dateFabrication: string;
  dlc?: string;
  ddm?: string;
  numerLot?: string;
  allergenes?: string[];
  ingredients?: string;
  poids?: string;
  volume?: string;
  conditionsConservation?: string;
  referenceProduction?: string;
  mention: MentionEtiquette;
  format: FormatEtiquette;
}

// ── Prévision d'achat ──────────────────────────────────────
export interface PrevisionAchat {
  ingredientId: string;
  nom: string;
  unite: string;
  quantiteNecessaire: number;
  quantiteEnStock: number;
  quantiteAacheter: number;
  urgence: "urgent" | "normal" | "bientot";
  fournisseurConseille?: string;
  prixEstime?: number;
  dateLimite?: string;
  raisons: string[];
}

// ── Recommandation commerciale ─────────────────────────────
export interface Recommandation {
  id: string;
  type: "mettre_en_avant" | "promotion" | "augmenter" | "eviter" | "pack";
  titre: string;
  description: string;
  produits?: string[];
  gainEstime?: number;
  priorite: "haute" | "moyenne" | "basse";
}
