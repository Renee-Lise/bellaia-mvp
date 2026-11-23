// Atelier pédagogique GS (Mo Ti-Péyi) — parcours fondatrice complet + refus pour un compte Famille (cliente).
// Usage : node tests/iphone/t_atelier.js <dossier_sorties> <dossier_fixtures> [iphone|ordinateur]
//   <dossier_fixtures> : les 12 photos (01.jpg … 12.jpg) et Fiches_GS_References_Mo_Ti_Peyi.pdf (hors dépôt : références privées).
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const UID = { fondatrice: '00000000-0000-0000-0000-0000000000f0', cliente: '00000000-0000-0000-0000-0000000000a0' };
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const API = 'http://localhost:54337';
(async () => {
  const out = process.argv[2] || '.', fx = process.argv[3], appareil = process.argv[4] || 'iphone'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
  const b = await chromium.launch();
  const contexte = async role => { const ctx = await b.newContext({ ...(appareil === 'iphone' ? devices['iPhone 13'] : { viewport: { width: 1366, height: 900 } }), acceptDownloads: true });
    await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7200)); }, [{ id: UID[role], role }, jwt(UID[role])]); return ctx; };
  const ctx = await contexte('fondatrice'); const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
  const texte = () => p.evaluate(() => document.body.innerText);
  const cliquer = async re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim())); if (e) { e.scrollIntoView(); e.click(); return true; } return false; }, re.source);
  const ressources = async () => (await fetch(`${API}/rest/v1/__ressources`)).json();
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await p.waitForSelector('text=Centre de direction', { timeout: 90000 });
  await cliquer(/^📚\s*Éditions$/); await p.waitForTimeout(1200); await cliquer(/^Mo Ti-Péyi$/); await p.waitForTimeout(2000);
  ok('Mo Ti-Péyi › onglet « Atelier pédagogique » présent', await cliquer(/Atelier pédagogique$/)); await p.waitForSelector('text=Bibliothèque de références', { timeout: 60000 }); await p.waitForTimeout(1000);
  // ── Bibliothèque : import reconnu par empreinte, sans doublon
  const fichiers = [...Array.from({ length: 12 }, (_, i) => path.join(fx, `${String(i + 1).padStart(2, '0')}.jpg`)), path.join(fx, 'Fiches_GS_References_Mo_Ti_Peyi.pdf')];
  await p.setInputFiles('input[aria-label="Importer les références"]', fichiers); try { await p.waitForFunction(() => /12\/12 pages importées/.test(document.body.innerText) && !/Import en cours/.test(document.body.innerText), null, { timeout: 60000 }); } catch (e) { { const tt = await texte(); const i = tt.indexOf("Atelier pédagogique —"); console.log("ÉCRAN :", tt.slice(i, i + 1500)); } throw e; } await p.waitForTimeout(800);
  let rs = await ressources(); const refs = rs.filter(r => r.type === 'reference_gs'); const pdf = rs.find(r => r.type === 'reference_gs_pdf');
  ok('import : 12 pages + le PDF enregistrés, pages 1 à 12 reconnues par leur empreinte', refs.length === 12 && !!pdf && refs.map(r => r.tome).sort((a, c) => a - c).join() === '1,2,3,4,5,6,7,8,9,10,11,12');
  ok('chaque fiche : titre, page, consigne, compétence, source quand visible, remarques', refs.every(r => r.nom_original && r.tome && r.validation.consigne && r.validation.competence) && refs.find(r => r.tome === 6).provenance === 'www.pass-education.fr' && /USINE/.test(refs.find(r => r.tome === 4).validation.remarques));
  ok('fichiers rangés dans l\'espace privé motipy/references/gs/', [...refs, pdf].every(r => /^motipy\/references\/gs\/[0-9a-f]{64}\.(jpg|pdf)$/.test(r.stockage_chemin)));
  await p.screenshot({ path: `${out}/atelier_${appareil}_1_bibliotheque.png` });
  await p.setInputFiles('input[aria-label="Importer les références"]', fichiers); await p.waitForFunction(() => (document.body.innerText.match(/aucun doublon créé/g) || []).length >= 13, null, { timeout: 60000 });
  rs = await ressources(); ok('réimport du même lot : 13 « déjà importé », aucun doublon', rs.filter(r => /^gs-ref-/.test(r.identifiant)).length === 13);
  await p.setInputFiles('input[aria-label="Importer les références"]', { name: 'inconnu.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('pas une référence') }); await p.waitForTimeout(1500);
  ok('fichier non répertorié : ignoré', /non répertorié/.test(await texte()) && (await ressources()).length === rs.length);
  await p.selectOption('select[aria-label="Domaine"]', 'Graphisme'); await p.waitForTimeout(400);
  ok('filtre par domaine (Graphisme → pages 01 et 11)', (await p.locator('text=/^Page (01|11) · GS · Graphisme/').count()) === 2 && (await p.locator('text=/^Page \\d\\d · GS ·/').count()) === 2);
  await p.selectOption('select[aria-label="Domaine"]', ''); await p.fill('input[placeholder="Rechercher une compétence…"]', 'dé'); await p.waitForTimeout(400);
  ok('recherche par compétence (« dé » → page 09)', await p.locator('text=/^Page 09 ·/').count() === 1);
  await p.fill('input[placeholder="Rechercher une compétence…"]', '');
  await p.locator('button', { hasText: 'Ouvrir la page' }).nth(8).click(); await p.waitForSelector('[role=dialog] img', { timeout: 20000 }); await p.waitForTimeout(1200);
  const img = await p.evaluate(() => { const i = document.querySelector('[role=dialog] img'); return { w: i.naturalWidth, h: i.naturalHeight, src: i.src }; });
  ok('ouvrir la page 09 : image privée affichée via lien temporaire signé', img.w === 976 && img.h === 1098 && /object\/sign\/equipe-prive\/motipy\//.test(img.src) && /token=/.test(img.src));
  await p.screenshot({ path: `${out}/atelier_${appareil}_2_page09.png` });
  ok('accès direct au fichier sans signature : refusé', (await fetch(`${API}/storage/v1/object/equipe-prive/${refs[0].stockage_chemin}`)).status >= 400);
  await cliquer(/^← Retour$/); await p.waitForTimeout(400);
  // ── Créer une fiche : 6 modèles, brouillon, modification, duplication, exports
  await cliquer(/Créer une fiche$/); await p.waitForSelector('[aria-label="Aperçu de la fiche"] svg', { timeout: 30000 });
  const modeles = [['Graphisme en pointillés', false], ['Suites de formes', true], ['Capitales et minuscules', true], ['Prénom et mots', true], ['Dénombrement (dés)', true], ['Bande numérique et chiffres', true]];
  const telecharge = async nomBouton => { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('button', { hasText: nomBouton }).click()]); const f = path.join(out, `${appareil}_${dl.suggestedFilename()}`); await dl.saveAs(f); const s = fs.readFileSync(f); const t = s.toString('latin1'); return { nom: dl.suggestedFilename(), pdf: t.startsWith('%PDF'), a4: /\/MediaBox \[0 0 595\.2\d 841\.8\d\]/.test(t), pages: (t.match(/\/Type \/Page\b/g) || []).length, octets: s.length }; };
  for (const [nom, aCorrige] of modeles) {
    await p.locator('button', { hasText: nom }).first().click(); await p.waitForTimeout(700);
    if (nom === 'Prénom et mots') { await p.fill('textarea[aria-label="Mots"]', 'BANANE, ANANAS'); await p.fill('input[aria-label="Prénom (facultatif)"]', 'Léa'); await p.waitForTimeout(500); }
    const t = await texte(); const erreurs = await p.locator('[role=alert]', { hasText: '⚠️' }).count();
    ok(`${nom} : aperçu généré sans erreur`, (await p.locator('[aria-label="Aperçu de la fiche"] svg path, [aria-label="Aperçu de la fiche"] svg circle').count()) > 5 && erreurs === 0);
    ok(`${nom} : ${aCorrige ? 'corrigé disponible' : '« Corrigé non nécessaire »'}`, aCorrige ? /Voir le corrigé/.test(t) : /Corrigé non nécessaire/.test(t));
    if (nom === 'Prénom et mots') ok('mots : vérification des lettres répétées affichée (BANANE A×2 N×2, ANANAS A×3 N×2)', /B×1, A×2, N×2, E×1/.test(t) && /A×3, N×2, S×1/.test(t));
    await p.locator('button', { hasText: /Enregistrer le brouillon|Enregistrer les modifications/ }).first().click(); await p.waitForTimeout(1200);
    const e1 = await telecharge('Exporter la fiche (PDF)'); ok(`${nom} : PDF fiche A4 (1 page, ${Math.round(e1.octets / 1024)} Ko)`, e1.pdf && e1.a4 && e1.pages === 1);
    if (aCorrige) { const e2 = await telecharge('Exporter le corrigé (PDF)'); ok(`${nom} : PDF corrigé séparé A4`, e2.pdf && e2.a4 && e2.pages === 1 && /_corrige\.pdf$/.test(e2.nom)); }
    if (nom === 'Suites de formes') await p.screenshot({ path: `${out}/atelier_${appareil}_3_creer.png` });
  }
  rs = await ressources(); const fiches = rs.filter(r => r.type === 'fiche_atelier_gs');
  ok('6 brouillons enregistrés (un par modèle), statut brouillon', fiches.length === 6 && fiches.every(f => f.publication === 'brouillon'));
  const mots = fiches.find(f => f.scene === 'mots'); ok('prénom de l\'enfant NON enregistré dans le brouillon (par défaut)', mots && !('prenom' in mots.validation.parametres) && /BANANE/.test(mots.validation.parametres.mots));
  // Modifier le brouillon courant (mots), puis dupliquer
  await p.locator('button', { hasText: 'Prénom et mots' }).first().click(); await p.waitForTimeout(300);
  await cliquer(/Mes fiches$/); await p.waitForTimeout(800); const nbListe = await p.locator('button', { hasText: /^Ouvrir$/ }).count(); ok('Mes fiches : 6 fiches listées', nbListe === 6);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Ouvrir' && /Prénom et mots ·/.test(x.parentElement.innerText)); b.click(); }); await p.waitForTimeout(800);
  ok('réouverture du brouillon : paramètres restaurés', (await p.inputValue('textarea[aria-label="Mots"]')).includes('BANANE'));
  await p.fill('input[aria-label="Titre"]', 'Les lettres des fruits'); await p.locator('button', { hasText: 'Enregistrer les modifications' }).click(); await p.waitForTimeout(1200);
  rs = await ressources(); const modif = rs.find(r => r.id === mots.id);
  ok('modification : même fiche mise à jour, historique tracé', modif.nom_original === 'Les lettres des fruits' && modif.validation.historique.length === 2 && rs.filter(r => r.type === 'fiche_atelier_gs').length === 6);
  await p.locator('button', { hasText: 'Dupliquer' }).click(); await p.waitForTimeout(1200);
  rs = await ressources(); ok('duplication : nouvelle fiche distincte (copie)', rs.filter(r => r.type === 'fiche_atelier_gs').length === 7 && rs.some(r => / \(copie\)$/.test(r.nom_original)));
  const avant = await p.locator('[aria-label="Aperçu de la fiche"]').innerHTML(); await p.locator('button', { hasText: 'Nouvelle variante' }).click(); await p.waitForTimeout(500);
  ok('nouvelle variante : autre tirage des lettres', avant !== await p.locator('[aria-label="Aperçu de la fiche"]').innerHTML());
  await p.locator('button', { hasText: 'Valider pour les familles' }).click(); await p.waitForTimeout(1000);
  rs = await ressources(); ok('validation explicite (confirmation) : statut « approuvé », rien de publié', rs.filter(r => r.publication === 'approuve').length === 1 && !rs.some(r => r.publication === 'publie'));
  ok('aucune erreur JavaScript (fondatrice)', err.length === 0);
  // ── Compte Famille (cliente) : ni références, ni brouillons, ni fichiers
  const c = await (await contexte('cliente')).newPage(); await c.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await c.waitForTimeout(2500);
  const h = { Authorization: `Bearer ${jwt(UID.cliente)}`, apikey: 'cle-anon-locale' };
  const lus = await (await fetch(`${API}/rest/v1/editions_ressources?collection=eq.mo-ti-peyi-gs&select=*`, { headers: h })).json();
  const signe = await fetch(`${API}/storage/v1/object/sign/equipe-prive/${refs[0].stockage_chemin}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{"expiresIn":60}' });
  const ecrit = await fetch(`${API}/rest/v1/editions_ressources`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ collection: 'mo-ti-peyi-gs', identifiant: 'intrus', type: 'fiche_atelier_gs' }) });
  ok('compte Famille : références et brouillons invisibles (0 ligne)', Array.isArray(lus) && lus.length === 0);
  ok('compte Famille : lien signé vers un fichier privé refusé', signe.status >= 400);
  ok('compte Famille : écriture refusée', ecrit.status === 403);
  ok('compte Famille : atelier absent de son interface', !/Atelier pédagogique|Bibliothèque de références/.test(await c.evaluate(() => document.body.innerText)));
  console.log(`[${appareil}]\n` + R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`); if (err.length) console.log(err.slice(0, 3));
  await b.close();
})();
