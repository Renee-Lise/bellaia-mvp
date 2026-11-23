// Jeu de cartes Mo Ti-Péyi (prototype, espace fondatrice) — profil iPhone 13 SIMULÉ. Aucune donnée écrite.
// Usage : node tests/iphone/t_jeu_cartes.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', cliente: '00000000-0000-0000-0000-0000000000a0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  const page = async role => { const ctx = await b.newContext({ ...devices['iPhone 13'] });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role }, jwt(UID[role])]);
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); const ecritures = []; p.on('request', q => { if (q.method() !== 'GET' && /rest\/v1|storage\/v1/.test(q.url())) ecritures.push(q.url()); });
    await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500); return { p, err, ecritures }; };
  const cliquer = (p, re) => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim())); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, re.source);
  const { p, err, ecritures } = await page('fondatrice'); const texte = () => p.evaluate(() => document.body.innerText);
  await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await cliquer(p, /^📚\s*Éditions$/); await p.waitForTimeout(1200); await cliquer(p, /^Mo Ti-Péyi$/); await p.waitForTimeout(2000);
  ok('01 onglet « Jeu de cartes (prototype) » présent dans Mo Ti-Péyi', await cliquer(p, /Jeu de cartes \(prototype\)$/));
  await p.waitForSelector('[aria-label="Plateau"]', { timeout: 60000 }); await p.waitForTimeout(500);
  ok('02 bandeau « Prototype … non visible des familles »', /Prototype/.test(await texte()) && /Non visible des familles/.test(await texte()));
  const jouer = async () => { await cliquer(p, /^▶ Jouer$/); await p.waitForFunction(() => document.querySelector('[role=status]'), null, { timeout: 15000 }); return p.locator('[role=status]').innerText(); };
  // PS-1 : 3 flèches droite
  for (let i = 0; i < 3; i++) await p.getByRole('button', { name: 'Flèche E' }).click();
  ok('03 PS : 3 flèches → Ti-Colibri arrive au carbet', /Bravo/.test(await jouer()));
  await p.screenshot({ path: `${out}/jeu_ps_reussi.png` });
  await cliquer(p, /^Recommencer$/); await p.getByRole('button', { name: 'Flèche N' }).click();
  ok('04 PS : flèche vers le haut → « sort du plateau », pas de victoire', /sort du plateau/.test(await jouer()));
  await cliquer(p, /^Recommencer$/); for (let i = 0; i < 5; i++) await p.getByRole('button', { name: 'Flèche E' }).click();
  ok('05 limite de cartes respectée (4 au maximum)', await p.locator('[data-carte-programme]').count() === 4 && /4 cartes au maximum/.test(await texte()));
  // MS-2 : mangue
  await p.getByRole('tab', { name: 'MS' }).click(); await cliquer(p, /^2\. La mangue$/); await p.waitForTimeout(300);
  for (const d of ['E', 'E']) await p.getByRole('button', { name: 'Flèche ' + d }).click(); await p.getByRole('button', { name: 'Ramasser' }).click();
  for (const d of ['E', 'S', 'S', 'S']) await p.getByRole('button', { name: 'Flèche ' + d }).click();
  ok('06 MS : ramasser la mangue puis rentrer → réussi', /Bravo/.test(await jouer()));
  // GS-3 : débogage
  await p.getByRole('tab', { name: 'GS' }).click(); await cliquer(p, /^3\. Le programme cassé$/); await p.waitForTimeout(300);
  ok('07 GS débogage : programme pré-rempli (5 cartes) qui échoue', await p.locator('[data-carte-programme]').count() === 5 && !/Bravo/.test(await jouer()));
  await cliquer(p, /^Indice$/); await p.waitForTimeout(200);
  ok('08 indice pour l\'adulte : carte n° 2', /carte n° 2/.test(await p.locator('[role=status]').innerText()));
  await p.locator('[data-carte-programme="1"]').click(); await p.getByRole('button', { name: 'Flèche S' }).click();
  ok('09 remplacer la carte fausse → réussi', await p.locator('[data-carte-programme]').count() === 5 && /Bravo/.test(await jouer()));
  // CP-2 : boucles
  await p.getByRole('tab', { name: 'CP' }).click(); await cliquer(p, /^2\. La grande boucle$/); await p.waitForTimeout(300);
  for (let k = 0; k < 2; k++) { await p.getByRole('button', { name: 'Répéter 4 fois' }).click(); await p.getByRole('button', { name: 'Avancer', exact: true }).click(); await cliquer(p, /^Fermer la boucle$/); await p.getByRole('button', { name: 'Tourner à droite' }).click(); }
  await p.getByRole('button', { name: 'Répéter 4 fois' }).click(); await p.getByRole('button', { name: 'Avancer', exact: true }).click();
  ok('10 CP : 3 boucles « répéter 4 × avancer » + 2 virages → réussi (boucle fermée au lancement)', /Bravo/.test(await jouer()));
  await p.screenshot({ path: `${out}/jeu_cp_boucles.png`, fullPage: true });
  // CP-3 : condition
  await cliquer(p, /^3\. Si un obstacle…$/); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Répéter 7 fois' }).click(); await p.getByRole('button', { name: 'Si obstacle tourner à droite sinon avancer' }).click();
  ok('11 CP : « répéter 7 × si obstacle » → réussi', /Bravo/.test(await jouer()));
  const t = await p.locator('button', { hasText: 'Flèche' }).count();
  ok('12 cartes adaptées au niveau : pas de flèches en CP', t === 0);
  const tailles = await p.evaluate(() => [...document.querySelectorAll('[aria-label="Cartes disponibles"] button')].map(x => x.getBoundingClientRect()).every(r => r.width >= 44 && r.height >= 44));
  ok('13 cartes tactiles ≥ 44 px', tailles);
  ok('14 aucune écriture en base ou dans le stockage', ecritures.length === 0);
  ok('15 fondatrice : aucune erreur JavaScript', err.length === 0);
  const c = await page('cliente');
  ok('16 compte Famille : jeu absent de son interface', !/Jeu de cartes \(prototype\)/.test(await c.p.evaluate(() => document.body.innerText)));
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
