// Contrôle mobile des portails par rôle (profil iPhone 14 SIMULÉ) : chaque rubrique du menu est ouverte,
// puis on vérifie l'absence de débordement horizontal, de texte tronqué hors écran et d'erreur JavaScript.
// Usage : node tests/iphone/t_portails_mobile.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const ROLES = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0', cliente: '00000000-0000-0000-0000-0000000000a0', collaborateur: '00000000-0000-0000-0000-0000000000c0' };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v, d = '') => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}${d ? ' — ' + d : ''}`);
  const b = await chromium.launch();
  for (const [role, id] of Object.entries(ROLES)) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [{ id, role, prenom: 'Essai' }, jwt(id)]);
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
    await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500);
    const audit = () => p.evaluate(() => {
      const W = window.innerWidth; const larges = [];
      for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width > 0 && r.right > W + 2 && getComputedStyle(e).position !== 'fixed') { let c = e.parentElement, cache = false; while (c) { const s = getComputedStyle(c); if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) { cache = true; break; } c = c.parentElement; } if (!cache) larges.push((e.tagName + ' ' + (e.textContent || '').trim().slice(0, 30)).replace(/\s+/g, ' ')); } }
      return { deborde: document.documentElement.scrollWidth > W + 1, larges: larges.slice(0, 3) };
    });
    const a0 = await audit(); ok(`${role} · accueil sans débordement`, !a0.deborde && !a0.larges.length, a0.larges.join(' | '));
    await p.screenshot({ path: `${out}/portail_${role}.png` });
    // Rubriques du menu inférieur (ou latéral) : boutons de navigation visibles
    const rubriques = await p.evaluate(() => [...document.querySelectorAll('button')].filter(x => { const r = x.getBoundingClientRect(); return r.bottom > window.innerHeight - 120 && r.height > 0 && (x.textContent || '').trim().length > 1; }).map(x => (x.textContent || '').trim()).slice(0, 14));
    let echecs = [];
    for (const t of rubriques) {
      const clic = await p.evaluate(t => { const e = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === t && x.getBoundingClientRect().height > 0); if (!e) return false; e.click(); return true; }, t);
      if (!clic) continue; await p.waitForTimeout(1200);
      const a = await audit(); if (a.deborde || a.larges.length) echecs.push(`${t} → ${a.larges[0] || 'page plus large que l\'écran'}`);
    }
    ok(`${role} · ${rubriques.length} rubrique(s) du menu sans débordement`, echecs.length === 0, echecs.slice(0, 4).join(' ; '));
    ok(`${role} · aucune erreur JavaScript`, err.length === 0, err.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => / : OK/.test(x)).length}/${R.length}`);
})();
