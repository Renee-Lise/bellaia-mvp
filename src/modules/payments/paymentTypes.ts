// ═══════════════════════════════════════════════════════════
// BELLAÏA PAYMENTS — Types
// src/modules/payments/paymentTypes.ts
// ═══════════════════════════════════════════════════════════

export type PayStatut =
  | 'brouillon' | 'en_attente' | 'lien_genere' | 'redirige'
  | 'confirme' | 'partiellement_paye' | 'paye'
  | 'echoue' | 'expire' | 'annule' | 'rembourse';

export type PayMode =
  | 'virement' | 'especes' | 'cheque'
  | 'sumup' | 'paypal' | 'revolut' | 'lien' | 'manuel';

export type PayType = 'acompte' | 'solde' | 'integral' | 'fractionne';

export interface Paiement {
  id: string;
  reference: string;
  client_id?: string;
  client_nom?: string;
  client_email?: string;
  module?: string;
  commande_id?: string;
  facture_id?: string;
  dossier_ref?: string;
  motif: string;
  montant_total: number;
  montant_acompte: number;
  montant_paye: number;
  type_paiement: PayType;
  nb_echeances: number;
  mode?: PayMode;
  provider?: string;
  provider_reference?: string;
  checkout_url?: string;
  statut: PayStatut;
  date_echeance?: string;
  date_paiement?: string;
  justificatif_url?: string;
  recu_genere: boolean;
  notes?: string;
  valide_par?: string;
  valide_le?: string;
  cree_par?: string;
  created_at: string;
  updated_at: string;
}

export interface Echeance {
  id: string;
  paiement_id: string;
  numero: number;
  montant: number;
  date_echeance?: string;
  statut: 'en_attente' | 'paye' | 'retard' | 'annule';
  date_paiement?: string;
  mode?: string;
  notes?: string;
  created_at: string;
}

export interface Recu {
  id: string;
  paiement_id: string;
  reference: string;
  montant?: number;
  genere_le: string;
  storage_path?: string;
  envoye_le?: string;
}

export interface HistoriquePay {
  id: string;
  paiement_id: string;
  ancien_statut?: string;
  nouveau_statut?: string;
  note?: string;
  fait_par?: string;
  created_at: string;
}

export const STATUT_LABELS: Record<PayStatut, string> = {
  brouillon:           'Brouillon',
  en_attente:          'En attente',
  lien_genere:         'Lien créé',
  redirige:            'Redirigé',
  confirme:            'Confirmé',
  partiellement_paye:  'Partiel',
  paye:                'Payé ✓',
  echoue:              'Échoué',
  expire:              'Expiré',
  annule:              'Annulé',
  rembourse:           'Remboursé',
};

export const STATUT_COLORS: Record<PayStatut, { bg: string; color: string }> = {
  brouillon:          { bg: 'rgba(139,127,168,0.15)', color: '#8b7fa8' },
  en_attente:         { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  lien_genere:        { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
  redirige:           { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
  confirme:           { bg: 'rgba(110,231,160,0.15)', color: '#6ee7a0' },
  partiellement_paye: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  paye:               { bg: 'rgba(110,231,160,0.15)', color: '#6ee7a0' },
  echoue:             { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  expire:             { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  annule:             { bg: 'rgba(139,127,168,0.15)', color: '#8b7fa8' },
  rembourse:          { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
};

export const MODE_LABELS: Record<PayMode, string> = {
  virement:  '🏦 Virement bancaire',
  especes:   '💵 Espèces',
  cheque:    '📝 Chèque',
  sumup:     '📱 SumUp',
  paypal:    '🔵 PayPal',
  revolut:   '🟣 Revolut',
  lien:      '🔗 Lien de paiement',
  manuel:    '✅ Validation manuelle',
};
