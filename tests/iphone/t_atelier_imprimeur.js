// Atelier papeterie (24/11) : patron ORIGINAL → éditeur → export imprimeur à l'échelle réelle (fond perdu, traits de coupe).
// iPhone 13 SIMULÉ (Chromium), PAS un iPhone réel. Les écritures events_papeterie sont interceptées (aucune base réelle).
// Prérequis : mockapp.js (:54337) + next dev -p 3160. Usage : node tests/iphone/t_atelier_imprimeur.js <sorties>
const { chromium, devices } = require('playwright'); const fs = require('fs');
const F = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; let n = 0; const ok = (m, v) => { n++; R.push(`${String(n).padStart(2, '0')} ${m} : ${v ? 'OK' : 'ÉCHEC'}`); };
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.removeItem('bellaia-nav'); }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
  const lignes = []; const ecritures = [];
  await p.route(/\/rest\/v1\/events_papeterie/, async r => { const m = r.request().method();
    if (m === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lignes) });
    const c = JSON.parse(r.request().postData() || 'null'); ecritures.push({ m, c });
    if (m === 'POST') { const row = { id: 'pap' + (lignes.length + 1), created_at: new Date().toISOString(), ...(Array.isArray(c) ? c[0] : c) }; lignes.push(row); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
  await p.route(/\/rest\/v1\/(events_medias|events_packs_registre)/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await p.locator('button', { hasText: "Even's" }).first().tap(); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Atelier papeterie/ }).first().tap(); await p.waitForTimeout(2500);
  await p.getByRole('button', { name: '+ Nouvelle création / patron' }).tap(); await p.waitForTimeout(400);
  ok('7 patrons originaux proposés dans « Nouvelle création »', (await p.locator('[data-testid^=patron-]').count()) === 7);
  await p.getByTestId('patron-cube').tap(); await p.getByLabel('Côté').fill('60'); await p.waitForTimeout(200);
  ok('dimensions du patron calculées avant création (boîte cube 60 → 264 × 228 mm, marges comprises)', /264 × 228 mm/.test(await p.evaluate(() => document.body.innerText)));
  await p.getByRole('button', { name: 'Créer et ouvrir' }).tap(); await p.waitForTimeout(2500);
  const cree = ecritures.find(e => e.m === 'POST');
  ok('patron enregistré : type boîte cube, 264 × 228 mm, coupe + plis + collage + zones de décor', cree && cree.c.type_support === 'boite_cube' && cree.c.largeur_mm === 264 && cree.c.hauteur_mm === 228 && cree.c.contenu.reperes.traits.some(t => t.type === 'collage') && cree.c.contenu.calques.some(c => c.zone === 'PRENOM'));
  ok('l\'éditeur s\'ouvre sur le patron (format affiché)', /264 × 228 mm/.test(await p.evaluate(() => document.body.innerText)));
  await p.getByTestId('fond-perdu-3').tap(); await p.waitForTimeout(200);
  const t = await p.evaluate(() => document.body.innerText);
  ok('réglages : fond perdu 0 / 3 / 5 mm et marge de sécurité 3 / 5 mm', (await p.locator('[data-testid^=fond-perdu-]').count()) === 3 && /Marge de sécurité/.test(t));
  ok('contrôle de la marge de sécurité affiché', /dans la marge de sécurité|du bord \(risque de coupe\)/.test(t));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('span', { hasText: /^PDF imprimeur/ }).locator('xpath=following-sibling::button[1]').tap()]);
  const fichier = `${out}/imprimeur.pdf`; await dl.saveAs(fichier); const pdf = fs.readFileSync(fichier).toString('latin1');
  const mb = (pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/) || []).slice(1).map(Number); const mm = v => v * 25.4 / 72;
  ok('PDF imprimeur valide (%PDF, image JPEG intégrée)', pdf.startsWith('%PDF-1.4') && /DCTDecode/.test(pdf));
  ok(`page à l'échelle réelle : 264 + 2×13 = 290 mm × 228 + 26 = 254 mm (mesuré ${mm(mb[0]).toFixed(1)} × ${mm(mb[1]).toFixed(1)} mm)`, Math.abs(mm(mb[0]) - 290) < 0.1 && Math.abs(mm(mb[1]) - 254) < 0.1);
  ok('résolution d\'impression ≥ 250 dpi', (() => { const w = Number((pdf.match(/\/Width (\d+)/) || [])[1]); return w / (290 / 25.4) >= 250; })());
  ok('nom du fichier explicite (format fini)', /imprimeur-264x228mm\.pdf$/.test(dl.suggestedFilename()));
  await p.screenshot({ path: `${out}/atelier_imprimeur.png` });
  ok('aucune erreur JavaScript', err.length === 0); if (err.length) console.log(err.slice(0, 3).join('\n'));
  await b.close();
  console.log(R.join('\n') + `\n${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})().catch(e => { console.error(e); process.exit(1); });
