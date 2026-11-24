// Bella'Food › Offre & tarifs (24/11) — iPhone 13 SIMULÉ (Chromium), PAS un iPhone réel.
// Les lectures/écritures Supabase de l'écran sont interceptées : on vérifie le CONTENU de chaque écriture.
// Prérequis : mockapp.js (:54337) + next dev -p 3160. Usage : node tests/iphone/t_food_pilotage.js <sorties>
const { chromium, devices } = require('playwright');
const F = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const pr = (id, nom, slug, prix, o = {}) => ({ id, nom, categorie_slug: slug, prix, statut: 'actif', visible_client: true, disponible: true, allergenes: ['gluten'], metadata: null, ...o });
const PRODUITS = [
  pr('11111111-0000-0000-0000-000000000001', 'Barquette poulet boucané (frites nature)', 'street_food', 8),
  pr('11111111-0000-0000-0000-000000000002', 'Brochette de poulet', 'street_food', 3.5),
  pr('11111111-0000-0000-0000-000000000003', 'Soupe créole', 'soupe', 13),
  pr('11111111-0000-0000-0000-000000000004', 'Crêpe Lardon + Fromage + Béchamel', 'crepe', 4),
  pr('11111111-0000-0000-0000-000000000005', 'Punch Coco', 'cocktail', 25),
  pr('11111111-0000-0000-0000-000000000006', 'Gâteau chocolat', 'cake', 20),
  pr('11111111-0000-0000-0000-000000000007', 'Jus de goyave', 'jus', null, { statut: 'brouillon', visible_client: false }),
  pr('11111111-0000-0000-0000-000000000008', 'Soupe z\'habitants', 'soupe', 13, { metadata: { prix: { statut: 'confirme' } } }),
  pr('11111111-0000-0000-0000-000000000009', 'Frites nature', 'street_food', null),
];
const VARIANTES = [{ id: 'v1', produit_id: '11111111-0000-0000-0000-000000000009', nom: 'Sans supplément', prix: 3, disponible: true }, { id: 'v2', produit_id: '11111111-0000-0000-0000-000000000009', nom: '+ Merguez', prix: 7, disponible: true }];
(async () => {
  const out = process.argv[2] || '.'; const R = []; let n = 0; const ok = (m, v) => { n++; R.push(`${String(n).padStart(2, '0')} ${m} : ${v ? 'OK' : 'ÉCHEC'}`); };
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.removeItem('bellaia-nav'); }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
  const ecritures = []; let journee = null;
  await p.route(/\/rest\/v1\/catalogue_produits(\?|$)/, async r => { const m = r.request().method(); if (m === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRODUITS) }); ecritures.push({ table: 'catalogue_produits', m, url: r.request().url(), corps: JSON.parse(r.request().postData() || 'null') }); return r.fulfill({ status: m === 'POST' ? 201 : 204, contentType: 'application/json', body: m === 'POST' ? '[{}]' : '' }); });
  await p.route(/\/rest\/v1\/catalogue_variantes(\?|$)/, async r => { const m = r.request().method(); if (m === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VARIANTES) }); ecritures.push({ table: 'catalogue_variantes', m, url: r.request().url(), corps: JSON.parse(r.request().postData() || 'null') }); return r.fulfill({ status: m === 'POST' ? 201 : 204, contentType: 'application/json', body: m === 'POST' ? '[{}]' : '' }); });
  await p.route(/\/rest\/v1\/food_menu_jour(\?|$)/, async r => { const m = r.request().method(); if (m === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(journee ? [journee] : []) });
    const c = JSON.parse(r.request().postData() || 'null'); ecritures.push({ table: 'food_menu_jour', m, corps: c }); journee = { id: 'j1', lieux: [], ...(journee || {}), ...c }; return r.fulfill({ status: m === 'POST' ? 201 : 204, contentType: 'application/json', body: m === 'POST' ? JSON.stringify([journee]) : '' }); });
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await p.locator('button', { hasText: "Bella'Food" }).first().tap(); await p.waitForTimeout(2500);
  await p.getByRole('button', { name: /Offre & tarifs/ }).first().tap(); await p.waitForSelector('[data-testid=tuile-repas]', { timeout: 60000 });
  // ── Offre du jour
  const tuile = await p.getByTestId('tuile-restauration_rapide').boundingBox();
  ok('12 grandes catégories ; tuiles lisibles sur iPhone (≥ 90 px de haut, ≥ 150 px de large)', (await p.locator('[data-testid^=tuile-]').count()) === 12 && tuile.height >= 90 && tuile.width >= 150);
  ok('compteurs réels par catégorie (« 0 / 4 cochés » en restauration rapide)', /0 \/ 4 cochés/.test(await p.getByTestId('tuile-restauration_rapide').innerText()));
  await p.getByTestId('tuile-restauration_rapide').tap(); await p.waitForTimeout(300);
  ok('produit au porc : case désactivée avec motif', await p.getByLabel('Proposer Crêpe Lardon + Fromage + Béchamel').isDisabled() && /porc/.test(await p.evaluate(() => document.body.innerText)));
  ok('produit en brouillon : jamais proposé', (await p.getByLabel('Proposer Jus de goyave').count()) === 0);
  await p.getByLabel('Proposer Barquette poulet boucané (frites nature)').check(); await p.waitForTimeout(200);
  await p.getByLabel('Prix du jour Barquette poulet boucané (frites nature)').fill('6.5'); await p.getByLabel('Quantité Barquette poulet boucané (frites nature)').fill('20');
  await p.getByTestId('tuile-repas').tap(); await p.waitForTimeout(200); await p.getByLabel('Proposer Soupe créole').check();
  ok('compteur mis à jour après coche (1 / 4)', /1 \/ 4 cochés/.test(await p.getByTestId('tuile-restauration_rapide').innerText()));
  await p.getByRole('button', { name: '+ Composer un menu' }).tap(); await p.getByLabel('Nom du menu').fill('Formule midi'); await p.getByLabel('Prix du menu').fill('15');
  const cases = p.locator('label', { hasText: /^Soupe créole$|^Brochette de poulet$/ }).locator('input'); for (let i = 0; i < await cases.count(); i++) await cases.nth(i).check();
  await p.getByRole('button', { name: 'Ajouter le menu' }).tap(); await p.waitForTimeout(200);
  await p.getByRole('button', { name: /Prévisualiser côté client/ }).tap(); await p.waitForTimeout(200);
  const ap = await p.getByTestId('apercu-client').innerText();
  ok('prévisualisation client : 2 plats + le menu, prix du jour 6,50 €, 20 portions', /Barquette poulet boucané/.test(ap) && /6,50 €/.test(ap) && /20 portions/.test(ap) && /Formule midi/.test(ap) && /15,00 €/.test(ap));
  await p.screenshot({ path: `${out}/food_pilotage_offre.png` });
  await p.getByTestId('publier-offre').tap(); await p.waitForTimeout(800);
  const pub = ecritures.filter(e => e.table === 'food_menu_jour').pop();
  ok('publication : 1 seule écriture food_menu_jour, statut publié, 3 éléments rattachés au catalogue', pub && pub.corps.statut === 'publie' && pub.corps.items.length === 3 && pub.corps.items.every(i => i.cle && i.type));
  ok('élément enregistré : produit_id, prix 6,5, quantité 20 ; menu avec composition de 2', pub.corps.items.some(i => i.produit_id === '11111111-0000-0000-0000-000000000001' && i.prix === 6.5 && i.quantite === 20) && pub.corps.items.some(i => i.type === 'menu' && i.composition.length === 2 && i.prix === 15));
  ok('statut affiché « Publiée » après relecture', /Publiée/.test(await p.getByTestId('statut-offre').innerText()));
  // ── Catégories
  await p.getByRole('tab', { name: /Catégories/ }).tap(); await p.waitForTimeout(300);
  await p.getByTestId('tuile-boissons').tap(); ok('catégorie Boissons : compteur réel (2 produits)', /2 produit/.test(await p.getByTestId('compteur-categorie').innerText()));
  await p.getByRole('button', { name: /Aperçu du reclassement/ }).tap(); await p.waitForTimeout(200);
  ok('aperçu du reclassement avant application (ancienne → nouvelle catégorie)', /street_food → Restauration rapide/.test(await p.getByTestId('apercu-classement').innerText()));
  const av = ecritures.length; await p.getByTestId('appliquer-classement').tap(); await p.waitForTimeout(1200);
  const cl = ecritures.slice(av).filter(e => e.table === 'catalogue_produits');
  ok('application : uniquement metadata.hierarchie écrite (ni prix, ni recette, ni identifiant)', cl.length === PRODUITS.length && cl.every(e => e.m === 'PATCH' && Object.keys(e.corps).filter(k => k !== 'updated_at').join() === 'metadata' && e.corps.metadata.hierarchie.categorie));
  // ── Sauces
  await p.getByRole('tab', { name: /Sauces/ }).tap(); await p.waitForTimeout(300);
  await p.getByLabel('Produit').selectOption({ label: 'Gâteau chocolat' }); await p.waitForTimeout(200);
  const tSauces = await p.evaluate(() => document.body.innerText);
  ok('sauces proposées pour un gâteau : desserts seulement (caramel oui, ketchup non)', (await p.getByRole('button', { name: 'Caramel beurre salé' }).count()) === 1 && (await p.getByRole('button', { name: 'Ketchup' }).count()) === 0);
  await p.getByRole('button', { name: 'Vanille' }).tap(); await p.getByRole('button', { name: 'Chocolat', exact: true }).tap();
  const avS = ecritures.length; await p.getByRole('button', { name: /Enregistrer les sauces \(2\)/ }).tap(); await p.waitForTimeout(600);
  ok('plusieurs sauces compatibles enregistrées sur le produit', ecritures.slice(avS).some(e => e.corps?.metadata?.sauces?.join() === 'Vanille,Chocolat'));
  // ── Tarifs
  await p.getByRole('tab', { name: /Tarifs/ }).tap(); await p.waitForTimeout(400);
  const tT = await p.evaluate(() => document.body.innerText);
  ok('tarifs : grille de la fondatrice et estimations marquées PROVISOIRE', /Votre grille/.test(tT) && /PROVISOIRE/.test(tT) && /0 recette sur 306/.test(tT));
  ok('prix confirmé : ligne non modifiable', await p.getByLabel('Appliquer Soupe z\'habitants').isDisabled());
  await p.getByLabel('Appliquer Brochette de poulet').check(); await p.getByLabel('Appliquer Frites nature — + Merguez').check(); await p.getByLabel('Appliquer Frites nature — Moyenne portion').check();
  const avT = ecritures.length; await p.getByTestId('appliquer-tarifs').tap(); await p.waitForTimeout(1200);
  const et = ecritures.slice(avT);
  ok('brochette 3,50 → 2,50 avec historique de l\'ancien prix', et.some(e => e.table === 'catalogue_produits' && e.corps.prix === 2.5 && e.corps.metadata.prix.historique[0].prix === 3.5 && e.corps.metadata.prix.statut === 'valide_fondatrice'));
  ok('variante frites + merguez 7 → 6 ; variante moyenne portion 4 € créée', et.some(e => e.table === 'catalogue_variantes' && e.m === 'PATCH' && e.corps.prix === 6) && et.some(e => e.table === 'catalogue_variantes' && e.m === 'POST' && e.corps.nom === 'Moyenne portion' && e.corps.prix === 4));
  ok('aucune autre écriture que les 3 lignes cochées', et.length === 3);
  await p.getByLabel('Ingrédients (€)').fill('2'); await p.getByLabel('Conditionnement (€)').fill('0.3'); await p.getByLabel("Main-d'œuvre (min)").fill('6'); await p.getByLabel('Taux horaire (€)').fill('15');
  ok('calcul indicatif : coût 3,80 € → 6,33 € (arrondi 6,50 €)', /3,80 €.*6,33 €.*6,50 €/.test(await p.getByTestId('resultat-calcul').innerText()));
  await p.screenshot({ path: `${out}/food_pilotage_tarifs.png` });
  // ── Conformité
  await p.getByRole('tab', { name: /Conformité/ }).tap(); await p.waitForTimeout(300);
  ok('conformité : lardons et punch signalés (2 candidats)', (await p.getByTestId('candidat-masquage').count()) === 2);
  await p.getByTestId('candidat-masquage').first().locator('input').check();
  const avC = ecritures.length; await p.getByTestId('masquer').tap(); await p.waitForTimeout(800);
  const mq = ecritures.slice(avC);
  ok('masquage réversible : invisible, état précédent mémorisé, aucune suppression', mq.length === 1 && mq[0].m === 'PATCH' && mq[0].corps.visible_client === false && mq[0].corps.metadata.masquage.avant.visible_client === true && !ecritures.some(e => e.m === 'DELETE'));
  ok('variantes compatibles proposées (jambon et lardons de volaille, merguez de bœuf, cocktails sans alcool)', /Lardons de volaille/.test(await p.evaluate(() => document.body.innerText)) && /Punch coco sans alcool/.test(await p.evaluate(() => document.body.innerText)));
  await p.screenshot({ path: `${out}/food_pilotage_conformite.png` });
  ok('aucune débordement horizontal ni erreur JavaScript', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && err.length === 0);
  if (err.length) console.log(err.slice(0, 3).join('\n'));
  await b.close();
  console.log(R.join('\n') + `\n${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})().catch(e => { console.error(e); process.exit(1); });
