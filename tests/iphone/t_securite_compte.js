// Sécurité du compte — iPhone 13 SIMULÉ. Service d'authentification simulé par interception (aucun compte réel).
// Usage : node tests/iphone/t_securite_compte.js <dossier>
const { chromium, devices } = require('playwright');
const ID = '00000000-0000-0000-0000-0000000000a0';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub, extra = {}) => `${b64({ alg: 'HS256' })}.${b64({ role: 'authenticated', sub, email: 'cliente.essai@exemple.invalid', iat: Math.floor(Date.now() / 1000) - 60, exp: Math.floor(Date.now() / 1000) + 7200, amr: [{ method: 'password' }], ...extra })}.x`;
const ANCIEN = jwt(ID, { session_id: 'ancienne' }), NOUVEAU = jwt(ID, { session_id: 'nouvelle' });
(async () => {
  const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch(); const appels = [];
  const contexte = async (connecte = true) => {
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    if (connecte) await ctx.addInitScript(([u, t]) => { if (!sessionStorage.getItem('init')) { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_refresh', 'r-ancien'); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); sessionStorage.setItem('init', '1'); } }, [{ id: ID, role: 'cliente', prenom: 'Essai', email: 'cliente.essai@exemple.invalid' }, ANCIEN]);
    await ctx.route(/\/auth\/v1\/token\?grant_type=password/, async r => { const d = JSON.parse(r.request().postData()); appels.push('verif:' + d.password); if (d.password === 'Ancien-Motdepasse-1') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: NOUVEAU, refresh_token: 'r-nouveau', expires_at: Math.floor(Date.now() / 1000) + 3600 }) }); r.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant"}' }); });
    await ctx.route(/\/auth\/v1\/user$/, async r => { const q = r.request(); if (q.method() === 'PUT') { appels.push('put:' + (q.headers().authorization || '').slice(7, 20) + ':' + JSON.parse(q.postData()).password); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'cliente.essai@exemple.invalid', last_sign_in_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString() }) }); });
    await ctx.route(/\/auth\/v1\/logout\?scope=/, r => { appels.push('logout:' + r.request().url().split('scope=')[1] + ':' + ((r.request().headers().authorization || '').includes(NOUVEAU.slice(-12)) ? 'nouveau' : 'ancien')); r.fulfill({ status: 204, body: '' }); });
    await ctx.route(/\/auth\/v1\/recover/, r => { appels.push('recover:' + JSON.parse(r.request().postData()).email); r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
    await ctx.route(/\/api\/auth\/logout$/, r => { appels.push('api-logout:' + (r.request().headers().authorization ? 'avec-jeton' : 'sans-jeton')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept()); return { ctx, p, err };
  };
  const texte = p => p.evaluate(() => document.body.innerText);
  let { ctx, p, err } = await contexte();
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2500);
  await p.getByRole('button', { name: 'Sécurité du compte' }).click(); await p.waitForTimeout(1500);
  ok('01 Mon compte › « Sécurité du compte » ouvre sa page (mot de passe, connexions)', /Changer mon mot de passe/.test(await texte(p)) && /Mes connexions/.test(await texte(p)));
  await p.fill('#mdp-actuel', 'Mauvais-Motdepasse-9'); await p.fill('#mdp-nouveau', 'Soleil-Guyane-2026'); await p.fill('#mdp-conf', 'Soleil-Guyane-2026');
  await p.getByRole('button', { name: 'Changer le mot de passe' }).click(); await p.waitForTimeout(1200);
  ok('02 mot de passe actuel faux : refus, aucun changement envoyé', /Mot de passe actuel incorrect/.test(await texte(p)) && !appels.some(a => a.startsWith('put:')));
  await p.fill('#mdp-actuel', 'Ancien-Motdepasse-1'); await p.fill('#mdp-nouveau', 'court1'); await p.fill('#mdp-conf', 'court1');
  await p.getByRole('button', { name: 'Changer le mot de passe' }).click(); await p.waitForTimeout(600);
  ok('03 nouveau mot de passe trop faible : refusé avant tout appel', /12 caractères au minimum/.test(await texte(p)) && appels.filter(a => a.startsWith('verif:')).length === 1);
  await p.fill('#mdp-nouveau', 'Soleil-Guyane-2026'); await p.fill('#mdp-conf', 'Soleil-Guyane-2026');
  await p.getByRole('button', { name: 'Changer le mot de passe' }).click(); await p.waitForTimeout(1500);
  ok('04 changement : vérification puis modification avec la session vérifiée', appels.includes('verif:Ancien-Motdepasse-1') && appels.some(a => a.startsWith('put:') && a.endsWith(':Soleil-Guyane-2026')));
  ok('05 ancienne session révoquée, autres appareils déconnectés', appels.includes('logout:local:ancien') && appels.includes('logout:others:nouveau'));
  ok('06 la nouvelle session remplace l\'ancienne sur l\'appareil', (await p.evaluate(() => localStorage.getItem('bellaia_token'))) === NOUVEAU && (await p.evaluate(() => localStorage.getItem('bellaia_refresh'))) === 'r-nouveau');
  ok('07 confirmation affichée', /Mot de passe modifié/.test(await texte(p)));
  await p.screenshot({ path: `${out}/securite_compte.png`, fullPage: true });
  await p.getByRole('button', { name: 'Me déconnecter partout' }).click(); await p.waitForTimeout(2000);
  ok('08 « Me déconnecter partout » : révocation globale puis retour à la connexion', appels.some(a => a.startsWith('logout:global')) && /Se connecter/.test(await texte(p)) && !(await p.evaluate(() => localStorage.getItem('bellaia_token'))));
  ok('09 déconnexion : la route serveur reçoit le jeton (révocation réelle)', appels.includes('api-logout:avec-jeton'));
  ok('10 aucune erreur JavaScript (compte)', err.length === 0);
  await ctx.close();
  // Mot de passe oublié
  ({ ctx, p, err } = await contexte(false));
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForTimeout(2000);
  await p.getByRole('button', { name: 'Mot de passe oublié ?' }).click(); await p.waitForTimeout(1200);
  await p.fill('#mdp-oubli', 'Inconnue@Exemple.invalid'); await p.getByRole('button', { name: 'Recevoir un lien' }).click(); await p.waitForTimeout(1000);
  ok('11 mot de passe oublié : demande envoyée, message neutre (n\'indique pas si le compte existe)', appels.includes('recover:inconnue@exemple.invalid') && /Si un compte existe pour cette adresse/.test(await texte(p)));
  await ctx.close();
  // Lien reçu par e-mail
  ({ ctx, p, err } = await contexte(false)); const REC = jwt(ID, { amr: [{ method: 'recovery' }] });
  await p.goto(`http://localhost:3160/#access_token=${REC}&refresh_token=x&expires_in=3600&type=recovery`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  ok('12 lien de réinitialisation : page « Nouveau mot de passe », jeton retiré de l\'adresse', /Nouveau mot de passe/.test(await texte(p)) && !p.url().includes('access_token'));
  await p.fill('#rec-nouveau', 'Riviere-Kourou-2026'); await p.fill('#rec-conf', 'Riviere-Kourou-2026'); await p.getByRole('button', { name: 'Enregistrer' }).click(); await p.waitForTimeout(1500);
  ok('13 nouveau mot de passe enregistré puis toutes les sessions fermées', appels.some(a => a.startsWith('put:') && a.endsWith(':Riviere-Kourou-2026')) && appels.some(a => a.startsWith('logout:global')) && /connectez-vous avec le nouveau mot de passe/.test(await texte(p)));
  ok('14 aucune erreur JavaScript (réinitialisation)', err.length === 0);
  await b.close(); console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})();
