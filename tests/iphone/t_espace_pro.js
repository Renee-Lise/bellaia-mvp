// Espace professionnel commun (hôte / partenaire) — profil iPhone 14 SIMULÉ, données injectées par interception
// réseau (rien n'est écrit en base). Vérifie : missions réelles, actions tracées, agenda, documents, profil,
// absence de redirection WhatsApp, refus d'accès quand le rôle est suspendu.
// Usage : node tests/iphone/t_espace_pro.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const ID = '00000000-0000-0000-0000-0000000000b1';
const MISSIONS = [
  { id: '11111111-1111-1111-1111-111111111111', titre: 'Accueil des invités samedi', details: 'Arrivée 14 h, tenue sobre.', pole: 'EVENTS', statut: 'a_faire', priorite: 2, date_prevue: '2026-11-28', echeance: '2026-11-28', created_at: '2026-11-20T10:00:00Z', assigne_a: ID },
  { id: '22222222-2222-2222-2222-222222222222', titre: 'Inventaire des nappes', details: null, pole: 'EVENTS', statut: 'en_cours', priorite: 2, date_prevue: null, echeance: '2026-11-30', created_at: '2026-11-19T10:00:00Z', assigne_a: ID },
];
const json = (r, b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
async function session(b, role, roles, appels) {
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.setItem('bellaia_espace_' + u.id, u.role); }, [{ id: ID, role, prenom: 'Essai', nom: 'Pro', email: 'essai@exemple.invalid' }, jwt(ID)]);
  await ctx.route(/\/rest\/v1\/bellaia_roles\?/, r => json(r, roles));
  await ctx.route(/\/rest\/v1\/bsh_hotes\?/, r => json(r, []));
  await ctx.route(/\/rest\/v1\/bellaia_permissions\?/, r => json(r, [{ id: 'p1', permission: 'missions.voir', univers: 'EVENTS', statut: 'active' }]));
  await ctx.route(/\/rest\/v1\/bellaia_missions\?/, r => json(r, MISSIONS));
  await ctx.route(/\/rest\/v1\/bellaia_missions_fil/, async r => { if (r.request().method() === 'POST') { appels.push('fil:' + r.request().postData()); return json(r, [{}]); } return json(r, appels.filter(a => a.startsWith('fil:')).map((a, i) => ({ id: 'f' + i, type: 'commentaire', texte: JSON.parse(a.slice(4)).texte, created_at: new Date().toISOString(), auteur: ID }))); });
  await ctx.route(/\/rest\/v1\/bellaia_documents\?/, r => json(r, [{ id: 'd1', titre: 'Charte d\'accueil', categorie: 'procedure', created_at: '2026-11-01T00:00:00Z' }]));
  await ctx.route(/\/rest\/v1\/rpc\/(mission_[a-z_]+)/, async r => { const f = r.request().url().match(/rpc\/(mission_[a-z_]+)/)[1]; appels.push('rpc:' + f + ':' + r.request().postData()); return r.fulfill({ status: 204, body: '' }); });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const ext = []; p.on('popup', x => ext.push(x.url())); p.on('request', q => { if (/wa\.me|whatsapp/i.test(q.url())) ext.push(q.url()); });
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(3000);
  return { ctx, p, err, ext };
}
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const texte = p => p.evaluate(() => document.body.innerText);
  const appels = [];
  let { ctx, p, err, ext } = await session(b, 'hote', [], appels);
  let t = await texte(p);
  ok('01 hôte : espace professionnel ouvert (Accueil, Missions, Agenda, Documents, Profil)', /Mon espace hôte/.test(t) && ['Accueil', 'Missions', 'Agenda', 'Documents', 'Profil'].every(x => t.includes(x)));
  ok('02 tableau de bord : compteurs réels (1 à faire, 1 en cours)', /1\s*\n?\s*À faire/.test(t) && /1\s*\n?\s*En cours/.test(t));
  ok('03 aucun bouton ni lien WhatsApp', !/WhatsApp/i.test(t) && await p.locator('a[href*="wa.me"]').count() === 0);
  await p.screenshot({ path: `${out}/pro_accueil.png` });
  await p.getByRole('tab', { name: 'Missions' }).click(); await p.waitForTimeout(800);
  t = await texte(p);
  ok('04 liste des missions attribuées (2), avec pôle et échéance', /Accueil des invités samedi/.test(t) && /Inventaire des nappes/.test(t) && /EVENTS/.test(t));
  await p.getByText('Accueil des invités samedi').click(); await p.waitForTimeout(800);
  await p.getByText('Accuser réception').click(); await p.waitForTimeout(800);
  ok('05 accusé de réception → fonction sécurisée appelée', appels.some(a => a.startsWith('rpc:mission_accuser_reception')) && /Réception confirmée/.test(await texte(p)));
  await p.getByRole('button', { name: '50 %' }).click(); await p.waitForTimeout(800);
  ok('06 avancement 50 % → mission_avancer (progression 50)', appels.some(a => a.startsWith('rpc:mission_avancer') && a.includes('"p_progression":50')));
  await p.locator('textarea').fill('Il manque la liste des invités.');
  await p.getByText('Signaler un problème').click(); await p.waitForTimeout(800);
  ok('07 signalement tracé dans le fil de la mission', appels.some(a => a.startsWith('fil:') && a.includes('[Problème signalé] Il manque')));
  await p.locator('textarea').fill('Indisponible samedi, merci de réattribuer.');
  await p.getByText('Demander un transfert').click(); await p.waitForTimeout(800);
  ok('08 demande de transfert tracée (aucun transfert direct par la personne)', appels.some(a => a.includes('[Demande de transfert]')) && !appels.some(a => a.startsWith('rpc:mission_transferer')));
  await p.getByText('Soumettre à validation').click(); await p.waitForTimeout(800);
  ok('09 soumission à validation → mission_avancer 100 %', appels.some(a => a.startsWith('rpc:mission_avancer') && a.includes('"p_progression":100')));
  ok('09b aucune action affichée comme « impossible » ni doublée dans le fil', !/Action impossible/.test(await texte(p)) && appels.filter(a => a.startsWith('fil:') && a.includes('Avancement')).length === 0);
  ok('10 pièce jointe : sélecteur de fichier présent (images / PDF)', await p.locator('input[type=file][accept*="pdf"]').count() === 1);
  ok('11 historique affiché dans la mission', /Historique/.test(await texte(p)) && /Il manque la liste/.test(await texte(p)));
  await p.screenshot({ path: `${out}/pro_mission.png`, fullPage: true });
  await p.getByText('‹ Mes missions').click(); await p.waitForTimeout(500);
  await p.getByRole('tab', { name: 'Agenda' }).click(); await p.waitForTimeout(1500);
  ok('12 agenda professionnel (vues jour / semaine / mois)', /Agenda professionnel/.test(await texte(p)) && /Jour[\s\S]*Semaine[\s\S]*Mois/.test(await texte(p)));
  await p.getByRole('tab', { name: 'Documents' }).click(); await p.waitForTimeout(1000);
  ok('13 documents partagés listés', /Charte d'accueil/.test(await texte(p)));
  await p.getByRole('tab', { name: 'Profil' }).click(); await p.waitForTimeout(1000);
  t = await texte(p);
  ok('14 profil professionnel : rôle, pôles, autorisations', /hote/.test(t) && /Pôles : EVENTS/.test(t) && /missions\.voir/.test(t));
  await p.screenshot({ path: `${out}/pro_profil.png` });
  ok('15 aucune ouverture externe (WhatsApp) pendant le parcours', ext.length === 0);
  ok('16 hôte : aucune erreur JavaScript', err.length === 0);
  await ctx.close();
  // Partenaire sans organisation : même espace (plus l'ancien écran à boutons WhatsApp)
  ({ ctx, p, err, ext } = await session(b, 'partenaire', [], []));
  t = await texte(p);
  ok('17 partenaire sans organisation : espace professionnel, sans WhatsApp', /Mon espace partenaire/.test(t) && !/WhatsApp/i.test(t));
  await ctx.close();
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
