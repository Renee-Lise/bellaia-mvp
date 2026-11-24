// Règles BSH Secret Agenda (continuité, 4 étapes, import, récurrences, doublons). Usage : node tests/unit/t_bsh_continuite.js
// Données fictives uniquement.
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/modules/bshAgenda/continuite.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new M('c'); m._compile(js, 'c.js'); const C = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
// Programmation réelle de production (lue le 23/11) : 8 h et 21 h, samedi en pause.
const JOURS = [0, 1, 2, 3, 4, 5].map(j => ({ jour_semaine: j, thematique: 'T' + j, en_pause: false, creneaux: ['08:00', '21:00'], creneaux_facultatifs: ['12:30', '18:00'] })).concat([{ jour_semaine: 6, thematique: 'Pause', en_pause: true, creneaux: [], creneaux_facultatifs: ['20:00'] }]);

// Récurrences et campagne Christmas Secrets (17/11 → 25/12/2026)
const cr = C.creneauxPeriode('2026-11-17', '2026-12-25', JOURS);
const samedis = cr.filter(c => C.jourDe(c.date) === 6).length;
ok('01 campagne 17/11 → 25/12 : 39 jours, 5 samedis en pause, 34 jours × 2 rendez-vous = 68 créneaux', cr.length === 68 && samedis === 0);
ok('02 seulement 8 h et 21 h', cr.every(c => ['08:00', '21:00'].includes(c.heure)));
ok('03 21 h à Cayenne = 00:00 UTC le lendemain (fuseau America/Cayenne, UTC−3)', C.versIsoCayenne('2026-12-24', '21:00') === '2026-12-25T00:00:00.000Z' && C.cleCayenne('2026-12-25T00:00:00.000Z') === '2026-12-24' && C.heureCayenneDe('2026-12-25T00:00:00.000Z') === '21:00');

// 4 étapes
const brouillon = { statut: 'brouillon', titre: 'Secret du jour', contenu: 'Texte', date_programmee: C.versIsoCayenne('2026-12-01', '08:00') };
ok('04 génération : un brouillon est à l\'étape 1', C.etapePublication(brouillon) === 'generation');
ok('05 programmation refusée sans validation', /validé/.test(C.controleTransition(brouillon, 'programme') || ''));
const valide = { ...brouillon, statut: 'valide', valide_le: '2026-11-23T20:00:00Z' };
ok('06 validation → étape 2 ; programmation permise', C.etapePublication(valide) === 'validation' && C.controleTransition(valide, 'programme') === null);
const programme = { ...valide, statut: 'programme' };
ok('07 programmée → étape 3, et ce n\'est PAS une publication', C.etapePublication(programme) === 'programmation');
ok('08 « publié » refusé sans preuve', /preuve/.test(C.controleTransition(programme, 'publie') || '') && /preuve/.test(C.controleTransition(programme, 'publie', { preuve: 'ok' }) || ''));
ok('09 « publié » accepté avec une preuve', C.controleTransition(programme, 'publie', { preuve: 'Lien du message dans la Chaîne BSH, 08:02' }) === null);
ok('10 statut « publie » saisi à la main sans preuve ni confirmation : reste à l\'étape 3', C.etapePublication({ ...programme, statut: 'publie' }) === 'programmation');
const publie = { ...programme, statut: 'publie', preuve_publication: 'Capture du message envoyé à 08:02', confirme_le: '2026-12-01T11:03:00Z' };
ok('11 publication confirmée → étape 4 ; elle ne revient plus en arrière', C.etapePublication(publie) === 'publication' && C.controleTransition(publie, 'programme') !== null && C.controleTransition(publie, 'archive') === null);
ok('12 validation refusée sans titre ni texte', C.controleTransition({ statut: 'brouillon', titre: '', contenu: '' }, 'valide') !== null);

// Duplication
const copie = C.dupliquer({ id: 'x', ...publie, serie_id: 's', titre: 'Secret du jour' }, null);
ok('13 duplication : brouillon, sans id, sans validation, sans preuve, sans date', copie.statut === 'brouillon' && !copie.id && !copie.valide_le && !copie.preuve_publication && !copie.confirme_le && copie.date_programmee === null && /copie/.test(copie.titre));

// Import du calendrier
const maintenant = new Date('2026-11-24T02:00:00Z'); // 23/11 23 h à Cayenne
const csv = 'date;heure;espace;type;titre;contenu\n2026-11-17;08:00;chaine;publication;Ouverture;Texte\n24/11/2026;21h;cercle;sondage;Votre secret;Texte\n2026-11-28;21:00;chaine;publication;Samedi;Texte\n2026-12-02;10:15;lounge;publication;Hors créneau;Texte\n2026-12-02;10:15;lounge;publication;Hors créneau;Texte\n2026-13-01;08:00;chaine;publication;Mauvaise date;x\n2026-12-03;08:00;whatsapp;publication;Espace;x';
const L = C.lireCalendrier(csv, { maintenant, jours: JOURS, existants: [] });
ok('14 date passée (17/11) → « historique », jamais « publiée »', L[0].etat === 'historique');
ok('15 formats JJ/MM/AAAA et « 21h » compris ; date future → « à venir »', L[1].date === '2026-11-24' && L[1].heure === '21:00' && L[1].etat === 'a_venir');
ok('16 samedi de pause signalé', L[2].alertes.some(a => /samedi/.test(a)));
ok('17 hors créneaux 8 h / 21 h signalé ; doublon détecté', L[3].alertes.some(a => /créneaux/.test(a)) && L[4].doublon && !L[3].doublon);
ok('18 date impossible et espace inconnu → erreur', L[5].etat === 'erreur' && L[6].etat === 'erreur');
ok('19 doublon avec une publication existante', C.lireCalendrier('2026-12-01;08:00;chaine;publication;Secret du jour;x', { maintenant, jours: JOURS, existants: [{ date_programmee: C.versIsoCayenne('2026-12-01', '08:00'), espace: 'chaine', titre: 'secret du jour' }] })[0].doublon);
const pro = C.prochainCreneauLibre(new Date('2026-11-28T12:00:00Z'), JOURS, new Set([C.versIsoCayenne('2026-11-29', '08:00')]), '08:00');
ok('20 replanification : saute le samedi de pause et le créneau occupé', pro && pro.date === '2026-11-29' && pro.heure === '21:00');

// Continuité
const H = [{ id: 'h1', statut: 'active' }, { id: 'h2', statut: 'active' }, { id: 'h3', statut: 'inactive' }];
const ind = [{ hote_id: 'h1', jour: '2026-12-05', type: 'indisponible' }];
const E = [{ cle: 'p1', libelle: 'A', date: '2026-12-04' }, { cle: 'p2', libelle: 'B', date: '2026-12-05' }, { cle: 'p3', libelle: 'C', date: '2026-12-06' }, { cle: 'p4', libelle: 'D', date: '2026-12-07' }];
const Mi = [{ hote_id: 'h1', remplacant_id: 'h2', date_mission: '2026-12-04', communication_id: 'p1' }, { hote_id: 'h1', remplacant_id: 'h2', date_mission: '2026-12-05', communication_id: 'p2' }, { hote_id: 'h3', remplacant_id: null, date_mission: '2026-12-06', communication_id: 'p3' }];
const A = C.alertesContinuite(E, Mi, H, ind, null);
ok('21 titulaire disponible → OK', A[0].niveau === 'ok' && A[0].responsable === 'h1');
ok('22 titulaire indisponible → remplaçant, niveau « attention »', A[1].niveau === 'attention' && A[1].responsable === 'h2');
ok('23 hôte inactive sans remplaçant → alerte critique', A[2].niveau === 'critique' && A[2].responsable === null);
ok('24 aucune mission → alerte critique « aucun responsable désigné »', A[3].niveau === 'critique' && /désigné/.test(A[3].motif));
const A2 = C.alertesContinuite(E, Mi, H, ind, { active: true, principal: 'h2', remplacant: null });
ok('25 mode Continuité : l\'hôte principal couvre les échéances sans responsable', A2[2].responsable === 'h2' && A2[3].responsable === 'h2' && A2[3].niveau === 'attention');

// Exécution déclarée par l'hôte
ok('26 hôte : « réalisée » exige un compte rendu ; report et annulation réservés à la fondatrice', C.controleExecution('realisee', 'ok') !== null && C.controleExecution('realisee', 'Animation menée, 12 participants.') === null && C.controleExecution('reportee', 'x') !== null && C.controleExecution('annulee', 'x') !== null);

// Médiathèque
ok('27 ressource utilisable seulement si validée ET droits établis', C.utilisable({ statut_validation: 'valide', droits: 'proprietaire' }) && !C.utilisable({ statut_validation: 'valide', droits: 'a_verifier' }) && !C.utilisable({ statut_validation: 'a_valider', droits: 'proprietaire' }));
ok('28 doublons : même empreinte = même ressource, quel que soit le titre', C.cleDoublon({ empreinte: 'ABC', titre: 'x' }) === C.cleDoublon({ empreinte: 'abc', titre: 'y' }) && C.cleDoublon({ source_media_id: 'm1' }) !== C.cleDoublon({ source_media_id: 'm2' }));
ok('29 formats du studio : story 1080 × 1920, affiche 1080 × 1350', C.FORMATS_STUDIO.story.h === 1920 && C.FORMATS_STUDIO.affiche.h === 1350);

// ═══ Compléments du 24/11 ═══
const Q = C.QUOTIDIEN_CHRISTMAS;
ok('30 calendrier officiel : 33 jours du 23/11 au 25/12, 4 pauses, toutes un samedi', Q.length === 33 && Q.filter(x => !x[1]).length === 4 && Q.filter(x => !x[1]).every(x => C.jourDe(x[0]) === 6) && Q.filter(x => x[1]).every(x => C.jourDe(x[0]) !== 6));
ok('31 temps forts : 6 périodes contiguës du 17/11 au 25/12', C.PERIODES_CHRISTMAS.length === 6 && C.PERIODES_CHRISTMAS[0][0] === '2026-11-17' && C.PERIODES_CHRISTMAS[5][1] === '2026-12-25' && C.PERIODES_CHRISTMAS.every((p, i) => i === 0 || C.ajouterJours(C.PERIODES_CHRISTMAS[i - 1][1], 1) === p[0]));
const LO = C.lignesCalendrierOfficiel(false);
ok('32 déclinaison quotidienne : 29 jours × 5 éléments (affiches 8 h et 21 h, publications, animation 21 h), thème de la semaine', LO.length === 29 * 5 && LO.every(l => ['08:00', '21:00'].includes(l.heure) && !!l.thematique) && LO.find(l => l.date === '2026-12-24').thematique === 'La magie finale');
ok('33 avec les facultatifs : 10 h, 12 h 30, 18 h, 22 h 30 en plus', C.lignesCalendrierOfficiel(true).length === 29 * 9);
const LC = C.lireCalendrier(C.csvCalendrierOfficiel(false), { maintenant: new Date('2026-11-24T11:30:00Z'), jours: C.programmationPermanente({}), existants: [] });
ok('34 import du calendrier officiel le 24/11 à 8 h 30 Cayenne : 23/11 et 24/11 8 h historiques, aucune erreur, aucun doublon', LC.every(l => l.etat !== 'erreur' && !l.doublon) && LC.filter(l => l.etat === 'historique').length === 5 + 2 && LC.find(l => l.date === '2026-11-24' && l.heure === '21:00').etat === 'a_venir');
const PP = C.programmationPermanente({ 1: 'Mystérieux' });
ok('35 programmation permanente : 8 h / 21 h, facultatifs 10 h, 12 h 30, 18 h, 22 h 30, samedi fermé avec réouverture 20 h', PP[1].creneaux.join() === '08:00,21:00' && PP[1].creneaux_facultatifs.join() === '10:00,12:30,18:00,22:30' && PP[6].en_pause && PP[6].creneaux_facultatifs.join() === '20:00' && PP[1].thematique === 'Mystérieux');
const F1 = C.planFusion([{ id: 'n', nom: 'Noël BSH', saison: 'noel', date_debut: '2026-12-01', date_fin: '2026-12-26', recurrence_annuelle: true, statut: 'brouillon' }]);
ok('36 fusion (seule « Noël BSH ») : renommage, même identifiant, dates officielles, ancien état tracé', F1.action === 'renommer' && F1.id === 'n' && F1.patch.nom === 'BSH Christmas Secrets 2026' && F1.patch.date_debut === '2026-11-17' && /avant : « Noël BSH », 2026-12-01 → 2026-12-26/.test(F1.patch.notes_internes));
const F2 = C.planFusion([{ id: 'n', nom: 'Noël BSH', saison: 'noel', statut: 'brouillon', date_debut: null, date_fin: null }, { id: 'c', nom: 'BSH Christmas Secrets 2026', saison: 'noel', statut: 'brouillon', date_debut: '2026-11-17', date_fin: '2026-12-25' }]);
ok('37 fusion (les deux existent) : rattachement vers la campagne officielle, « Noël BSH » archivée et non supprimée', F2.action === 'rattacher' && F2.de === 'n' && F2.vers === 'c' && F2.archive.statut === 'archivee' && F2.tables.includes('bsh_communications'));
ok('38 fusion déjà faite : aucune action', C.planFusion([{ id: 'c', nom: 'BSH Christmas Secrets 2026', saison: 'noel', statut: 'brouillon', date_debut: null, date_fin: null }]).action === 'rien');
const S0 = C.sondagesAManquer([]); const S1 = C.sondagesAManquer([{ question: 'quelle ambiance preferez-vous pour noel chez bsh ?' }]);
ok('39 réserve : 10 sondages en brouillon, 4 réponses chacun ; doublon reconnu sans accents ni casse', S0.length === 10 && S0.every(x => x.statut === 'brouillon' && x.choix.length === 4) && S1.length === 9);
ok('40 Rewards : 4 catégories officielles', C.CATEGORIES_REWARDS.map(x => x[1]).join('|') === 'BSH Sweet Rewards|BSH Golden Ticket|BSH Secret Gift|BSH Members Rewards');
ok('41 studio : 6 ambiances, Story Snapchat et TikTok en 1080 × 1920 avec zones sûres, exports PDF pour l\'impression', C.AMBIANCES.length === 6 && C.FORMATS_STUDIO.story_tiktok.h === 1920 && C.ZONES_SURES.story_tiktok.bas > 0 && C.EXPORTS_STUDIO.invitation.includes('pdf') && !C.EXPORTS_STUDIO.story.includes('pdf'));

// Personnage officiel : principale + secondaires
const RP = (id, role, st = 'valide', dr = 'proprietaire') => ({ id, type: 'personnage_reference', role_reference: role, statut_validation: st, droits: dr, url: 'u' + id });
const LP = [RP('a', 'principale'), RP('b', 'secondaire'), RP('c', 'secondaire'), RP('d', 'secondaire', 'a_valider', 'a_verifier'), RP('e', 'secondaire', 'archive'), { id: 'x', type: 'affiche', statut_validation: 'valide', droits: 'proprietaire' }];
const rp = C.referencesPersonnage(LP);
ok('42 personnage : 1 principale, 2 secondaires validées, 1 à valider, archivée ignorée', rp.principale.id === 'a' && rp.secondaires.map(x => x.id).join() === 'b,c' && rp.enAttente.map(x => x.id).join() === 'd' && rp.toutes.length === 4);
ok('43 nouvelle principale : l\'ancienne repasse en secondaire AVANT (unicité en base)', JSON.stringify(C.patchsPrincipale(rp.toutes, 'c')) === JSON.stringify([{ id: 'a', role_reference: 'secondaire' }, { id: 'c', role_reference: 'principale' }]));
ok('44 création : principale par défaut, secondaire choisie respectée, visuel non validé jamais utilisé', C.personnageCreation(LP).id === 'a' && C.personnageCreation(LP, 'b').id === 'b' && C.personnageCreation(LP, 'd').id === 'a');
ok('45 sans principale validée : aucun personnage imposé', C.personnageCreation([RP('d', 'principale', 'a_valider', 'a_verifier')]) === null);
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
