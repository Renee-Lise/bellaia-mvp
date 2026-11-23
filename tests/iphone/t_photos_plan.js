// Photos BSH depuis le plan du site public de Concorde Pro (fondatrice, iPhone) : source affichée, avertissement droits,
// « Image à fournir », prix provisoires bloqués, choix de la photo principale, validation, retrait, annulation, inventaire CSV.
// Usage : node tests/iphone/t_photos_plan.js <dossier_sorties>
// Prérequis : mockapp.js (MOCK_STOCKS_BSH = produits de test) + next dev avec CONCORDE_PLAN_DU_SITE_URL / CONCORDE_NEGOCE_URL.
const { chromium, devices } = require('playwright'); const { execFileSync } = require('child_process'); const crypto = require('crypto'); const fs = require('fs');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out + '/cache_img', { recursive: true }); const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true }); const id = '00000000-0000-0000-0000-0000000000f0';
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); localStorage.removeItem('bellaia_bsh_validations_photos'); }, [{ id, role: 'fondatrice' }, jwt(id)]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
  // Photos réelles servies depuis un cache local (lecture seule, rien n'est enregistré dans Bellaïa)
  await p.route('https://www.concordepro.com/**', async route => { const u = route.request().url(); const f = out + '/cache_img/' + crypto.createHash('md5').update(u).digest('hex') + '.jpg';
    try { if (!fs.existsSync(f)) execFileSync('curl', ['-s', '-f', '-m', '30', '-o', f, u]); await route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(f) }); } catch { await route.abort(); } });
  const ecritures = async () => (await fetch('http://localhost:54337/rest/v1/__ecritures')).json();
  const e0 = (await ecritures()).length;
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500);
  await p.waitForSelector('text=Centre de direction'); await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /🗝/.test(x.textContent || '') && /Secret Home/.test(x.textContent || '')); e.scrollIntoView(); e.click(); }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /Réglages/.test(x.textContent || '') || /⚙/.test(x.textContent || '')); e && e.click(); }); await p.waitForTimeout(1500);
  await p.locator('text=Valider les photos produit par produit').first().click();
  await p.waitForSelector('text=Source :', { timeout: 90000 }); await p.waitForTimeout(1500);
  const t = () => p.evaluate(() => document.body.innerText);
  const T = await t();
  ok('repli automatique sur le plan du site public (export privé absent)', /plan du site public de Concorde Pro/.test(T));
  ok('avertissement : droits photo non confirmés', /Droits d'utilisation commerciale des photos non confirmés/.test(T));
  const n = re => Number(((T.match(re) || [])[1]) || -1);
  const aFournir = n(/Image à fournir \((\d+)\)/), prov = n(/Prix provisoires \((\d+)\)/), tous = n(/Tous \((\d+)\)/), aValider = n(/À valider \((\d+)\)/);
  ok(`compteurs : ${tous} produits, ${aValider} à valider, ${aFournir} « Image à fournir », ${prov} prix provisoires`, tous === 390 && aFournir === 37 && prov === 81 && aValider > 0);
  await p.screenshot({ path: `${out}/photos_1_liste.png` });
  await p.locator('button', { hasText: /^Image à fournir \(/ }).click(); await p.waitForTimeout(600);
  ok('« Image à fournir » affiché à la place d\'une photo, aucune photo inventée', await p.evaluate(() => { const L = [...document.querySelectorAll('label')].filter(l => l.querySelector('input[aria-label^="Sélectionner"]')); return L.length > 0 && L.every(l => !l.querySelector('img') && /Image à fournir/.test(l.innerText)); }));
  await p.screenshot({ path: `${out}/photos_2_a_fournir.png` });
  await p.locator('button', { hasText: /^Prix provisoires \(/ }).click(); await p.waitForTimeout(600);
  ok('prix provisoires : aucune sélection possible', await p.evaluate(() => [...document.querySelectorAll('input[aria-label^="Sélectionner"]')].every(c => c.disabled)));
  // Choix de la 2e photo comme principale sur un produit « À valider » avec plusieurs photos
  await p.locator('button', { hasText: /^À valider \(/ }).click(); await p.waitForTimeout(800);
  const carte = p.locator('label').filter({ has: p.locator('button[aria-label="Choisir la photo 2 comme photo principale"]') }).first();
  const nom = (await carte.locator('div').filter({ hasText: /./ }).nth(1).innerText()).split('\n')[0];
  const urlPhoto2 = (await carte.locator('button[aria-label="Choisir la photo 2 comme photo principale"] img').getAttribute('src')).replace('-home_default/', '-large_default/');
  await carte.locator('button[aria-label="Choisir la photo 2 comme photo principale"]').click(); await p.waitForTimeout(300);
  ok('vignette de la photo choisie mise en avant', (await carte.locator('img').first().getAttribute('src')) === urlPhoto2);
  await carte.locator('input[aria-label^="Sélectionner"]').check();
  await p.locator('button', { hasText: 'Aperçu des modifications' }).click(); await p.waitForTimeout(800);
  ok('aperçu : 1 fiche, photo choisie', /1 fiche\(s\) seront modifiées/.test(await t()) && (await p.locator('[role=dialog] img').first().getAttribute('src')) === urlPhoto2);
  await p.screenshot({ path: `${out}/photos_3_apercu.png` });
  ok('aucune écriture avant la validation', (await ecritures()).length === e0);
  await p.locator('button', { hasText: 'Valider 1 fiche' }).click(); await p.waitForTimeout(2000);
  let E = await ecritures();
  ok('écriture unique : image_url = photo choisie (+ date), rien d\'autre', E.length === e0 + 1 && E[E.length - 1].image_url === urlPhoto2 && Object.keys(E[E.length - 1]).sort().join() === 'id,image_url,updated_at');
  // Retirer la photo puis annuler
  await p.locator('button', { hasText: /^Tous \(/ }).click(); await p.fill('input[placeholder="Rechercher un produit ou une référence"]', nom.slice(0, 18)); await p.waitForTimeout(600);
  await p.locator('button', { hasText: 'Retirer la photo' }).first().click(); await p.waitForTimeout(1500);
  E = await ecritures(); ok('retrait : image_url remis à vide', E.length === e0 + 2 && E[E.length - 1].image_url === null);
  await p.locator('button', { hasText: 'Annuler le dernier lot' }).click(); await p.waitForTimeout(1500);
  E = await ecritures(); ok('annulation du retrait : photo rétablie', E.length === e0 + 3 && E[E.length - 1].image_url === urlPhoto2);
  // Inventaire CSV
  await p.fill('input[placeholder="Rechercher un produit ou une référence"]', '');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Inventaire (CSV)' }).click()]);
  const f = out + '/' + dl.suggestedFilename(); await dl.saveAs(f); const csv = fs.readFileSync(f, 'utf8'); const lignes = csv.trim().split('\n');
  ok('inventaire : 390 articles + en-tête', lignes.length === 391);
  ok('inventaire : colonnes demandées, sans prix d\'achat', /Référence;Nom;.*Statut de publication;Prix actuel.*Image principale.*Vérification visuelle;Validation nécessaire/.test(lignes[0]) && !/achat;|prix_achat/i.test(lignes[0].replace('Prix provisoire (achat + 5 €)', '')));
  ok('inventaire : 37 « Image à fournir »', lignes.filter(l => l.includes(';Image à fournir;')).length === 37);
  ok('aucune erreur JavaScript', err.length === 0);
  console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`); if (err.length) console.log(err.slice(0, 3));
  await b.close();
})();
