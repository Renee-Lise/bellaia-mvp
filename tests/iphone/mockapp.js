// Base simulée pour tester l'APPLICATION RÉELLE par rôle (données de démonstration, jamais écrites).
const http = require('http');
const sem = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0', cliente: '00000000-0000-0000-0000-0000000000a0', collaborateur: '00000000-0000-0000-0000-0000000000c0' };
const roleDe = sub => Object.keys(UID).find(k => UID[k] === sub);
const M = (titre, statut, priorite, j, univers, t) => ({ id: titre, titre, statut, priorite, echeance: sem(j), univers, pole: univers, temps_passe_min: t, updated_at: new Date(Date.now() - 864e5).toISOString(), assigne_a: UID.assistante });
const missions = [M("Préparer les étiquettes de la commande du samedi", "a_faire", 1, 1, "FOOD", 0), M("Mettre à jour les fiches recettes proposées", "en_cours", 2, 3, "FOOD", 45), M("Visuel Canva : annonce de la carte de saison", "a_valider", 2, 2, "STUDIO", 80), M("Inventaire des emballages", "fait", 2, -2, "FOOD", 60)];
const units = [["STUDIO", "Bella'Studio", "actif"], ["BSH", "Bella'Secret Home", "actif"], ["ODYSSEE", "Bella'Odyssée", "actif"], ["EVENTS", "Bella'Even's", "actif"], ["FOOD", "Bella'Food", "en développement"], ["VILO", "Vilo'Assistance", "actif"], ["INVEST", "BellaInvest", "en développement"], ["STRUCTURE", "Bella'Structure", "en développement"], ["GENERAL", "Général", "actif"], ["EDITIONS", "Bella'Éditions", "actif"], ["MOTIPY", "Mo Ti-Péyi", "actif"], ["VILDOR", "Vil'Dor Pâtisse", "partenaire"]].map(([code, nom, statut], ordre) => ({ code, nom, statut, ordre }));
const JEUX = JSON.parse(require('fs').readFileSync(__dirname + '/bshjeux.json', 'utf8'));
const CAT_FOOD = [
  { id: 'cp1', reference: 'F-1', business_unit: 'FOOD', categorie_slug: 'patisserie', nom: 'Tarte coco (test)', description_courte: 'Test', prix: 4.5, allergenes: ['Gluten', 'Œufs'], galerie_photos: [], statut: 'actif', visible_client: true, disponible: true },
  { id: 'cp2', reference: 'F-2', business_unit: 'FOOD', categorie_slug: 'repas', nom: 'Colombo de poulet (test)', description_courte: '', prix: 12, allergenes: [], galerie_photos: [], statut: 'actif', visible_client: true, disponible: true },
  { id: 'cp3', reference: 'F-3', business_unit: 'FOOD', categorie_slug: 'boissons', nom: 'Jus maison (test)', description_courte: '', prix: null, allergenes: [], galerie_photos: [], statut: 'actif', visible_client: true, disponible: true }];
const STOCKS_BSH = require('fs').existsSync(__dirname + '/stocks_bsh_test.json') ? JSON.parse(require('fs').readFileSync(__dirname + '/stocks_bsh_test.json', 'utf8')) : null;
const ECRITURES = [];
const D = {
  catalogue_produits: CAT_FOOD, v_catalogue_food_public: [{ id: 'cp1', commandable: true }, { id: 'cp2', commandable: false }],
  ...JEUX,
  v_dashboard_finances: [{ ca_facture_mois: 0, encaisse_mois: 0, total_en_attente: 0 }], v_dashboard_crm: [{ nb_clientes_actives: 7 }],
  v_stocks_critiques: [{ id: 's1', nom: 'Yara rose poudré', univers: 'ODYSSEE', quantite: 0, quantite_min: 2 }],
  bellaia_actions: [["Décider de l'application de la migration 0129", "BSH", 2], ["Secret Stories : choisir le prestataire de paiement", "BSH", 2], ["Valider les portails assistante et cliente", "STUDIO", 2]].map(([titre, univers, priorite], i) => ({ id: 'a' + i, titre, univers, priorite })),
  business_units: units,
};
const MEM = { bsh_parties: [], bsh_parties_participants: [], bsh_parties_tirages: [] };
const CARTES_AV = [{ id: 'av1', emoji: '🎭', nom: 'Action', question: 'Offrez un compliment sincère à la personne à votre gauche.' }, { id: 'av2', emoji: '💬', nom: 'Vérité', question: 'Quel est votre plus joli souvenir de cette année ?' }];
const filtres = qs => [...new URLSearchParams(qs).entries()].filter(([k, v]) => /^(eq|in)\./.test(v)).map(([k, v]) => [k, v.slice(3)]);
const corps = q => new Promise(ok => { let d = ''; q.on('data', c => d += c); q.on('end', () => { try { ok(JSON.parse(d || 'null')); } catch { ok(null); } }); });
http.createServer(async (q, r) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*', 'Content-Type': 'application/json' };
  if (q.method === 'OPTIONS') { r.writeHead(204, h); return r.end(); }
  let sub = ''; try { sub = JSON.parse(Buffer.from((q.headers.authorization || '').split(' ')[1].split('.')[1], 'base64').toString()).sub; } catch {}
  const role = roleDe(sub); const u = new URL(q.url, 'http://x'); const t = u.pathname.split('/').pop(); const qs = decodeURIComponent(u.search);
  if (u.pathname === '/auth/v1/user') { if (!role) { r.writeHead(401, h); return r.end('{"message":"invalid"}'); } r.writeHead(200, h); return r.end(JSON.stringify({ id: sub, aud: 'authenticated', role: 'authenticated' })); }
  if (MEM[t]) {
    const h2 = { ...h }; const obj = (q.headers.accept || '').includes('pgrst.object'); const f = filtres(u.search);
    const match = x => f.every(([k, v]) => String(x[k]) === v);
    let res;
    if (q.method === 'POST') { const b = await corps(q); const rows = (Array.isArray(b) ? b : [b]).map(x => ({ id: require('crypto').randomUUID(), created_at: new Date().toISOString(), rejoint_le: new Date().toISOString(), tour_actuel: 0, statut: 'en_cours', ...x })); MEM[t].push(...rows); res = rows; }
    else if (q.method === 'PATCH') { const b = await corps(q); res = MEM[t].filter(match); res.forEach(x => Object.assign(x, b)); }
    else if (q.method === 'DELETE') { res = MEM[t].filter(match); MEM[t] = MEM[t].filter(x => !match(x)); }
    else { res = MEM[t].filter(match); if (u.searchParams.get('order')?.startsWith('tour.desc')) res = [...res].sort((a, b) => b.tour - a.tour); }
    const l = u.searchParams.get('limit'); if (l) res = res.slice(0, +l);
    r.writeHead(200, h2); return r.end(JSON.stringify(obj ? (res[0] || null) : res));
  }
  let out = D[t] || [];
  if (t === 'v_catalogue_public' && qs.includes('univers=eq.BSH')) out = JSON.parse(require('fs').readFileSync(__dirname + '/apercu_bsh_produits.json', 'utf8'));
  if (t === 'bsh_jeux_cartes' && (qs.includes('97991d2d') || qs.includes('id=eq.av'))) out = CARTES_AV.filter(c => !qs.includes('nom=eq.') || qs.includes('nom=eq.' + c.nom)).filter(c => !qs.includes('id=eq.av') || qs.includes('id=eq.' + c.id));
  if (t === 'mes_acces') out = { fondatrice: role === 'fondatrice', roles: [], permissions: role === 'assistante' ? ['food.consulter:FOOD', 'food.commandes:FOOD'] : [], hote_bsh: false };
  else if (t === 'bellaia_missions') out = role === 'assistante' && qs.includes('assigne_a=eq.' + sub) ? missions : [];
  else if (t === 'profiles') out = role === 'cliente' ? [{ prenom: null, role: 'cliente', membership_status: 'customer', age_verifi: false, date_naissance: null }] : [{ prenom: null, role }];
  else if (t === 'bellaia_commandes') out = role === 'cliente' && qs.includes('created_by=eq.') ? [{ id: 'c1', reference: 'BF-DEMO-0001', bu: 'FOOD', statut: 'BROUILLON', total: 37, created_at: sem(-1) }] : role === 'fondatrice' ? [{ id: 'c1', bu: 'FOOD', total: 37, statut: 'BROUILLON', created_at: sem(-1) }] : [];
  else if (['v_dashboard_finances', 'v_dashboard_crm', 'v_stocks_critiques', 'bellaia_actions'].includes(t) && role !== 'fondatrice') out = [];
  else if (t === 'stocks' && q.method === 'PATCH' && role === 'fondatrice') { const b = await corps(q); const id = (u.searchParams.get('id') || '').replace('eq.', ''); ECRITURES.push({ id, ...b }); const row = (STOCKS_BSH || []).find(x => x.id === id); if (row) Object.assign(row, b); out = row ? [row] : []; }
  else if (t === 'stocks' && STOCKS_BSH) out = role === 'fondatrice' ? STOCKS_BSH : [];
  else if (t === '__ecritures') out = ECRITURES;
  else if (t === '__vider_parties') { MEM.bsh_parties = []; MEM.bsh_parties_participants = []; MEM.bsh_parties_tirages = []; out = { ok: true }; }
  else if (t === 'stocks') out = role === 'fondatrice' ? ['514038001020', '597218003020', '501001', '999999999999'].map(r => ({ notes: 'Import Concorde Pro — Réf ' + r + ' — test' })) : [];
  else if (t === 'client_mes_dossiers_events') out = [];
  else if (t.startsWith('ss_') || t === 'rpc') out = [];
  if (q.method === 'POST' && u.pathname.includes('/rpc/') && !['mes_acces', 'client_mes_dossiers_events'].includes(t)) out = Array.isArray(out) ? out : out;
  if (u.pathname.startsWith('/rest/v1/ss_') || ['ss_studio', 'ss_est_adulte'].includes(t)) { r.writeHead(404, h); return r.end(JSON.stringify({ message: 'relation does not exist' })); }
  if (t === 'bsh_jeux_cartes' && Array.isArray(out) && /[?&]id=eq\./.test(qs)) out = out.filter(c => qs.includes('id=eq.' + c.id + '&') || qs.endsWith('id=eq.' + c.id));
  if ((q.headers.accept || '').includes('pgrst.object')) out = Array.isArray(out) ? (out[0] || null) : out;
  r.writeHead(200, h); r.end(JSON.stringify(out));
}).listen(54337, () => console.log('ok'));
