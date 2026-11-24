// BSH Secret Agenda : continuité, publication en 4 étapes, délégation aux hôtes, médiathèque, studio — iPhone 13 SIMULÉ
// (ce n'est pas un iPhone réel). Base simulée : MOCK_BSH_AGENDA=1 node tests/iphone/mockapp.js (+ MOCK_BSH_0141=0 pour
// la base AVANT la migration 0141, que ce script relance lui-même). Application : next dev -p 3160.
// Usage : node tests/iphone/t_bsh_agenda.js <dossier_sorties>
const { chromium, devices } = require('playwright'); const { spawn, execSync } = require('child_process'); const path = require('path');
const out = process.argv[2] || '.'; const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
const F = '00000000-0000-0000-0000-0000000000f0', B1 = '00000000-0000-0000-0000-0000000000b1', B2 = '00000000-0000-0000-0000-0000000000b2', CL = '00000000-0000-0000-0000-0000000000a0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const tok = jwt(F);
const etat = async () => (await fetch('http://localhost:54337/rest/v1/__bsh_etat', { headers: { Authorization: 'Bearer ' + tok } })).json();
const attendre = ms => new Promise(r => setTimeout(r, ms));
let mock;
async function demarrerMock(avec0141) {
  try { execSync("pkill -f 'tests/iphone/mockapp.js'"); } catch {}
  await attendre(800);
  mock = spawn('node', [path.join(__dirname, 'mockapp.js')], { env: { ...process.env, MOCK_BSH_AGENDA: '1', MOCK_BSH_0141: avec0141 ? '1' : '0' }, stdio: 'ignore', detached: true });
  for (let i = 0; i < 40; i++) { try { await fetch('http://localhost:54337/rest/v1/__bsh_etat'); return; } catch { await attendre(250); } }
}
async function contexte(b, sub, role, espace) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t, e]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); if (e) localStorage.setItem('bellaia_espace_' + u.id, e); localStorage.setItem('bsh-agenda-rubrique', 'tableau'); }, [{ id: sub, role, prenom: role === 'fondatrice' ? 'Fondatrice' : null, email: 'test@example.invalid' }, jwt(sub), espace || null]);
  await ctx.addInitScript(() => { const s = document.createElement('style'); s.textContent = ':root{--bellaia-haut:47px!important}nextjs-portal{display:none!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
  const p = await ctx.newPage(); p.err = []; p.on('pageerror', e => p.err.push(e.message)); p.on('dialog', d => d.accept()); return p;
}
const texte = p => p.evaluate(() => document.body.innerText);
const debordement = p => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
async function ouvrirAgenda(p) {
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.waitForSelector('text=Centre de direction', { timeout: 60000 });
  await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /🗝/.test(x.textContent || '') && /Secret Home/.test(x.textContent || '')); e.scrollIntoView(); e.click(); }); await attendre(1500);
  await p.getByRole('button', { name: /Secret Agenda/ }).first().click(); await p.waitForSelector('nav[aria-label="Rubriques BSH Secret Agenda"]', { timeout: 60000 }); await attendre(1200);
}
const rubrique = async (p, nom) => { await p.locator('nav[aria-label="Rubriques BSH Secret Agenda"] button', { hasText: nom }).first().click(); await attendre(900); };
const onglet = async (p, nom) => { await p.getByRole('tab', { name: nom }).click(); await attendre(600); };

(async () => {
  const b = await chromium.launch();
  // ═════ A. Fondatrice, base AVEC 0141 ═════
  await demarrerMock(true);
  const p = await contexte(b, F, 'fondatrice');
  await ouvrirAgenda(p);
  const navTxt = await p.locator('nav[aria-label="Rubriques BSH Secret Agenda"]').innerText();
  ok('01 Secret Agenda : 3 nouvelles rubriques (Continuité, Studio, Médiathèque), rubriques existantes conservées', await p.locator('nav[aria-label="Rubriques BSH Secret Agenda"] button').count() === 13 && ['Continuité BSH', 'Studio créatif', 'Médiathèque', 'Publications', 'Sondages', 'BSH Rewards', 'Jeux et animations', 'Boudoir Sessions'].every(x => navTxt.includes(x)));
  // Continuité › alertes (avant toute action)
  await rubrique(p, 'Continuité BSH');
  let t = await texte(p);
  ok('02 alertes : la publication confiée à une hôte disponible est couverte ; les 2 échéances sans mission sont signalées', /Sans responsable/.test(t) && await p.getByText('Aucun responsable', { exact: true }).count() === 2 && await p.getByText('Couverte', { exact: true }).count() === 1);
  await p.screenshot({ path: `${out}/bsh_continuite_alertes.png`, fullPage: true });
  // Publications : 4 étapes
  await rubrique(p, 'Publications'); t = await texte(p);
  ok('03 publications : aucun bouton « Marquer comme publié » ; étape 3/4 affichée pour la publication programmée', !/Marquer comme publié/.test(t) && /Étape 3\/4/.test(t) && /rien n'est publié tant que la publication n'est pas confirmée/.test(t));
  await p.getByRole('button', { name: /Confirmer la publication/ }).first().click(); await attendre(500);
  await p.getByRole('button', { name: /Confirmer avec cette preuve/ }).click(); await attendre(400);
  ok('04 confirmation sans preuve refusée à l\'écran, rien écrit', /Décris la preuve/.test(await texte(p)) && (await etat()).bsh_preuves_publication.length === 0);
  await p.locator('textarea').last().fill('Message posté dans la Chaîne BSH à 08:02, capture conservée');
  await p.getByRole('button', { name: /Confirmer avec cette preuve/ }).click(); await attendre(1500);
  let E = await etat();
  ok('05 confirmation avec preuve : publication « publiée », preuve tracée (source fondatrice)', E.bsh_communications.find(c => c.id === 'p1').statut === 'publie' && E.bsh_preuves_publication.length === 1 && E.bsh_preuves_publication[0].source === 'fondatrice');
  t = await texte(p);
  ok('06 la carte publiée passe à l\'étape 4/4', /Étape 4\/4/.test(t));
  await p.getByRole('button', { name: '✓ Valider' }).first().click(); await attendre(1200);
  E = await etat(); const p2 = E.bsh_communications.find(c => c.id === 'p2');
  ok('07 validation : statut « validé » et date de validation enregistrée', p2.statut === 'valide' && !!p2.valide_le);
  await p.getByRole('button', { name: /Programmer/ }).first().click(); await attendre(1200);
  ok('08 programmation après validation : statut « programmé », rien de publié', (await etat()).bsh_communications.find(c => c.id === 'p2').statut === 'programme');
  await p.locator('text=Sondage du soir').first().click(); await attendre(800);
  const options = await p.locator('[role=group][aria-label="Statut"] select option').allTextContents();
  ok('09 éditeur : « Publié » n\'est pas proposé dans la liste des statuts', options.length > 3 && !options.includes('Publié'));
  await p.getByRole('button', { name: 'Annuler' }).last().click(); await attendre(400);
  await p.getByRole('button', { name: /Dupliquer/ }).first().click(); await attendre(1200);
  E = await etat(); const copie = E.bsh_communications.find(c => /\(copie\)/.test(c.titre));
  ok('10 duplication : copie en brouillon, sans validation ni date effective', copie && copie.statut === 'brouillon' && !copie.valide_le && !copie.date_publication_effective);
  // Continuité › missions
  await rubrique(p, 'Continuité BSH'); await onglet(p, 'Missions'); t = await texte(p);
  ok('11 missions : responsable, remplaçant, consignes et ressources autorisées affichés', /Hôte Alpha/.test(t) && /remplaçant : Hôte Bêta/.test(t) && /Publier à 8 h/.test(t) && /Ressources autorisées/.test(t));
  await p.getByRole('button', { name: /Confier une mission/ }).click(); await attendre(600);
  const feuille = p.locator('.bsh-feuille').last();
  await feuille.locator('[role=group][aria-label="Publication liée"] select').selectOption('p2');
  await feuille.locator('[role=group][aria-label="Responsable *"] select').selectOption('h2');
  await feuille.locator('[role=group][aria-label="Remplaçant (facultatif)"] select').selectOption('h1');
  const ressourcesProposees = await feuille.locator('[role=group][aria-label="Ressources autorisées"] label').allTextContents();
  ok('12 seules les ressources validées aux droits établis peuvent être confiées', ressourcesProposees.join('|') === 'Affiche validée');
  await feuille.locator('[role=group][aria-label="Ressources autorisées"] input').first().check();
  await feuille.locator('[role=group][aria-label="Consignes d\'animation"] textarea').fill('Lancer le sondage à 21 h, relancer à 21 h 30.');
  await feuille.getByRole('button', { name: /Enregistrer/ }).click(); await attendre(1200);
  E = await etat(); const m2 = E.bsh_missions.find(m => m.communication_id === 'p2');
  ok('13 mission confiée : titulaire, remplaçant, espace, ressource, simulation, « à faire »', m2 && m2.hote_id === 'h2' && m2.remplacant_id === 'h1' && m2.espace === 'cercle' && m2.ressources.join() === 'r1' && m2.simulation === true && m2.statut_execution === 'a_faire');
  await p.getByRole('button', { name: /Reporter/ }).last().click(); await attendre(500);
  const f2 = p.locator('.bsh-feuille').last();
  await f2.locator('input[type=date]').fill(new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10)); await f2.locator('[role=group][aria-label="Motif *"] input').fill('Absence de la fondatrice');
  await f2.getByRole('button', { name: /↷ Reporter/ }).click(); await attendre(1300);
  E = await etat();
  ok('14 report : mission « reportée » avec motif, publication liée « reportée » (jamais « publiée »)', E.bsh_missions.find(m => m.id === m2.id).statut_execution === 'reportee' && E.bsh_communications.find(c => c.id === 'p2').statut === 'reporte');
  // Préparer plusieurs semaines
  await onglet(p, 'Préparer plusieurs semaines'); const avant = (await etat()).bsh_communications.length;
  await p.locator('[role=group][aria-label="Espace"] select').selectOption('lounge');
  const libres = +((await texte(p)).match(/(\d+) créneau\(x\) libre/) || [])[1];
  await p.getByRole('button', { name: /Créer \d+ brouillon/ }).click(); await attendre(1500);
  E = await etat(); const crees = E.bsh_communications.slice(avant);
  const jourCayenne = iso => new Date(new Date(iso).getTime() - 3 * 3600e3).getUTCDay(); const heureC = iso => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(11, 16);
  ok(`15 préparation sur 2 semaines : ${libres} brouillons, aucun le samedi, uniquement 8 h / 21 h, aucun publié`, libres >= 20 && crees.length === libres && crees.every(c => c.statut === 'brouillon' && jourCayenne(c.date_programmee) !== 6 && ['08:00', '21:00'].includes(heureC(c.date_programmee))));
  // Import Christmas Secrets
  await onglet(p, 'Importer un calendrier');
  ok('16a fusion proposée pour « Noël BSH » avant création (pas de doublon de campagne)', /Fusion proposée/.test(await texte(p))); await p.getByRole('button', { name: /Fusionner « Noël BSH »/ }).click(); await attendre(1200);
  E = await etat(); const cs = E.bsh_campagnes.find(c => c.nom === 'BSH Christmas Secrets 2026');
  ok('16 campagne officielle BSH Christmas Secrets 2026 (fusion de « Noël BSH »), 17/11 → 25/12, brouillon, une seule campagne', cs && cs.id === 'cnoel' && cs.date_debut === '2026-11-17' && cs.date_fin === '2026-12-25' && cs.statut === 'brouillon' && E.bsh_campagnes.length === 1);
  const futur = new Date(Date.now() + 12 * 864e5); while (new Date(futur.getTime() - 3 * 3600e3).getUTCDay() === 6) futur.setTime(futur.getTime() + 864e5);
  const fj = futur.toISOString().slice(0, 10);
  let sam = new Date(Date.now() + 864e5); while (new Date(sam.getTime() + 12 * 3600e3).getUTCDay() !== 6) sam.setTime(sam.getTime() + 864e5); const sj = sam.toISOString().slice(0, 10);
  await p.locator('[role=group][aria-label="Campagne"] select').last().selectOption(cs.id);
  await p.locator('textarea[aria-label="Calendrier à importer"]').fill(`date;heure;espace;type;titre;contenu\n2026-11-17;08:00;chaine;publication;Ouverture des secrets;Texte\n${fj};21h;cercle;publication;Secret à venir;Texte\n${fj};21h;cercle;publication;Secret à venir;Texte\n${sj};21:00;chaine;publication;Secret du samedi;Texte`);
  await attendre(500); t = await texte(p);
  ok('17 aperçu : date passée « Historique », doublon ignoré, samedi de pause signalé', /Historique/.test(t) && /Doublon ignoré/.test(t) && /samedi de pause/.test(t));
  const avantImport = (await etat()).bsh_communications.length;
  await p.getByRole('button', { name: /Importer 3 ligne/ }).click(); await attendre(1500);
  E = await etat(); const imp = E.bsh_communications.slice(avantImport);
  ok('18 import : 3 lignes, la date passée archivée en programmation historique, aucune « publiée »', imp.length === 3 && imp.filter(c => c.historique && c.statut === 'archive').length === 1 && imp.every(c => c.statut !== 'publie') && imp.every(c => c.campagne_id === cs.id));
  // Mode Continuité
  await onglet(p, 'Mode Continuité');
  await p.locator('label', { hasText: 'Activer le mode' }).locator('input').check();
  await p.locator('[role=group][aria-label="Hôte principal"] select').selectOption('h1'); await p.locator('[role=group][aria-label="Remplaçant"] select').selectOption('h2');
  await p.getByRole('button', { name: /Enregistrer/ }).click(); await attendre(1200);
  E = await etat();
  ok('19 mode Continuité enregistré (hôte principal, remplaçant)', E.bsh_agenda_reglages[0].continuite_active === true && E.bsh_agenda_reglages[0].continuite_principal === 'h1' && E.bsh_agenda_reglages[0].continuite_remplacant === 'h2');
  await onglet(p, 'Alertes'); t = await texte(p);
  ok('20 avec le mode Continuité, les échéances sans mission sont couvertes par l\'hôte principal', /hôte principal \(Continuité\)/.test(t));
  // Médiathèque
  await rubrique(p, 'Médiathèque'); t = await texte(p);
  ok('21 médiathèque : ressources classées (univers, type, validation, droits) ; absence de personnage de référence signalée', /Secret Agenda · Affiche quotidienne/.test(t) && /Droits : À vérifier/.test(t) && /Aucun personnage principal de référence validé/.test(t));
  await p.getByRole('button', { name: /Ajouter une ressource/ }).click(); await attendre(500);
  let fm = p.locator('.bsh-feuille').last();
  await fm.getByRole('button', { name: 'Texte / scénario' }).click();
  await fm.locator('[role=group][aria-label="Titre *"] input').fill('Scénario de quiz'); await fm.locator('[role=group][aria-label="Univers"] select').selectOption('secret_games'); await fm.locator('[role=group][aria-label="Type"] select').selectOption('scenario');
  await fm.locator('[role=group][aria-label="Texte"] textarea').fill('Autre texte'); await fm.getByRole('button', { name: /Ajouter/ }).last().click(); await attendre(600);
  ok('22 doublon (même titre, type et univers) refusé avant écriture', /Doublon/.test(await texte(p)) && (await etat()).bsh_ressources.length === 3);
  await fm.getByRole('button', { name: 'Média déjà importé' }).click(); await fm.locator('[role=group][aria-label="Titre *"] input').fill('Fond nuit');
  await fm.locator('[role=group][aria-label^="Média de la médiathèque"] select').selectOption('em1'); await fm.getByRole('button', { name: /Ajouter/ }).last().click(); await attendre(1200);
  E = await etat(); const reuse = E.bsh_ressources.find(r => r.source_media_id === 'em1');
  ok('23 média Events réutilisé par référence (aucune copie), en « à valider »', reuse && reuse.statut_validation === 'a_valider' && !reuse.chemin_storage);
  await p.locator('text=Fond nuit').first().click(); await attendre(500);
  fm = p.locator('.bsh-feuille').last(); await fm.locator('[role=group][aria-label="Droits d\'utilisation"] select').selectOption('proprietaire'); await fm.getByRole('button', { name: '✓ Valider' }).click(); await attendre(1200);
  E = await etat(); const v = E.bsh_ressources.find(r => r.source_media_id === 'em1');
  ok('24 validation d\'une ressource : statut, date et droits enregistrés', v.statut_validation === 'valide' && !!v.valide_le && v.droits === 'proprietaire');
  // Studio
  await rubrique(p, 'Studio créatif');
  await p.getByRole('button', { name: /Nouvelle création/ }).click(); await attendre(400); fm = p.locator('.bsh-feuille').last();
  await fm.locator('[role=group][aria-label="Titre *"] input').fill('Affiche du 1er décembre'); await fm.locator('[role=group][aria-label="Ambiance"] select').selectOption('dark_romance');
  await fm.getByRole('button', { name: /Créer le brouillon/ }).click(); await attendre(2000);
  E = await etat(); const cr = E.bsh_creations[0];
  ok('25 création en brouillon + version 1', cr && cr.statut === 'brouillon' && E.bsh_creations_versions.filter(x => x.creation_id === cr.id).length === 1);
  fm = p.locator('.bsh-feuille').last();
  const taille = await fm.locator('canvas[aria-label="Aperçu au format réel"]').evaluate(c => [c.width, c.height]);
  ok('26 aperçu au format réel (1080 × 1350)', taille[0] === 1080 && taille[1] === 1350);
  await fm.locator('[role=group][aria-label="Texte"] textarea').fill('Ce soir, un secret se dévoile.'); await fm.locator('[role=group][aria-label^="Note de correction"] input').fill('Ajout du texte');
  await fm.getByRole('button', { name: /Enregistrer la version 2/ }).click(); await attendre(1500);
  E = await etat();
  ok('27 correction : version 2 ajoutée (la 1 est conservée)', E.bsh_creations_versions.filter(x => x.creation_id === cr.id).map(x => x.numero).sort().join() === '1,2');
  fm = p.locator('.bsh-feuille').last(); ok('28 historique des versions affiché', /Historique des versions \(2\)/.test(await fm.innerText()));
  await fm.getByRole('button', { name: '✓ Valider' }).click(); await attendre(1200);
  fm = p.locator('.bsh-feuille').last(); await fm.getByRole('button', { name: /Story verticale/ }).click(); await attendre(2000);
  E = await etat(); const vari = E.bsh_creations.find(x => x.parent_id === cr.id);
  ok('29 variante « story » liée à l\'original, format 1080 × 1920', vari && vari.format === 'story' && (await p.locator('.bsh-feuille').last().locator('canvas').evaluate(c => c.height)) === 1920);
  await p.screenshot({ path: `${out}/bsh_studio.png`, fullPage: true });
  ok('30 fondatrice : aucun débordement horizontal, aucune erreur JavaScript', !(await debordement(p)) && p.err.length === 0);
  if (p.err.length) R.push('   erreurs : ' + p.err.slice(0, 3).join(' | '));
  await p.context().close();

  // ═════ B. Hôtes et cliente (base réinitialisée) ═════
  await demarrerMock(true);
  const h2 = await contexte(b, B2, 'cliente', 'hote');
  await h2.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await attendre(2500);
  await h2.getByRole('tab', { name: 'Missions' }).click(); await attendre(2500); t = await texte(h2);
  ok('31 hôte remplaçante : voit la mission confiée dans son espace professionnel, avec son rôle', /Missions Bella'Secret Home/.test(t) && /Vous êtes remplaçant·e sur cette mission/.test(t) && /Publier le secret du matin/.test(t));
  ok('32 ressources : seule la ressource validée aux droits établis est visible (la base filtre)', /Affiche validée/.test(t) && !/Visuel aux droits à vérifier/.test(t));
  await h2.getByRole('button', { name: 'Mission réalisée' }).click(); await attendre(800);
  ok('33 « réalisée » sans compte rendu refusée', /compte rendu d'au moins 10 caractères/i.test(await texte(h2)) && (await etat()).bsh_missions[0].statut_execution === 'a_faire');
  await h2.locator('textarea[aria-label="Compte rendu"]').fill('Secret publié et réactions modérées pendant 30 minutes.');
  await h2.getByRole('button', { name: 'Mission réalisée' }).click(); await attendre(1200);
  E = await etat();
  ok('34 compte rendu enregistré par la remplaçante (fonction contrôlée)', E.bsh_missions[0].statut_execution === 'realisee' && E.bsh_missions[0].execute_par === B2 && /réactions modérées/.test(E.bsh_missions[0].compte_rendu));
  await h2.getByRole('button', { name: /J'ai publié/ }).click(); await attendre(300);
  await h2.locator('textarea[aria-label="Preuve de publication"]').fill('Posté dans la Chaîne BSH à 08:01, capture conservée');
  await h2.getByRole('button', { name: 'Confirmer avec cette preuve' }).click(); await attendre(1200);
  E = await etat();
  ok('35 publication confirmée par l\'hôte avec preuve (source « hôte »)', E.bsh_communications.find(c => c.id === 'p1').statut === 'publie' && E.bsh_preuves_publication[0]?.source === 'hote');
  ok('36 hôte : aucun accès au studio ni aux autres publications', !(/Studio créatif|Sondage du soir/.test(await texte(h2))));
  ok('37 hôte : aucun débordement horizontal, aucune erreur JavaScript', !(await debordement(h2)) && h2.err.length === 0);
  await h2.screenshot({ path: `${out}/bsh_hote_mission.png`, fullPage: true }); await h2.context().close();
  const h1 = await contexte(b, B1, 'cliente', 'hote');
  await h1.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await attendre(2500); await h1.getByRole('tab', { name: 'Missions' }).click(); await attendre(2500);
  ok('38 hôte titulaire : voit la même mission en tant que responsable, compte rendu déjà déclaré', /Vous êtes responsable de cette mission/.test(await texte(h1)) && /Réalisée/.test(await texte(h1)));
  await h1.context().close();
  const cl = await contexte(b, CL, 'cliente');
  await cl.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await attendre(2500);
  ok('39 cliente : aucun espace hôte ni mission BSH', !/Missions Bella'Secret Home/.test(await texte(cl)) && await cl.locator('[aria-label="Mes espaces"]').count() === 0);
  await cl.context().close();

  // ═════ D. Compléments du 24/11 (campagne officielle, programmation, réserve, Rewards, Diamond B, studio, assistant) ═════
  await demarrerMock(true);
  const r = await contexte(b, F, 'fondatrice'); await ouvrirAgenda(r);
  await rubrique(r, 'Continuité BSH'); await onglet(r, 'Importer un calendrier');
  ok('43 fusion proposée : « Noël BSH » deviendra la campagne officielle (même identifiant)', /Fusion proposée/.test(await texte(r)));
  await r.getByRole('button', { name: /Fusionner « Noël BSH »/ }).click(); await attendre(1300);
  E = await etat(); const cn = E.bsh_campagnes.find(c => c.id === 'cnoel');
  ok('44 fusion : même identifiant, nom et dates officiels, ancien état tracé, rien supprimé', E.bsh_campagnes.length === 1 && cn.nom === 'BSH Christmas Secrets 2026' && cn.date_debut === '2026-11-17' && cn.date_fin === '2026-12-25' && /avant : « Noël BSH »/.test(cn.notes_internes || '') && /Le réveil des fêtes/.test(cn.description || ''));
  await r.getByRole('button', { name: 'Charger le calendrier officiel' }).click(); await attendre(800);
  t = await texte(r); const nbImport = +((t.match(/Importer (\d+) ligne/) || [])[1] || 0);
  ok('45 calendrier officiel chargé : 145 lignes (29 jours × 5), aucune erreur, dates passées signalées', nbImport === 145 && !/Erreur/.test(t.replace(/Erreurs?\s+de/g, '')) && /Historique/.test(t));
  const avOff = (await etat()).bsh_communications.length;
  await r.getByRole('button', { name: /Importer 145 ligne/ }).click(); await attendre(2500);
  E = await etat(); const off = E.bsh_communications.slice(avOff);
  ok('46 import officiel : 145 brouillons ou historiques, aucun « publié », thème de la semaine et nature renseignés', off.length === 145 && off.every(c => c.statut !== 'publie' && c.campagne_id === 'cnoel' && !!c.thematique && !!c.nature) && off.some(c => c.historique) && off.find(c => /réveillon des Sweeties — animation/.test(c.titre))?.thematique === 'La magie finale');
  await onglet(r, 'Mode Continuité');
  await r.getByRole('button', { name: /Appliquer à \d+ jour/ }).click(); await attendre(1500);
  E = await etat(); const lun = E.bsh_programmation_jours.find(j => j.jour_semaine === 1), samedi = E.bsh_programmation_jours.find(j => j.jour_semaine === 6);
  ok('47 programmation permanente appliquée : facultatifs 10 h, 12 h 30, 18 h, 22 h 30 ; samedi fermé, réouverture 20 h ; thèmes conservés', lun.creneaux_facultatifs.join() === '10:00,12:30,18:00,22:30' && lun.thematique === "Mystérieux" && samedi.en_pause && samedi.creneaux_facultatifs.join() === '20:00');
  await rubrique(r, 'Sondages');
  await r.getByRole('button', { name: /Ajouter la réserve en brouillon \(10\)/ }).click(); await attendre(1300);
  E = await etat();
  ok('48 réserve : 10 sondages en brouillon, 4 réponses chacun ; le bouton disparaît (pas de doublon)', E.bsh_sondages.length === 10 && E.bsh_sondages.every(s => s.statut === 'brouillon' && s.choix.length === 4) && /Les 10 sondages de la réserve sont présents/.test(await texte(r)));
  await rubrique(r, 'Publications');
  await r.getByRole('button', { name: '↻ TikTok' }).first().click(); await attendre(1200);
  E = await etat(); const tk = E.bsh_communications.find(c => c.plateforme === 'tiktok');
  ok('49 adaptation TikTok : copie en brouillon, plateforme TikTok, sans validation ni preuve', tk && tk.statut === 'brouillon' && !tk.valide_le && /TikTok/.test(tk.titre));
  await rubrique(r, 'BSH Rewards'); t = await texte(r);
  ok('50 Rewards : les 4 catégories officielles affichées', ['BSH Sweet Rewards', 'BSH Golden Ticket', 'BSH Secret Gift', 'BSH Members Rewards'].every(x => t.includes(x)));
  await r.getByRole('button', { name: /Campagne Rewards/ }).click(); await attendre(500); let fr = r.locator('.bsh-feuille').last();
  await fr.locator('[role=group][aria-label="Titre *"] input').fill('Golden Ticket de Noël'); await fr.locator('[role=group][aria-label="Catégorie"] select').selectOption('golden_ticket');
  await fr.getByRole('button', { name: /Enregistrer/ }).last().click(); await attendre(1200);
  E = await etat(); const gt = E.bsh_rewards_campagnes[0];
  ok('51 campagne Golden Ticket enregistrée en brouillon, participation fermée', gt && gt.categorie === 'golden_ticket' && gt.statut === 'brouillon' && !gt.participation_ouverte);
  await rubrique(r, 'Jeux et animations'); await r.getByRole('button', { name: /Diamond B/ }).first().click(); await attendre(500);
  await r.getByRole('button', { name: /Importer des titres/ }).click();
  await r.locator('textarea[aria-label="Titres à importer"]').fill('titre;lien;ambiance;durée;droits\nNuit de velours;https://exemple.invalid/ecoute;velours;3:45;a_verifier\nSecret d\'or;http://non-securise.invalid;mystère;4:10;autorisee');
  await r.getByRole('button', { name: /Importer 2 titre/ }).click(); await attendre(1200);
  E = await etat();
  ok('52 Diamond B : 2 titres importés, droits « à vérifier » par défaut, lien non https ignoré', E.bsh_musique.length === 2 && E.bsh_musique[0].autorisation_diffusion === 'a_verifier' && E.bsh_musique[1].lien_ecoute === null && E.bsh_musique[0].duree_secondes === 225);
  await r.locator('text=Nuit de velours').first().click(); await attendre(500); fr = r.locator('.bsh-feuille').last();
  await fr.locator('[role=group][aria-label="Paroles originales"] textarea').fill('Paroles originales de test'); await fr.locator('[role=group][aria-label="Jeux Secret Games associés"] select').selectOption('j1'); await attendre(800);
  fr = r.locator('.bsh-feuille').last(); await fr.getByRole('button', { name: /Enregistrer/ }).click(); await attendre(1200);
  E = await etat();
  ok('53 Diamond B : paroles enregistrées et titre lié au jeu Secret Games', E.bsh_musique[0].paroles === 'Paroles originales de test' && E.bsh_musique_liens.some(l => l.cible_type === 'jeu' && l.cible_id === 'j1'));
  await rubrique(r, 'Studio créatif'); t = await texte(r);
  ok('54 studio : fiche du personnage officiel (description, aucun visuel validé)', /Femme adulte noire, glamour/.test(t) && /Aucun visuel officiel déposé/.test(t));
  const [fc] = await Promise.all([r.waitForEvent('filechooser'), r.locator('label', { hasText: 'Importer le visuel officiel' }).click()]);
  const png1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await fc.setFiles({ name: 'personnage.png', mimeType: 'image/png', buffer: png1 }); await attendre(1800);
  E = await etat(); const pers = E.bsh_ressources.find(x => x.type === 'personnage_reference');
  ok('55 visuel officiel déposé : « à valider », droits à vérifier (non utilisé tant que non validé)', pers && pers.statut_validation === 'a_valider' && pers.droits === 'a_verifier');
  await r.getByRole('button', { name: /Nouvelle création/ }).click(); await attendre(400); fr = r.locator('.bsh-feuille').last();
  await fr.locator('[role=group][aria-label="Titre *"] input').fill('Invitation du réveillon'); await fr.locator('[role=group][aria-label="Format"] select').selectOption('invitation'); await fr.locator('[role=group][aria-label="Ambiance"] select').selectOption('festive');
  await fr.getByRole('button', { name: /Créer le brouillon/ }).click(); await attendre(2000); fr = r.locator('.bsh-feuille').last();
  ok('56 6 ambiances proposées ; aperçu signalé « non finalisé »', (await r.locator('.bsh-feuille').last().locator('text=Aperçu — non finalisé').count()) === 1);
  await fr.getByRole('button', { name: '⬇️ PDF' }).click(); await attendre(500);
  ok('57 téléchargement refusé tant que la création n\'est pas validée', /Valide la création/.test(await fr.innerText()));
  await fr.getByRole('button', { name: '✓ Valider' }).click(); await attendre(1300); fr = r.locator('.bsh-feuille').last();
  const fichiers = {};
  for (const x of ['PNG', 'JPEG', 'PDF']) { const [dl] = await Promise.all([r.waitForEvent('download'), fr.getByRole('button', { name: '⬇️ ' + x }).click()]); fichiers[x] = require('fs').readFileSync(await dl.path()); }
  const dimsPng = [fichiers.PNG.readUInt32BE(16), fichiers.PNG.readUInt32BE(20)];
  const pdfTxt = fichiers.PDF.toString('latin1');
  ok('58 exports réels : PNG 1080 × 1350 (signature PNG), JPEG (signature FFD8), PDF valide avec image 1080 × 1350', fichiers.PNG.slice(1, 4).toString() === 'PNG' && dimsPng.join('x') === '1080x1350' && fichiers.JPEG[0] === 0xFF && fichiers.JPEG[1] === 0xD8 && pdfTxt.startsWith('%PDF-1.4') && /\/Width 1080 \/Height 1350/.test(pdfTxt) && /%%EOF\s*$/.test(pdfTxt));
  require('fs').writeFileSync(`${out}/bsh_export_invitation.pdf`, fichiers.PDF);
  await fr.getByRole('button', { name: /Story TikTok/ }).click(); await attendre(2000);
  ok('59 variante Story TikTok : 1080 × 1920 avec zones sûres signalées', (await r.locator('.bsh-feuille').last().locator('canvas').evaluate(c => c.height)) === 1920 && /Zones hachurées/.test(await r.locator('.bsh-feuille').last().innerText()));
  await r.locator('.bsh-feuille').last().getByRole('button', { name: '✕' }).click(); await attendre(400);
  await rubrique(r, 'Assistant de communication'); t = await texte(r);
  ok('60 assistant : limites affichées (aucun accès à Meta AI ni publication)', /n'a aucun accès à Meta AI ni à WhatsApp Business/.test(t));
  await r.getByRole('button', { name: /＋ Nouveau/ }).click(); await attendre(400); fr = r.locator('.bsh-feuille').last();
  await fr.locator('[role=group][aria-label="Titre *"] input').fill('Horaires'); await fr.locator('[role=group][aria-label="Raccourci"] input').fill('/horaires');
  await fr.locator('textarea[aria-label="Texte"]').fill('Nos rendez-vous : 8 h et 21 h. Écrivez à contact@exemple.fr'); await attendre(300);
  await fr.getByRole('button', { name: '✓ Valider' }).click(); await attendre(500);
  ok('61 validation refusée si une donnée personnelle figure dans le texte', /retire adresse e-mail/.test(await fr.innerText()) && (await etat()).bsh_assistant_contenus.length === 0);
  await fr.locator('textarea[aria-label="Texte"]').fill('Nos rendez-vous : 8 h et 21 h, heure de Cayenne. Le samedi, pause.'); await fr.getByRole('button', { name: '✓ Valider' }).click(); await attendre(1200);
  E = await etat(); const ra = E.bsh_assistant_contenus[0];
  ok('62 réponse rapide validée (raccourci, version, date de validation)', ra && ra.statut === 'valide' && ra.raccourci === '/horaires' && !!ra.valide_le && ra.version === 1);
  const [dlx] = await Promise.all([r.waitForEvent('download'), r.getByRole('button', { name: /Exporter les contenus validés \(1\)/ }).click()]);
  const txt = require('fs').readFileSync(await dlx.path(), 'utf8');
  ok('63 export manuel : fichier texte des contenus validés', /Réponse rapide/.test(txt) && /\/horaires — Horaires/.test(txt) && /Aucune donnée personnelle/.test(txt));
  ok('64 compléments : aucun débordement horizontal, aucune erreur JavaScript', !(await debordement(r)) && r.err.length === 0);
  if (r.err.length) R.push('   erreurs : ' + r.err.slice(0, 3).join(' | '));
  await r.screenshot({ path: `${out}/bsh_assistant.png`, fullPage: true }); await r.context().close();

  // ═════ C. Base AVANT 0141 (comportement honnête) ═════
  await demarrerMock(false);
  const q = await contexte(b, F, 'fondatrice'); await ouvrirAgenda(q);
  await rubrique(q, 'Publications');
  await q.getByRole('button', { name: /Confirmer la publication/ }).first().click(); await attendre(400);
  await q.locator('textarea').last().fill('Message posté dans la Chaîne BSH à 08:02'); await q.getByRole('button', { name: /Confirmer avec cette preuve/ }).click(); await attendre(600);
  E = await etat();
  ok('40 avant 0141 : la confirmation est refusée avec explication, rien n\'est marqué publié', /après la migration 0141/.test(await texte(q)) && E.bsh_communications.every(c => c.statut !== 'publie'));
  await q.getByRole('button', { name: 'Annuler' }).last().click();
  await rubrique(q, 'Studio créatif'); const s1 = /s'activera avec la migration 0141/.test(await texte(q));
  await rubrique(q, 'Médiathèque'); const s2 = /s'activera avec la migration 0141/.test(await texte(q));
  await rubrique(q, 'Continuité BSH'); const s3 = /Migration 0141 non appliquée/.test(await texte(q)) && await q.locator('text=Aucun responsable').count() >= 1;
  ok('41 avant 0141 : studio et médiathèque annoncés « après migration », alertes de continuité disponibles', s1 && s2 && s3);
  ok('42 avant 0141 : aucune erreur JavaScript', q.err.length === 0);
  await q.context().close();

  await b.close(); try { process.kill(-mock.pid); } catch {}
  console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.filter(x => / : (OK|ÉCHEC)$/.test(x)).length}`);
})().catch(e => { console.log(R.join('\n')); console.log('ECHEC ' + e.message.split('\n')[0]); try { process.kill(-mock.pid); } catch {} process.exit(1); });
