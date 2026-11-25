// Accès & permissions (refonte 24/11) + « Mes espaces » d'une partenaire — simulateur Chromium profil iPhone 13 (PAS un iPhone réel).
// Base simulée DANS le test (interception réseau) : personnes fictives uniquement, aucune écriture réelle.
// Usage : node tests/iphone/t_acces_permissions.js <dossier>   (mockapp.js + next dev sur :3160)
const { chromium, devices } = require('playwright'); const fs = require('fs');
const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const F = '00000000-0000-0000-0000-0000000000f1', A = '00000000-0000-0000-0000-00000000a001', B1 = '00000000-0000-0000-0000-00000000b001', B2 = '00000000-0000-0000-0000-00000000b002', D = '00000000-0000-0000-0000-00000000d001';
const ORG = '00000000-0000-0000-0000-0000000000c1';
let ok = 0, n = 0; const R = []; const t = (nom, v) => { n++; if (v) ok++; R.push(`${v ? '✅' : '❌'} ${nom}`); };
const attendre = ms => new Promise(r => setTimeout(r, ms));
let uid = 0; const nid = () => `00000000-0000-0000-0000-${String(++uid).padStart(12, '0')}`;
const DB = {
  profiles: [
    { id: F, prenom: 'Fondatrice', nom: 'TEST', role: 'fondatrice', statut: 'actif', email: 'fondatrice@exemple.invalid' },
    { id: A, prenom: 'Lina', nom: 'TESTEUR', role: 'partenaire', statut: 'actif', email: 'lina.testeur@exemple.invalid' },
    { id: B1, prenom: 'Marie', nom: 'DUPONT', role: 'cliente', statut: 'actif', email: 'marie1@exemple.invalid' },
    { id: B2, prenom: 'Marie', nom: 'DUPONT', role: 'cliente', statut: 'actif', email: 'marie2@exemple.invalid' },
    { id: D, prenom: 'Paul', nom: 'HÔTE', role: 'hote', statut: 'actif', email: 'paul@exemple.invalid' },
  ],
  roles: [
    { id: nid(), user_id: A, role: 'hote', statut: 'actif', organisation_id: ORG },
    { id: nid(), user_id: A, role: 'assistante', statut: 'actif', organisation_id: ORG },
    { id: nid(), user_id: A, role: 'collaborateur', statut: 'actif', organisation_id: ORG },
  ],
  perms: [{ id: nid(), user_id: A, permission: 'food.consulter', univers: 'FOOD', expire_le: null }, { id: nid(), user_id: A, permission: 'missions.gerer', univers: '*', expire_le: null }],
};
const ecritures = []; let echecPerm = false;
const equipe = () => DB.profiles.filter(p => p.role !== 'fondatrice' && (!['cliente', 'client'].includes(p.role) || DB.roles.some(r => r.user_id === p.id))).map(p => ({
  id: p.id, nom: `${p.prenom} ${p.nom}`, email: p.email, role_profil: p.role,
  roles: DB.roles.filter(r => r.user_id === p.id).map(r => ({ id: r.id, role: r.role, statut: r.statut, organisation_id: r.organisation_id })),
  permissions: DB.perms.filter(x => x.user_id === p.id).map(x => ({ id: x.id, permission: x.permission, univers: x.univers, expire_le: null })),
}));
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const idDe = u => (new URL(u).searchParams.get('id') || '').replace('eq.', '');

async function baseSimulee(ctx) {
  await ctx.route(/\/rest\/v1\/rpc\/fondatrice_equipe/, r => json(r, equipe()));
  await ctx.route(/\/rest\/v1\/rpc\/repertoire_contacts/, r => json(r, { message: 'Could not find the function public.repertoire_contacts' }, 404));
  await ctx.route(/\/rest\/v1\/rpc\/mes_acces/, r => json(r, { fondatrice: true, roles: [], permissions: [], hote_bsh: false }));
  await ctx.route(/\/rest\/v1\/bellaia_organisations\?/, r => json(r, [{ id: ORG, nom_commercial: "Vil'Dor Pâtisse" }]));
  await ctx.route(/\/rest\/v1\/bellaia_journal\?/, r => json(r, []));
  await ctx.route(/\/rest\/v1\/profiles\?/, async r => {
    const q = r.request(); const u = q.url();
    if (q.method() === 'PATCH') { const p = DB.profiles.find(x => x.id === idDe(u)); Object.assign(p, q.postDataJSON()); ecritures.push(`PATCH profiles ${JSON.stringify(q.postDataJSON())}`); return json(r, [p]); }
    if (/id=eq\./.test(u)) { const p = DB.profiles.find(x => x.id === idDe(u)); return json(r, p ? [{ role: p.role, prenom: p.prenom, nom: p.nom }] : []); }
    return json(r, DB.profiles.map(({ email, ...p }) => p));
  });
  await ctx.route(/\/rest\/v1\/bellaia_roles/, async r => {
    const q = r.request(); const u = q.url();
    if (q.method() === 'POST') { const b = q.postDataJSON(); if (DB.roles.some(x => x.user_id === b.user_id && x.role === b.role && (x.organisation_id || null) === (b.organisation_id || null))) return json(r, { message: 'doublon' }, 409); DB.roles.push({ id: nid(), ...b }); ecritures.push(`POST roles ${b.role}`); return r.fulfill({ status: 201, body: '' }); }
    if (q.method() === 'PATCH') { const x = DB.roles.find(y => y.id === idDe(u)); Object.assign(x, q.postDataJSON()); ecritures.push(`PATCH roles ${x.role}→${x.statut}`); return json(r, [x]); }
    return json(r, []);
  });
  await ctx.route(/\/rest\/v1\/bellaia_permissions/, async r => {
    const q = r.request(); const u = q.url();
    if (q.method() === 'POST') { if (echecPerm) return json(r, { message: 'new row violates row-level security policy' }, 403); const b = q.postDataJSON(); if (DB.perms.some(x => x.user_id === b.user_id && x.permission === b.permission && x.univers === b.univers)) return json(r, { message: 'doublon' }, 409); DB.perms.push({ id: nid(), ...b }); ecritures.push(`POST perm ${b.permission}`); return r.fulfill({ status: 201, body: '' }); }
    if (q.method() === 'DELETE') { const i = DB.perms.findIndex(x => x.id === idDe(u)); const [x] = DB.perms.splice(i, 1); ecritures.push(`DELETE perm ${x.permission}`); return json(r, [x]); }
    return json(r, []);
  });
}



// Ouvre une page de l'espace fondatrice : par l'écran mémorisé (branche) ou, à défaut, par les menus (version de production).
async function ouvrirPage(p, selecteur, libelle) {
  if (await p.waitForSelector(selecteur, { timeout: 8000 }).then(() => true).catch(() => false)) return;
  await p.getByText('Organisation', { exact: true }).last().tap().catch(() => {}); await attendre(1200);
  await p.getByText(libelle).first().tap(); await p.waitForSelector(selecteur, { timeout: 60000 });
}
async function sauver(p, attendu = /enregistrée|interrompu/) {
  await p.getByTestId('enregistrer').tap();
  await p.waitForFunction(() => !document.querySelector('[data-testid=message-acces]'), null, { timeout: 5000 }).catch(() => {});
  await p.waitForFunction(re => new RegExp(re).test(document.querySelector('[data-testid=message-acces]')?.textContent || ''), attendu.source, { timeout: 20000 });
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, tk]) => { if (!localStorage.getItem('bellaia_user')) { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', tk); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.setItem('bellaia-nav', JSON.stringify({ 'f:fondatrice': { v: 'acces', t: Date.now() } })); } }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  await baseSimulee(ctx);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const dialogues = []; p.on('dialog', d => { dialogues.push(d.message()); d.accept(); });
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await ouvrirPage(p, '[data-testid=selecteur-acces]', '🔐 Accès & permissions');
  const saisie = p.getByTestId('selecteur-acces-saisie'); const options = p.getByTestId('selecteur-acces-option');
  t('écran ouvert : plus de champ e-mail obligatoire, sélecteur de contacts présent', (await p.locator('input[type=email]').count()) === 0 && (await saisie.count()) === 1);
  t('repli avant 0145 signalé honnêtement', (await p.getByTestId('source-repli').count()) === 1);
  await saisie.fill('lin');
  t('autocomplétion dès 3 lettres du prénom', (await options.count()) === 1 && /Lina TESTEUR/.test(await options.first().innerText()));
  t('résultat : e-mail, catégories et pôle affichés', /lina\.testeur@exemple\.invalid/.test(await options.first().innerText()) && /Vil’Dor Pâtisse/.test(await options.first().innerText()) && /Hôtes|Assistants|Collaborateurs/.test(await options.first().innerText()));
  await saisie.fill('testeur'); t('recherche par nom', (await options.count()) === 1);
  await saisie.fill('lina.tes'); t('recherche par e-mail partiel', (await options.count()) === 1);
  await saisie.fill('dupont');
  const homo = await options.allInnerTexts();
  t('homonymes : 2 « Marie DUPONT » distingués', homo.length === 2 && homo[0].split('\n')[0] !== homo[1].split('\n')[0]);
  await saisie.fill('zzzz');
  t('aucun résultat : propositions (rechercher un compte existant…)', (await p.getByTestId('selecteur-acces-aucun').count()) === 1);
  await saisie.fill('');
  await p.getByTestId('selecteur-acces-parcourir').tap();
  t('menu déroulant sans saisie : tous les comptes (hors fondatrice)', (await options.count()) === 4);
  t('aucun débordement horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.screenshot({ path: out + '/acces_1_selecteur.png' });
  await options.filter({ hasText: 'Lina' }).first().tap();
  await p.waitForSelector('[data-testid=fiche-acces]');
  const groupeVildor = p.locator('[data-testid=groupe-pole][data-pole="Vil\'Dor Pâtisse"]');
  t('fiche : 3 fonctions actives sous Vil’Dor Pâtisse', (await groupeVildor.locator('[data-testid=fonction][data-statut=actif]').count()) === 3);
  // Brouillon : suspendre puis restaurer
  await groupeVildor.locator('[data-testid=fonction][data-role=hote] button', { hasText: 'Suspendre' }).tap();
  t('brouillon : 1 modification en attente, rien écrit', /1 modification/.test(await p.getByTestId('nb-changements').innerText()) && ecritures.length === 0);
  await p.getByTestId('restaurer').tap();
  t('« Restaurer » revient aux valeurs enregistrées', /Aucune modification/.test(await p.getByTestId('nb-changements').innerText()));
  // Retirer une fonction, enregistrer, relu en base
  await groupeVildor.locator('[data-testid=fonction][data-role=collaborateur] [data-testid=retirer-fonction]').tap();
  await sauver(p);
  t('retrait enregistré (statut révoqué, historique conservé), confirmation relue en base', ecritures.join('|') === 'PATCH roles collaborateur→revoque' && /2 fonctions actives/.test(await p.getByTestId('message-acces').innerText()));
  t('les deux autres fonctions sont conservées', DB.roles.filter(r => r.user_id === A && r.statut === 'actif').length === 2);
  await p.locator('button', { hasText: 'Rétablir' }).tap(); await sauver(p);
  t('rétablir : aucune création en double (même ligne réactivée)', DB.roles.filter(r => r.user_id === A).length === 3 && ecritures.at(-1) === 'PATCH roles collaborateur→actif');
  // Second pôle
  await p.getByTestId('ajouter-pole').selectOption('studio');
  await p.locator('[data-testid=groupe-pole][data-pole^="Équipe Bella"] [data-testid=ajouter-fonction]').selectOption('assistante');
  await sauver(p);
  t('second pôle (équipe interne) ajouté, Vil’Dor intact', DB.roles.some(r => r.user_id === A && r.role === 'assistante' && r.organisation_id === null) && DB.roles.filter(r => r.user_id === A && r.organisation_id === ORG && r.statut === 'actif').length === 3);
  t('fonction déjà présente : non proposée (pas de doublon)', (await groupeVildor.locator('[data-testid=ajouter-fonction] option[value=hote]').count()) === 0);
  // Permissions par pôle
  t('permissions rangées par pôle (Missions, Transversal, Bella’Food, BSH)', (await p.getByTestId('groupe-permissions').count()) === 4);
  await p.locator('[data-testid=groupe-permissions][data-groupe="Bella’Food"] summary').tap();
  await p.getByTestId('perm-food.commandes').check();
  await p.getByTestId('perm-food.consulter').uncheck();
  await sauver(p);
  t('permissions : ajout et retrait indépendants, univers FOOD', DB.perms.filter(x => x.user_id === A && x.univers === 'FOOD').map(x => `${x.permission}:${x.univers}`).join(',') === 'food.commandes:FOOD');
  // Missions : limiter « tout Bellaïa » à Vil’Dor Pâtisse seulement
  await p.locator('[data-testid=groupe-permissions][data-groupe^="Missions"] summary').tap();
  t('missions : portée actuelle « Tout Bellaïa » affichée', (await p.getByTestId('portee-missions.gerer-*').getAttribute('aria-pressed')) === 'true');
  await p.getByTestId('portee-missions.gerer-*').tap();
  await p.getByTestId('portee-missions.gerer-VILDOR').tap();
  t('missions : avertissement honnête (effectif après 0146)', (await p.getByTestId('avertissement-portee').count()) === 1);
  await sauver(p);
  t('missions : permission globale retirée, permission Vil’Dor seule enregistrée, autres autorisations conservées', DB.perms.filter(x => x.user_id === A && x.permission === 'missions.gerer').map(x => x.univers).join() === 'VILDOR' && DB.perms.some(x => x.user_id === A && x.permission === 'food.commandes'));
  // Autorisation critique : confirmation explicite
  await p.locator('[data-testid=groupe-permissions][data-groupe^="Transversal"] summary').tap();
  await p.getByTestId('perm-ia.utiliser').check();
  t('autorisation critique (crédits IA) : confirmation demandée', dialogues.some(d => /critique/.test(d)));
  await p.getByTestId('restaurer').tap();
  t('… puis restaurée sans rien écrire', !DB.perms.some(x => x.permission === 'ia.utiliser'));
  // Modèle : ajoute sans retirer
  await p.getByTestId('modele').selectOption('assistant_commercial'); await p.locator('button', { hasText: 'Appliquer' }).tap();
  t('modèle appliqué au brouillon sans rien retirer', /aucune autorisation retirée/.test(await p.getByTestId('message-acces').innerText()) && await p.getByTestId('perm-food.commandes').isChecked());
  // Erreur : brouillon conservé, cause affichée
  echecPerm = true; await sauver(p, /interrompu/);
  t('erreur serveur : cause affichée, brouillon conservé (aucune erreur silencieuse)', /row-level security/.test(await p.getByTestId('message-acces').innerText()) && !/Aucune modification/.test(await p.getByTestId('nb-changements').innerText()));
  echecPerm = false; await sauver(p);
  await p.screenshot({ path: out + '/acces_2_fiche.png', fullPage: true });
  t('barre d’enregistrement visible à l’écran (bas de page iPhone)', await p.evaluate(() => { const r = document.querySelector('[data-testid=enregistrer]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
  // Persistance après rechargement
  await p.reload({ waitUntil: 'networkidle' }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await ouvrirPage(p, '[data-testid=carte-membre]', '🔐 Accès & permissions');
  await p.locator('[data-testid=carte-membre][data-id="' + A + '"]').tap();
  t('après rechargement : affectations et permissions relues (4 fonctions)', (await p.locator('[data-testid=fonction][data-statut=actif]').count()) === 4 && await p.getByTestId('perm-food.commandes').isChecked());
  await p.getByTestId('annuler').tap();
  // Rattacher une cliente sans saisir d'e-mail
  await saisie.fill('dupont'); await options.first().tap();
  await p.getByTestId('ajouter-pole').selectOption(ORG);
  await p.locator('[data-testid=groupe-pole][data-pole="Vil\'Dor Pâtisse"] [data-testid=ajouter-fonction]').selectOption('hote');
  await sauver(p);
  if (!(DB.roles.some(r => r.user_id === B1) && DB.profiles.find(x => x.id === B1).role === 'partenaire')) console.log('DEBUG', JSON.stringify(DB.roles.filter(r=>r.user_id!==A)), JSON.stringify(DB.profiles.filter(x=>x.nom==='DUPONT')), ecritures.slice(-4), await p.getByTestId('message-acces').innerText().catch(()=>'-'), await p.getByTestId('fiche-nom').innerText().catch(()=>'-'));
  t('rattachement d’une cliente par sélection (identifiant), compte passé « partenaire »', DB.roles.some(r => r.user_id === B1 && r.role === 'hote' && r.organisation_id === ORG) && DB.profiles.find(x => x.id === B1).role === 'partenaire' && DB.roles.every(r => r.user_id !== B2));
  t('aucune erreur JavaScript (fondatrice)', err.length === 0); if (err.length) console.log(err);
  await ctx.close();

  // ── Répertoire (Organisation › Répertoire)
  const ctx3 = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  await ctx3.addInitScript(([u, tk]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', tk); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.setItem('bellaia-nav', JSON.stringify({ 'f:fondatrice': { v: 'repertoire', t: Date.now() } })); }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  await baseSimulee(ctx3);
  const r3 = await ctx3.newPage(); const err3 = []; r3.on('pageerror', e => err3.push(e.message));
  await r3.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await r3.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await ouvrirPage(r3, '[data-testid=repertoire-recherche]', '📇 Répertoire');
  await r3.waitForFunction(() => document.querySelectorAll('[data-testid=ligne-contact]').length > 0, null, { timeout: 20000 }).catch(() => {});
  t('répertoire : 4 comptes, mode consultation signalé avant 0145', (await r3.getByTestId('ligne-contact').count()) === 4 && (await r3.getByTestId('repertoire-repli').count()) === 1);
  await r3.getByTestId('cat-clients').tap();
  t('répertoire : filtre par catégorie (Clients : 1 après le rattachement de Marie)', (await r3.getByTestId('ligne-contact').count()) === 1);
  await r3.getByTestId('cat-clients').tap(); await r3.getByTestId('repertoire-recherche').fill('paul');
  t('répertoire : recherche', (await r3.getByTestId('ligne-contact').count()) === 1);
  await r3.getByTestId('repertoire-recherche').fill('');
  await r3.getByTestId('import-repertoire').setInputFiles({ name: 'contacts.csv', mimeType: 'text/csv', buffer: Buffer.from('Prénom;Nom;E-mail;Société\nAnna;Martin;anna@exemple.invalid;Fournil\nLina;Testeur;lina.testeur@exemple.invalid;\n') });
  t('import CSV : aperçu, doublon avec un compte existant détecté', /2 contact\(s\) lu/.test(await r3.getByTestId('apercu-import').innerText()) && /1 doublon/.test(await r3.getByTestId('apercu-import').innerText()));
  await r3.locator('button', { hasText: "Enregistrer l'import" }).tap();
  t('import : enregistrement refusé honnêtement avant 0145 (aperçu conservé)', /0145/.test(await r3.getByTestId('message-repertoire').innerText()) && (await r3.getByTestId('apercu-import').count()) === 1);
  const [dl] = await Promise.all([r3.waitForEvent('download'), r3.getByTestId('export-vcf').tap()]);
  const vcf = fs.readFileSync(await dl.path(), 'utf8');
  t('export VCF : 4 fiches', (vcf.match(/BEGIN:VCARD/g) || []).length === 4);
  t('répertoire : aucun débordement horizontal, aucune erreur', await r3.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && err3.length === 0);
  await r3.screenshot({ path: out + '/repertoire.png' });
  await ctx3.close();

  // ── Côté partenaire : « Mes espaces » et rôle relu sans déconnexion
  const ctx2 = await b.newContext({ ...devices['iPhone 13'] });
  await ctx2.addInitScript(([u, tk]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', tk); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [{ id: A, role: 'cliente', prenom: 'Lina' }, jwt(A)]);
  await ctx2.route(/\/rest\/v1\/profiles\?id=eq\./, r => json(r, [{ role: 'partenaire', prenom: 'Lina', nom: 'TESTEUR' }]));
  await ctx2.route(/\/rest\/v1\/bellaia_roles\?/, r => json(r, DB.roles.filter(x => x.user_id === A && x.statut !== 'revoque').map(x => ({ role: x.role, statut: x.statut, organisation_id: x.organisation_id, bellaia_organisations: x.organisation_id ? { nom_commercial: "Vil'Dor Pâtisse" } : null }))));
  await ctx2.route(/\/rest\/v1\/bsh_hotes\?/, r => json(r, []));
  await ctx2.route(/\/rest\/v1\/rpc\/mes_acces/, r => json(r, { fondatrice: false, roles: DB.roles.filter(x => x.user_id === A && x.organisation_id && x.statut === 'actif').map(x => ({ role: x.role, organisation: "Vil'Dor Pâtisse", organisation_id: x.organisation_id, statut_organisation: 'en_creation' })), permissions: [], hote_bsh: false }));
  await ctx2.route(/\/rest\/v1\/bellaia_organisations\?/, r => json(r, [{ id: ORG, nom_commercial: "Vil'Dor Pâtisse", type: 'partenaire', statut_admin: 'en_creation', activites: [] }]));
  const q = await ctx2.newPage(); const err2 = []; q.on('pageerror', e => err2.push(e.message));
  await q.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await q.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await attendre(2500);
  if (process.env.SANS_MES_ESPACES) {
    // Version de production ciblée (sans sélecteur « Mes espaces ») : le rôle relu ouvre directement l'espace partenaire.
    await attendre(2500);
    t('rôle relu en base sans déconnexion (cliente → partenaire) : espace professionnel Vil’Dor ouvert', /partenaire/.test(await q.evaluate(() => localStorage.getItem('bellaia_user'))) && /Espace professionnel/.test(await q.evaluate(() => document.body.innerText)));
    await q.screenshot({ path: out + '/acces_3_espace_partenaire.png' });
    t('aucune erreur JavaScript (partenaire)', err2.length === 0); if (err2.length) console.log(err2);
    await b.close(); console.log(R.join('\n') + `\n\nRÉSULTAT : ${ok}/${n}`); return;
  }
  t('rôle relu en base sans déconnexion (cliente → partenaire) : « Mes espaces » apparaît', (await q.locator('button[aria-label="Mes espaces"]').count()) === 1 && /partenaire/.test(await q.evaluate(() => localStorage.getItem('bellaia_user'))));
  await q.locator('button[aria-label="Mes espaces"]').tap(); await attendre(400);
  const menu = await q.locator('[role=menu]').innerText();
  t('« Mes espaces » : Vil’Dor Pâtisse avec ses fonctions', /Vil'Dor Pâtisse — hôtesse · assistante · collaboratrice/.test(menu));
  t('les fonctions Vil’Dor n’ouvrent pas l’espace hôte générique ; seule la fonction interne ajoutée ouvre l’espace assistante', !/Hôte \/ prestataire/.test(menu) && /Assistante \/ collaboratrice/.test(menu));
  await q.screenshot({ path: out + '/acces_3_mes_espaces.png' });
  t('aucune erreur JavaScript (partenaire)', err2.length === 0); if (err2.length) console.log(err2);
  await b.close();
  console.log(R.join('\n') + `\n\nRÉSULTAT : ${ok}/${n}`);
})().catch(e => { console.error(e); process.exit(1); });
