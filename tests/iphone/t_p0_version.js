// Anomalie P0 : changement de version pendant que l'application est ouverte (simulateur Chromium iPhone 13, PAS un iPhone réel).
// Usage : node tests/iphone/t_p0_version.js <dossier> — <dossier> contient buildOld (commit fa41c5d), buildA (code corrigé) et buildB (code corrigé dont le module Secret Agenda diffère),
// compilés avec VERCEL_GIT_COMMIT_SHA distincts et la base simulée (MOCK_BSH_AGENDA=1 node tests/iphone/mockapp.js). Résultats : <dossier>/p0/.
const { chromium, devices } = require('playwright'); const { execSync, spawn } = require('child_process');
const S = process.argv[2]; const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const attendre = ms => new Promise(r => setTimeout(r, ms));
const demarrer = async dir => { try { execSync('fuser -k 3170/tcp'); } catch {} await attendre(1500); const fd = require('fs').openSync(S + '/p0/serveur.log', 'a'); spawn('npx', ['next', 'start', '-p', '3170'], { cwd: dir, stdio: ['ignore', fd, fd], detached: true }); for (let i = 0; i < 80; i++) { try { const r = await fetch('http://localhost:3170/api/version'); if (r.status < 500) return; } catch {} await attendre(500); } };
let ok = 0, ko = 0; const res = []; const verif = (c, m) => { (c ? ok++ : ko++); res.push(`${c ? '✅' : '❌'} ${m}`); };
const F = '00000000-0000-0000-0000-0000000000f0';
async function contexte(b) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { if (!localStorage.getItem('bellaia_user')) { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); } }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  return ctx;
}
const hub = p => p.locator('nav[aria-label="Rubriques BSH Secret Agenda"]').count();
async function ouvrirBSH(p) { await p.goto('http://localhost:3170/', { waitUntil: 'networkidle' }); await p.waitForSelector('text=Centre de direction', { timeout: 60000 }); await p.locator('button', { hasText: 'Secret Home' }).filter({ hasText: '🗝' }).first().tap(); await attendre(2000); }
(async () => {
  const b = await chromium.launch();
  // ── 1. Reproduction avec l'ANCIEN code (fa41c5d)
  await demarrer(S + '/buildOld');
  { const ctx = await contexte(b); const p = await ctx.newPage(); const nav = []; p.on('framenavigated', f => { if (f === p.mainFrame()) nav.push(f.url()); });
    await ouvrirBSH(p); const n0 = nav.length; await demarrer(S + '/buildB');
    await p.getByRole('button', { name: /Secret Agenda/ }).first().tap(); await attendre(8000);
    verif(nav.length > n0 && (await p.locator('text=Centre de direction').count()) > 0 && !(await hub(p)), `ANCIEN code : après une mise en ligne, « Secret Agenda » recharge la page en silence et ramène au Centre de direction (anomalie reproduite ; rechargements : ${nav.length - n0})`);
    await p.screenshot({ path: S + '/p0/1_ancien_retour_accueil.png' }); await ctx.close(); }
  // ── 2. Code CORRIGÉ (A) puis mise en ligne de B pendant que l'application est ouverte
  await demarrer(S + '/buildA');
  { const ctx = await contexte(b); const p = await ctx.newPage(); const nav = []; p.on('framenavigated', f => { if (f === p.mainFrame()) nav.push(f.url()); });
    const diag = []; p.on('request', r => { if (r.url().includes('/api/diagnostic')) diag.push(r.postData() || ''); });
    await ouvrirBSH(p); const n0 = nav.length;
    verif((await p.locator('text=version aaaaaaa').count()) > 0, 'La version de l\'application est affichée (« version aaaaaaa »)');
    await demarrer(S + '/buildB');
    await p.getByRole('button', { name: /Secret Agenda/ }).first().tap(); await attendre(5000);
    verif(nav.length === n0, 'CORRIGÉ : aucun rechargement silencieux');
    verif((await p.locator('text=Centre de direction').count()) === 0, 'CORRIGÉ : pas de retour à l\'accueil');
    verif((await p.getByTestId('agenda-erreur').count()) === 1 && (await p.locator('text=BSH Secret Agenda n\'a pas pu s\'ouvrir').count()) === 1, 'CORRIGÉ : message explicite « BSH Secret Agenda n\'a pas pu s\'ouvrir » avec la cause (version plus ancienne)');
    verif((await p.getByTestId('alerte-version').count()) === 0 && (await p.getByRole('button', { name: 'Mettre à jour et rouvrir Secret Agenda' }).count()) === 1, 'CORRIGÉ : bouton « Mettre à jour et rouvrir Secret Agenda » (un seul message, pas de doublon)');
    const jl = await p.evaluate(() => localStorage.getItem('bellaia-diagnostic') || '');
    verif(jl.includes('module_version_obsolete') && jl.includes('bshAgenda') && !/@|eyJ/.test(jl), 'Journal local : incident module_version_obsolete (bshAgenda) noté, sans courriel ni jeton');
    const lignes = require('fs').readFileSync(S + '/p0/serveur.log', 'utf8').split(String.fromCharCode(10)).filter(l => l.includes('[diagnostic-client]'));
    verif(lignes.some(l => l.includes('module_version_obsolete') && l.includes('bshAgenda') && l.includes('iPhone')), 'Journal serveur [diagnostic-client] reçu (type, module, versions, appareil résumé)');
    await p.screenshot({ path: S + '/p0/2_corrige_message.png' });
    await p.getByRole('button', { name: 'Mettre à jour et rouvrir Secret Agenda' }).tap(); await attendre(9000);
    verif((await hub(p)) === 1 && (await p.locator('[data-version-b]').count()) === 1, 'Après « Mettre à jour » : nouvelle version chargée ET Secret Agenda rouvert directement (13 rubriques)');
    verif((await p.locator('nav[aria-label="Rubriques BSH Secret Agenda"] button').count()) >= 13, 'Les 13 rubriques sont présentes');
    await p.screenshot({ path: S + '/p0/3_corrige_rouvert.png' });
    // ── 3. Actualisation, fermeture et réouverture
    await p.reload({ waitUntil: 'networkidle' }); await attendre(5000);
    verif((await hub(p)) === 1, 'Actualisation : Secret Agenda reste ouvert');
    const p2 = await ctx.newPage(); await p.close(); await p2.goto('http://localhost:3170/', { waitUntil: 'networkidle' }); await attendre(5000);
    verif((await hub(p2)) === 1, 'Fermeture puis réouverture : Secret Agenda rouvert');
    // retour : rubrique BSH → accueil (comportement voulu et inchangé)
    await p2.getByRole('button', { name: /Centre hôtes/ }).first().tap(); await attendre(1500);
    await p2.reload({ waitUntil: 'networkidle' }); await attendre(4000);
    const sec = await p2.evaluate(() => { try { return JSON.parse(localStorage.getItem('bellaia-nav') || '{}')['bsh-sec'].v; } catch { return null; } });
    verif(sec === 'centre_hotes' && (await hub(p2)) === 0 && (await p2.locator('text=Centre de direction').count()) === 0 && (await p2.getByRole('button', { name: /Secret Agenda/ }).count()) > 0, 'Autre onglet BSH (Centre hôtes) conservé après actualisation (onglets BSH visibles, pas d’accueil)');
    // Route de diagnostic : liste blanche, rien d'autre n'est accepté
    const r1 = await p2.evaluate(() => fetch('/api/diagnostic', { method: 'POST', body: JSON.stringify({ type: 'inconnu', email: 'x@y.fr' }) }).then(r => r.status));
    const r2 = await p2.evaluate(() => fetch('/api/diagnostic', { method: 'POST', body: JSON.stringify({ type: 'module_erreur', detail: 'contact test@exemple.fr', nom: 'Jeanne' }) }).then(r => r.status));
    await attendre(500); const der = require('fs').readFileSync(S + '/p0/serveur.log', 'utf8').split(String.fromCharCode(10)).filter(l => l.includes('[diagnostic-client]')).pop() || '';
    verif(r1 === 400 && r2 === 204 && !der.includes('test@exemple.fr') && !der.includes('Jeanne') && der.includes('[courriel]'), '/api/diagnostic : type inconnu refusé (400) ; courriel masqué et champs hors liste ignorés');
    await p2.screenshot({ path: S + '/p0/4_reouverture.png' });
    await ctx.close(); }
  // ── 4. Détection d'une nouvelle version au retour dans l'application (sans erreur préalable)
  await demarrer(S + '/buildA');
  { const ctx = await contexte(b); const p = await ctx.newPage(); await ouvrirBSH(p); await demarrer(S + '/buildB');
    await attendre(31000); await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await attendre(2500);
    verif((await p.getByTestId('alerte-version').count()) === 1 && (await p.locator('text=Une nouvelle version de Bellaïa est disponible').count()) === 1, 'Retour dans l\'application : nouvelle version détectée et proposée AVANT tout échec');
    await p.screenshot({ path: S + '/p0/5_nouvelle_version.png' });
    await p.getByRole('button', { name: 'Plus tard' }).tap(); await attendre(500);
    verif((await p.getByTestId('alerte-version').count()) === 0, '« Plus tard » ferme l\'alerte sans recharger');
    await p.getByRole('button', { name: 'Diagnostic' }).first().tap(); await attendre(500);
    verif((await p.getByTestId('panneau-diagnostic').count()) === 1 && (await p.locator('text=nouvelle_version_detectee').count()) > 0, 'Panneau Diagnostic : version, appareil et journal des incidents');
    await p.screenshot({ path: S + '/p0/6_diagnostic.png' });
    await ctx.close(); }
  await b.close();
  try { execSync('fuser -k 3170/tcp'); } catch {}
  console.log(res.join('\n') + `\n\nRÉSULTAT : ${ok}/${ok + ko}`);
})().catch(e => { console.error(e); process.exit(1); });
