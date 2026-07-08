// ═══════════════════════════════════════════════════════════
// workflowTypes.ts — Workflow Commercial Universel Bellaïa
// Statuts, transitions, journal d'audit — LOT VIII
// src/modules/core/workflowTypes.ts
// Aucune dépendance externe — types purs
// ═══════════════════════════════════════════════════════════

// ── Business unit (même que coreTypes, recopié pour autonomie) ──
export type BU =
  | "FOOD" | "EVENTS" | "BSH" | "ODYSSEE" | "STRUCTURE" | "GENERAL";

// ══════════════════════════════════════════════════════════
// STATUTS UNIVERSELS BELLAÏA
// Tous les modules utilisent exactement ces statuts.
// ══════════════════════════════════════════════════════════
export type StatutWorkflow =
  | "BROUILLON"       // Simulation ou devis non finalisé
  | "SIMULATION"      // Estimation en cours
  | "DEVIS"           // Devis généré
  | "DEVIS_ENVOYE"    // Devis transmis au client
  | "DEVIS_ACCEPTE"   // Client a accepté
  | "DEVIS_REFUSE"    // Client a refusé
  | "COMMANDE"        // Commande créée
  | "FACTURE"         // Facture émise (FAC-)
  | "ACOMPTE_RECU"    // Acompte encaissé
  | "SOLDE_RECU"      // Solde encaissé → paiement complet
  | "PRODUCTION"      // En cours de fabrication/préparation
  | "PRET"            // Prêt pour livraison/retrait
  | "LIVRE"           // Livré ou retiré
  | "CLOTURE"         // Dossier clôturé
  | "ANNULE";         // Annulé à toute étape

// ── Étiquettes lisibles ─────────────────────────────────
export const STATUT_LABELS: Record<StatutWorkflow, string> = {
  BROUILLON:     "Brouillon",
  SIMULATION:    "Simulation",
  DEVIS:         "Devis",
  DEVIS_ENVOYE:  "Devis envoyé",
  DEVIS_ACCEPTE: "Devis accepté",
  DEVIS_REFUSE:  "Devis refusé",
  COMMANDE:      "Commande",
  FACTURE:       "Facturé",
  ACOMPTE_RECU:  "Acompte reçu",
  SOLDE_RECU:    "Soldé",
  PRODUCTION:    "En production",
  PRET:          "Prêt",
  LIVRE:         "Livré",
  CLOTURE:       "Clôturé",
  ANNULE:        "Annulé",
};

// ── Couleurs par statut ─────────────────────────────────
export const STATUT_COLORS: Record<StatutWorkflow, { bg: string; txt: string }> = {
  BROUILLON:     {bg:"rgba(255,255,255,0.06)",   txt:"rgba(255,255,255,0.4)"},
  SIMULATION:    {bg:"rgba(96,165,250,0.1)",     txt:"#60a5fa"},
  DEVIS:         {bg:"rgba(201,168,76,0.15)",    txt:"#c9a96e"},
  DEVIS_ENVOYE:  {bg:"rgba(59,130,246,0.15)",   txt:"#60a5fa"},
  DEVIS_ACCEPTE: {bg:"rgba(16,185,129,0.15)",   txt:"#22c55e"},
  DEVIS_REFUSE:  {bg:"rgba(248,113,113,0.12)",  txt:"#f87171"},
  COMMANDE:      {bg:"rgba(168,85,247,0.12)",   txt:"#a855f7"},
  FACTURE:       {bg:"rgba(201,168,76,0.12)",   txt:"#c9a96e"},
  ACOMPTE_RECU:  {bg:"rgba(16,185,129,0.12)",   txt:"#22c55e"},
  SOLDE_RECU:    {bg:"rgba(21,128,61,0.2)",     txt:"#22c55e"},
  PRODUCTION:    {bg:"rgba(251,146,60,0.12)",   txt:"#fb923c"},
  PRET:          {bg:"rgba(16,185,129,0.15)",   txt:"#22c55e"},
  LIVRE:         {bg:"rgba(21,128,61,0.2)",     txt:"#34d399"},
  CLOTURE:       {bg:"rgba(21,128,61,0.25)",    txt:"#34d399"},
  ANNULE:        {bg:"rgba(248,113,113,0.1)",   txt:"#f87171"},
};

// ══════════════════════════════════════════════════════════
// TRANSITIONS AUTORISÉES
// Chaque statut liste les statuts vers lesquels il peut aller.
// Le moteur refuse toute transition hors de cette table.
// ══════════════════════════════════════════════════════════
export const TRANSITIONS_VALIDES: Record<StatutWorkflow, StatutWorkflow[]> = {
  BROUILLON:     ["SIMULATION", "DEVIS", "ANNULE"],
  SIMULATION:    ["DEVIS", "BROUILLON", "ANNULE"],
  DEVIS:         ["DEVIS_ENVOYE", "BROUILLON", "ANNULE"],
  DEVIS_ENVOYE:  ["DEVIS_ACCEPTE", "DEVIS_REFUSE", "DEVIS", "ANNULE"],
  DEVIS_ACCEPTE: ["COMMANDE", "ANNULE"],
  DEVIS_REFUSE:  ["DEVIS", "ANNULE"],
  COMMANDE:      ["FACTURE", "ANNULE"],
  FACTURE:       ["ACOMPTE_RECU", "SOLDE_RECU", "ANNULE"],
  ACOMPTE_RECU:  ["PRODUCTION", "SOLDE_RECU"],
  SOLDE_RECU:    ["PRODUCTION", "PRET"],
  PRODUCTION:    ["PRET", "ANNULE"],
  PRET:          ["LIVRE"],
  LIVRE:         ["CLOTURE"],
  CLOTURE:       [],      // État terminal
  ANNULE:        [],      // État terminal
};

// ── Transitions avec message d'erreur ───────────────────
export function transitionAutorisee(
  de: StatutWorkflow,
  vers: StatutWorkflow
): { ok: boolean; raison?: string } {
  const suivants = TRANSITIONS_VALIDES[de];
  if (suivants.includes(vers)) return { ok: true };

  // Messages d'erreur spécifiques
  const raisons: Partial<Record<StatutWorkflow, string>> = {
    COMMANDE:  "Impossible de créer une commande sans devis accepté.",
    FACTURE:   "Impossible de facturer sans commande.",
    ACOMPTE_RECU: "Impossible d'enregistrer un acompte sans facture.",
    SOLDE_RECU:   "Impossible d'encaisser le solde sans acompte.",
    PRODUCTION:"Impossible de lancer la production sans paiement.",
    LIVRE:     "Impossible de livrer sans que la production soit prête.",
    CLOTURE:   "Impossible de clôturer sans livraison.",
  };
  return {
    ok: false,
    raison: raisons[vers] || `Transition de ${de} vers ${vers} non autorisée.`,
  };
}

// ── Étapes ordonnées pour l'affichage ───────────────────
export const ETAPES_ORDONNEES: StatutWorkflow[] = [
  "BROUILLON", "SIMULATION", "DEVIS", "DEVIS_ENVOYE", "DEVIS_ACCEPTE",
  "COMMANDE", "FACTURE", "ACOMPTE_RECU", "SOLDE_RECU",
  "PRODUCTION", "PRET", "LIVRE", "CLOTURE",
];

export function indexEtape(s: StatutWorkflow): number {
  return ETAPES_ORDONNEES.indexOf(s);
}

// ══════════════════════════════════════════════════════════
// NUMÉROTATION UNIVERSELLE
// ══════════════════════════════════════════════════════════
export type PrefixeRef =
  | "DEV"   // Devis
  | "CMD"   // Commande
  | "FAC"   // Facture
  | "PAY"   // Paiement
  | "LIV"   // Livraison
  | "CLI"   // Client
  | "PROD"; // Production

// ══════════════════════════════════════════════════════════
// TYPES — ENTITÉS WORKFLOW
// ══════════════════════════════════════════════════════════

// ── Entrée d'historique / journal ───────────────────────
export interface TransitionWorkflow {
  id: string;
  entiteTable: string;        // 'events_demandes'|'bellaia_factures'|...
  entiteId: string;
  bu: BU;
  statutAvant: StatutWorkflow;
  statutApres: StatutWorkflow;
  commentaire?: string;
  operateur?: string;         // 'fondatrice'|'client'|'system'
  dateAction: string;         // ISO
}

// ── Commande universelle ─────────────────────────────────
export interface CommandeUniverselle {
  id: string;
  reference: string;          // CMD-YYYY-XXXXXX
  bu: BU;
  clientId?: string;
  clientNom: string;
  clientTel?: string;
  statut: StatutWorkflow;
  devisRef?: string;
  factureRef?: string;
  lignes: LigneCommande[];
  total: number;
  acompte?: number;
  acomptePaye?: boolean;
  soldePaye?: boolean;
  notes?: string;
  dateCommande: string;
  dateLivraison?: string;
  modeLivraison?: "retrait" | "livraison" | "sur_place";
}

export interface LigneCommande {
  libelle: string;
  qte: number;
  prixUnitaire: number;
  total: number;
  notes?: string;
}

// ── Livraison ────────────────────────────────────────────
export interface LivraisonUniverselle {
  id: string;
  reference: string;          // LIV-YYYY-XXXXXX
  commandeRef: string;
  bu: BU;
  clientNom: string;
  mode: "retrait" | "livraison" | "sur_place";
  adresse?: string;
  datePrevue?: string;
  heurePrevue?: string;
  statut: "planifiee" | "prete" | "en_route" | "livree" | "echec";
  notes?: string;
  bonLivraisonHtml?: string;
}

// ── Notification workflow ────────────────────────────────
export interface NotificationWorkflow {
  id: string;
  entiteId: string;
  bu: BU;
  destinataire: "fondatrice" | "client";
  type: StatutWorkflow;       // le statut qui déclenche la notif
  canal: "whatsapp" | "email" | "sms" | "interne";
  message: string;
  envoyee: boolean;
  dateCreation: string;
}

// ── Tâche de production ──────────────────────────────────
export interface TacheProduction {
  id: string;
  commandeRef: string;
  bu: BU;
  libelle: string;
  description?: string;
  ordre: number;
  dureeEstimee?: number;      // minutes
  faite: boolean;
  datePrevue?: string;
}
