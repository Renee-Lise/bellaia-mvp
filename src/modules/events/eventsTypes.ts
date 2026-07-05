// ═══════════════════════════════════════════════════════════
// TYPES — Module Bella'Events
// ═══════════════════════════════════════════════════════════

export interface EventsPrestation {
  id: string;
  nom: string;
  categorie: string;
  sous?: string;
  type?: string;
  desc?: string;
  prix?: number | null;
  prix_max?: number;
  prix_des?: boolean;
  prix_jusqua?: boolean;
  unite?: string;
  min_qte?: number;
  acompte_pct?: number;
  sur_devis: boolean;
  note?: string;
  categories?: string[];
  delai_minimum?: string;
  cout_revient?: number | null;
  fournisseur?: string | null;
  stock_lie?: string | null;
}

export interface EventsDemande {
  id: string;
  reference?: string;
  statut: string;
  client_prenom?: string;
  client_nom?: string;
  client_tel?: string;
  client_email?: string;
  date_souhaitee?: string;
  heure_souhaitee?: string;
  type_evenement?: string;
  nb_invites?: string | number;
  theme?: string;
  couleurs?: string;
  budget?: string | number;
  message?: string;
  pole?: string;
  categorie?: string;
  prestation?: string;
  prix?: string;
  acompte?: string;
  delai?: string;
  type_prestation?: string;
  commande_id?: string;
  planning_event_id?: string;
  numero_devis?: string;
  montant_estime?: number;
  montant_acompte?: number;
  montant_solde?: number;
  mode_paiement?: string;
  statut_paiement?: string;
  lignes_devis?: LigneDevis[] | string;
  devis_genere_at?: string;
  devis_envoye_at?: string;
  devis_accepte_at?: string;
  devis_refuse_at?: string;
  devis_pdf_url?: string;
  client_reponse?: string;
  client_reponse_at?: string;
  fondatrice_notes?: string;
  dossier_evenement_id?: string;
  // Paiement
  paiement_url?:     string | null;
  acompte_paye?:     boolean;
  statut_paiement?:  string;
  mode_paiement?:    string | null;
  date_paiement?:    string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LigneDevis {
  id: string;
  libelle: string;
  pole: string;
  categorie: string;
  qte: number;
  prixUnitaire: number | null;
  total: number | null;
  statut: "automatique" | "a_completer" | "suggestion";
  source: string;
  note?: string | null;
  unite?: string;
}

export interface EtapeSuivi {
  statut: string;
  ico: string;
  label: string;
}

export interface FoodItem {
  id: string;
  nom: string;
  pole: string;
  categorie: string;
  prix: number;
  unite: string;
  note?: string;
}

export interface DemandeAnalyseParams {
  prestation?: string;
  message?: string;
  theme?: string;
  couleurs?: string;
  nbInvites?: string | number;
  typeEvt?: string;
  budget?: string | number;
}

// ── Types additionnels Lot Devis ────────────────────────────
export interface LigneDevisEditee {
  id: string;
  libelle: string;
  categorie: string;
  unite: string;
  qte: number;
  prixUnitaire: number | null;
  remise: number;          // € ou % selon remiseType
  remiseType: "%" | "€";
  supplement: number;
  tva: number;             // % — prévu, non calculé pour l'instant
  acompte: number;         // % de cette ligne
  commentaire: string;
  description_detaillee?: string; // Description longue modifiable avant envoi
  statut: "automatique" | "a_completer" | "suggestion";
  source: string;
}

export interface DevisGenere {
  id: string;
  reference: string;        // DEV-2026-NNNNNN
  numDemande: string;
  statut: "brouillon" | "valide" | "envoye" | "accepte" | "refuse" | "expire";
  dateCreation: string;
  dateValidite: string;     // +30 jours par défaut
  client: { prenom: string; nom: string; tel: string; email: string };
  evenement: string;
  dateSouhaitee?: string;
  nbInvites?: string;
  lignes: LigneDevisEditee[];
  conditionsGenerales: string;
  acomptePct: number;
  notes?: string;
}

export type ActionDevis =
  | "modifier" | "generer" | "envoyer" | "voir" | "dupliquer" | "annuler";


// ── Location vaisselle ────────────────────────────────────
export interface LocationVaisselle {
  id: string;
  commandeId: string;
  quantite: number;
  caution: number;
  etatDepart?: string;
  etatRetour?: string;
  fraisCasse?: number;
  nettoyageInclus: boolean;
  dateRetour?: string;
  notes?: string;
}

// ── Paiement (interface utilitaire) ──────────────────────
export interface PaiementDemande {
  paiement_url?:    string | null;
  acompte_paye?:    boolean;
  statut_paiement?: "non_paye" | "acompte_paye" | "solde_paye" | "rembourse";
  mode_paiement?:   "especes" | "virement" | "sumup" | "paypal" | "cheque" | null;
  date_paiement?:   string | null;
}
