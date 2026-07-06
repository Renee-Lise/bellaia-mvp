// ═══════════════════════════════════════════════════════════
// Types transverses Bellaïa — LOT V ERP Central
// Partagés par tous les modules : Food, Events, BSH, Odyssée
// src/modules/core/coreTypes.ts
// ═══════════════════════════════════════════════════════════

// ── Business units ─────────────────────────────────────────
export type BusinessUnit =
  | "FOOD" | "EVENTS" | "BSH" | "ODYSSEE" | "STRUCTURE" | "INVEST" | "GENERAL";

// ── Catalogue produit central ──────────────────────────────
export type StatutProduit = "actif" | "brouillon" | "archive" | "rupture";

export interface CatalogueOption {
  id: string;
  groupe: string;        // 'saveur'|'forme'|'decoration'|'taille'|...
  libelle: string;
  supplement: number;    // € ajouté au prix
  deltaTempMin: number;  // minutes supplémentaires
  disponible: boolean;
  ordre: number;
}

export interface CatalogueVariante {
  id: string;
  nom: string;           // 'Pour 10 personnes', '2 étages', ...
  sku?: string;
  prix?: number;
  cout?: number;
  stock?: number;
  attributs?: Record<string, string>;   // {taille:"L", couleur:"rose"}
  disponible: boolean;
}

export interface CatalogueProduit {
  id: string;
  reference?: string;
  businessUnit: BusinessUnit;
  categorieId?: string;
  categorieSlug?: string;
  sousCategorie?: string;
  nom: string;
  descriptionCourte?: string;
  descriptionLongue?: string;
  galeriePhotos?: string[];
  videos?: string[];
  prix: number | null;
  prixPromotion?: number | null;
  coutRevient?: number | null;
  tva?: number;
  unite?: string;
  dureeMin?: number;
  tempsPreparation?: number;
  tempsProduction?: number;
  marge?: number | null;
  tauxMarge?: number | null;
  visibleClient: boolean;
  disponible: boolean;
  statut: StatutProduit;
  tags?: string[];
  allergenes?: string[];
  metadata?: Record<string, unknown>;
  options?: CatalogueOption[];
  variantes?: CatalogueVariante[];
  ordre?: number;
}

// ── Configuration produit (configurateur client) ────────────
export interface EtapeConfigurateur {
  id: string;
  groupe: string;
  label: string;
  type: "select" | "multiselect" | "number" | "text" | "toggle";
  options?: CatalogueOption[];
  obligatoire?: boolean;
  description?: string;
  imageUrl?: string;
}

export interface ConfigurationProduit {
  produitId: string;
  variante?: string;
  options: Record<string, string | string[] | number>;
  prixTotal: number;
  coutEstime: number;
  tempsTotal: number;
  nbPersonnes?: number;
  commentaire?: string;
}

// ── Stock central ──────────────────────────────────────────
export type CategorieStock =
  | "matieres_premieres" | "produits_finis" | "consommables"
  | "emballages" | "materiel" | "mobilier" | "decoration"
  | "papeterie" | "lingerie" | "parfums" | "cosmetiques"
  | "accessoires" | "informatique" | "autre";

export type NiveauAlerteStock = "ok" | "alerte" | "critique" | "rupture";

export interface StockGlobal {
  id: string;
  businessUnit: BusinessUnit;
  reference?: string;
  nom: string;
  categorie: CategorieStock;
  sousCategorie?: string;
  unite: string;
  fournisseurNom?: string;
  prixAchat?: number;
  prixMoyen?: number;
  stockActuel: number;
  stockReserve: number;
  stockDisponible: number;   // calculé : actuel - réservé
  stockMin: number;
  seuilCritique?: number;
  emplacement?: string;
  dlc?: string;
  ddm?: string;
  notes?: string;
  actif: boolean;
  niveauAlerte?: NiveauAlerteStock;
}

export interface MouvementStock {
  id: string;
  stockItemId: string;
  type: "entree" | "sortie" | "ajustement" | "reservation" | "liberation" | "perte";
  quantite: number;
  motif?: string;
  sourceTable?: string;
  sourceId?: string;
  operateur?: string;
  date: string;
}

export interface ReservationStock {
  id: string;
  stockItemId: string;
  quantite: number;
  sourceTable: string;
  sourceId: string;
  statut: "active" | "liberee" | "consommee";
  dateReserve: string;
  dateExpiry?: string;
}

// ── Workflow commercial unifié ─────────────────────────────
export type EtapeWorkflow =
  | "catalogue" | "simulation" | "devis" | "commande"
  | "production" | "facture" | "paiement" | "livraison" | "cloture";

export type StatutFacture =
  | "brouillon" | "emise" | "envoyee"
  | "partiellement_payee" | "payee" | "annulee";

export type StatutPaiement =
  | "en_attente" | "confirme" | "rembourse" | "echoue";

export type ModePaiement =
  | "especes" | "virement" | "sumup" | "paypal" | "cheque" | "en_ligne";

export type ModelivraIson = "retrait" | "livraison" | "evenement";

export interface LigneFacture {
  libelle: string;
  description?: string;
  qte: number;
  unite?: string;
  prixUnitaire: number;
  tva?: number;
  total: number;
  sourceModule?: BusinessUnit;
}

export interface Facture {
  id: string;
  reference: string;          // FAC-YYYY-XXXXXX
  businessUnit: BusinessUnit;
  commandeId?: string;
  sourceTable?: string;
  clientNom: string;
  clientTel?: string;
  clientEmail?: string;
  lignes: LigneFacture[];
  sousTotal: number;
  tvaTotal?: number;
  totalTTC: number;
  acompte: number;
  acomptePaye: boolean;
  solde: number;
  statut: StatutFacture;
  dateEmission: string;
  dateEcheance?: string;
  notes?: string;
}

export interface Paiement {
  id: string;
  reference: string;          // PAY-YYYY-XXXXXX
  factureId?: string;
  businessUnit: BusinessUnit;
  montant: number;
  mode?: ModePaiement;
  statut: StatutPaiement;
  datePaiement?: string;
  referenceExt?: string;      // ref SumUp/PayPal
  notes?: string;
}

export interface Livraison {
  id: string;
  reference: string;          // LIV-YYYY-XXXXXX
  factureId?: string;
  businessUnit: BusinessUnit;
  mode: ModelivraIson;
  adresse?: string;
  datePrevue?: string;
  heurePrevue?: string;
  statut: "planifiee" | "en_route" | "livree" | "echec";
  notes?: string;
}

// ── Fournisseur central ────────────────────────────────────
export interface FournisseurCentral {
  id: string;
  nom: string;
  businessUnits: BusinessUnit[];
  tel?: string;
  email?: string;
  site?: string;
  adresse?: string;
  contact?: string;
  categories?: string[];
  delaiMoyen?: number;
  minimumCommande?: number;
  note?: number;
  notes?: string;
  actif: boolean;
}

// ── Étape du configurateur par catégorie produit ───────────
export const CONFIGURATEUR_STEPS: Record<string, EtapeConfigurateur[]> = {
  layer_cake: [
    {id:"forme",     groupe:"forme",     label:"Forme",           type:"select",
     options:[
       {id:"o_ronde",   groupe:"forme", libelle:"Ronde",           supplement:0,   deltaTempMin:0,  disponible:true, ordre:1},
       {id:"o_carree",  groupe:"forme", libelle:"Carrée",          supplement:5,   deltaTempMin:15, disponible:true, ordre:2},
       {id:"o_coeur",   groupe:"forme", libelle:"Cœur",            supplement:10,  deltaTempMin:20, disponible:true, ordre:3},
       {id:"o_guyane",  groupe:"forme", libelle:"Carte de Guyane", supplement:15,  deltaTempMin:30, disponible:true, ordre:4},
       {id:"o_chiffre", groupe:"forme", libelle:"Chiffre",         supplement:20,  deltaTempMin:30, disponible:true, ordre:5},
     ], obligatoire:true},
    {id:"etages",    groupe:"etages",    label:"Nombre d'étages", type:"select",
     options:[
       {id:"e1",groupe:"etages",libelle:"1 étage",  supplement:0,  deltaTempMin:0,  disponible:true,ordre:1},
       {id:"e2",groupe:"etages",libelle:"2 étages", supplement:15, deltaTempMin:30, disponible:true,ordre:2},
       {id:"e3",groupe:"etages",libelle:"3 étages", supplement:30, deltaTempMin:60, disponible:true,ordre:3},
     ], obligatoire:true},
    {id:"parts",     groupe:"parts",     label:"Nombre de parts", type:"number",  obligatoire:true},
    {id:"saveur",    groupe:"saveur",    label:"Saveur principale",type:"select",
     options:[
       {id:"sv_van", groupe:"saveur",libelle:"Vanille",             supplement:0,  deltaTempMin:0, disponible:true,ordre:1},
       {id:"sv_cho", groupe:"saveur",libelle:"Chocolat",            supplement:0,  deltaTempMin:0, disponible:true,ordre:2},
       {id:"sv_fraise",groupe:"saveur",libelle:"Fraise",            supplement:3,  deltaTempMin:0, disponible:true,ordre:3},
       {id:"sv_coco",  groupe:"saveur",libelle:"Noix de coco",      supplement:3,  deltaTempMin:0, disponible:true,ordre:4},
       {id:"sv_citron",groupe:"saveur",libelle:"Citron",            supplement:3,  deltaTempMin:0, disponible:true,ordre:5},
       {id:"sv_mango", groupe:"saveur",libelle:"Mangue-passion",    supplement:5,  deltaTempMin:0, disponible:true,ordre:6},
       {id:"sv_sg",    groupe:"saveur",libelle:"Sans gluten (+sup)",supplement:8,  deltaTempMin:15,disponible:true,ordre:7},
       {id:"sv_sl",    groupe:"saveur",libelle:"Sans lactose (+sup)",supplement:8, deltaTempMin:15,disponible:true,ordre:8},
     ], obligatoire:true},
    {id:"fourrage",  groupe:"fourrage",  label:"Fourrage",         type:"select",
     options:[
       {id:"f_van",  groupe:"fourrage",libelle:"Crème vanille",     supplement:0, deltaTempMin:0, disponible:true,ordre:1},
       {id:"f_cho",  groupe:"fourrage",libelle:"Ganache chocolat",  supplement:0, deltaTempMin:0, disponible:true,ordre:2},
       {id:"f_frs",  groupe:"fourrage",libelle:"Coulis fraise",     supplement:3, deltaTempMin:0, disponible:true,ordre:3},
       {id:"f_nut",  groupe:"fourrage",libelle:"Nutella",           supplement:3, deltaTempMin:0, disponible:true,ordre:4},
       {id:"f_coco", groupe:"fourrage",libelle:"Coco-passion",      supplement:5, deltaTempMin:0, disponible:true,ordre:5},
     ]},
    {id:"decoration",groupe:"decoration",label:"Décoration",       type:"select",
     options:[
       {id:"d_sim", groupe:"decoration",libelle:"Simple (lissage)",       supplement:0,  deltaTempMin:0,  disponible:true,ordre:1},
       {id:"d_flo", groupe:"decoration",libelle:"Fleurs en sucre",        supplement:15, deltaTempMin:30, disponible:true,ordre:2},
       {id:"d_top", groupe:"decoration",libelle:"Cake topper personnalisé",supplement:10,deltaTempMin:0,  disponible:true,ordre:3},
       {id:"d_per", groupe:"decoration",libelle:"Personnage en sucre",    supplement:25, deltaTempMin:60, disponible:true,ordre:4},
       {id:"d_cpt", groupe:"decoration",libelle:"Décoration complète",    supplement:35, deltaTempMin:90, disponible:true,ordre:5},
     ], obligatoire:true},
    {id:"texte",     groupe:"texte",     label:"Texte sur le gâteau",type:"text"},
    {id:"couleurs",  groupe:"couleurs",  label:"Couleurs souhaitées",type:"text",
     description:"Ex: rose, doré, blanc, thème tropical..."},
    {id:"livraison", groupe:"livraison", label:"Mode de récupération",type:"select",
     options:[
       {id:"l_ret",groupe:"livraison",libelle:"Retrait à Sinnamary",    supplement:0,  deltaTempMin:0, disponible:true,ordre:1},
       {id:"l_liv",groupe:"livraison",libelle:"Livraison (supplément)", supplement:10, deltaTempMin:0, disponible:true,ordre:2},
     ], obligatoire:true},
  ],
  decoration_evenement: [
    {id:"type_deco",  groupe:"type_deco",  label:"Type de décoration", type:"select",
     options:[
       {id:"d_arche",   groupe:"type_deco",libelle:"Arche de ballons",    supplement:0,  deltaTempMin:120,disponible:true,ordre:1},
       {id:"d_table",   groupe:"type_deco",libelle:"Décoration de table", supplement:0,  deltaTempMin:60, disponible:true,ordre:2},
       {id:"d_fond",    groupe:"type_deco",libelle:"Fond de table",        supplement:0,  deltaTempMin:90, disponible:true,ordre:3},
       {id:"d_complete",groupe:"type_deco",libelle:"Décoration complète",  supplement:50, deltaTempMin:240,disponible:true,ordre:4},
     ], obligatoire:true},
    {id:"nb_couleurs",groupe:"nb_couleurs",label:"Nombre de couleurs",   type:"select",
     options:[
       {id:"c1",groupe:"nb_couleurs",libelle:"1 couleur",   supplement:0,  deltaTempMin:0, disponible:true,ordre:1},
       {id:"c2",groupe:"nb_couleurs",libelle:"2 couleurs",  supplement:5,  deltaTempMin:0, disponible:true,ordre:2},
       {id:"c3",groupe:"nb_couleurs",libelle:"3 couleurs+", supplement:10, deltaTempMin:15,disponible:true,ordre:3},
     ]},
    {id:"installation",groupe:"installation",label:"Installation sur site",type:"toggle"},
    {id:"desinstall", groupe:"desinstall",  label:"Désinstallation",       type:"toggle"},
    {id:"dimensions", groupe:"dimensions",  label:"Dimensions souhaitées", type:"text",
     description:"Ex: arche 2m, fond de table 3m..."},
    {id:"livraison",  groupe:"livraison",   label:"Livraison matériel",    type:"select",
     options:[
       {id:"l_ret",groupe:"livraison",libelle:"À récupérer",     supplement:0, deltaTempMin:0, disponible:true,ordre:1},
       {id:"l_liv",groupe:"livraison",libelle:"Livré sur place", supplement:15,deltaTempMin:0, disponible:true,ordre:2},
     ]},
  ],
};

// ═══════════════════════════════════════════════════════════
// TYPES LOT VII — CRM Central Bellaïa
// ═══════════════════════════════════════════════════════════

// ── Client central ─────────────────────────────────────────
export type StatutClient = "actif" | "inactif" | "archive";

export interface Client {
  id: string;
  reference?: string;           // CLI-2026-XXXXXX
  nom: string;
  prenom?: string;
  societe?: string;
  telephone?: string;
  email?: string;
  whatsapp?: string;
  dateNaissance?: string;       // YYYY-MM-DD
  tags?: string[];
  notes?: string;
  rgpdOk?: boolean;
  rgpdDate?: string;
  consentements?: Record<string, boolean>;  // {email:true, sms:false}
  preferences?: {
    allergenes?: string[];
    saveurs?: string[];
    couleurs?: string[];
    notes?: string;
  };
  businessUnits?: BusinessUnit[];
  statut: StatutClient;
  adresses?: Adresse[];
  contacts?: Contact[];
}

// ── Adresse ────────────────────────────────────────────────
export type TypeAdresse = "domicile" | "livraison" | "facturation";

export interface Adresse {
  id: string;
  clientId: string;
  type: TypeAdresse;
  ligne1: string;
  ligne2?: string;
  commune?: string;
  codePostal?: string;
  pays?: string;
  principale?: boolean;
}

// ── Contact lié ────────────────────────────────────────────
export interface Contact {
  id: string;
  clientId: string;
  nom: string;
  prenom?: string;
  role?: string;
  telephone?: string;
  email?: string;
  notes?: string;
}

// ── Entrée historique client ────────────────────────────────
export interface EntreeHistoriqueClient {
  clientId: string;
  typeEntite: "devis_events" | "facture" | "paiement" | "commande_food" | "note";
  reference?: string;
  libelle: string;
  montant?: number;
  statut?: string;
  dateAction: string;
}
