// ═══════════════════════════════════════════════════════════
// crmTypes.ts — Types CRM Central Bellaïa LOT VII
// Partagés par tous les modules : Food, Events, BSH, Odyssée
// src/modules/crm/crmTypes.ts
// ═══════════════════════════════════════════════════════════

// ── Statuts ────────────────────────────────────────────────
export type StatutClient =
  | "actif" | "inactif" | "prospect" | "vip" | "archive";

export type TypeAdresse =
  | "domicile" | "livraison" | "facturation" | "autre";

export type TypeDocument =
  | "devis" | "facture" | "contrat" | "photo" | "pdf"
  | "image" | "piece_jointe" | "autre";

export type TypeConsentement =
  | "email" | "sms" | "whatsapp" | "relance" | "newsletter" | "photo";

export type TypeEntiteHistorique =
  | "devis_events" | "commande_food" | "facture" | "paiement"
  | "evenement" | "prestation" | "achat" | "document"
  | "communication" | "note";

// ── Module (business unit) ─────────────────────────────────
export type ModuleBU =
  | "FOOD" | "EVENTS" | "BSH" | "ODYSSEE" | "STRUCTURE" | "GENERAL";

// ── Adresse ────────────────────────────────────────────────
export interface Adresse {
  id: string;
  clientId: string;
  type: TypeAdresse;
  ligne1: string;
  ligne2?: string;
  commune?: string;
  codePostal?: string;
  pays: string;
  principale: boolean;
}

// ── Contact lié ────────────────────────────────────────────
export interface ContactLie {
  id: string;
  clientId: string;
  nom: string;
  prenom?: string;
  role?: string;           // 'conjoint'|'parent'|'assistante'|...
  telephone?: string;
  email?: string;
  notes?: string;
}

// ── Document client ────────────────────────────────────────
export interface DocumentClient {
  id: string;
  clientId: string;
  type: TypeDocument;
  nom: string;
  url?: string;
  taille?: number;         // octets
  notes?: string;
  createdAt: string;
}

// ── Consentement ───────────────────────────────────────────
export interface ConsentementClient {
  id: string;
  clientId: string;
  type: TypeConsentement;
  accorde: boolean;
  dateConsentement: string;
  commentaire?: string;
}

// ── Entrée historique ──────────────────────────────────────
export interface EntreeHistorique {
  id: string;
  clientId: string;
  typeEntite: TypeEntiteHistorique;
  reference?: string;
  libelle: string;
  montant?: number;
  statut?: string;
  sourceTable?: string;
  sourceId?: string;
  dateAction: string;
}

// ── Client central ─────────────────────────────────────────
export interface Client {
  id: string;
  reference: string;            // CLI-2026-XXXXXX
  // Identité
  nom: string;
  prenom?: string;
  societe?: string;
  // Contact
  telephone?: string;
  whatsapp?: string;
  email?: string;
  // Profil
  dateNaissance?: string;       // YYYY-MM-DD
  tags?: string[];
  notes?: string;
  // Préférences & santé
  preferences?: {
    saveurs?: string[];
    couleurs?: string[];
    styles?: string[];
    notes?: string;
  };
  allergies?: string[];
  // RGPD
  rgpdOk: boolean;
  rgpdDate?: string;
  // Modules
  modulesActifs?: ModuleBU[];
  // Statut
  statut: StatutClient;
  // Données calculées (chargées à part)
  adresses?: Adresse[];
  contacts?: ContactLie[];
  documents?: DocumentClient[];
  consentements?: ConsentementClient[];
  historique?: EntreeHistorique[];
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ── Stats client (calculées) ──────────────────────────────
export interface StatsClient {
  nbDevis: number;
  nbCommandes: number;
  nbFactures: number;
  caTotal: number;
  derniereActivite?: string;
}

// ── Résultat recherche ─────────────────────────────────────
export interface ResultatRechercheClient {
  client: Client;
  score: number;         // pertinence 0-100
  matchField: string;    // champ ayant matché
}
