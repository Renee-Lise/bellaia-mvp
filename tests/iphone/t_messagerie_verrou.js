// Messagerie : réservée à la fondatrice tant que la migration 0133 n'est pas en production.
// Usage : node tests/iphone/t_messagerie_verrou.js <dossier_sorties>   (mockapp.js + next dev -p 3160 lancés)
const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  for (const role of ['assistante', 'fondatrice']) {
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role }, jwt(UID[role])]);
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
    const appels = []; p.on('request', r => { if (/bellaia_(conversations|conv_membres|messages)/.test(r.url())) appels.push(r.url()); });
    await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await p.waitForTimeout(2500);
    const cliquer = re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button, a, [role=button], [role=link], div')].reverse().find(x => r.test((x.textContent || '').trim()) && x.offsetParent !== null); if (e) { (e.closest('button, a, [role=button], [role=link]') || e).click(); return true; } return false; }, re.source);
    if (!(await cliquer(/^Messages$/))) { await cliquer(/Messages/); await p.waitForTimeout(800); await cliquer(/^Messages$/); }
    await p.waitForTimeout(3000);
    const t = await p.evaluate(() => document.body.innerText);
    const verrou = /messagerie interne est en cours de sécurisation/.test(t);
    if (role === 'assistante') {
      ok('assistante : après appui sur « Messages », écran verrouillé et aucune conversation', verrou && !/Nouvelle conversation/.test(t));
      ok('assistante : aucune requête vers les tables de messagerie', appels.length === 0);
    } else {
      ok('fondatrice : messagerie accessible (pas de verrou)', !verrou && /Messag/.test(t));
    }
    ok(`${role} : aucune erreur JavaScript`, err.length === 0);
    await p.screenshot({ path: `${out}/messagerie_${role}.png` }); await ctx.close();
  }
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
