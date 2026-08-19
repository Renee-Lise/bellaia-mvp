// src/modules/documents/documentTypes.ts
export type DocStatut =
  | 'demande' | 'vu' | 'en_attente' | 'depose'
  | 'a_verifier' | 'accepte' | 'refuse' | 'expire';

export interface DocCategorie {
  id: string;
  code: string;
  libelle: string;
  module?: string;
  icone?: string;
}

export interface DocRequest {
  id: string;
  reference: string;
  destinataire_id?: string;
  destinataire_nom?: string;
  categorie?: string;
  titre: string;
  consignes?: string;
  module?: string;
  entite_type?: string;
  entite_id?: string;
  obligatoire: boolean;
  date_echeance?: string;
  statut: DocStatut;
  note_refus?: string;
  cree_par?: string;
  created_at: string;
  updated_at: string;
}

export interface DocSubmission {
  id: string;
  request_id: string;
  depose_par?: string;
  commentaire?: string;
  storage_path?: string;
  nom_fichier?: string;
  type_mime?: string;
  taille_bytes?: number;
  version: number;
  created_at: string;
  signed_url?: string;
}

export interface BellaiaDocument {
  id: string;
  reference?: string;
  titre: string;
  categorie?: string;
  module?: string;
  entite_type?: string;
  entite_id?: string;
  client_id?: string;
  hote_id?: string;
  storage_path?: string;
  taille_bytes?: number;
  type_mime?: string;
  statut: string;
  version: number;
  signe: boolean;
  signe_le?: string;
  cree_par?: string;
  created_at: string;
  updated_at: string;
  signed_url?: string;
}

export const STATUT_LABELS: Record<DocStatut, string> = {
  demande:    '📋 Demandé',
  vu:         '👁 Vu',
  en_attente: '⏳ En attente',
  depose:     '📤 Déposé',
  a_verifier: '🔍 À vérifier',
  accepte:    '✅ Accepté',
  refuse:     '❌ Refusé',
  expire:     '⌛ Expiré',
};

export const STATUT_COLORS: Record<DocStatut, { bg: string; color: string }> = {
  demande:    { bg:'rgba(96,165,250,0.15)',  color:'#60a5fa' },
  vu:         { bg:'rgba(139,127,168,0.15)', color:'#8b7fa8' },
  en_attente: { bg:'rgba(251,191,36,0.15)',  color:'#fbbf24' },
  depose:     { bg:'rgba(124,58,237,0.15)',  color:'#9d6ef5' },
  a_verifier: { bg:'rgba(251,191,36,0.15)',  color:'#fbbf24' },
  accepte:    { bg:'rgba(110,231,160,0.15)', color:'#6ee7a0' },
  refuse:     { bg:'rgba(248,113,113,0.15)', color:'#f87171' },
  expire:     { bg:'rgba(139,127,168,0.15)', color:'#8b7fa8' },
};
