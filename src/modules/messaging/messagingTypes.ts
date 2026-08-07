// ═══════════════════════════════════════════════════════════
// BELLAÏA MESSAGING — Types TypeScript
// src/modules/messaging/messagingTypes.ts
// ═══════════════════════════════════════════════════════════

export interface Conversation {
  id: string;
  nom?: string;
  type: 'direct' | 'groupe' | 'mission' | 'dossier';
  module?: string;
  ref_id?: string;
  ref_type?: string;
  cree_par?: string;
  archive: boolean;
  created_at: string;
  updated_at: string;
  // Champs joints
  nb_messages?: number;
  dernier_message?: string;
  client_nom?: string;
  non_lus?: number;
  membres?: Participant[];
}

export interface Participant {
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'membre';
  notifs_actives: boolean;
  rejoint_le: string;
  // Joints depuis profiles
  prenom?: string;
  nom?: string;
  role_profil?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  auteur_id?: string;
  contenu?: string;
  type: 'texte' | 'image' | 'video' | 'audio' | 'document' | 'lien' | 'systeme';
  metadata: Record<string, any>;
  reponse_a?: string;
  transfert_de?: string;
  supprime: boolean;
  created_at: string;
  // Champs joints
  auteur_prenom?: string;
  auteur_nom?: string;
  auteur_role?: string;
  lu_par?: string[];
  reactions?: Reaction[];
  attachments?: Attachment[];
  msg_repondu?: Message;
}

export interface Attachment {
  id: string;
  message_id: string;
  nom_fichier: string;
  type_mime?: string;
  taille_bytes?: number;
  storage_path: string;
  miniature_url?: string;
  created_at: string;
  // URL signée (générée à la demande)
  signed_url?: string;
}

export interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Call {
  id: string;
  conversation_id: string;
  initie_par?: string;
  type: 'audio' | 'video';
  statut: 'en_attente' | 'accepte' | 'refuse' | 'termine' | 'manque';
  debut_at?: string;
  fin_at?: string;
  duree_secondes?: number;
  created_at: string;
}

export type MessageType = Message['type'];
export type ConvType = Conversation['type'];
