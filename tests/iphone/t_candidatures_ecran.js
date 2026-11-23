// Administration « Candidatures » (fondatrice) + acceptation d'invitation — profil iPhone 13 SIMULÉ.
// Toutes les données sont simulées par interception réseau (aucune écriture en base, aucun faux compte en production).
// Usage : node tests/iphone/t_candidatures_ecran.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0', cliente: '00000000-0000-0000-0000-0000000000c3' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const json = (r, b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
const JETON = 'a'.repeat(64);
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  const session = async (role, url = 'http://localhost:3160/') => {
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role, email: role + '@exemple.invalid' }, jwt(UID[role])]);
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
    return { ctx, p, err, url };
  };
  const ouvrir = async (s) => { await s.p.goto(s.url, { waitUntil: 'networkidle', timeout: 120000 }); await s.p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await s.p.waitForTimeout(2500); };
  const cliquer = (p, re) => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test(x.textContent || '')); if (e) { e.click(); return true; } return false; }, re.source);
  const allerCandidatures = async p => { await p.waitForSelector('text=Centre de direction', { timeout: 60000 }); await cliquer(p, /Organisation/); await p.waitForTimeout(800); await cliquer(p, /📨 Candidatures/); await p.waitForTimeout(2500); };
  const texte = p => p.evaluate(() => document.body.innerText);

  // A. Table absente (0135 non appliquée) : message clair, aucune erreur
  let s = await session('fondatrice');
  await s.ctx.route(/\/rest\/v1\/bellaia_candidatures\?/, r => json(r, { code: '42P01', message: 'relation "public.bellaia_candidatures" does not exist' }, 404));
  await ouvrir(s); await allerCandidatures(s.p);
  ok('01 0135 non appliquée : « en attente d\'activation », aucun formulaire ouvert', /en attente d'activation/.test(await texte(s.p)) && /COMPLET/.test(await texte(s.p)));
  ok('02 aucune erreur JavaScript', s.err.length === 0);
  await s.ctx.close();

  // B. Table présente : liste, proposition, refus motivé, acceptation, invitation
  const CANDS = [
    { id: 'c1111111-1111-4111-8111-111111111111', type: 'hote', nom_affiche: 'Candidate A', email: 'a@exemple.invalid', ville: 'Cayenne', poles: ['EVENTS'], disponibilites: 'week-ends', motivation: 'Accueil et service.', langues: ['fr'], donnees: {}, majeur_declare: true, statut: 'nouvelle', proposition: null, created_at: '2026-11-22T10:00:00Z', conserver_jusqu_au: '2027-05-22' },
    { id: 'c2222222-2222-4222-8222-222222222222', type: 'assistant', nom_affiche: 'Candidat B', email: 'b@exemple.invalid', ville: null, poles: [], disponibilites: null, experience: null, langues: [], donnees: {}, majeur_declare: true, statut: 'nouvelle', proposition: null, created_at: '2026-11-21T10:00:00Z', conserver_jusqu_au: '2027-05-21' },
  ];
  const appels = [];
  s = await session('fondatrice');
  await s.ctx.route(/\/rest\/v1\/bellaia_candidatures\?/, async r => {
    const q = r.request(); const u = new URL(q.url());
    if (q.method() === 'PATCH') { const id = u.searchParams.get('id').slice(3); const patch = JSON.parse(q.postData()); appels.push('patch:' + JSON.stringify(patch));
      const c = CANDS.find(x => x.id === id); Object.assign(c, patch); return json(r, [c]); }
    const idf = u.searchParams.get('id'); return json(r, idf ? CANDS.filter(c => 'eq.' + c.id === idf) : CANDS);
  });
  await s.ctx.route(/\/rest\/v1\/bellaia_candidatures_historique\?/, r => json(r, appels.filter(a => a.startsWith('patch:')).map((a, i) => ({ id: i, action: 'update', motif: JSON.parse(a.slice(6)).decision_motif || null, le: new Date().toISOString() }))));
  await s.ctx.route(/\/rest\/v1\/bellaia_candidatures_documents\?/, r => json(r, []));
  await s.ctx.route(/\/rest\/v1\/rpc\/candidature_proposer/, async r => { const a = JSON.parse(r.request().postData()); appels.push('proposer:' + a.p_proposition.statut_propose); CANDS.find(c => c.id === a.p_id).proposition = a.p_proposition; r.fulfill({ status: 204, body: '' }); });
  await s.ctx.route(/\/rest\/v1\/rpc\/creer_invitation/, async r => { appels.push('invitation:' + r.request().postData()); json(r, JETON); });
  await ouvrir(s); await allerCandidatures(s.p);
  let t = await texte(s.p);
  ok('03 liste « À traiter (2) » avec type et statut', /À traiter \(2\)/.test(t) && /Candidate A/.test(t) && /Hôte \/ hôtesse/.test(t));
  await s.p.screenshot({ path: `${out}/cand_liste.png` });
  await s.p.getByText('Candidat B').click(); await s.p.waitForTimeout(1200);
  ok('04 dossier : éléments manquants signalés', /Éléments manquants/.test(await texte(s.p)));
  await cliquer(s.p, /Calculer la proposition/); await s.p.waitForTimeout(1500);
  t = await texte(s.p);
  ok('05 proposition par règles : « Incomplet », jamais une décision', appels.includes('proposer:incomplet') && /Statut proposé : Incomplet/.test(t) && /n'est pas une décision/.test(t));
  ok('06 « Refuser » impossible sans motif', await s.p.locator('button', { hasText: /^Refuser$/ }).isDisabled());
  await s.p.locator('textarea').fill('Profil ne correspondant pas aux besoins actuels.');
  await cliquer(s.p, /^Refuser$/); await s.p.waitForTimeout(1500);
  ok('07 refus motivé enregistré (statut + motif), visible dans l\'historique', appels.some(a => a.includes('"statut":"refuse"') && a.includes('Profil ne correspondant')) && /Refusé/.test(await texte(s.p)) && /Profil ne correspondant/.test(await texte(s.p)));
  await cliquer(s.p, /Toutes les candidatures/); await s.p.waitForTimeout(800);
  await s.p.getByText('Candidate A').click(); await s.p.waitForTimeout(1200);
  ok('08 avant acceptation : pas de bouton d\'invitation', !/Créer l'invitation/.test(await texte(s.p)));
  await cliquer(s.p, /^Accepter$/); await s.p.waitForTimeout(1500);
  ok('09 acceptation enregistrée, aucun accès ouvert automatiquement', appels.some(a => a.includes('"statut":"accepte"')) && /Créer l'invitation/.test(await texte(s.p)) && !appels.some(a => a.startsWith('invitation:')));
  await cliquer(s.p, /Créer l'invitation/); await s.p.waitForTimeout(1500);
  const lien = await s.p.locator('input[aria-label="Lien d\'invitation"]').inputValue().catch(() => '');
  ok('10 invitation : rôle « hote » seul, aucune permission, lien à usage unique affiché (rien n\'est envoyé)', appels.some(a => a.startsWith('invitation:') && a.includes('"p_roles":["hote"]') && a.includes('"p_permissions":[]')) && lien.endsWith('?invitation=' + JETON) && /Rien n'est envoyé automatiquement/.test(await texte(s.p)));
  await s.p.screenshot({ path: `${out}/cand_invitation.png`, fullPage: true });
  ok('11 fondatrice : aucune erreur JavaScript', s.err.length === 0);
  await s.ctx.close();

  // C. Assistante : rubrique absente de sa navigation
  s = await session('assistante'); await ouvrir(s);
  ok('12 assistante : aucune rubrique « Candidatures »', !/📨 Candidatures/.test(await texte(s.p)));
  await s.ctx.close();

  // D. Personne invitée : acceptation (connectée)
  const appelsInv = [];
  s = await session('cliente', 'http://localhost:3160/?invitation=' + JETON);
  await s.ctx.route(/\/rest\/v1\/rpc\/accepter_invitation/, async r => { appelsInv.push(r.request().postData()); r.fulfill({ status: 204, body: '' }); });
  await ouvrir(s);
  ok('13 lien d\'invitation : écran d\'acceptation, jeton retiré de l\'adresse affichée', /Invitation Bellaïa/.test(await texte(s.p)) && !s.p.url().includes('invitation='));
  ok('14 bouton désactivé tant que les conditions ne sont pas acceptées', await s.p.locator('button', { hasText: "Accepter l'invitation" }).isDisabled());
  await s.p.locator('input[type=checkbox]').check(); await cliquer(s.p, /Accepter l'invitation/); await s.p.waitForTimeout(1500);
  ok('15 acceptation : fonction sécurisée appelée avec la version des conditions', appelsInv.length === 1 && appelsInv[0].includes(JETON) && appelsInv[0].includes('conditions-collaboration-v1') && /Invitation acceptée/.test(await texte(s.p)));
  await s.p.screenshot({ path: `${out}/invitation_acceptee.png` });
  ok('16 personne invitée : aucune erreur JavaScript', s.err.length === 0);
  await s.ctx.close();
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
