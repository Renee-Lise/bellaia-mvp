// Registre « Suivi des exigences » (fondatrice) sur iPhone : accès, filtres, recherche, détail, statut, règle « Déployé »,
// rapports privés, bouton Retour ; et refus pour l'assistante. Usage : node tests/iphone/t_exig.js <dossier_sorties>
const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  const session = async role => { const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role }, jwt(UID[role])]);
    return ctx.newPage(); };
  const p = await session('fondatrice'); const err = []; p.on('pageerror', e => err.push(e.message));
  const reponses = []; p.on('dialog', d => d.accept(reponses.shift() ?? ''));
  const texte = () => p.evaluate(() => document.body.innerText);
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.waitForSelector('text=Centre de direction', { timeout: 60000 }); await p.waitForTimeout(1500);
  // Accès : Accueil › Actions requises › Suivi des exigences
  const cliquer = async re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test(x.textContent || '')); if (e) { e.click(); return true; } return false; }, re.source);
  if (!(await cliquer(/Suivi des exigences/))) { await cliquer(/Actions requises/); await p.waitForTimeout(1500); await cliquer(/Suivi des exigences/); }
  await p.waitForSelector('text=🧭 Suivi des exigences', { timeout: 30000 }); await p.waitForTimeout(1500);
  ok('écran accessible depuis l\'interface fondatrice', /Exigences \(3\)/.test(await texte()));
  ok('compteurs par statut', /À faire · 1/.test(await texte()) && /Bloqué · 1/.test(await texte()) && /À valider · 1/.test(await texte()));
  ok('décisions attendues comptées', /1 décision attendue de votre part/.test(await texte()));
  await p.screenshot({ path: `${out}/exig_1_liste.png` });
  await p.locator('button', { hasText: 'Bloqué · 1' }).click(); await p.waitForTimeout(300);
  ok('filtre par statut', /1 exigence affichée/.test(await texte()) && /Exigence bloquée/.test(await texte()));
  await p.locator('button', { hasText: 'Bloqué · 1' }).click();
  await p.fill('input[placeholder="Rechercher une exigence…"]', 'absente'); await p.waitForTimeout(300);
  ok('recherche', /1 exigence affichée/.test(await texte()) && /Exigence de test absente/.test(await texte()));
  await p.fill('input[placeholder="Rechercher une exigence…"]', '');
  await p.getByText('Exigence de test développée').click(); await p.waitForTimeout(400);
  const t1 = await texte();
  ok('détail : responsable, résultat de test, preuve, décision', /Claude \(développement\)/.test(t1) && /Oui — 3\/3/.test(t1) && /Commit abc1234/.test(t1) && /GO production/.test(t1));
  ok('détail : 4 étapes distinctes (développée, test local, test en prévisualisation, production)', /Développée/i.test(t1) && /Testée localement/i.test(t1) && /Testée en prévisualisation/i.test(t1) && /Déployée en production/i.test(t1));
  // Règle : « Déployé » sans identifiant de déploiement → refusé
  const sel = p.locator('select').filter({ has: p.locator('option[value="deploye"]') }).first();
  reponses.push('pas un identifiant'); await sel.selectOption('deploye'); await p.waitForTimeout(800);
  ok('« Déployé » refusé sans identifiant de déploiement', /« Déployé » refusé/.test(await texte()));
  let row = await (await fetch('http://localhost:54337/rest/v1/bellaia_actions?cle=eq.suivi_exigences', { headers: { Authorization: `Bearer ${jwt(UID.fondatrice)}` } })).json();
  ok('aucune écriture après le refus', row[0].pieces_jointes[0].items[0].s === 'a_valider');
  reponses.push('dpl_TestDeploiement123'); await sel.selectOption('deploye'); await p.waitForTimeout(1200);
  row = await (await fetch('http://localhost:54337/rest/v1/bellaia_actions?cle=eq.suivi_exigences', { headers: { Authorization: `Bearer ${jwt(UID.fondatrice)}` } })).json();
  const it = row[0].pieces_jointes[0].items[0];
  ok('« Déployé » accepté avec identifiant, preuve complétée, historique', it.s === 'deploye' && /dpl_TestDeploiement123/.test(it.p) && it.h?.length === 1 && it.h[0].de === 'a_valider');
  ok('rapports conservés après l\'écriture', row[0].pieces_jointes.some(x => x.type === 'rapport'));
  await p.screenshot({ path: `${out}/exig_2_detail.png` });
  // Rapports privés
  await p.locator('button', { hasText: 'Rapports privés (1)' }).click(); await p.locator('button', { hasText: 'Lire' }).click(); await p.waitForTimeout(300);
  ok('lecture du rapport', /Contenu privé fictif/.test(await texte()));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Télécharger' }).first().click()]);
  ok('téléchargement du rapport', /rapport_test\.md/.test(dl.suggestedFilename()));
  await p.locator('button', { hasText: '← Retour aux rapports' }).click();
  await p.locator('button[aria-label="Retour"]').click(); await p.waitForTimeout(1500);
  ok('bouton Retour → Actions requises', /📌 Actions requises/.test(await texte()) && !/Rapports privés/.test(await texte()));
  ok('aucune erreur JavaScript (fondatrice)', err.length === 0);
  // Assistante : la ligne n'est jamais renvoyée (RLS simulée) ; l'écran n'est pas dans sa navigation
  const a = await session('assistante'); await a.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await a.waitForTimeout(2500);
  const ra = await (await fetch('http://localhost:54337/rest/v1/bellaia_actions?cle=eq.suivi_exigences', { headers: { Authorization: `Bearer ${jwt(UID.assistante)}` } })).json();
  ok('assistante : registre non lisible, écran absent de sa navigation', ra.length === 0 && !/Suivi des exigences/.test(await a.evaluate(() => document.body.innerText)));
  console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`); if (err.length) console.log(err.slice(0, 3));
  await b.close();
})();
