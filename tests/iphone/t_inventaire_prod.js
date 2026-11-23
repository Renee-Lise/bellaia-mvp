// Variante pour la version de production (accueil « Bonjour », menu ✦BSH) — paquet de déploiement du lot 7.
// Inventaire physique BSH (fondatrice) : fiche imprimable, saisie, contrôle, correction tracée, annulation,
// masquage explicite si stock compté à 0 (lot « absents » uniquement), aucun prix modifié ; assistante sans accès.
// Usage : node tests/iphone/t_inventaire.js <dossier_sorties> [iphone|ordinateur]
// Prérequis : mockapp.js avec MOCK_STOCKS_BSH = jeu d'essai des 16 références + next dev -p 3160.
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', assistante: '00000000-0000-0000-0000-0000000000e0' };
(async () => {
  const out = process.argv[2] || '.'; const mode = process.argv[3] || 'iphone'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const appareil = mode === 'ordinateur' ? { viewport: { width: 1366, height: 900 } } : { ...devices['iPhone 13'] };
  const b = await chromium.launch(); const ctx = await b.newContext(appareil);
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID.fondatrice, role: 'fondatrice' }, jwt(UID.fondatrice)]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
  const ecritures = async () => (await fetch('http://localhost:54337/rest/v1/__ecritures')).json();
  const e0 = (await ecritures()).length; const texte = () => p.evaluate(() => document.body.innerText);
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500);
  await p.waitForSelector('text=Bonjour'); await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim() === '✦BSH'); e.scrollIntoView(); e.click(); }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /Réglages/.test(x.textContent || '') || /⚙/.test(x.textContent || '')); e && e.click(); }); await p.waitForTimeout(1500);
  await p.locator('text=Inventaire physique (fiche et correction des stocks)').first().click();
  await p.waitForSelector('[aria-label="Produits à compter"] li', { timeout: 60000 }); await p.waitForTimeout(800);
  const items = () => p.locator('[aria-label="Produits à compter"] li').count();
  ok('lot « ruptures » : 10 produits listés', await items() === 10);
  ok('lot « ruptures » : aucun bouton de masquage', await p.locator('text=Masquer (stock compté à 0)').count() === 0);
  // Fiche imprimable
  const [fen] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), p.locator('text=Imprimer la fiche d\'inventaire').click()]);
  if (fen) { await fen.waitForLoadState(); const h = await fen.content(); ok('fiche imprimable : 10 lignes, colonne « Quantité comptée », signature', (h.match(/<tr><td>/g) || []).length === 10 && /Quantité comptée/.test(h) && /Signature/.test(h)); await fen.pdf({ path: `${out}/inventaire_fiche_${mode}.pdf`, format: 'A4' }).catch(() => {}); await fen.close(); } else ok('fiche imprimable ouverte', false);
  // Saisie invalide
  const champs = p.locator('[aria-label="Produits à compter"] input');
  await champs.nth(0).fill('abc'); await p.waitForTimeout(200);
  ok('quantité invalide signalée et enregistrement bloqué', /Quantité invalide/.test(await texte()) && await p.locator('button', { hasText: 'Enregistrer le comptage' }).isDisabled());
  await champs.nth(0).fill('40'); await champs.nth(1).fill('28'); await champs.nth(2).fill('20'); await p.waitForTimeout(200);
  ok('seules les quantités différentes comptent (2 changements)', /Enregistrer le comptage \(2\)/.test(await texte()));
  await p.locator('button', { hasText: 'Enregistrer le comptage' }).click(); await p.waitForTimeout(2500);
  let ec = (await ecritures()).slice(e0);
  ok('2 stocks corrigés, trace « Inventaire du … : avant → après »', ec.length === 2 && ec.every(e => typeof e.quantite === 'number' && /Inventaire du .* : \d+ → \d+ \(comptage physique\)/.test(e.notes || '')));
  ok('aucun prix ni statut modifié', ec.every(e => !('prix_vente' in e) && !('prix_achat' in e) && !('statut' in e)));
  await p.locator('button', { hasText: 'Annuler la dernière correction' }).click(); await p.waitForTimeout(2500);
  ec = (await ecritures()).slice(e0);
  ok('annulation : 2 fiches rétablies (quantités d\'origine 45 et 23)', ec.length === 4 && ec.slice(2).map(e => e.quantite).sort((a, b) => a - b).join() === '23,45');
  // Lot « absents » : comptage à 0 → masquage explicite proposé
  await p.locator('button[role=tab]', { hasText: 'Absents du catalogue fournisseur' }).click(); await p.waitForTimeout(800);
  ok('lot « absents » : 6 produits listés', await items() === 6);
  const e1 = (await ecritures()).length;
  await champs.nth(0).fill('0'); await p.locator('button', { hasText: 'Enregistrer le comptage' }).click(); await p.waitForTimeout(2500);
  ok('stock compté à 0 → bouton « Masquer » proposé (pas de masquage automatique)', await p.locator('text=Masquer (stock compté à 0)').count() === 1 && !(await ecritures()).slice(e1).some(e => e.statut));
  await p.locator('text=Masquer (stock compté à 0)').click(); await p.waitForTimeout(2500);
  ec = (await ecritures()).slice(e1);
  ok('masquage sur action explicite : statut inactif, trace dans les notes', ec.some(e => e.statut === 'inactif' && /stock compté 0/.test(e.notes || '')));
  ok('aucune erreur JavaScript', err.length === 0);
  await p.screenshot({ path: `${out}/inventaire_${mode}.png`, fullPage: false });
  // Assistante : aucune donnée de stock
  const ctx2 = await b.newContext(appareil);
  await ctx2.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID.assistante, role: 'assistante' }, jwt(UID.assistante)]);
  const r = await fetch('http://localhost:54337/rest/v1/stocks?univers=eq.BSH&select=id', { headers: { Authorization: 'Bearer ' + jwt(UID.assistante), apikey: 'cle-anon-locale' } });
  ok('assistante : lecture des stocks refusée (0 ligne)', (await r.json()).length === 0);
  await ctx2.close(); await b.close();
  console.log(`[${mode}]`); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
