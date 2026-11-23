// Pages légales de travail + accessibilité (zoom, focus clavier) — iPhone 13 SIMULÉ et ordinateur.
// Usage : node tests/iphone/t_legal_accessibilite.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  for (const [chemin, titre, attendu] of [['/mentions-legales', 'Mentions légales', /Médiation de la consommation/], ['/confidentialite', 'Confidentialité', /aucun traceur publicitaire/], ['/conditions-generales', 'Conditions générales', /Droit de rétractation/]]) {
    const r = await p.goto('http://localhost:3160' + chemin, { waitUntil: 'networkidle', timeout: 180000 });
    const t = await p.evaluate(() => document.body.innerText);
    ok(`01 ${chemin} : page servie (200), titre, contenu`, r.status() === 200 && t.includes(titre) && attendu.test(t));
    ok(`02 ${chemin} : bandeau « Document de travail », champs à compléter visibles, non indexée`, /Document de travail/.test(t) && /\[[^\]]+\]/.test(t) && /noindex/.test(await p.locator('meta[name=robots]').getAttribute('content') || ''));
    ok(`03 ${chemin} : pas de débordement horizontal sur iPhone`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await p.screenshot({ path: `${out}/legal${chemin.replace(/\//g, '_')}.png`, fullPage: true });
  }
  const tc = await p.evaluate(() => document.body.innerText);
  ok('04 conditions générales : 5 activités dans le tableau de rétractation', ['Bella\'Food', 'Bella\'Secret Home', 'Bella\'Events', 'Bella\'Odyssée', 'ebooks'].every(x => tc.includes(x)));
  await p.goto('http://localhost:3160/confidentialite', { waitUntil: 'networkidle' });
  ok('05 confidentialité : 7 sous-traitants listés, dont l\'hébergement en Union européenne', await p.locator('table tbody tr').count() === 7 && /Francfort/.test(await p.evaluate(() => document.body.innerText)));
  const vp = await p.locator('meta[name=viewport]').getAttribute('content');
  ok('06 zoom autorisé (ni user-scalable=no, ni maximum-scale=1)', !!vp && !/user-scalable=no|maximum-scale=1\b/.test(vp));
  // Clavier (ordinateur) : focus visible
  const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } }); const q = await c2.newPage();
  await q.goto('http://localhost:3160/mentions-legales', { waitUntil: 'networkidle' }); await q.keyboard.press('Tab');
  const focus = await q.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { tag: e.tagName, style: s.outlineStyle, w: parseFloat(s.outlineWidth) }; });
  ok('07 Tab : focus sur un lien, contour visible ≥ 3 px', focus.tag === 'A' && focus.style !== 'none' && focus.w >= 3);
  await q.screenshot({ path: `${out}/legal_focus_clavier.png` });
  await q.mouse.click(5, 5);
  // Compte client : liens vers les pages légales
  const c3 = await b.newContext({ ...devices['iPhone 13'] }); const ID = '00000000-0000-0000-0000-0000000000a0';
  await c3.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [{ id: ID, role: 'cliente', prenom: 'Essai' }, jwt(ID)]);
  const k = await c3.newPage(); await k.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await k.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await k.waitForTimeout(2500);
  await k.getByText('Confidentialité et mes données', { exact: true }).first().click(); await k.waitForTimeout(1500);
  ok('08 compte client › Confidentialité : liens vers les 3 documents', await k.locator('a[href="/confidentialite"]').count() >= 1 && await k.locator('a[href="/mentions-legales"]').count() >= 1 && await k.locator('a[href="/conditions-generales"]').count() >= 1);
  const champ = await k.evaluate(() => { const i = document.createElement('input'); document.body.appendChild(i); const f = parseFloat(getComputedStyle(i).fontSize); i.remove(); return f; });
  R.push(`09 taille d'un champ de saisie sous WebKit simulé : ${champ} px (la règle cible Safari iOS réel : à vérifier sur iPhone)`);
  ok('10 aucune erreur JavaScript', err.length === 0);
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
