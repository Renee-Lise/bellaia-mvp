// En-têtes « collants » et zone de l'heure/encoche — iPhone 13 SIMULÉ. Le simulateur ne fournit pas
// env(safe-area-inset-top) : on impose 47 px via --bellaia-haut (valeur d'un iPhone à encoche) et on vérifie
// qu'après défilement l'en-tête reste entièrement SOUS cette zone. Usage : node tests/iphone/t_entetes_iphone.js <dossier>
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const ID = '00000000-0000-0000-0000-0000000000a0';
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [{ id: ID, role: 'cliente', prenom: 'Essai' }, jwt(ID)]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important} :root{--bellaia-haut:47px}' }); await p.waitForTimeout(2500);
  for (const rub of ['Confidentialité et mes données', 'Aide et contact']) {
    await p.getByText(rub, { exact: true }).first().click(); await p.waitForTimeout(1500);
    await p.mouse.wheel(0, 2000); await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /‹ Accueil/.test(x.textContent || '')); if (!b) return null; const h = b.closest('div'); return { top: h.getBoundingClientRect().top, btn: b.getBoundingClientRect().top }; });
    ok(`01 « ${rub} » après défilement : en-tête et bouton « ‹ Accueil » sous la zone de 47 px`, !!r && r.top >= 47 - 0.5 && r.btn >= 47);
    await p.screenshot({ path: `${out}/entete_${rub.slice(0, 6).replace(/\W/g, '')}.png` });
    await p.getByText('‹ Accueil').first().click(); await p.waitForTimeout(1000);
  }
  ok('02 aucune erreur JavaScript', err.length === 0);
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
