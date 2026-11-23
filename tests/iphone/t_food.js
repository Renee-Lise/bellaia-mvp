// Bella'Food premium : parcours de commande complet sur iPhone (par défaut) ou ordinateur, pour un profil (fondatrice | assistante | cliente).
// Usage : node tests/iphone/t_food.js <profil> <dossier_sorties> [iphone|ordinateur]
// Usage : node tests/iphone/t_food.js <profil> <dossier_sorties>   (mockapp.js + next dev -p 3160 lancés)
const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0', cliente: '00000000-0000-0000-0000-0000000000a0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const role = process.argv[2] || 'cliente', out = process.argv[3] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const appareil = process.argv[4] === 'ordinateur' ? { viewport: { width: 1366, height: 900 } } : { ...devices['iPhone 13'] };
  const b = await chromium.launch(); const ctx = await b.newContext(appareil);
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role }, jwt(UID[role])]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const avant = (await (await fetch('http://localhost:54337/rest/v1/__commandes_food')).json()).length;
  await p.goto('http://localhost:3160/apercu/boutiques?u=FOOD&commande=1', { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500);
  const texte = () => p.evaluate(() => document.body.innerText);
  if (role !== 'fondatrice') {
    // Le parcours premium n'est pas encore ouvert aux clientes : l'aperçu doit rester fermé, la route de commande doit
    // recalculer les prix et prendre l'identité du jeton pour ce profil.
    ok('aperçu premium fermé à ce profil', /réservé à la fondatrice/i.test(await texte()));
    const api = (body, cle) => fetch('http://localhost:3160/api/food/commandes/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt(UID[role])}` }, body: JSON.stringify({ clientNom: `Test ${role}`, idempotencyKey: cle, ...body }) });
    let r = await api({ lignes: [{ id: 'fp1::v2', qte: 1 }] }, 'k-sans-base-' + role); ok('frites sans base refusées (400)', r.status === 400);
    r = await api({ lignes: [{ id: 'fp3', qte: 1 }] }, 'k-tarte-' + role); ok('produit sans allergènes validés refusé (409)', r.status === 409);
    r = await api({ lignes: [{ id: 'fp1::v2::betterave', qte: 1 }] }, 'k-base-' + role); ok('base inconnue refusée (400)', r.status === 400);
    // Quantités : bornes et entiers stricts
    for (const [q, n] of [[0, 'zéro'], [21, '21 (> 20)'], [1.5, '1,5'], ['2abc', '« 2abc »'], [-1, 'négative']]) {
      r = await api({ lignes: [{ id: 'fp2', qte: q }] }, `k-q-${n}-${role}`); ok(`quantité ${n} refusée (400)`, r.status === 400);
    }
    r = await api({ lignes: Array.from({ length: 31 }, () => ({ id: 'fp2', qte: 1 })) }, 'k-31-' + role); ok('31 lignes refusées (400)', r.status === 400);
    r = await api({ lignes: [{ id: 'fp2', qte: 20 }] }, 'k-q20-' + role); const d20 = await r.json();
    ok('20 unités acceptées, total serveur 240,00 €', r.ok && Math.abs(d20.total - 240) < 0.001);
    const corps = { lignes: [{ id: 'fp1::v2::plantain', qte: 1, prix: 0.01 }, { id: 'fp2', qte: 1, total: 0 }], codeReduction: 'BIENVENUE10', clientId: UID.fondatrice };
    r = await api(corps, 'k-ok-' + role); const d = await r.json();
    ok('commande acceptée, référence attribuée', r.ok && /FOOD-2026-\d{4}/.test(d.reference || ''));
    const r2 = await api(corps, 'k-ok-' + role); const d2 = await r2.json();
    ok('même clé renvoyée deux fois : même commande', r2.ok && d2.reference === d.reference);
    const cmds = await (await fetch('http://localhost:54337/rest/v1/__commandes_food')).json(); const c = cmds.find(x => x.idempotency_key === 'k-ok-' + role);
    ok('une seule commande enregistrée', cmds.filter(x => x.idempotency_key === 'k-ok-' + role).length === 1);
    ok('prix envoyés par le navigateur ignorés (16,20 € recalculés)', c && c.total_avant_remise === 18 && Math.abs(c.total - 16.2) < 0.001);
    ok('identité prise du jeton, jamais du corps de la requête', c && c.created_by === UID[role]);
    ok('aucune erreur JavaScript', err.length === 0);
    console.log(`[${role}]\n` + R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`); await b.close(); return;
  }
  ok('vitrine : 3 produits, prix « dès » pour les tailles', /Frites maison/.test(await texte()) && /dès 4,00 €/.test(await texte()));
  await p.screenshot({ path: `${out}/food_${role}_1_vitrine.png` });
  // Frites : taille puis base obligatoires
  await p.getByText('Frites maison', { exact: true }).first().click(); await p.waitForTimeout(1200);
  const btnAjout = p.locator('button', { hasText: /Choisissez une taille|Choisissez une base|Ajouter au panier/ }).first();
  ok('frites : « Choisissez une taille » tant qu\'aucune taille', /Choisissez une taille/.test(await btnAjout.innerText()) && await btnAjout.isDisabled());
  await p.locator('button', { hasText: 'Grande portion' }).click();
  ok('frites : base exigée après la taille', /Choisissez une base/.test(await btnAjout.innerText()) && await btnAjout.isDisabled());
  await p.locator('button', { hasText: 'Plantain' }).click();
  ok('frites : allergènes validés affichés', /Aucun des 14 allergènes/.test(await texte()));
  ok('frites : bouton actif au bon prix (6,00 €)', /Ajouter au panier · 6,00 €/.test(await btnAjout.innerText()) && !(await btnAjout.isDisabled()));
  await p.screenshot({ path: `${out}/food_${role}_2_options.png` });
  await btnAjout.click(); await p.waitForTimeout(600);
  // Colombo
  await p.keyboard.press('Escape').catch(() => {});
  const fermer = p.locator('button[aria-label="Fermer"]'); if (await fermer.count()) await fermer.first().click().catch(() => {});
  await p.waitForTimeout(400);
  await p.getByText('Colombo de poulet', { exact: true }).first().click(); await p.waitForTimeout(1000);
  await p.locator('button', { hasText: /Ajouter au panier · 12,00 €/ }).first().click(); await p.waitForTimeout(500);
  if (await fermer.count()) await fermer.first().click().catch(() => {});
  // Tarte coco : bloquée (allergènes non validés)
  await p.getByText('Tarte coco', { exact: true }).first().click(); await p.waitForTimeout(1000);
  ok('produit sans allergènes validés : non commandable', /Indisponible pour l'instant/.test(await texte()) || /non commandable/.test(await texte()));
  if (await fermer.count()) await fermer.first().click().catch(() => {});
  await p.waitForTimeout(400);
  // Panier
  await p.locator('button', { hasText: 'Voir le panier' }).click(); await p.waitForTimeout(800);
  const tp = await texte();
  ok('panier : 2 lignes, libellé avec base et taille, total 18,00 €', /Frites maison \(Plantain\) — Grande portion/.test(tp) && /Colombo de poulet/.test(tp) && /18,00 €/.test(tp));
  await p.locator('button', { hasText: 'Envoyer ma commande' }).click(); await p.waitForTimeout(500);
  ok('nom obligatoire', /Indiquez votre nom/.test(await texte()));
  const dmin = await p.locator('input[type=date]').getAttribute('min'); const auj = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  ok('date : pas de date passée possible', dmin === auj);
  await p.fill('input[placeholder="Votre nom *"]', `Test ${role}`); await p.fill('input[placeholder="Téléphone"]', '0694000000');
  await p.fill('input[placeholder="Code de réduction"]', 'FAUX'); await p.locator('button', { hasText: 'Vérifier' }).click(); await p.waitForTimeout(800);
  ok('code invalide refusé', /non valide|inconnu/i.test(await texte()));
  await p.fill('input[placeholder="Code de réduction"]', 'BIENVENUE10'); await p.locator('button', { hasText: 'Vérifier' }).click(); await p.waitForTimeout(800);
  ok('code valide : remise annoncée (−1,80 €)', /appliqué à la commande/.test(await texte()) && /−1,80 €/.test(await texte()));
  await p.screenshot({ path: `${out}/food_${role}_3_panier.png` });
  // Coupure réseau : le panier est conservé
  await p.route('**/api/food/commandes/create', r => r.abort());
  await p.locator('button', { hasText: 'Envoyer ma commande' }).click(); await p.waitForTimeout(1200);
  ok('hors ligne : message d\'erreur et panier conservé', /Frites maison \(Plantain\)/.test(await texte()) && !/Commande enregistrée/.test(await texte()));
  await p.unroute('**/api/food/commandes/create');
  // Envoi : double appui → une seule commande
  await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /Envoyer ma commande/.test(x.textContent || '')); e.click(); e.click(); }); await p.waitForTimeout(4000);
  const tc = await texte();
  ok('confirmation avec référence', /Commande enregistrée ✓/.test(tc) && /FOOD-2026-\d{4}/.test(tc));
  const cmds = await (await fetch('http://localhost:54337/rest/v1/__commandes_food')).json(); const c = cmds[cmds.length - 1];
  ok('une seule commande enregistrée malgré le double appui', cmds.length === avant + 1);
  const lignes = JSON.parse(c.lignes || '[]');
  ok('montants recalculés par le serveur (18,00 € − 1,80 € = 16,20 €)', c.total_avant_remise === 18 && Math.abs(c.total - 16.2) < 0.001 && c.reduction_code === 'BIENVENUE10');
  ok('lignes serveur : base et taille, prix de la variante', lignes.length === 2 && lignes.some(l => /Plantain/.test(l.libelle) && l.prixUnitaire === 6));
  ok('allergènes de la commande repris des fiches', (c.allergenes || []).includes('Céleri'));
  ok(role === 'cliente' ? 'commande rattachée au compte vérifié' : 'identité prise du jeton, jamais du formulaire', c.created_by === UID[role]);
  await p.screenshot({ path: `${out}/food_${role}_4_confirmation.png` });
  ok('aucune erreur JavaScript', err.length === 0);
  console.log(`[${role}]\n` + R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
  if (err.length) console.log(err.slice(0, 3));
  await b.close();
})();
