// Compteur « actions requises » (version de production + lot 7) : 75 lignes simulées
// = 60 « à faire » + 2 « en cours » + 10 terminées/annulées + 1 ligne technique + 2 sans objet → badge 60, liste 60.
// Usage : node tests/iphone/t_compteur_actions_prod.js <dossier_sorties> [iphone|ordinateur]   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const A = (i, statut, priorite = 2, extra = {}) => ({ id: 'act' + i, cle: 'c' + i, titre: `Action d'essai ${i}`, univers: 'STUDIO', priorite, date_limite: null, statut, decision: null, bloque: null, ...extra });
const lignes = [
  ...Array.from({ length: 60 }, (_, i) => A(i, 'a_faire', i < 12 ? 1 : 2 + (i % 3))),
  A(60, 'en_cours'), A(61, 'en_cours'),
  ...Array.from({ length: 6 }, (_, i) => A(70 + i, 'fait')), A(80, 'annule'), A(81, 'annulee'), A(82, 'abandonne'), A(83, 'fait'),
  A(90, 'sans_objet'), A(91, 'sans_objet'),
  A(99, 'a_faire', 1, { cle: 'suivi_exigences', titre: 'Registre (ligne technique)' }),
];
(async () => {
  const out = process.argv[2] || '.'; const mode = process.argv[3] || 'iphone'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const ctx = await b.newContext(mode === 'ordinateur' ? { viewport: { width: 1366, height: 900 } } : { ...devices['iPhone 13'] });
  const u = { id: '00000000-0000-0000-0000-0000000000f0', role: 'fondatrice', prenom: 'Test' };
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [u, jwt(u.id)]);
  let limite = false;
  await ctx.route(/\/rest\/v1\/bellaia_actions\?/, async r => { const q = decodeURIComponent(r.request().url()); if (/limit=50\b/.test(q)) limite = true; if (/cle=eq\.suivi_exigences|id=eq\./.test(q)) return r.continue(); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lignes) }); });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForSelector('text=Bonjour'); await p.waitForTimeout(2500);
  const bouton = p.locator('button', { hasText: 'Actions requises' }).first();
  const txt = (await bouton.textContent()) || '';
  ok(`badge du menu = 60 (lu : « ${txt.trim()} »)`, /\b60\b/.test(txt) && !/\b50\b/.test(txt));
  await bouton.click(); await p.waitForTimeout(2500);
  const corps = await p.evaluate(() => document.body.innerText);
  ok('écran : 60 à traiter', /60\s*(action|à traiter|ouverte|en attente)/i.test(corps));
  ok('écran : « 2 en cours » affiché', /2\s*en cours/i.test(corps));
  ok('ligne technique du registre absente de la liste', !/Registre \(ligne technique\)/.test(corps));
  ok('actions terminées / annulées absentes', !/Action d'essai 7[0-5]\b|Action d'essai 8[0-3]\b|Action d'essai 9[01]\b/.test(corps));
  ok('aucune requête plafonnée à 50', !limite);
  ok('aucune erreur JavaScript', err.length === 0);
  await p.screenshot({ path: `${out}/compteur_actions_${mode}.png` });
  await b.close(); console.log(`[${mode}]\n` + R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
