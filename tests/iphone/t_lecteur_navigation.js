// Lecteur de livres + navigation retour + zones de sécurité (profil iPhone 14 SIMULÉ — pas un iPhone physique).
// Livre d'essai FICTIF injecté par interception réseau (rien n'est écrit en base, aucun texte réel inventé).
// Usage : node tests/iphone/t_lecteur_navigation.js <dossier_sorties>   (mockapp.js + application sur :3160)
const { chromium, devices } = require('playwright');
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const TOME = { collection: 'essai', identifiant: 'essai-1', titre: 'Livre d\'essai (fictif)', numero: 1, collection_titre: 'Collection d\'essai', volume: 1, couverture: null, audio: null, video: null };
const SCENES = [1, 2, 3].map(i => ({ identifiant: 's' + i, ordre: i, texte: `[ESSAI] Texte fictif de la partie ${i}.\n\nDeuxième paragraphe d'essai.`, image_chemin: i === 1 ? 'essai/illustration.png' : null, image_alt: 'Illustration d\'essai' }));
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const u = { id: '00000000-0000-0000-0000-0000000000a0', role: 'cliente', prenom: 'Essai' };
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); }, [u, jwt(u.id)]);
  await ctx.route(/\/rpc\/histoires_catalogue/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([TOME]) }));
  await ctx.route(/\/rpc\/histoire_lecture/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...TOME, scenes: SCENES }) }));
  await ctx.route(/\/storage\/v1\/object\/sign\//, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signedURL: '/object/sign/essai.png?token=x' }) }));
  await ctx.route(/\/storage\/v1\/object\/sign\/essai\.png/, r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const texte = () => p.evaluate(() => document.body.innerText);
  const deborde = () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const cliquer = async re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button,a,[role=button]')].find(x => r.test((x.textContent || '').trim()) && x.getBoundingClientRect().width > 0); if (!e) return false; e.scrollIntoView({ block: 'center' }); e.click(); return true; }, re.source);
  const glisser = async (x0, dx, doigts = 1, dy = 0) => p.evaluate(([x0, dx, doigts, dy]) => {
    const cible = document.querySelector('article')?.parentElement || document.body; const y = 400;
    const T = (x, yy, i) => new Touch({ identifier: i, target: cible, clientX: x, clientY: yy });
    const debut = Array.from({ length: doigts }, (_, i) => T(x0 + i * 30, y, i)); const fin = Array.from({ length: doigts }, (_, i) => T(x0 + dx + i * 30, y + dy, i));
    cible.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: debut, changedTouches: debut }));
    cible.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: fin, changedTouches: fin }));
    cible.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: fin }));
  }, [x0, dx, doigts, dy]);
  const partie = async () => ((await texte()).match(/Partie (\d)\/3/) || [])[1];

  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(3000);
  ok('portail cliente : aucun débordement horizontal', !(await deborde()));
  await p.screenshot({ path: `${out}/01_portail_cliente.png` });
  ok('ouverture de Mo Ti-Péyi', await p.getByText(/^Mo Ti-P[ée]yi$/).first().click({ timeout: 15000 }).then(() => true).catch(() => false)); await p.waitForTimeout(2500);
  const st = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /‹ Portail/.test(x.textContent || '')); let c = b; while (c && !(c.getAttribute('style') || '').includes('100dvh')) c = c.parentElement; return { h: b ? b.getBoundingClientRect().height : 0, safe: c ? c.getAttribute('style').includes('safe-area-inset-top') : false }; });
  ok(`Mo Ti-Péyi : conteneur avec zone de sécurité haute et bouton « ‹ Portail » ≥ 44 px (${Math.round(st.h)} px)`, st.safe && st.h >= 44);
  ok('Mo Ti-Péyi : aucun débordement horizontal', !(await deborde()));
  await p.screenshot({ path: `${out}/02_motipeyi.png` });
  await cliquer(/^🌙\s*Histoires$/); await p.waitForTimeout(1500);
  await cliquer(/📖 Lire/); await p.waitForTimeout(2000);
  ok('lecteur ouvert sur la partie 1/3, indicateur de progression présent', await partie() === '1' && await p.locator('[role=progressbar]').count() === 1);
  await glisser(300, -150); await p.waitForTimeout(400); ok('glissement droite → gauche : partie suivante (2/3)', await partie() === '2');
  await glisser(80, 150); await p.waitForTimeout(400); ok('glissement gauche → droite : partie précédente (1/3)', await partie() === '1');
  await glisser(10, 150); await p.waitForTimeout(400); ok('geste depuis le bord gauche : pas de changement de page (réservé au retour)', await partie() === '1');
  await glisser(300, -150, 2); await p.waitForTimeout(400); ok('geste à deux doigts (zoom) : pas de changement de page', await partie() === '1');
  await glisser(300, -150, 1, 120); await p.waitForTimeout(400); ok('défilement vertical : pas de changement de page', await partie() === '1');
  await p.locator('[aria-label="Agrandir l\'illustration"]').click().catch(() => {}); await p.waitForTimeout(500);
  ok('illustration agrandie en plein écran', await p.locator('[role=dialog][aria-label="Illustration en plein écran"]').count() === 1);
  await p.evaluate(() => { const d = document.querySelector('[role=dialog]'); if (!d) return; const T = (x, i) => new Touch({ identifier: i, target: d, clientX: x, clientY: 300 }); d.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [T(300, 0)], changedTouches: [T(300, 0)] })); d.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [T(100, 0)] })); });
  await p.waitForTimeout(300); ok('déplacement dans l\'image agrandie : pas de changement de page', await partie() === '1');
  await cliquer(/✕ Fermer/); await p.waitForTimeout(300);
  await cliquer(/Partie suivante/); await p.waitForTimeout(300); await cliquer(/^🔖$/); await p.waitForTimeout(200);
  ok('marque-page posé sur la partie 2 et mémorisé', await p.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('bellaia.histoires.marque.') && localStorage.getItem(k) === '1')));
  await p.screenshot({ path: `${out}/03_lecteur.png` });
  await p.goBack(); await p.waitForTimeout(1200);
  ok('retour du navigateur (ou geste natif) : le lecteur se ferme, liste des histoires affichée, application conservée', /Histoires du soir/.test(await texte()) && !/Partie \d\/3/.test(await texte()) && p.url().startsWith('http://localhost:3160'));
  await p.goBack(); await p.waitForTimeout(1200);
  ok('second retour : Mo Ti-Péyi se ferme, retour au portail', !/‹ Portail/.test(await texte()));
  ok('aucune erreur JavaScript', err.length === 0);
  if (err.length) console.log(err.slice(0, 3).join('\n'));
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
