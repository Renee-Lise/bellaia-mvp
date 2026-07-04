// ═══════════════════════════════════════════════════════════
// TYPES — Module Bella'Food
// ═══════════════════════════════════════════════════════════

export type CategorieRecette =
  | "patisserie" | "boisson" | "glace" | "plat" | "dessert"
  | "sauce" | "accompagnement" | "buffet" | "jus" | "smoothie";

export type StatutRecette = "testee" | "validee" | "a_ameliorer" | "archivee";

export type EtatMateriel = "neuf" | "bon" | "a_remplacer" | "manquant";
export type PrioriteAchat = "urgent" | "utile" | "plus_tard";

export type StatutStock = "disponible" | "faible" | "rupture";
export type UniteMesure = "g" | "kg" | "ml" | "L" | "piece" | "boite" | "sachet";

export type StatutCommande =
  | "demande_recue" | "devis_envoye" | "acompte_recu"
  | "confirme" | "en_production" | "pret" | "livre" | "annule";

export interface Ingredient {
  id: string;
  nom: string;
  quantite: number;
  unite: UniteMesure;
  coutUnitaire?: number;
  coutTotal?: number;
  allergene?: boolean;
}

export interface Recette {
  id: string;
  nom: string;
  categorie: CategorieRecette;
  sousCat?: string;
  ingredients: Ingredient[];
  epices?: string[];
  proteines?: string[];
  accompagnements?: string[];
  tempsPrepa: number;    // minutes
  tempsCuisson: number;  // minutes
  tempsRepos?: number;   // minutes
  difficulte: 1 | 2 | 3 | 4 | 5;
  nbParts: number;
  coutMatiere?: number;
  coutConsommables?: number;
  prixConseille?: number;
  margeEstimee?: number;
  allergenes?: string[];
  conservation?: string;
  etapes: string[];
  photo?: string;
  lienSource?: string;
  notes?: string;
  statut: StatutRecette;
  // Pâtisserie spécifique
  diametre?: string;
  base?: string;
  creme?: string;
  ganache?: string;
  insert?: string;
  topping?: string;
  theme?: string;
  supplemet?: number;
}

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
  // Liaison Events
  visibleEvents?: boolean;
}

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
  dateAchat?: string;
  dlc?: string;
  notes?: string;
}

export interface Materiel {
  id: string;
  nom: string;
  categorie: string;
  qteDispo: number;
  etat: EtatMateriel;
  prixAchat?: number;
  fournisseur?: string;
  utilite?: string;
  recettesAssociees?: string[];
  priorite: PrioriteAchat;
  notes?: string;
}

export interface Consommable {
  id: string;
  nom: string;
  categorie: string;
  qteDispo: number;
  qteParProduit?: number;
  prixAchat?: number;
  coutUnitaire?: number;
  fournisseur?: string;
  seuilAlerte: number;
  statut: StatutStock;
  notes?: string;
}

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
