// ═══════════════════════════════════════════════════════════
// BELLAÏA PAYMENTS — API Supabase
// src/modules/payments/paymentApi.ts
// ═══════════════════════════════════════════════════════════

import type { Paiement, Echeance, Recu, HistoriquePay, PayStatut } from './paymentTypes';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Token avec refresh automatique ─────────────────────────
async function getToken(): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SB_URL, SB_KEY);
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) throw new Error('SESSION_ABSENTE');
  const expiresSoon = data.session.expires_at
    ? data.session.expires_at * 1000 < Date.now() + 60_000
    : false;
  if (expiresSoon) {
    const { data: r, error: re } = await sb.auth.refreshSession();
    if (re || !r.session) throw new Error('SESSION_EXPIREE — Reconnectez-vous');
    return r.session.access_token;
  }
  return data.session.access_token;
}

async function sbFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    // Distinguer les types d'erreur
    if (res.status === 401) throw new Error('SESSION_EXPIREE — Reconnectez-vous');
    if (res.status === 403) throw new Error('ACCES_REFUSE — Droits insuffisants');
    if (err.code === 'PGRST301') throw new Error('RLS_BLOQUE — Vérifiez les droits');
    throw new Error(err.message || `Erreur Supabase ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Générer une référence paiement ─────────────────────────
async function genRef(prefix: string): Promise<string> {
  const token = await getToken();
  const res = await fetch(`${SB_URL}/rest/v1/rpc/prochaine_reference`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_prefixe: prefix }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('SESSION_EXPIREE — Reconnectez-vous');
    throw new Error('Impossible de générer la référence');
  }
  return res.json();
}

// ── CRUD Paiements ──────────────────────────────────────────

export async function getPaiements(filters?: {
  clientId?: string;
  module?: string;
  statut?: PayStatut;
}): Promise<Paiement[]> {
  let q = 'bellaia_paiements?order=created_at.desc';
  if (filters?.clientId) q += `&client_id=eq.${filters.clientId}`;
  if (filters?.module)   q += `&module=eq.${filters.module}`;
  if (filters?.statut)   q += `&statut=eq.${filters.statut}`;
  const data = await sbFetch(q);
  return data || [];
}

export async function getPaiement(id: string): Promise<Paiement> {
  const data = await sbFetch(`bellaia_paiements?id=eq.${id}&limit=1`);
  if (!data?.[0]) throw new Error('Paiement introuvable');
  return data[0];
}

export async function creerPaiement(payload: {
  clientId?: string;
  clientNom?: string;
  clientEmail?: string;
  module?: string;
  commandeId?: string;
  factureId?: string;
  dossierRef?: string;
  motif: string;
  montantTotal: number;
  montantAcompte?: number;
  typePaiement: string;
  nbEcheances?: number;
  dateEcheance?: string;
  notes?: string;
  creePar: string;
}): Promise<Paiement> {
  const reference = await genRef('PAY');
  const data = await sbFetch('bellaia_paiements', {
    method: 'POST',
    body: JSON.stringify({
      reference,
      client_id:      payload.clientId,
      client_nom:     payload.clientNom,
      client_email:   payload.clientEmail,
      module:         payload.module,
      commande_id:    payload.commandeId,
      facture_id:     payload.factureId,
      dossier_ref:    payload.dossierRef,
      motif:          payload.motif,
      montant_total:  payload.montantTotal,
      montant_acompte: payload.montantAcompte || 0,
      montant_paye:   0,
      type_paiement:  payload.typePaiement,
      nb_echeances:   payload.nbEcheances || 1,
      statut:         'brouillon',
      date_echeance:  payload.dateEcheance,
      notes:          payload.notes,
      cree_par:       payload.creePar,
      recu_genere:    false,
    }),
  });
  if (!data?.[0]) throw new Error('Création paiement échouée');
  return data[0];
}

export async function mettreAJourStatut(
  paiementId: string,
  statut: PayStatut,
  extra?: {
    montantPaye?: number;
    mode?: string;
    providerRef?: string;
    note?: string;
  }
): Promise<Paiement> {
  const body: Record<string, any> = { statut };
  if (extra?.montantPaye !== undefined) body.montant_paye  = extra.montantPaye;
  if (extra?.mode)         body.mode              = extra.mode;
  if (extra?.providerRef)  body.provider_reference = extra.providerRef;
  if (statut === 'paye' || statut === 'confirme') {
    body.date_paiement = new Date().toISOString();
  }
  const data = await sbFetch(`bellaia_paiements?id=eq.${paiementId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!data?.[0]) throw new Error('Mise à jour statut échouée');
  return data[0];
}

export async function validerManuellement(
  paiementId: string,
  fondatriceId: string,
  mode: string,
  montantPaye: number,
  note?: string
): Promise<Paiement> {
  const data = await sbFetch(`bellaia_paiements?id=eq.${paiementId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      statut:         montantPaye >= 0 ? 'paye' : 'partiellement_paye',
      montant_paye:   montantPaye,
      mode,
      date_paiement:  new Date().toISOString(),
      valide_par:     fondatriceId,
      valide_le:      new Date().toISOString(),
      notes:          note,
    }),
  });
  if (!data?.[0]) throw new Error('Validation manuelle échouée');
  return data[0];
}

// ── Échéances ───────────────────────────────────────────────

export async function getEcheances(paiementId: string): Promise<Echeance[]> {
  const data = await sbFetch(
    `pay_echeances?paiement_id=eq.${paiementId}&order=numero.asc`
  );
  return data || [];
}

export async function creerEcheances(
  paiementId: string,
  montantTotal: number,
  nbEcheances: number,
  dateDebut?: string
): Promise<Echeance[]> {
  const montantParEch = Math.round((montantTotal / nbEcheances) * 100) / 100;
  const rows = Array.from({ length: nbEcheances }, (_, i) => {
    const date = dateDebut
      ? new Date(new Date(dateDebut).setMonth(new Date(dateDebut).getMonth() + i))
          .toISOString().split('T')[0]
      : undefined;
    return {
      paiement_id:   paiementId,
      numero:        i + 1,
      montant:       i === nbEcheances - 1
        ? montantTotal - montantParEch * (nbEcheances - 1)
        : montantParEch,
      date_echeance: date,
      statut:        'en_attente',
    };
  });
  const data = await sbFetch('pay_echeances', {
    method: 'POST',
    body: JSON.stringify(rows),
  });
  return data || [];
}

export async function payerEcheance(
  echeanceId: string,
  mode: string,
  note?: string
): Promise<Echeance> {
  const data = await sbFetch(`pay_echeances?id=eq.${echeanceId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      statut:        'paye',
      date_paiement: new Date().toISOString(),
      mode,
      notes:         note,
    }),
  });
  if (!data?.[0]) throw new Error('Paiement échéance échoué');
  return data[0];
}

// ── Reçus ───────────────────────────────────────────────────

export async function genererRecu(
  paiementId: string,
  montant: number
): Promise<Recu> {
  const reference = await genRef('RECU');
  const data = await sbFetch('pay_recus', {
    method: 'POST',
    body: JSON.stringify({
      paiement_id: paiementId,
      reference,
      montant,
      genere_le: new Date().toISOString(),
    }),
  });
  if (!data?.[0]) throw new Error('Génération reçu échouée');
  // Marquer reçu_genere = true sur le paiement
  await sbFetch(`bellaia_paiements?id=eq.${paiementId}`, {
    method: 'PATCH',
    body: JSON.stringify({ recu_genere: true }),
  });
  return data[0];
}

export async function getRecus(paiementId: string): Promise<Recu[]> {
  const data = await sbFetch(
    `pay_recus?paiement_id=eq.${paiementId}&order=genere_le.desc`
  );
  return data || [];
}

// ── Historique ──────────────────────────────────────────────

export async function getHistorique(paiementId: string): Promise<HistoriquePay[]> {
  const data = await sbFetch(
    `pay_historique?paiement_id=eq.${paiementId}&order=created_at.asc`
  );
  return data || [];
}

// ── Notification paiement ───────────────────────────────────

export async function notifierPaiement(
  userId: string,
  titre: string,
  contenu: string,
  paiementId: string
): Promise<void> {
  await sbFetch('bellaia_notifications', {
    method: 'POST',
    body: JSON.stringify({
      user_id:    userId,
      type:       'paiement',
      titre,
      contenu,
      lien:       `/paiements/${paiementId}`,
      lu:         false,
    }),
  });
}
