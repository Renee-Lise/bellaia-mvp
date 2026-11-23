// Compte client (4 rubriques + agenda), sélecteur « Mes espaces », blocage Mo Ti-Péyi — profil iPhone 14 SIMULÉ.
// Rôles supplémentaires injectés par interception réseau (rien n'est écrit en base).
// Usage : node tests/iphone/t_compte_espaces.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const CLI = '00000000-0000-0000-0000-0000000000a0';
async function session(b, roles, hotes, role = 'cliente') {
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [{ id: CLI, role, prenom: 'Essai', email: 'essai@exemple.invalid' }, jwt(CLI)]);
  await ctx.route(/\/rest\/v1\/bellaia_roles\?/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(roles) }));
  await ctx.route(/\/rest\/v1\/bsh_hotes\?/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hotes) }));
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(3000);
  return { ctx, p, err };
}
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  const texte = p => p.evaluate(() => document.body.innerText);
  // 1. Cliente simple : pas de sélecteur, 4 rubriques réelles, agenda en rubrique
  let { ctx, p, err } = await session(b, [], []);
  ok('01 cliente simple : accueil client, aucun sélecteur « Mes espaces »', /Ma maison|MA MAISON/i.test(await texte(p)) && await p.locator('button[aria-label="Mes espaces"]').count() === 0);
  ok('02 accueil : résumé d\'agenda compact + bouton « Voir mon agenda »', /Voir mon agenda/.test(await texte(p)) && !/Semaine du/.test(await texte(p)));
  for (const [lib, attendu] of [['Mes informations', /Prénom[\s\S]*Téléphone/], ['Notifications', /Toutes \(/], ['Confidentialité et mes données', /Vos droits/], ['Aide et contact', /Questions fréquentes/]]) {
    await p.getByText(lib, { exact: true }).first().click(); await p.waitForTimeout(1500);
    const t = await texte(p);
    ok(`03 « ${lib} » ouvre sa vraie page (pas l'accueil générique)`, attendu.test(t) && /‹ Accueil/.test(t));
    await p.screenshot({ path: `${out}/compte_${lib.slice(0, 6).replace(/\W/g, '')}.png` });
    await p.getByText('‹ Accueil').first().click(); await p.waitForTimeout(1200);
  }
  await p.getByText('Voir mon agenda').first().click(); await p.waitForTimeout(1800);
  ok('04 « Mon agenda » : rubrique indépendante avec vues jour / semaine / mois', /Jour[\s\S]*Semaine[\s\S]*Mois/.test(await texte(p)) && /Mon agenda/.test(await texte(p)));
  await p.goBack(); await p.waitForTimeout(1200);
  ok('05 retour du navigateur depuis l\'agenda → accueil client', /Voir mon agenda/.test(await texte(p)));
  ok('06 cliente simple : aucune erreur JavaScript', err.length === 0);
  await ctx.close();
  // 2. Personne à trois rôles : assistante active, hôte BSH actif, partenaire suspendu
  ({ ctx, p, err } = await session(b, [{ role: 'assistante', statut: 'actif' }, { role: 'partenaire', statut: 'suspendu' }], [{ statut: 'active' }]));
  ok('07 trois rôles : sélecteur « Mes espaces » présent sur l\'accueil client', await p.locator('button[aria-label="Mes espaces"]').count() === 1 && /Voir mon agenda/.test(await texte(p)));
  await p.locator('button[aria-label="Mes espaces"]').click(); await p.waitForTimeout(400);
  const menu = await p.locator('[role=menu]').innerText();
  ok('08 le sélecteur liste cliente, assistante, hôte et le partenaire « suspendu »', /Ma maison/.test(menu) && /Assistante/.test(menu) && /Hôte/.test(menu) && /Partenaire[\s\S]*suspendu/.test(menu));
  ok('09 l\'espace suspendu ne s\'ouvre pas', await p.locator('[role=menuitem]', { hasText: 'Partenaire' }).isDisabled());
  await p.screenshot({ path: `${out}/mes_espaces.png` });
  await p.locator('[role=menuitem]', { hasText: 'Assistante' }).click(); await p.waitForTimeout(2500);
  ok('10 bascule vers l\'espace assistante sans reconnexion, retour « Ma maison » visible', /‹ Ma maison Bellaïa/.test(await texte(p)) && /ESPACE ASSISTANTE|Espace assistante/i.test(await texte(p)));
  await p.getByText('‹ Ma maison Bellaïa').first().click(); await p.waitForTimeout(1500);
  ok('11 retour à l\'accueil client', /Voir mon agenda/.test(await texte(p)));
  ok('12 trois rôles : aucune erreur JavaScript', err.length === 0);
  await ctx.close();
  // 3. Rôle uniquement suspendu → accueil client seulement, aucun accès au portail
  ({ ctx, p, err } = await session(b, [{ role: 'assistante', statut: 'suspendu' }], []));
  await p.evaluate(() => localStorage.setItem('bellaia_espace_00000000-0000-0000-0000-0000000000a0', 'assistante'));
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  ok('13 espace mémorisé mais suspendu : le portail assistante ne s\'ouvre pas (accueil client)', /Voir mon agenda/.test(await texte(p)) && !/‹ Ma maison Bellaïa/.test(await texte(p)));
  await ctx.close();
  // 4. Mo Ti-Péyi : aucune commande possible, aucun prix non validé affiché
  ({ ctx, p, err } = await session(b, [], []));
  await p.getByText(/^Mo Ti-P[ée]yi$/).first().click(); await p.waitForTimeout(2500);
  const t = await texte(p);
  ok('14 Mo Ti-Péyi : « Tarif en cours de validation », aucun bouton « Commander », aucun prix', /Tarif en cours de validation/.test(t) && !/🛒 Commander/.test(t) && !/29,90/.test(t));
  await p.screenshot({ path: `${out}/motipeyi_bloque.png` });
  await ctx.close();
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
