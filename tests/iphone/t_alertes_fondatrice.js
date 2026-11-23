// Notifications fondatrice : section « Alertes reçues » (bellaia_notifications) — iPhone 13 SIMULÉ, base simulée.
// Usage : node tests/iphone/t_alertes_fondatrice.js <dossier>
const { chromium, devices } = require('playwright');
const UID = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID, role: 'fondatrice' }, jwt(UID)]);
  const ALERTES = [{ id: 'n1', type: 'ODYSSEE', titre: 'Nouveau RDV Odyssée — Extensions de cils', contenu: 'Client : Essai\nRéférence : BO-TEST', lu: false, created_at: new Date().toISOString() },
                   { id: 'n2', type: 'FOOD', titre: 'Nouvelle commande Bella\'Food', contenu: 'Référence : BF-TEST', lu: true, created_at: new Date(Date.now() - 3600e3).toISOString() }];
  const patchs = []; let filtreUser = '';
  await ctx.route(/\/rest\/v1\/bellaia_notifications/, async r => { const q = r.request(); if (q.method() === 'PATCH') { patchs.push(q.url() + ' ' + q.postData()); return r.fulfill({ status: 204, body: '' }); } filtreUser = new URL(q.url()).searchParams.get('user_id') || ''; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ALERTES) }); });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const cliquer = re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim())); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, re.source);
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await cliquer(/Accueil/); await p.waitForTimeout(800); const nav = await cliquer(/^Notifications$/); await p.waitForTimeout(2500);
  if (!/Alertes reçues/.test(await p.evaluate(() => document.body.innerText))) console.log('NAV', nav, (await p.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n+/g, ' | '));
  const t = await p.evaluate(() => document.body.innerText);
  ok('01 section « Alertes reçues » affichée avec 1 non lue', /Alertes reçues/.test(t) && /1 non lue/.test(t));
  ok('02 lecture limitée aux alertes de la fondatrice connectée', filtreUser === 'eq.' + UID);
  ok('03 contenu des alertes affiché (titre, détail)', /Nouveau RDV Odyssée — Extensions de cils/.test(t) && /BO-TEST/.test(t));
  await p.getByRole('button', { name: 'Lu' }).first().click(); await p.waitForTimeout(600);
  ok('04 « Lu » : alerte marquée lue en base', patchs.length === 1 && /id=eq\.n1/.test(patchs[0]) && /"lu":true/.test(patchs[0]));
  await p.screenshot({ path: `${out}/alertes_fondatrice.png`, fullPage: true });
  ok('05 aucune erreur JavaScript', err.length === 0);
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
