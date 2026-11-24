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

console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
