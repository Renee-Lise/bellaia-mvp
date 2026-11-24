// Base simulée BSH Secret Agenda (données fictives, en mémoire). Branchée dans mockapp.js.
// Reproduit les règles d'accès de 0103/0128/0141 testées en SQL (supabase/tests/0141_bsh) :
// fondatrice = tout ; hôte titulaire OU remplaçante = ses missions, leurs publications, animations et ressources autorisées ;
// autres comptes = rien. MOCK_BSH_0141=0 simule la base AVANT 0141 (tables et fonctions absentes).
const crypto = require('crypto');
const F = '00000000-0000-0000-0000-0000000000f0';
const HOTES_SUB = { '00000000-0000-0000-0000-0000000000b1': 'h1', '00000000-0000-0000-0000-0000000000b2': 'h2' };
const AVEC_0141 = process.env.MOCK_BSH_0141 !== '0';
const TABLES_0141 = ['bsh_preuves_publication', 'bsh_ressources', 'bsh_creations', 'bsh_creations_versions', 'bsh_assistant_contenus'];
const RPC_0141 = ['bsh_confirmer_publication', 'bsh_hote_execution'];
const iso = (j, h = '08:00') => { const d = new Date(Date.now() + j * 864e5 - 3 * 3600e3); return new Date(`${d.toISOString().slice(0, 10)}T${h}:00-03:00`).toISOString(); };
const jour = j => new Date(Date.now() + j * 864e5 - 3 * 3600e3).toISOString().slice(0, 10);
function initial() {
  return {
    bsh_hotes: [
      { id: 'h1', prenom: 'Hôte Alpha', nom: null, statut: 'active', profile_id: '00000000-0000-0000-0000-0000000000b1', pseudo_scene: 'Alpha', ville: 'Cayenne', competences: ['animation'], langues: ['fr'], majeur_confirme: true, charte_signee_le: '2026-11-01T00:00:00Z', autorise_missions: false, permissions: { messagerie: true } },
      { id: 'h2', prenom: 'Hôte Bêta', nom: null, statut: 'active', profile_id: '00000000-0000-0000-0000-0000000000b2', pseudo_scene: 'Bêta', ville: 'Kourou', competences: ['moderation'], langues: ['fr'], majeur_confirme: true, charte_signee_le: '2026-11-01T00:00:00Z', autorise_missions: false, permissions: { messagerie: true } },
      { id: 'h3', prenom: 'Hôte Gamma', nom: null, statut: 'inactive', profile_id: null, competences: [], langues: [], permissions: {} },
    ],
    bsh_hotes_candidatures: [], bsh_missions_presences: [], bsh_interventions: [], bsh_hotes_documents: [], bsh_remunerations: [], bsh_hotes_messages: [], bsh_invitations: [],
    bsh_hotes_disponibilites: [{ id: 'd1', hote_id: 'h1', jour: jour(3), type: 'indisponible', note: 'absente' }],
    bsh_programmation_jours: [0, 1, 2, 3, 4, 5].map(j => ({ jour_semaine: j, thematique: ['Douceur', 'Mystérieux', 'Joueuse', 'Audacieux', 'Complice', 'Élégance'][j], en_pause: false, creneaux: ['08:00', '21:00'], creneaux_facultatifs: ['12:30', '18:00'], note: null })).concat([{ jour_semaine: 6, thematique: 'Pause', en_pause: true, creneaux: [], creneaux_facultatifs: ['20:00'], note: null }]),
    bsh_agenda_reglages: [{ id: 1, fuseau: 'America/Cayenne', horaires_principaux: ['08:00', '21:00'], pensee_actif: true, pensee_frequence_jours: 2, pensee_heure: '08:00', pensee_date_reference: '2026-11-16', ...(AVEC_0141 ? { continuite_active: false, continuite_principal: null, continuite_remplacant: null, continuite_horizon_jours: 21, continuite_note: null } : {}) }],
    bsh_campagnes: [{ id: 'cnoel', nom: 'Noël BSH', saison: 'noel', date_debut: '2026-12-01', date_fin: '2026-12-26', date_cible: null, recurrence_annuelle: true, statut: 'brouillon' }],
    bsh_communications: [
      { id: 'p1', titre: 'Secret du matin', contenu: 'Texte du secret du matin.', type: 'publication', cible: 'tous', statut: 'programme', espace: 'chaine', date_programmee: iso(2), hote_id: null, ...(AVEC_0141 ? { valide_le: iso(-1), valide_par: F, historique: false } : {}) },
      { id: 'p2', titre: 'Sondage du soir', contenu: 'Quel secret préférez-vous ?', type: 'publication', cible: 'tous', statut: 'brouillon', espace: 'cercle', date_programmee: iso(3, '21:00'), hote_id: null, ...(AVEC_0141 ? { valide_le: null, valide_par: null, historique: false } : {}) },
    ],
    bsh_animations: [{ id: 'a1', nom: 'Quiz des secrets', categorie: 'quiz', difficulte: 'moyen', questions: [], points_actifs: false, espace: 'cercle', statut: 'valide', date_prevue: iso(3, '21:00'), hote_id: null }],
    bsh_missions: AVEC_0141 ? [{ id: 'm1', hote_id: 'h1', remplacant_id: 'h2', titre: 'Publier le secret du matin', date_mission: iso(2), statut: 'acceptee', simulation: true, espace: 'chaine', communication_id: 'p1', animation_id: null, consignes: 'Publier à 8 h, répondre aux réactions pendant 30 min.', ressources: ['r1', 'r2'], statut_execution: 'a_faire', compte_rendu: null, role_mission: 'communication', heure_debut: '08:00', heure_fin: '08:30', lieu: 'Chaîne BSH' }] : [],
    bsh_ressources: [
      { id: 'r1', titre: 'Affiche validée', univers: 'secret_agenda', type: 'affiche', statut_validation: 'valide', valide_le: iso(-2), droits: 'proprietaire', empreinte: 'aa11', url: null, contenu_texte: null, campagne_id: null, espace: 'chaine', created_at: iso(-3) },
      { id: 'r2', titre: 'Visuel aux droits à vérifier', univers: 'secret_agenda', type: 'affiche', statut_validation: 'valide', valide_le: iso(-2), droits: 'a_verifier', empreinte: 'bb22', url: null, created_at: iso(-3) },
      { id: 'r3', titre: 'Scénario de quiz', univers: 'secret_games', type: 'scenario', statut_validation: 'a_valider', valide_le: null, droits: 'proprietaire', empreinte: null, contenu_texte: 'Question 1…', created_at: iso(-1) },
    ],
    bsh_creations: [], bsh_creations_versions: [], bsh_preuves_publication: [], bsh_assistant_contenus: [],
    bsh_sondages: [], bsh_rewards_campagnes: [], bsh_musique: [], bsh_musique_liens: [], bsh_evenements: [], bsh_jeux: [{ id: 'j1', nom: 'Secret Games', icone: '🎴', statut: 'publie' }],
    events_medias: [{ id: 'em1', url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', chemin_storage: 'x/fond.png', nom_fichier: 'fond-nuit.png', dossier: 'bsh', created_at: iso(-10) }],
    __ecritures: [],
  };
}
let DB = initial();
const monHote = sub => HOTES_SUB[sub] && DB.bsh_hotes.find(h => h.id === HOTES_SUB[sub] && h.statut === 'active')?.id || null;
const missionsDe = id => DB.bsh_missions.filter(m => m.statut !== 'annulee' && (m.hote_id === id || m.remplacant_id === id));
function visibles(t, sub) {
  const l = DB[t] || [];
  if (sub === F) return l;
  const moi = monHote(sub);
  if (t === 'bsh_hotes') return l.filter(h => h.profile_id === sub);
  if (t === 'profiles') return [];
  if (!moi) return [];
  const mm = missionsDe(moi);
  if (t === 'bsh_missions') return mm;
  if (t === 'bsh_communications') return l.filter(c => c.hote_id === moi || mm.some(m => m.communication_id === c.id));
  if (t === 'bsh_animations') return l.filter(a => a.hote_id === moi || mm.some(m => m.animation_id === a.id));
  if (t === 'bsh_ressources') return l.filter(r => r.statut_validation === 'valide' && !['a_verifier', 'interdit'].includes(r.droits) && mm.some(m => (m.ressources || []).includes(r.id)));
  if (t === 'bsh_preuves_publication') return l.filter(p => mm.some(m => m.communication_id === p.communication_id));
  if (t === 'bsh_hotes_disponibilites') return l.filter(x => x.hote_id === moi);
  return [];
}
function filtrer(l, sp) {
  let out = l;
  for (const [k, v] of sp.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    if (v.startsWith('eq.')) out = out.filter(x => String(x[k]) === v.slice(3));
    else if (v.startsWith('neq.')) out = out.filter(x => String(x[k]) !== v.slice(4));
    else if (v.startsWith('in.(')) { const s = v.slice(4, -1).split(',').map(x => x.replace(/"/g, '')); out = out.filter(x => s.includes(String(x[k]))); }
    else if (v.startsWith('gte.')) out = out.filter(x => String(x[k]) >= v.slice(4));
  }
  const o = sp.get('order'); if (o) { const [c, dir] = o.split(','); const [col, sens] = c.split('.'); out = [...out].sort((a, b) => String(a[col] ?? '￿').localeCompare(String(b[col] ?? '￿')) * (sens === 'desc' ? -1 : 1)); }
  const lim = sp.get('limit'); if (lim) out = out.slice(0, +lim);
  return out;
}
const erreur = (status, message, code) => ({ status, body: { message, code } });
// Garde « publication » (déclencheur bsh_garde_publication)
function garde(ancien, nouveau) {
  if (!AVEC_0141) return null;
  if (['programme', 'pret', 'publie'].includes(nouveau.statut) && !nouveau.valide_le) return 'Publication non validée : la validation précède la programmation et la publication.';
  if (nouveau.statut === 'publie' && ancien?.statut !== 'publie' && !DB.bsh_preuves_publication.some(p => p.communication_id === nouveau.id)) return 'Publication non confirmée : une preuve de publication est obligatoire.';
  if (ancien?.statut === 'publie' && !['publie', 'archive'].includes(nouveau.statut)) return 'Une publication confirmée ne peut que rester publiée ou être archivée.';
  return null;
}
async function gerer(t, q, u, sub, corps) {
  const estRpc = u.pathname.includes('/rpc/');
  const absente = !AVEC_0141 && (TABLES_0141.includes(t) || (estRpc && RPC_0141.includes(t)));
  if (absente) return erreur(404, estRpc ? `Could not find the function public.${t}` : `relation "public.${t}" does not exist`, estRpc ? 'PGRST202' : '42P01');
  if (estRpc) {
    const b = await corps(q) || {}; const moi = monHote(sub);
    if (t === 'bsh_mon_hote') return { status: 200, body: moi };
    if (t === 'bsh_hote_repondre') { const m = DB.bsh_missions.find(x => x.id === b.p_mission && x.hote_id === moi); if (!m) return erreur(400, 'Mission introuvable.'); m.statut = b.p_reponse; return { status: 200, body: { ok: true } }; }
    if (t === 'bsh_hote_execution') {
      if (!moi) return erreur(400, 'Espace réservé aux hôtes actifs.');
      if (!['en_cours', 'realisee', 'non_realisee'].includes(b.p_statut)) return erreur(400, 'Statut réservé à la fondatrice.');
      if (['realisee', 'non_realisee'].includes(b.p_statut) && String(b.p_compte_rendu || '').trim().length < 10) return erreur(400, "Compte rendu d'au moins 10 caractères demandé.");
      const m = DB.bsh_missions.find(x => x.id === b.p_mission && (x.hote_id === moi || x.remplacant_id === moi)); if (!m) return erreur(400, 'Mission introuvable.');
      Object.assign(m, { statut_execution: b.p_statut, compte_rendu: b.p_compte_rendu ?? m.compte_rendu, compte_rendu_le: new Date().toISOString(), execute_par: sub }); DB.__ecritures.push({ rpc: t, ...b, par: sub });
      return { status: 200, body: { ok: true, statut_execution: b.p_statut } };
    }
    if (t === 'bsh_confirmer_publication') {
      const c = DB.bsh_communications.find(x => x.id === b.p_communication); if (!c) return erreur(400, 'Publication introuvable.');
      let source = null; if (sub === F) source = 'fondatrice'; else if (moi && (c.hote_id === moi || missionsDe(moi).some(m => m.communication_id === c.id))) source = 'hote';
      if (!source) return erreur(400, 'Confirmation non autorisée.');
      if (!c.valide_le) return erreur(400, 'Publication non validée.');
      if (!['programme', 'pret'].includes(c.statut)) return erreur(400, 'Seule une publication programmée peut être confirmée.');
      if (String(b.p_preuve || '').trim().length < 8) return erreur(400, 'new row violates check constraint "bsh_preuves_publication_preuve_check"');
      DB.bsh_preuves_publication.push({ id: crypto.randomUUID(), communication_id: c.id, preuve: b.p_preuve, preuve_url: b.p_url || null, confirme_par: sub, source, publie_le: new Date().toISOString() });
      Object.assign(c, { statut: 'publie', date_publication_effective: new Date().toISOString(), publiee_le: new Date().toISOString() }); DB.__ecritures.push({ rpc: t, ...b, par: sub });
      return { status: 200, body: { ok: true, source } };
    }
    return null;
  }
  if (t === 'profiles' && HOTES_SUB[sub]) return { status: 200, body: (q.headers.accept || '').includes('pgrst.object') ? { prenom: null, role: 'cliente', membership_status: 'customer', age_verifi: true, date_naissance: '1990-01-01' } : [{ prenom: null, role: 'cliente', membership_status: 'customer', age_verifi: true, date_naissance: '1990-01-01' }] };
  if (t === '__bsh_etat') return { status: 200, body: DB };
  if (t === '__bsh_reinit') { DB = initial(); return { status: 200, body: { ok: true } }; }
  if (!(t in DB) || t.startsWith('__')) return null;
  const sp = u.searchParams; const unique = (q.headers.accept || '').includes('pgrst.object');
  if (q.method === 'GET' || q.method === 'HEAD') { const out = filtrer(visibles(t, sub), sp); return { status: 200, body: unique ? (out[0] || null) : out }; }
  if (sub !== F) return erreur(403, 'new row violates row-level security policy', '42501'); // seuls les comptes fondatrice écrivent directement
  if (q.method === 'POST') {
    const b = await corps(q); const rows = (Array.isArray(b) ? b : [b]).map(x => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...x }));
    for (const r of rows) {
      if (!AVEC_0141 && t === 'bsh_missions' && ('remplacant_id' in r || 'ressources' in r)) return erreur(400, "Could not find the 'remplacant_id' column of 'bsh_missions' in the schema cache", 'PGRST204');
      if (!AVEC_0141 && t === 'bsh_communications' && ('valide_le' in r || 'historique' in r || 'nature' in r || 'plateforme' in r)) return erreur(400, "Could not find the 'valide_le' column of 'bsh_communications' in the schema cache", 'PGRST204');
      if (t === 'bsh_communications') { const g = garde(null, r); if (g) return erreur(400, g, 'P0001'); }
      if (t === 'bsh_ressources' && r.empreinte && DB.bsh_ressources.some(x => (x.empreinte || '').toLowerCase() === r.empreinte.toLowerCase())) return erreur(409, 'duplicate key value violates unique constraint "bsh_ressources_empreinte_unique"', '23505');
      if (t === 'bsh_ressources' && r.statut_validation === 'valide' && !r.valide_le) return erreur(400, 'violates check constraint "bsh_ressources_validation_datee"', '23514');
      if (t === 'bsh_creations_versions') { r.numero = DB.bsh_creations_versions.filter(v => v.creation_id === r.creation_id).length + 1; const c = DB.bsh_creations.find(x => x.id === r.creation_id); if (c) c.version_courante = r.numero; }
      if (t === 'bsh_creations') r.version_courante = 0;
      if (t === 'bsh_missions') r.statut_execution = r.statut_execution || 'a_faire';
      if (t === 'bsh_assistant_contenus' && r.statut === 'valide' && !r.valide_le) return erreur(400, 'violates check constraint "bsh_assistant_validation_datee"', '23514');
      if (t === 'bsh_rewards_campagnes' && r.categorie && !['sweet_rewards', 'golden_ticket', 'secret_gift', 'members_rewards'].includes(r.categorie)) return erreur(400, 'violates check constraint "bsh_rewards_categorie_check"', '23514');
    }
    DB[t].push(...rows); DB.__ecritures.push(...rows.map(r => ({ table: t, op: 'insert', ...r })));
    return { status: 201, body: (q.headers.prefer || '').includes('return=minimal') ? null : rows };
  }
  if (q.method === 'PATCH') {
    if (t === 'bsh_creations_versions') return erreur(400, 'Historique des versions : ajout seul (ni modification ni suppression).', 'P0001');
    const b = await corps(q); const cibles = filtrer(DB[t], sp);
    if (!AVEC_0141 && t === 'bsh_communications' && ('valide_le' in b || 'historique' in b)) return erreur(400, "Could not find the 'valide_le' column of 'bsh_communications' in the schema cache", 'PGRST204');
    if (!AVEC_0141 && t === 'bsh_agenda_reglages' && Object.keys(b).some(k => k.startsWith('continuite_'))) return erreur(400, "Could not find the 'continuite_active' column of 'bsh_agenda_reglages' in the schema cache", 'PGRST204');
    if (t === 'bsh_communications') for (const c of cibles) { const g = garde(c, { ...c, ...b }); if (g) return erreur(400, g, 'P0001'); }
    cibles.forEach(x => Object.assign(x, b)); DB.__ecritures.push(...cibles.map(x => ({ table: t, op: 'update', id: x.id, ...b })));
    return { status: 200, body: cibles };
  }
  if (q.method === 'DELETE') {
    if (t === 'bsh_creations_versions') return erreur(400, 'Historique des versions : ajout seul (ni modification ni suppression).', 'P0001');
    const cibles = filtrer(DB[t], sp); DB[t] = DB[t].filter(x => !cibles.includes(x)); return { status: 200, body: cibles };
  }
  return null;
}
module.exports = { gerer, HOTES_SUB };
