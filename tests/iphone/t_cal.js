const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', cliente: '00000000-0000-0000-0000-0000000000a0', assistante: '00000000-0000-0000-0000-0000000000e0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2]; const b = await chromium.launch();
  for (const role of ['fondatrice', 'assistante', 'cliente']) {
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role, prenom: role === 'fondatrice' ? 'Renée-Lise' : null, email: 'test@example.invalid' }, jwt(UID[role])]);
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
    await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500);
    if (role === 'fondatrice') { await p.locator('text=Agenda').first().click(); }
    if (role === 'assistante') { await p.locator('text=Mon agenda').first().click(); }
    await p.waitForTimeout(2500);
    const res = {};
    for (const v of ['Jour', 'Semaine', 'Mois']) {
      const bt = p.locator(`button:text-is("${v}")`).first();
      if (!(await bt.count())) { res[v] = 'bouton absent'; continue; }
      await bt.scrollIntoViewIfNeeded(); await bt.click(); await p.waitForTimeout(900);
      const box = await bt.boundingBox(); await p.evaluate(y => window.scrollBy(0, y - 120), box.y);
      await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${role}_${v.toLowerCase()}.png` });
      res[v] = await p.evaluate(() => ({ cases: document.querySelectorAll('[data-jour], td').length, texte: (document.body.innerText.match(/Aucun[^\n]{0,60}/) || [''])[0], largeur: document.documentElement.scrollWidth }));
    }
    console.log(role, JSON.stringify(res), err.length ? 'ERREURS ' + err.slice(0, 2) : 'sans erreur JS');
    await ctx.close();
  }
  await b.close();
})();
