// BSH Private Club et Secret World (maquette) — parcours sur simulateur Chromium, profil iPhone 13 (PAS un iPhone réel).
// Prérequis : next dev -p 3160 (base simulée mockapp.js). Aucune écriture en base : le club tourne en mode local.
// Usage : node tests/iphone/t_bsh_club.js <dossier_captures>
const { chromium, devices } = require('playwright'); const fs = require('fs');
const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true });
let ok = 0, n = 0; const R = []; const t = (nom, v) => { n++; if (v) ok++; R.push(`${v ? '✅' : '❌'} ${nom}`); };
const attendre = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('bsh_age_verified', '1'); } catch {} });
  const p = await ctx.newPage(); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message)); p.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Soirée Red Room' : undefined));
  const requetes = []; p.on('request', r => { if (/54337/.test(r.url()) && r.method() !== 'GET') requetes.push(r.method() + ' ' + r.url()); });

  // ── Secret Games : liens vers les extensions, jeux existants conservés
  await p.goto('http://localhost:3160/bsh/secret-games', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  t('Secret Games conservé et relié au Private Club et à Secret World', (await p.getByTestId('lien-private-club').count()) === 1 && (await p.getByTestId('lien-secret-world').count()) === 1 && (await p.locator('text=Tirer une carte').count() + await p.locator('text=Choisir un jeu').count()) > 0);

  // ── Club : 8 univers, Secret Duo relié
  await p.getByTestId('lien-private-club').tap(); await p.waitForURL(/private-club/); await p.waitForSelector('[data-testid=univers-the_red_room]', { timeout: 60000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  t('8 univers affichés', (await p.locator('[data-testid^=univers-]').count()) === 8);
  t('Secret Duo : lien vers la page existante', (await p.locator('[data-testid=univers-secret_duo] a[href="/bsh/secret-duo"]').count()) === 1);
  t('état honnête affiché : mode local, multijoueur non activé', /mode local/.test(await p.getByTestId('statut-club').innerText()) && /pas encore activé/.test(await p.getByTestId('statut-club').innerText()));
  t('aucun débordement horizontal (iPhone)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.screenshot({ path: out + '/club_1_univers.png', fullPage: true });

  // ── Présentation, programme, date passée, annonce à copier
  await p.getByTestId('onglet-redroom').tap();
  await p.getByTestId('date-session').fill('2026-11-01');
  t('date passée : conservée en historique, aucune annonce proposée', (await p.getByTestId('session-passee').count()) === 1 && (await p.getByTestId('texte-annonce').count()) === 0);
  await p.getByTestId('date-session').fill('2026-12-05');
  t('programme 14 h 45 → 16 h 30 et annonce WhatsApp à copier (sans envoi)', /14 h 45/.test(await p.locator('table').innerText()) && /16 h 30/.test(await p.locator('table').innerText()) && /THE RED ROOM/.test(await p.getByTestId('texte-annonce').innerText()));
  await p.screenshot({ path: out + '/club_2_programme.png', fullPage: true });

  // ── Partie locale : préparation, règles, acte I
  await p.getByTestId('jouer-red-room').tap();
  await p.getByTestId('pseudo-1').fill('Rubis'); await p.getByTestId('pseudo-2').fill('Onyx'); await p.getByTestId('ajouter-joueur').tap(); await p.getByTestId('pseudo-3').fill('Saphir');
  t('lancement impossible sans acceptation des règles', await p.getByTestId('lancer-partie').isDisabled());
  await p.getByTestId('accepter-regles').check(); await p.getByTestId('lancer-partie').tap();
  t('acte I affiché', /Personne n’est innocent/.test(await p.getByTestId('acte-courant').innerText()));
  await p.getByTestId('pseudo-acte').fill('Rubis'); await p.getByTestId('option-p1').tap(); await p.getByTestId('texte-reponse').fill('Bottes, sourire en coin et aucune intention de rentrer tôt.'); await p.getByTestId('envoyer-reponse').tap();
  t('réponse enregistrée, joueur suivant proposé', /enregistrée/.test(await p.getByTestId('message-jeu').innerText()) && (await p.getByTestId('joueur-actif').inputValue()) === 'j2');
  t('personnage déjà pris : désactivé pour le joueur suivant', await p.getByTestId('option-p1').isDisabled());
  await p.getByTestId('pseudo-acte').fill('Onyx'); await p.getByTestId('option-p2').tap(); await p.getByTestId('texte-reponse').fill('Mes intentions ? Mystérieuses, évidemment.'); await p.getByTestId('envoyer-reponse').tap();
  await p.getByTestId('passer').tap();
  t('passer une épreuve : sans pénalité', /sans pénalité/.test(await p.getByTestId('message-jeu').innerText()));
  await p.getByTestId('envoyer-indice').tap();
  t('indice envoyé par la console', (await p.getByTestId('indice').count()) === 1);
  await p.screenshot({ path: out + '/club_3_acte1.png', fullPage: true });

  // ── Acte II puis III : mot interdit refusé
  await p.getByTestId('acte-suivant').tap();
  t('acte II : réplique exacte', /Tu as beaucoup d’assurance/.test(await p.getByTestId('replique').innerText()) && (await p.getByTestId('chrono').count()) === 1);
  await p.getByTestId('texte-reponse').fill('Patience : je garde le meilleur pour la fin.'); await p.getByTestId('envoyer-reponse').tap();
  await p.getByTestId('acte-suivant').tap();
  await p.getByTestId('joueur-actif').selectOption('j1');
  await p.getByTestId('texte-reponse').fill('La personne derrière, elle était belle.');
  t('acte III : mot interdit signalé avant validation', /belle/.test(await p.getByTestId('erreurs-reponse').innerText()));
  await p.getByTestId('envoyer-reponse').tap();
  t('acte III : réponse avec mot interdit refusée par le moteur', /Mot.* à éviter/.test(await p.getByTestId('message-jeu').innerText()));
  await p.getByTestId('texte-reponse').fill('Le silence juste avant le dernier pas.'); await p.getByTestId('envoyer-reponse').tap();
  // Pause, puis reprise après une fermeture de la page (sauvegarde)
  await p.getByTestId('mettre-pause').tap();
  t('pause : chronomètre arrêté', (await p.getByTestId('pause').count()) === 1);
  await p.reload({ waitUntil: 'networkidle' }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  t('après rechargement : même onglet « Jouer » rouvert, partie reprise', (await p.getByTestId('partie-reprise').count()) === 1);
  t('… à l’acte III, en pause', /Sous les projecteurs/.test(await p.getByTestId('acte-courant').innerText()) && (await p.getByTestId('pause').count()) === 1);
  await p.getByTestId('reprendre').tap();
  // Acte IV : 4 phrases refusées
  await p.getByTestId('acte-suivant').tap();
  await p.getByTestId('option-o5').tap(); await p.getByTestId('texte-reponse').fill('Une rose. Un lieu. Une heure. Viens.');
  t('acte IV : 4 phrases signalées (3 au maximum)', /3 phrases au maximum/.test(await p.getByTestId('erreurs-reponse').innerText()));
  await p.getByTestId('texte-reponse').fill('Une rose noire t’attend au vestiaire. Elle n’oblige à rien. Si tu la prends, je saurai.'); await p.getByTestId('envoyer-reponse').tap();
  // Acte V : refus majoritaire → embranchement
  await p.getByTestId('acte-suivant').tap();
  for (const j of ['j1', 'j2']) { await p.getByTestId('joueur-actif').selectOption(j); await p.getByTestId('option-refuser').tap(); await p.getByTestId('envoyer-reponse').tap(); }
  await p.getByTestId('acte-suivant').tap();
  t('acte V : le refus majoritaire est respecté et oriente l’acte VI (balcon)', /balcon/.test(await p.getByTestId('acte-courant').innerText()));
  await p.getByTestId('joueur-actif').selectOption('j2'); await p.getByTestId('option-r4').tap(); await p.getByTestId('texte-reponse').fill('Je suis le genre qui ne se range pas.'); await p.getByTestId('envoyer-reponse').tap();
  await p.getByTestId('acte-suivant').tap();
  // Votes
  t('fin des actes : phase des Red Room Awards', (await p.getByTestId('votes').count()) === 1);
  await p.getByTestId('ouvrir-votes').tap();
  await p.getByTestId('votant').selectOption('j1'); await p.getByTestId('voter-meilleure_repartie-j2').tap();
  t('après son vote, J1 ne peut plus voter pour cette distinction', await p.getByTestId('voter-meilleure_repartie-j2').isDisabled());
  t('pas de bouton pour voter pour soi-même', (await p.getByTestId('voter-meilleure_repartie-j1').count()) === 0);
  await p.getByTestId('votant').selectOption('j3'); await p.getByTestId('voter-meilleure_repartie-j2').tap();
  await p.getByTestId('fermer-votes').tap();
  t('dépouillement : Onyx, 2 voix', /Onyx \(2 voix/.test(await p.getByTestId('resultat-meilleure_repartie').innerText()));
  await p.getByTestId('attribuer-meilleure_repartie').tap();
  t('titre remis', /titre remis/.test(await p.getByTestId('resultat-meilleure_repartie').innerText()));
  await p.getByTestId('terminer').tap();
  t('session terminée : classement et compte rendu', (await p.getByTestId('session-terminee').count()) === 1 && /Meilleure répartie : Onyx/.test(await p.getByTestId('compte-rendu').innerText()));
  await p.screenshot({ path: out + '/club_4_fin.png', fullPage: true });

  // ── Atelier : import Markdown, erreur de JSON
  await p.getByTestId('onglet-atelier').tap();
  await p.getByTestId('importer-scenario').setInputFiles({ name: 'vestiaire.md', mimeType: 'text/markdown', buffer: Buffer.from('# Le secret du vestiaire\nUnivers : Wild Saloon · Intensité : 3\n## Acte I — Le comptoir\n> « Qu\'est-ce que je vous sers ? »\n## Acte II — La porte\n- Entrer\n- Rester\n') });
  t('import Markdown : aperçu en brouillon, 2 actes', /Le secret du vestiaire/.test(await p.getByTestId('apercu-import').innerText()) && /2 acte/.test(await p.getByTestId('apercu-import').innerText()) && /brouillon/.test(await p.getByTestId('apercu-import').innerText()));
  await p.getByTestId('importer-scenario').setInputFiles({ name: 'casse.json', mimeType: 'application/json', buffer: Buffer.from('{ pas du json') });
  t('import JSON illisible : erreur explicite', /illisible/.test(await p.getByTestId('erreurs-import').innerText()));
  const [tel] = await Promise.all([p.waitForEvent('download'), p.getByTestId('dupliquer-red-room').tap()]);
  const copie = JSON.parse(fs.readFileSync(await tel.path(), 'utf8'));
  t('duplication de THE RED ROOM : fichier JSON en brouillon, 7 actes', copie.statut === 'brouillon' && copie.actes.length === 7 && copie.validePar === null);
  t('aucune écriture vers la base pendant tout le parcours du club', requetes.length === 0);

  // ── Secret World (maquette)
  await p.goto('http://localhost:3160/bsh/secret-world', { waitUntil: 'networkidle', timeout: 120000 }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.evaluate(() => localStorage.removeItem('bsh-monde')); await p.reload({ waitUntil: 'networkidle' }); await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  t('statut « maquette — joueur seul » et aucune fausse présence', /joueur seul/.test(await p.getByTestId('statut-monde').innerText()) && /non activée/.test(await p.getByTestId('presence').innerText()));
  t('première visite : atelier d’avatar ouvert', (await p.getByTestId('editeur-avatar').count()) === 1);
  await p.getByTestId('avatar-pseudo').fill('Rubis'); await p.getByTestId('avatar-coiffure').selectOption('afro'); await p.getByTestId('avatar-masque').selectOption('masque_bal_simple');
  t('membre : masques signature absents de la liste', (await p.locator('[data-testid=avatar-masque] option[value=masque_red_mystery]').count()) === 0);
  await p.getByTestId('enregistrer-tenue').tap();
  await p.getByTestId('fermer-avatar').tap(); await attendre(800);
  t('Grand Hall affiché', (await p.locator('[data-testid=salle-actuelle][data-salle=grand_hall]').count()) === 1);
  const cv = await p.getByTestId('monde').boundingBox();
  const pix = async () => p.evaluate(() => { const c = document.querySelector('[data-testid=monde]'); return c.toDataURL().length; });
  t('rendu du monde dessiné (canvas non vide)', (await pix()) > 20000);
  await p.screenshot({ path: out + '/monde_1_hall.png' });
  // Déplacement par toucher : position sauvegardée qui change
  const pos0 = await p.evaluate(() => JSON.parse(localStorage.getItem('bsh-monde') || '{}'));
  await p.touchscreen.tap(cv.x + cv.width * 0.62, cv.y + cv.height * 0.55); await attendre(2500);
  const pos1 = await p.evaluate(() => JSON.parse(localStorage.getItem('bsh-monde') || '{}'));
  t('toucher le sol : l’avatar marche (position enregistrée modifiée)', Math.hypot(pos1.x - pos0.x, pos1.y - pos0.y) > 0.5);
  // Joystick
  const j = await p.getByTestId('joystick').boundingBox();
  await p.mouse.move(j.x + j.width / 2, j.y + j.height / 2); await p.mouse.down(); await p.mouse.move(j.x + j.width / 2, j.y - 30, { steps: 5 }); await attendre(1200); await p.mouse.up(); await attendre(1200);
  const pos2 = await p.evaluate(() => JSON.parse(localStorage.getItem('bsh-monde') || '{}'));
  t('joystick : déplacement vers le fond (x et y diminuent)', pos2.x < pos1.x && pos2.y < pos1.y);
  // Clavier
  await p.keyboard.down('ArrowDown'); await attendre(900); await p.keyboard.up('ArrowDown'); await attendre(1200);
  const pos3 = await p.evaluate(() => JSON.parse(localStorage.getItem('bsh-monde') || '{}'));
  t('clavier : flèche bas → vers l’avant', pos3.x > pos2.x && pos3.y > pos2.y);
  // Gestes
  await p.getByTestId('geste-assis').tap();
  t('s’asseoir loin d’un fauteuil : message explicite', /Approchez-vous d’un fauteuil/.test(await p.getByTestId('message-monde').innerText()));
  await p.getByTestId('geste-danse').tap();
  t('danser', /dansez/.test(await p.getByTestId('message-monde').innerText()));
  // Carte, salle à venir, Red Room
  await p.getByTestId('ouvrir-carte').tap();
  t('carte : 2 salles ouvertes, 7 à venir', (await p.locator('[data-testid^=aller-]').count()) === 2 && (await p.getByTestId('carte-monde').locator('text=à venir').count()) === 7);
  await p.getByTestId('aller-the_red_room').tap(); await attendre(1200);
  t('navigation : entrée dans The Red Room', (await p.locator('[data-testid=salle-actuelle][data-salle=the_red_room]').count()) === 1);
  await p.screenshot({ path: out + '/monde_2_red_room.png' });
  // Reprise après rechargement (mise à jour)
  await p.reload({ waitUntil: 'networkidle' }); await attendre(1000);
  t('après rechargement : même salle, avatar conservé, pas de retour à l’accueil', (await p.locator('[data-testid=salle-actuelle][data-salle=the_red_room]').count()) === 1 && (await p.getByTestId('editeur-avatar').count()) === 0 && (await p.evaluate(() => JSON.parse(localStorage.getItem('bsh-monde')).apparence.coiffure)) === 'afro');
  t('tenue enregistrée conservée', (await p.evaluate(() => JSON.parse(localStorage.getItem('bsh-monde')).tenues.length)) === 1);
  // PNJ identifié comme tel
  await p.getByTestId('ouvrir-carte').tap(); await p.getByTestId('aller-grand_hall').tap(); await attendre(1000);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('bsh-monde')); return s; });
  const box = await p.getByTestId('monde').boundingBox();
  // le PNJ est en (7,7) : on cherche son point d'écran avec la même vue que le moteur
  const pt = await p.evaluate(() => { const c = document.querySelector('[data-testid=monde]'); const v = c.__vue(); const z = v.z, o = v.o; return { x: o.x + (7.5 - 7.5) * 32 * z, y: o.y + (15) * 16 * z - 30 * z }; });
  await p.touchscreen.tap(box.x + pt.x, box.y + pt.y); await attendre(600);
  t('PNJ : fiche « personnage non joueur »', (await p.getByTestId('fiche-info').count()) === 1 && /PNJ/.test(await p.getByTestId('fiche-info').innerText()) && /non joueur/.test(await p.getByTestId('fiche-info').innerText()));
  await p.screenshot({ path: out + '/monde_3_pnj.png' });
  t('aucune écriture vers la base', requetes.length === 0);
  t('aucune erreur JavaScript', erreurs.length === 0);
  if (erreurs.length) console.log(erreurs.join('\n'));
  await b.close();
  console.log(R.join('\n') + `\n\nRÉSULTAT : ${ok}/${n}`);
})().catch(e => { console.error(e); process.exit(1); });
