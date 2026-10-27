// ═══════════════════════════════════════════════════════════
// documentsTypes.ts — Types GED Centrale Bellaïa
// src/modules/docs/documentsTypes.ts
// Aucune dépendance externe
// ═══════════════════════════════════════════════════════════

export type ModuleDocument =
  | "FOOD" | "EVENTS" | "BSH" | "ODYSSEE"
  | "EDITIONS" | "MOTIPY" | "VILO" | "ERP" | "GENERAL";

export type TypeDocument =
  | "devis"       | "facture"      | "commande"    | "bon_livraison"
  | "contrat"     | "fiche_produit"| "recette"     | "haccp"
  | "roman"       | "ebook"        | "support_ped" | "post_social"
  | "affiche"     | "flyer"        | "photo"        | "pdf"
  | "document_admin" | "autre";

export type StatutDocument =
  | "brouillon" | "valide" | "envoye" | "archive" | "supprime";

export interface DocumentVersion {
  numero: number;       // 1, 2, 3...
  contenu?: string;     // HTML ou texte
  url?: string;         // URL de stockage
  creeLe: string;
  commentaire?: string;
}

// ── Document central ───────────────────────────────────────
export interface Document {
  id: string;
  reference: string;         // DOC-YYYY-XXXXXX
  titre: string;
  module: ModuleDocument;
  type: TypeDocument;
  categorie?: string;
  // Contenu
  contenuHtml?: string;      // HTML généré (devis, factures...)
  url?: string;              // lien externe (hors Bellaïa) — distinct d'un fichier uploadé
  storagePath?: string;      // chemin dans le bucket privé bsh-documents — colonne storage_path réelle
  taille?: number;           // octets
  mimeType?: string;
  // Liens modules
  clientId?: string;
  clientNom?: string;
  evenementId?: string;
  devisRef?: string;
  commandeRef?: string;
  factureRef?: string;
  hoteId?: string;           // lien direct vers une hôtesse BSH (profiles.id) — colonne hote_id réelle
  // Métadonnées
  statut: StatutDocument;
  version: number;
  versions?: DocumentVersion[];
  tags?: string[];
  notes?: string;
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

// ── Filtre de recherche GED ────────────────────────────────
export interface FiltreDocuments {
  texte?: string;
  module?: ModuleDocument | "tous";
  type?: TypeDocument | "tous";
  statut?: StatutDocument | "tous";
  clientId?: string;
  dateDebut?: string;
  dateFin?: string;
  tags?: string[];
}
