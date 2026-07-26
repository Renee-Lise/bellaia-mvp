// ═══════════════════════════════════════════════════════════
// searchTypes.ts — Types Recherche Globale Bellaïa
// src/modules/search/searchTypes.ts
// Aucune dépendance externe
// ═══════════════════════════════════════════════════════════

// ── Modules searchables ────────────────────────────────────
export type ModuleSearch =
  | "clients" | "devis" | "commandes" | "factures" | "paiements"
  | "recettes" | "produits" | "stocks" | "evenements"
  | "messages" | "documents" | "prestations";

// ── Profil de l'utilisateur qui recherche ──────────────────
export type ProfilRecherche = "fondatrice" | "client" | "hote";

// ── Critères de recherche ──────────────────────────────────
export interface CriteresRecherche {
  texte?: string;
  module?: ModuleSearch | "tous";
  statut?: string;
  dateDebut?: string;
  dateFin?: string;
  clientId?: string;
  profil: ProfilRecherche;
}

// ── Résultat de recherche ──────────────────────────────────
export type TypeResultat =
  | "client" | "devis" | "commande" | "facture" | "paiement"
  | "recette" | "produit" | "stock" | "evenement"
  | "message" | "document" | "prestation";

export interface ResultatRecherche {
  id: string;
  type: TypeResultat;
  titre: string;
  sousTitre?: string;
  reference?: string;
  statut?: string;
  montant?: number;
  date?: string;
  module: string;
  score: number;           // pertinence 0-100
  payload?: Record<string, unknown>;  // données brutes pour navigation
}

export interface ReponseRecherche {
  resultats: ResultatRecherche[];
  total: number;
  dureeMs: number;
  source: "supabase" | "local" | "mixte";
  query: string;
}
