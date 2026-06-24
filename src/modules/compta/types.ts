// ═══════════════════════════════════════════════════════════
// PRÉ-COMPTABILITÉ BELLAÏA — Types centraux
// ═══════════════════════════════════════════════════════════

export type ModesPaiement =
  | "SumUp" | "Revolut" | "PayPal" | "Virement" | "Lien_paiement"
  | "Especes" | "Stripe" | "Autre";

export type StatutEcriture =
  | "auto_valide"   // paiement en ligne — validé système
  | "a_verifier"    // espèces — attente validation fondatrice
  | "valide"        // validé manuellement
  | "annule";

export type TypeJournal =
  | "ventes" | "achats" | "caisse" | "banque" | "paiements" | "avoirs";

export type TypeOperation =
  | "vente_prestation" | "vente_produit" | "vente_numerique"
  | "achat_stock" | "achat_mp" | "achat_consommable" | "achat_service"
  | "remboursement" | "avoir";

export interface EcritureCompta {
  id:               string;
  date:             string;           // ISO date
  libelle:          string;
  type_operation:   TypeOperation;
  journal:          TypeJournal;
  pole:             string;           // BSH, ODYSSEE, FOOD, EVENTS, etc.
  mode_paiement:    ModesPaiement;
  montant_ht:       number;
  tva:              number;
  montant_ttc:      number;
  statut:           StatutEcriture;
  // Liens
  facture_id?:      string;
  paiement_id?:     string;
  commande_id?:     string;
  client_nom?:      string;
  fournisseur_nom?: string;
  stock_ids?:       string[];
  // Catégorisation auto
  categorie_compta: string;
  sous_categorie?:  string;
  // Justificatif
  justificatif_url?: string;
  notes?:           string;
  // Méta
  source:           "auto" | "manuel";
  cree_le:          string;
  valide_le?:       string;
  fondatrice_id?:   string;
}

// ── Règles de catégorisation automatique
export interface RegleCategorisation {
  conditions: {
    pole?: string;
    type_operation?: TypeOperation;
    mode_paiement?: ModesPaiement;
    libelle_contains?: string;
  };
  resultat: {
    journal:         TypeJournal;
    categorie_compta:string;
    sous_categorie?: string;
    statut:          StatutEcriture;
  };
}

// Modes paiement en ligne = automatiquement validés
export const MODES_EN_LIGNE: ModesPaiement[] = [
  "SumUp", "Revolut", "PayPal", "Virement", "Lien_paiement", "Stripe"
];

export const isEnLigne = (mode: ModesPaiement): boolean =>
  MODES_EN_LIGNE.includes(mode);

// ── Mapping pôle → catégorie comptable
export const CATEGORIES_PAR_POLE: Record<string, string> = {
  BSH:       "Ventes marchandises — Lingerie",
  ODYSSEE:   "Ventes prestations beauté",
  EVENTS:    "Ventes prestations événementielles",
  FOOD:      "Ventes traiteur / restauration",
  STRUCTURE: "Ventes produits numériques",
  VILO:      "Ventes prestations administratives",
  MTP:       "Ventes éditions jeunesse",
  INVEST:    "Revenus investissements",
  GENERAL:   "Ventes diverses",
};

export const CATEGORIES_ACHAT: Record<string, string> = {
  BSH:       "Achats marchandises boutique",
  ODYSSEE:   "Achats produits beauté",
  EVENTS:    "Achats consommables événements",
  FOOD:      "Achats matières premières alimentaires",
  STRUCTURE: "Achats outils numériques",
  VILO:      "Achats fournitures administratives",
  MTP:       "Achats production éditoriale",
  GENERAL:   "Charges diverses",
};
