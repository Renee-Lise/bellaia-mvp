// BSH Secret Games — robustesse multijoueur : actualisation, coupure réseau, départ / arrivée de joueuses, partie disparue.
const { chromium, devices } = require('playwright');
(async () => { const R = []; const ok = (n, v) => R.push(n + ' : ' + (v ? 'OK' : 'ÉCHEC')); const b = await chromium.launch();
  const nouvelle = async () => { const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); p._ctx = ctx; p._err = []; p.on('pageerror', e => p._err.push(e.message));
    await p.goto('http://localhost:3160/bsh/secret-games', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    const e = p.locator("text=J'ai 18 ans ou plus"); if (await e.count()) await e.first().click(); await p.waitForTimeout(1000); return p; };
  const texte = p => p.evaluate(() => document.body.innerText);
  const nb = async p => +((await texte(p)).match(/(\d+) participants?/) || [0, 0])[1];
  const A = await nouvelle();
  await A.locator('button:has-text("Jouer à plusieurs")').click(); await A.fill('input[placeholder="Votre pseudo"]', 'Orchidée'); await A.locator('button:has-text("Créer la partie")').click(); await A.waitForTimeout(2500);
  const code = (await A.locator('text=Code de la partie').locator('xpath=..').innerText()).split('\n')[1].trim();
  const B = await nouvelle(); await B.locator('button:has-text("Jouer à plusieurs")').click(); await B.locator('button:text-is("Rejoindre")').click();
  await B.fill('input[placeholder="Votre pseudo"]', 'Ylang'); await B.fill('input[placeholder^="Code de la partie"]', code); await B.locator('button:has-text("Rejoindre la partie")').click(); await B.waitForTimeout(2500);
  // 1. actualisation
  await A.reload({ waitUntil: 'networkidle' }); await A.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); { const e = A.locator("text=J'ai 18 ans ou plus"); if (await e.count()) await e.first().click(); } await A.waitForTimeout(3000);
  ok('après actualisation : même partie et 2 participantes', (await texte(A)).includes(code) && await nb(A) === 2);
  // 2. coupure réseau
  await A._ctx.setOffline(true); await A.waitForTimeout(7500);
  ok('coupure : message « connexion interrompue », partie conservée', /Connexion interrompue/.test(await texte(A)) && (await texte(A)).includes(code));
  await A._ctx.setOffline(false); await A.waitForTimeout(3000);
  ok('retour du réseau : message disparu, partie reprise', !/Connexion interrompue/.test(await texte(A)) && (await texte(A)).includes(code));
  await A.locator('button:has-text("Tirer la carte suivante")').click(); await A.waitForTimeout(1500); await B.waitForTimeout(6500);
  ok('tirage après reconnexion visible chez l\'autre joueuse', await B.locator('.sg-face').count() > 0);
  // 3. changement de joueuse
  await B.locator('button:text-is("Quitter")').click(); await A.waitForTimeout(7000);
  ok('départ : la joueuse qui quitte disparaît de la liste', await nb(A) === 1);
  const C = await nouvelle(); await C.locator('button:has-text("Jouer à plusieurs")').click(); await C.locator('button:text-is("Rejoindre")').click();
  await C.fill('input[placeholder="Votre pseudo"]', 'Vanille'); await C.fill('input[placeholder^="Code de la partie"]', code); await C.locator('button:has-text("Rejoindre la partie")').click(); await C.waitForTimeout(2500);
  await C.locator('button:has-text("Tirer la carte suivante")').click(); await A.waitForTimeout(7000);
  ok('arrivée d\'une nouvelle joueuse et tirage vu par la créatrice', await nb(A) === 2 && /Tirée par un·e autre participant·e/.test(await texte(A)));
  // 4. partie disparue
  await fetch('http://localhost:54337/rest/v1/__vider_parties'); await A.waitForTimeout(7000);
  ok('partie fermée côté serveur : sortie propre avec message', /n'existe plus/.test(await texte(A)) && !(await texte(A)).includes('Code de la partie'));
  ok('aucune erreur JavaScript', A._err.length + B._err.length + C._err.length === 0);
  console.log(R.join('\n')); console.log(R.filter(x => x.endsWith('OK')).length + '/' + R.length); await b.close(); })();
