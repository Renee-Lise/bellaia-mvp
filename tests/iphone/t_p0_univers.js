// Mise à jour pendant l'utilisation — extension à d'autres univers (Bella'Food, Atelier papeterie Events).
// Simulateur Chromium iPhone 13 (PAS un iPhone réel). <dossier> contient buildA et buildB (modules Food et Atelier
// différents dans B), compilés avec des VERCEL_GIT_COMMIT_SHA distincts ; base simulée mockapp.js (:54337).
// Usage : node tests/iphone/t_p0_univers.js <dossier>
const { chromium, devices } = require('playwright'); const { execSync, spawn } = require('child_process'); const fs = require('fs');
const S = process.argv[2]; const F = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const attendre = ms => new Promise(r => setTimeout(r, ms));
const demarrer = async dir => { try { execSync('fuser -k 3170/tcp'); } catch {} await attendre(1500); const fd = fs.openSync(S + '/p0/serveur_univers.log', 'a'); spawn('npx', ['next', 'start', '-p', '3170'], { cwd: dir, stdio: ['ignore', fd, fd], detached: true }); for (let i = 0; i < 80; i++) { try { const r = await fetch('http://localhost:3170/api/version'); if (r.status < 500) return; } catch {} await attendre(500); } };
let ok = 0, ko = 0; const R = []; const verif = (c, m) => { c ? ok++ : ko++; R.push(`${c ? '✅' : '❌'} ${m}`); };
async function scenario(b, nom, ouvrirAvant, ouvrirModule, attenduApres) {
  await demarrer(S + '/buildA');
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { if (!localStorage.getItem('bellaia_user')) { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); } }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  const p = await ctx.newPage(); const nav = []; p.on('load', () => nav.push('chargement')); p.on('dialog', d => d.accept());   // `load` : vrais chargements de page uniquement (pas les entrées d'historique)
  await p.goto('http://localhost:3170/', { waitUntil: 'networkidle' }); await p.waitForSelector('text=Centre de direction', { timeout: 60000 });
  await ouvrirAvant(p); const n0 = nav.length;
  await demarrer(S + '/buildB');
  await ouvrirModule(p); await attendre(5000);
  verif(nav.length === n0 && (await p.locator('text=Centre de direction').count()) === 0, `${nom} : nouvelle version en ligne → aucun rechargement silencieux, pas de retour à l'accueil`);
  const alerte = p.getByTestId('alerte-version');
  verif((await alerte.count()) === 1 && /n'a pas pu s'ouvrir/.test(await alerte.innerText()), `${nom} : message explicite « Cet écran n'a pas pu s'ouvrir » avec le module nommé (${((await alerte.innerText().catch(() => '')).match(/« [^»]+ »/) || [''])[0]})`);
  await p.screenshot({ path: `${S}/p0/univers_${nom.replace(/\W+/g, '_')}_alerte.png` });
  await p.getByTestId('alerte-version-maj').tap(); await attendre(9000);
  verif(await attenduApres(p), `${nom} : après « Mettre à jour », nouvelle version chargée et MÊME écran rouvert`);
  await ctx.close();
}
(async () => {
  fs.mkdirSync(S + '/p0', { recursive: true });
  const b = await chromium.launch();
  await scenario(b, "Bella'Food", async () => {}, async p => { await p.locator('button', { hasText: "Bella'Food" }).first().tap(); },
    async p => /HACCP · IA · ERP · B/.test(await p.evaluate(() => document.body.innerText)));
  await scenario(b, 'Atelier papeterie (Events)', async p => { await p.locator('button', { hasText: "Even's" }).first().tap(); await attendre(2500); },
    async p => { await p.getByRole('button', { name: /Atelier papeterie/ }).first().tap(); },
    async p => (await p.locator('[data-version-b]').count()) > 0);
  await b.close(); try { execSync('fuser -k 3170/tcp'); } catch {}
  console.log(R.join('\n') + `\n\nRÉSULTAT : ${ok}/${ok + ko}`);
})().catch(e => { console.error(e); process.exit(1); });
