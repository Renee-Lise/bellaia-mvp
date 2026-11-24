// Audit de TOUS les boutons de la page d'accueil réelle, par rôle (session simulée, base simulée).
const { chromium, devices } = require('playwright');
const B = 'http://localhost:3160/';
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', cliente: '00000000-0000-0000-0000-0000000000a0', assistante: '00000000-0000-0000-0000-0000000000e0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const b = await chromium.launch(); const role = process.argv[2]; const attente = { fondatrice: 'Centre de direction', cliente: 'Ma maison Bellaïa', assistante: 'Espace assistante' }[role];
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); if (u.role === 'assistante') localStorage.setItem('bellaia_espace_' + u.id, 'assistante'); /* depuis 6e2bf15 : accueil commun, espace assistante choisi dans « Mes espaces » (mémorisé) */ localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role, prenom: role === 'fondatrice' ? 'Renée-Lise' : null, email: 'test@example.invalid' }, jwt(UID[role])]);
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
  const ouvrir = async () => { await p.goto(B, { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForSelector('text=' + attente, { timeout: 30000 }); await p.waitForTimeout(800); };
  await ouvrir();
  // inventaire des cibles cliquables visibles dans la page d'accueil
  const cibles = await p.evaluate(() => { const els = [...document.querySelectorAll('button, a[href], [role="button"]'), ...[...document.querySelectorAll('div,span')].filter(d => getComputedStyle(d).cursor === 'pointer' && !d.closest('button'))];
    const vus = new Set(); return els.map((e, i) => { e.setAttribute('data-audit', String(i)); const t = (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60); return { i, t, tag: e.tagName }; }).filter(x => x.t && !vus.has(x.t) && vus.add(x.t)); });
  const res = [];
  for (const c of cibles) {
    await ouvrir();
    const el = await p.$(`[data-audit]`); // ré-étiqueter après rechargement
    await p.evaluate(() => { const els = [...document.querySelectorAll('button, a[href], [role="button"]'), ...[...document.querySelectorAll('div,span')].filter(d => getComputedStyle(d).cursor === 'pointer' && !d.closest('button'))]; els.forEach((e, i) => e.setAttribute('data-audit', String(i))); });
    const avant = await p.evaluate(() => document.body.innerText.length + '|' + location.href + '|' + scrollY);
    const loc = p.locator(`[data-audit="${c.i}"]`);
    if (!(await loc.count())) { res.push([c.t, 'introuvable après rechargement']); continue; }
    try { await loc.first().scrollIntoViewIfNeeded(); await loc.first().click({ timeout: 4000 }); } catch (e) { res.push([c.t, 'non cliquable : ' + e.message.split('\n')[0].slice(0, 60)]); continue; }
    await p.waitForTimeout(1200);
    const apres = await p.evaluate(() => document.body.innerText.length + '|' + location.href + '|' + scrollY);
    const txt = await p.evaluate(() => document.body.innerText);
    const message = /n'est pas encore disponible|en préparation|bientôt disponible|Bientôt/i.test(txt);
    res.push([c.t, avant !== apres ? 'effet visible (écran, contenu ou défilement)' : message ? 'message d\'état' : '⚠️ SANS EFFET VISIBLE']);
  }
  const sans = res.filter(r => /SANS EFFET|non cliquable|introuvable/.test(r[1]));
  console.log(`${role} : ${res.length} boutons testés, ${res.length - sans.length} avec effet ou message, ${sans.length} à corriger`);
  sans.forEach(r => console.log('   ', r[0], '→', r[1]));
  require('fs').writeFileSync(process.argv[3] + `/audit_boutons_${role}.json`, JSON.stringify(res, null, 1));
  await b.close();
})().catch(e => { console.error('ECHEC', e.message.split('\n')[0]); process.exit(1); });
