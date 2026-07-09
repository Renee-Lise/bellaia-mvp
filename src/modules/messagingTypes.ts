// ═══════════════════════════════════════════════════════════
// messagingTypes.ts — Types Messagerie Interne Bellaïa
// src/modules/messaging/messagingTypes.ts
// Aucune dépendance externe
// ═══════════════════════════════════════════════════════════

export type CanalMessage =
  | "interne"      // Messagerie native Bellaïa
  | "whatsapp"     // Bouton ouvrir WhatsApp (pas d'API connectée)
  | "email"        // Lien mailto:
  | "messenger"    // Préparé — API future
  | "telegram"     // Préparé — API future
  | "signal";      // Préparé — API future

export type StatutMessage =
  | "envoye" | "lu" | "repondu" | "archive";

export type TypeDestinataire =
  | "client" | "hote" | "fondatrice" | "equipe";

// ── Destinataire ───────────────────────────────────────────
export interface Destinataire {
  id: string;
  nom: string;
  type: TypeDestinataire;
  telephone?: string;
  email?: string;
  canal?: CanalMessage;
}

// ── Pièce jointe ───────────────────────────────────────────
export interface PieceJointe {
  id: string;
  nom: string;
  type: "image" | "pdf" | "document" | "autre";
  url?: string;          // URL si stockée (Supabase Storage)
  taille?: number;       // octets
}

// ── Message ────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  auteur: "fondatrice" | "client" | "systeme";
  contenu: string;
  canal: CanalMessage;
  statut: StatutMessage;
  piecesJointes?: PieceJointe[];
  // Liens vers modules
  devisRef?: string;
  commandeRef?: string;
  factureRef?: string;
  evenementId?: string;
  // Métadonnées
  createdAt: string;
  luLe?: string;
}

// ── Conversation ───────────────────────────────────────────
export interface Conversation {
  id: string;
  titre: string;
  destinataire: Destinataire;
  canal: CanalMessage;
  messages: Message[];
  // Liens modules
  clientId?: string;
  devisRef?: string;
  commandeRef?: string;
  factureRef?: string;
  evenementId?: string;
  // Statut
  dernierMessage?: string;
  dateDernierMsg?: string;
  nonLus: number;
  archivee: boolean;
  createdAt: string;
}

// ── Brouillon ──────────────────────────────────────────────
export interface BrouillonMessage {
  conversationId?: string;
  destinataireNom: string;
  destinataireTel?: string;
  destinataireEmail?: string;
  canal: CanalMessage;
  contenu: string;
  piecesJointes: PieceJointe[];
}
