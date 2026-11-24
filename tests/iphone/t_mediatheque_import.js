// Atelier papeterie (lot 6 du 24/11) : bouton d'import de la Médiathèque + nature réelle des liens des packs achetés.
// iPhone 13 SIMULÉ (Chromium) — ce n'est pas un iPhone réel. Les requêtes Supabase de la médiathèque sont interceptées
// (aucune écriture ailleurs). Prérequis : mockapp.js (:54337) + next dev -p 3160. Usage : node tests/iphone/t_mediatheque_import.js <sorties>
const { chromium, devices } = require('playwright');
const F = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
(async () => {
  const out = process.argv[2] || '.'; const R = []; let n = 0; const ok = (m, v) => { n++; R.push(`${String(n).padStart(2, '0')} ${m} : ${v ? 'OK' : 'ÉCHEC'}`); };
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.removeItem('bellaia-nav'); }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  const envois = [], lignes = [];
  await p.route(/\/rest\/v1\/events_medias/, async r => {
    if (r.request().method() === 'POST') { const corps = JSON.parse(r.request().postData() || '{}'); const row = { id: 'm' + (lignes.length + 1), created_at: new Date().toISOString(), ...corps }; lignes.push(row); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lignes) });
  });
  await p.route(/\/storage\/v1\/object\//, async r => { if (r.request().method() === 'POST') { envois.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"Key":"ok"}' }); } return r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); });
  await p.route(/\/rest\/v1\/events_packs_registre/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    { id: 'a', pack: 'Pack essai', ordre: 1, source: 'canva', element: 'Boîte cadeau', etat: 'a_ouvrir', licence: 'usage personnel', lien: 'https://www.canva.com/design/DAEXEMPLE01/abc/view' },
    { id: 'b', pack: 'Pack essai', ordre: 2, source: 'canva', element: 'Pack n°2', etat: 'a_ouvrir', licence: 'usage personnel', lien: 'https://canva.link/exemple' },
    { id: 'c', pack: 'Pack essai', ordre: 3, source: 'drive', element: 'Logos — Marque X', etat: 'a_ouvrir', licence: 'usage personnel', lien: 'https://drive.google.com/drive/folders/exemple' }]) }));
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await p.locator('button', { hasText: "Even's" }).first().tap(); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Médiathèque/ }).first().tap(); await p.waitForSelector('[data-testid=mediatheque-importer]', { timeout: 60000 });
  ok('iPhone : bouton « Importer des fichiers » présent, « Choisir un dossier » masqué (non pris en charge par Safari iOS)', await p.getByTestId('mediatheque-importer').isVisible() && (await p.getByText('📁 Choisir un dossier').count()) === 0);
  const champ = p.locator('[data-testid=mediatheque-importer] input[type=file]');
  ok('le champ de fichier est un vrai champ touchable (pas display:none) recouvrant le bouton', await champ.evaluate(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 20));
  await champ.setInputFiles([{ name: 'invitation.png', mimeType: 'image/png', buffer: PNG }, { name: 'photo', mimeType: 'image/png', buffer: PNG }, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }]);
  try { await p.waitForFunction(() => /Import terminé/.test(document.body.innerText), null, { timeout: 30000 }); } catch {}
  const t = await p.evaluate(() => document.body.innerText);
  ok('sélection reçue et signalée aussitôt (« 2 fichier(s) reçu(s) — envoi automatique »)', /2 fichier\(s\) reçu\(s\)/.test(t));
  ok('envoi lancé automatiquement, sans second bouton : 2 fichiers stockés et 2 fiches créées', envois.length === 2 && lignes.length === 2);
  ok('fichier iPhone sans extension accepté d\'après son type (image/png)', lignes.some(l => l.nom_fichier === 'photo'));
  ok('format refusé expliqué (notes.txt ignoré, formats acceptés listés)', /1 fichier\(s\) ignoré\(s\).*HEIC/.test(t));
  ok('les visuels importés apparaissent dans la médiathèque', /Médiathèque d'inspiration \(2\)/.test(t));
  await p.screenshot({ path: `${out}/mediatheque_import_iphone.png` });
  // Packs achetés : nature réelle des liens
  await p.getByRole('button', { name: /Atelier papeterie/ }).first().tap(); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Packs achetés/ }).first().tap(); await p.waitForSelector('[data-testid=nature-lien]', { timeout: 30000 });
  const natures = await p.locator('[data-testid=nature-lien]').allInnerTexts();
  ok('lien Canva « /view » : « Consultation seule », explique la visionneuse (pas une vidéo) et l\'absence de modification', /Consultation seule/.test(natures[0]) && /pas une vidéo/.test(natures[0]) && /Non modifiable/.test(natures[0]));
  ok('lien court Canva : « Lien de modèle », copie à créer dans Canva', /Lien de modèle Canva/.test(natures[1]));
  ok('dossier de logos : alerte « Marque déposée d\'un tiers »', /Dossier Google Drive/.test(natures[2]) && /Marque déposée/.test(natures[2]));
  ok('aucun lien n\'est présenté comme modifiable dans Bellaïa', !natures.some(x => /modifiable ici/i.test(x) && !/Non modifiable ici/.test(x)));
  await p.screenshot({ path: `${out}/packs_achetes_nature.png` });
  ok('aucune erreur JavaScript', err.length === 0);
  await b.close();
  console.log(R.join('\n') + `\n${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})().catch(e => { console.error(e); process.exit(1); });
