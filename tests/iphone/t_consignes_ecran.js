// Bibliothèque de consignes IA (fondatrice) — iPhone 13 SIMULÉ. Versions simulées par interception réseau
// (aucune écriture en base). Vérifie : 24 modèles / 8 métiers, remplissage, copie sans appel IA, nouvelle
// version (motif obligatoire), validation, historique, alerte sur les expressions non natives, assistante sans accès.
// Usage : node tests/iphone/t_consignes_ecran.js <dossier_sorties>
const { chromium, devices } = require('playwright');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const lignes = []; const ia = [];
  const session = async role => { const ctx = await b.newContext({ ...devices['iPhone 13'], permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role }, jwt(UID[role])]);
    await ctx.route(/\/rest\/v1\/bellaia_documents/, async r => { const q = r.request(); const u = new URL(q.url());
      if (q.method() === 'POST') { const row = { ...JSON.parse(q.postData()), id: 'd' + (lignes.length + 1), created_at: new Date().toISOString() }; lignes.push(row); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) }); }
      if (q.method() === 'PATCH') { const id = u.searchParams.get('id').slice(3); const l = lignes.find(x => x.id === id); Object.assign(l, JSON.parse(q.postData())); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([l]) }); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.searchParams.get('module') === 'eq.CONSIGNES' ? lignes : []) }); });
    await ctx.route(/\/api\/(ia|chat)\//, r => { ia.push(r.request().url()); r.fulfill({ status: 500, body: '' }); });
    await ctx.route(/api\.anthropic\.com|api\.openai\.com/, r => { ia.push(r.request().url()); r.abort(); });
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500); return { ctx, p, err }; };
  const cliquer = (p, re) => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim())); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, re.source);
  const { ctx, p, err } = await session('fondatrice'); const texte = () => p.evaluate(() => document.body.innerText);
  await p.waitForSelector('text=Centre de direction', { timeout: 90000 }); await cliquer(p, /Organisation/); await p.waitForTimeout(800);
  ok('01 Organisation › « Consignes IA » présent', await cliquer(p, /🧠 Consignes IA/)); await p.waitForSelector('text=Nouvelle consigne', { timeout: 60000 });
  let t = await texte();
  ok('02 24 modèles, 8 métiers, mention « aucun coût »', /Tous \(24\)/.test(t) && ['Recherche et veille', 'Développement et correction', 'Gestion administrative', 'Création de contenus', 'Communication et marketing', 'Analyse de données', 'Formation et pédagogie', 'Sécurité et conformité'].every(x => t.includes(x)) && /aucun coût/.test(t));
  await cliquer(p, /^Sécurité et conformité$/); await p.waitForTimeout(300);
  ok('03 filtre par métier : 3 consignes Sécurité', (await p.locator('button', { hasText: 'v1 ·' }).count()) === 3);
  await cliquer(p, /^Tous \(24\)$/); await p.fill('input[aria-label="Rechercher une consigne"]', 'relance'); await p.waitForTimeout(300);
  ok('04 recherche « relance » : la consigne dont le titre correspond arrive en premier', /Relance de facture impayée/.test(await p.locator('button', { hasText: 'v1 ·' }).first().innerText()));
  await p.locator('button', { hasText: 'Relance de facture impayée' }).click(); await p.waitForTimeout(500);
  ok('05 action sensible annoncée avec son autorisation', /Action sensible — Accord écrit/.test(await texte()));
  ok('06 « Copier » bloqué tant que les variables obligatoires manquent', await p.locator('button', { hasText: 'Copier la consigne' }).isDisabled() && /À compléter/.test(await texte()));
  for (const [l, v] of [['Nom du client', 'Cliente A'], ['Numéro et date de la facture', 'F-12'], ['Montant dû', '120 €'], ['Échéance dépassée', '15/11']]) await p.fill(`input[aria-label="${l}"]`, v);
  const pret = await p.locator('textarea[aria-label="Consigne prête"]').inputValue();
  ok('07 consigne remplie avec sources, coûts et autorisation', pret.includes('Cliente A') && /Cite chaque source/.test(pret) && /service payant/.test(pret) && !/\{\{/.test(pret));
  await cliquer(p, /^Copier la consigne$/); await p.waitForTimeout(400);
  ok('08 copie : presse-papiers rempli, aucun appel IA', (await p.evaluate(() => navigator.clipboard.readText())) === pret && ia.length === 0);
  await cliquer(p, /Modifier \(nouvelle version\)/); await p.waitForTimeout(300);
  const zone = p.locator('textarea').first(); await zone.fill((await zone.inputValue()) + ' Ajoute le rappel des pénalités prévues au contrat seulement. /relance ultrathink');
  ok('09 éditeur : expressions « /relance » et « ultrathink » signalées comme non garanties', /non garanties|pas des commandes garanties/.test(await texte()) && /\/relance/.test(await texte()));
  await cliquer(p, /Enregistrer une nouvelle version/); await p.waitForTimeout(400);
  ok('10 motif obligatoire pour une nouvelle version', /Indiquez le motif/.test(await texte()) && lignes.length === 0);
  await p.fill('input[placeholder^="ex. ajout"]', 'Rappel des pénalités contractuelles'); await cliquer(p, /Enregistrer une nouvelle version/); await p.waitForTimeout(1200);
  ok('11 version 2 enregistrée en brouillon (référence versionnée, v1 conservée)', lignes.length === 1 && lignes[0].reference === 'consigne:admin.relance_facture:v2' && lignes[0].statut === 'brouillon' && /v1 · utilisée/.test(await texte()) && /v2 · brouillon/.test(await texte()));
  await cliquer(p, /^Valider$/); await p.waitForTimeout(1200);
  ok('12 validation : v2 devient la version utilisée, historique avec motif', lignes[0].statut === 'valide' && /version 2/.test(await texte()) && /Rappel des pénalités contractuelles/.test(await texte()));
  await p.screenshot({ path: `${out}/consignes_historique.png`, fullPage: true });
  ok('13 aucune erreur JavaScript', err.length === 0);
  await ctx.close();
  const a = await session('assistante');
  ok('14 assistante : rubrique « Consignes IA » absente', !/Consignes IA/.test(await a.p.evaluate(() => document.body.innerText)));
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
