// Bella'Food › Catalogue : ajout d'une photo à un produit (fondatrice) — iPhone 13 SIMULÉ, base simulée.
// Vérifie : envoi dans le stockage public food-recettes-media, enregistrement dans galerie_photos, prix inchangé,
// affichage de l'aperçu, refus d'un fichier trop lourd. Usage : node tests/iphone/t_food_photo.js <dossier>
const { chromium, devices } = require('playwright');
const UID = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID, role: 'fondatrice' }, jwt(UID)]);
  const envois = [], patchs = [];
  await ctx.route(/\/storage\/v1\/object\/food-recettes-media\//, r => { envois.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"Key":"ok"}' }); });
  await ctx.route(/\/storage\/v1\/object\/public\/food-recettes-media\//, r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await ctx.route(/\/rest\/v1\/catalogue_produits\?id=eq\./, async r => { if (r.request().method() === 'PATCH') { patchs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 200, contentType: 'application/json', body: '[{}]' }); } return r.fallback(); });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const cliquer = re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim())); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, re.source);
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await cliquer(/^🍲?\s*Food$/) || await cliquer(/Food/); await p.waitForTimeout(1500); await cliquer(/Catalogue$/); await p.waitForTimeout(2000);
  ok('01 Food › Catalogue ouvert', /Tarte coco \(test\)/.test(await p.evaluate(() => document.body.innerText)));
  await p.locator('div', { hasText: /^Tarte coco \(test\)/ }).first().evaluate(() => {});
  const boutons = p.locator('button', { hasText: /Modifier|✏️/ }); 
  if (await boutons.count()) await boutons.first().click(); else await p.getByText('Tarte coco (test)').first().click();
  await p.waitForTimeout(800);
  ok('02 formulaire : zone « Photo du produit » et bouton d\'ajout', /Photo du produit/.test(await p.evaluate(() => document.body.innerText)) && await p.locator('input[aria-label="Photo du produit"]').count() === 1);
  await p.setInputFiles('input[aria-label="Photo du produit"]', { name: 'trop-lourde.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(9 * 1024 * 1024, 1) }); await p.waitForTimeout(400);
  ok('03 fichier de plus de 8 Mo refusé sans envoi', /trop lourde/.test(await p.evaluate(() => document.body.innerText)) && envois.length === 0);
  await p.setInputFiles('input[aria-label="Photo du produit"]', { name: 'tarte coco.png', mimeType: 'image/png', buffer: PNG }); await p.waitForTimeout(1500);
  ok('04 photo envoyée dans food-recettes-media/photos (nom de fichier nettoyé)', envois.length === 1 && /food-recettes-media\/photos\/\d+-tarte_coco\.png$/.test(envois[0]));
  ok('05 aperçu affiché avec texte alternatif', await p.locator('img[alt="Photo : Tarte coco (test)"]').count() === 1);
  await cliquer(/Enregistrer|Sauvegarder|Mettre à jour/); await p.waitForTimeout(1500);
  ok('06 enregistrement : galerie_photos contient l\'URL publique', patchs.length === 1 && Array.isArray(patchs[0].galerie_photos) && /\/object\/public\/food-recettes-media\/photos\//.test(patchs[0].galerie_photos[0]));
  ok('07 prix inchangé (4,5) dans l\'enregistrement', patchs.length === 1 && (patchs[0].prix === undefined || patchs[0].prix === 4.5));
  await p.screenshot({ path: `${out}/food_photo.png` });
  ok('08 aucune erreur JavaScript', err.length === 0);
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
