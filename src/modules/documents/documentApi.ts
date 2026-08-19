// src/modules/documents/documentApi.ts
import type { DocRequest, DocSubmission, BellaiaDocument, DocCategorie, DocStatut } from './documentTypes';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getToken(): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SB_URL, SB_KEY);
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) throw new Error('SESSION_ABSENTE');
  const expiresSoon = data.session.expires_at
    ? data.session.expires_at * 1000 < Date.now() + 60_000 : false;
  if (expiresSoon) {
    const { data: r, error: re } = await sb.auth.refreshSession();
    if (re || !r.session) throw new Error('SESSION_EXPIREE');
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
    if (res.status === 401) throw new Error('SESSION_EXPIREE');
    if (res.status === 403) throw new Error('ACCES_REFUSE');
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getSignedUrl(path: string, bucket: string): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const token = await getToken();
  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || '';
}

// ── Catégories ──────────────────────────────────────────────
export async function getCategories(): Promise<DocCategorie[]> {
  const data = await sbFetch('doc_categories?order=libelle.asc');
  return data || [];
}

// ── Demandes de documents ───────────────────────────────────
export async function getDemandesDoc(filters?: {
  destinataireId?: string;
  statut?: DocStatut;
  module?: string;
}): Promise<DocRequest[]> {
  let q = 'doc_requests?order=created_at.desc';
  if (filters?.destinataireId) q += `&destinataire_id=eq.${filters.destinataireId}`;
  if (filters?.statut)         q += `&statut=eq.${filters.statut}`;
  if (filters?.module)         q += `&module=eq.${filters.module}`;
  const data = await sbFetch(q);
  return data || [];
}

export async function creerDemandeDoc(payload: {
  destinataireId?: string;
  destinataireNom?: string;
  categorie?: string;
  titre: string;
  consignes?: string;
  module?: string;
  entiteType?: string;
  entiteId?: string;
  obligatoire?: boolean;
  dateEcheance?: string;
  creePar: string;
}): Promise<DocRequest> {
  const ref = `DOC-${Date.now().toString(36).toUpperCase()}`;
  const data = await sbFetch('doc_requests', {
    method: 'POST',
    body: JSON.stringify({
      reference:        ref,
      destinataire_id:  payload.destinataireId,
      destinataire_nom: payload.destinataireNom,
      categorie:        payload.categorie,
      titre:            payload.titre,
      consignes:        payload.consignes,
      module:           payload.module,
      entite_type:      payload.entiteType,
      entite_id:        payload.entiteId,
      obligatoire:      payload.obligatoire ?? true,
      date_echeance:    payload.dateEcheance,
      statut:           'demande',
      cree_par:         payload.creePar,
    }),
  });
  if (!data?.[0]) throw new Error('Création demande échouée');
  return data[0];
}

export async function mettreAJourStatutDoc(
  requestId: string,
  statut: DocStatut,
  noteRefus?: string
): Promise<DocRequest> {
  const body: any = { statut };
  if (noteRefus) body.note_refus = noteRefus;
  const data = await sbFetch(`doc_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!data?.[0]) throw new Error('Mise à jour statut échouée');
  return data[0];
}

// ── Dépôts (client → fondatrice) ────────────────────────────
export async function getSubmissions(requestId: string): Promise<DocSubmission[]> {
  const data = await sbFetch(
    `doc_submissions?request_id=eq.${requestId}&order=created_at.desc`
  );
  const subs = data || [];
  for (const s of subs) {
    if (s.storage_path) {
      s.signed_url = await getSignedUrl(s.storage_path, 'documents-clients').catch(() => '');
    }
  }
  return subs;
}

export async function deposerDocument(
  requestId: string,
  userId: string,
  file: File,
  commentaire?: string
): Promise<DocSubmission> {
  const { createClient } = await import('@supabase/supabase-js');
  const token = await getToken();
  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const ext  = file.name.split('.').pop();
  const path = `${userId}/${requestId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage
    .from('documents-clients')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Upload échoué : ${error.message}`);

  const data = await sbFetch('doc_submissions', {
    method: 'POST',
    body: JSON.stringify({
      request_id:   requestId,
      depose_par:   userId,
      commentaire,
      storage_path: path,
      nom_fichier:  file.name,
      type_mime:    file.type,
      taille_bytes: file.size,
      version:      1,
    }),
  });
  if (!data?.[0]) throw new Error('Enregistrement dépôt échoué');
  await mettreAJourStatutDoc(requestId, 'depose');
  return data[0];
}

// ── GED — documents Bellaïa ─────────────────────────────────
export async function getDocumentsGED(filters?: {
  clientId?: string;
  hoteId?: string;
  module?: string;
  categorie?: string;
}): Promise<BellaiaDocument[]> {
  let q = 'bellaia_documents?order=created_at.desc';
  if (filters?.clientId)  q += `&client_id=eq.${filters.clientId}`;
  if (filters?.hoteId)    q += `&hote_id=eq.${filters.hoteId}`;
  if (filters?.module)    q += `&module=eq.${filters.module}`;
  if (filters?.categorie) q += `&categorie=eq.${filters.categorie}`;
  const data = await sbFetch(q);
  const docs = data || [];
  for (const d of docs) {
    if (d.storage_path) {
      d.signed_url = await getSignedUrl(d.storage_path, 'bellaia-ged').catch(() => '');
    }
  }
  return docs;
}

export async function uploaderDocumentGED(
  file: File,
  meta: {
    titre: string;
    categorie?: string;
    module?: string;
    clientId?: string;
    hoteId?: string;
    entiteType?: string;
    entiteId?: string;
    creePar: string;
  }
): Promise<BellaiaDocument> {
  const { createClient } = await import('@supabase/supabase-js');
  const token = await getToken();
  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const userId = meta.clientId || meta.hoteId || meta.creePar;
  const ext    = file.name.split('.').pop();
  const path   = `${userId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage
    .from('bellaia-ged')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Upload GED échoué : ${error.message}`);
  const ref  = `GED-${Date.now().toString(36).toUpperCase()}`;
  const data = await sbFetch('bellaia_documents', {
    method: 'POST',
    body: JSON.stringify({
      reference:    ref,
      titre:        meta.titre,
      categorie:    meta.categorie,
      module:       meta.module,
      client_id:    meta.clientId,
      hote_id:      meta.hoteId,
      entite_type:  meta.entiteType,
      entite_id:    meta.entiteId,
      storage_path: path,
      taille_bytes: file.size,
      type_mime:    file.type,
      statut:       'actif',
      version:      1,
      signe:        false,
      cree_par:     meta.creePar,
    }),
  });
  if (!data?.[0]) throw new Error('Enregistrement GED échoué');
  return data[0];
}
