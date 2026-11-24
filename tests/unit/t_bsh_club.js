// BSH Private Club : moteur narratif, THE RED ROOM, nominations des hôtes, masques signature — règles pures.
// Usage : node tests/unit/t_bsh_club.js
const path = require('path'); const ts = require('typescript'); const fs = require('fs');
const charger = (rel, deps = {}) => { const src = fs.readFileSync(path.join(__dirname, '../../src/modules/bshClub', rel), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, x => deps[x] || require(x)); return m.exports; };
const M = charger('moteurNarratif.ts'); const R = charger('redRoom.ts', { './moteurNarratif': M }); const N = charger('nominations.ts');
let ok = 0, n = 0; const t = (nom, v) => { n++; if (v) ok++; else console.log('ÉCHEC', nom); };
const S = R.RED_ROOM; const T0 = new Date('2026-11-28T18:05:00Z');
const plus = s => new Date(T0.getTime() + s * 1000);
let e = M.nouvelleSession(S);
const a = (act, quand = T0) => { const r = M.appliquer(S, e, act, quand); if (r.ok) e = r.etat; return r; };

// Données du cahier des charges
t('8 univers, Secret Duo relié (non recréé)', R.UNIVERS_CLUB.length === 8 && R.UNIVERS_CLUB.find(u => u.id === 'secret_duo').lienExistant === '/bsh/secret-duo');
t('10 personnages, 6 objets, 5 répliques, 7 distinctions', R.PERSONNAGES_RED_ROOM.length === 10 && R.OBJETS_BOUTIQUE.length === 6 && R.REPLIQUES_ENCHERES.length === 5 && R.DISTINCTIONS_RED_ROOM.length === 7);
t('Red Room : intensité 6, durée 60-90, scénario cohérent', S.intensite === 6 && S.dureeMinutes[0] === 60 && S.dureeMinutes[1] === 90 && M.controlerScenario(S).length === 0);
t('6 actes numérotés 1 à 6 sur le parcours principal', ['acte_1','acte_2','acte_3','acte_4','acte_5','acte_6'].every((id, i) => S.actes.find(x => x.id === id).numero === i + 1));
t('répliques exactes (acte II et V)', S.actes[1].replique === 'Tu as beaucoup d’assurance pour quelqu’un qui n’a pas encore réussi à m’impressionner.' && S.actes[4].replique.startsWith('Une danse. Ensuite'));

// Contraintes de texte
t('mot interdit détecté (casse, accents)', M.motsInterditsTrouves('Tu étais MAGNIFIQUE', R.MOTS_INTERDITS_CABARET).includes('magnifique'));
t('pluriels et variantes détectés (beaux, belles, attirantes)', M.motsInterditsTrouves('de beaux gestes, des belles notes, attirantes', R.MOTS_INTERDITS_CABARET).length === 3);
t('pas de faux positif (« embellir », « beauté »)', M.motsInterditsTrouves('embellir la beauté du moment', R.MOTS_INTERDITS_CABARET).length === 0);
t('3 phrases acceptées, 4 refusées', M.nombrePhrases('Viens. Ce soir. Si tu veux.') === 3 && M.controlerTexte('Un. Deux. Trois. Quatre.', { maxPhrases: 3 }).length === 1);
t('points de suspension = une seule fin de phrase', M.nombrePhrases('Peut-être… ou pas.') === 2);

// Session
t('joueur seul : lancement refusé (minimum 2)', (a({ type: 'rejoindre', joueur: { id: 'h', pseudo: 'Hôtesse', role: 'hote' } }), a({ type: 'rejoindre', joueur: { id: 'j1', pseudo: 'Rubis', role: 'joueur' } }), !a({ type: 'lancer', par: 'h' }).ok));
a({ type: 'rejoindre', joueur: { id: 'j2', pseudo: 'Onyx', role: 'joueur' } });
a({ type: 'rejoindre', joueur: { id: 'j3', pseudo: 'Saphir', role: 'joueur' } });
t('pseudonyme en double refusé', !a({ type: 'rejoindre', joueur: { id: 'j9', pseudo: 'rubis', role: 'joueur' } }).ok);
t('un joueur ne peut pas lancer la session', !a({ type: 'lancer', par: 'j1' }).ok);
t('l’hôte lance : acte I', a({ type: 'lancer', par: 'h' }).ok && e.acteCourant === 'acte_1' && e.statut === 'en_cours');
t('acte I : personnage + pseudonyme + présentation', a({ type: 'repondre', par: 'j1', reponse: { personnage: 'p1', pseudo: 'Rubis', texte: 'Je débarque, bottes et sourire en coin.' } }).ok && e.joueurs.j1.personnage === 'p1');
t('acte I : personnage inconnu refusé', !a({ type: 'repondre', par: 'j2', reponse: { personnage: 'p99', pseudo: 'Onyx', texte: 'Présentation valable.' } }).ok);
a({ type: 'repondre', par: 'j2', reponse: { personnage: 'p2', pseudo: 'Onyx', texte: 'Mes intentions restent mystérieuses.' } });
t('passer une épreuve est toujours possible', a({ type: 'passer', par: 'j3' }).ok && e.reponses.acte_1.j3.passe === true);
t('indice envoyé par l’hôte, puis épuisé', a({ type: 'indice', par: 'h' }).ok && a({ type: 'indice', par: 'h' }).ok && !a({ type: 'indice', par: 'h' }).ok);
a({ type: 'acte_suivant', par: 'h' }, plus(600));
t('acte II en cours', e.acteCourant === 'acte_2');
t('réponse dans le temps acceptée', a({ type: 'repondre', par: 'j1', reponse: { texte: 'Patience : je garde le meilleur pour la fin.' } }, plus(700)).ok);
t('chronomètre : réponse hors délai refusée', !a({ type: 'repondre', par: 'j2', reponse: { texte: 'Trop tard ?' } }, plus(600 + 330)).ok);
// Pause et chronomètre
a({ type: 'pause', par: 'h' }, plus(720));
t('pendant la pause : réponses refusées', !a({ type: 'repondre', par: 'j3', reponse: { texte: 'En pause ?' } }, plus(730)).ok);
const resteAvant = M.secondesRestantes(S, e, plus(900));
a({ type: 'reprendre', par: 'h' }, plus(900));
t('le chronomètre est gelé pendant la pause', resteAvant === 180 && M.secondesRestantes(S, e, plus(900)) === 180);
// Sauvegarde / reprise après coupure
const sv = M.sauvegarder(e); const re = M.restaurer(sv, S);
t('reprise après coupure : même acte, réponses conservées, personne marqué présent', re.ok && re.etat.acteCourant === 'acte_2' && re.etat.reponses.acte_1.j1.texte && Object.values(re.etat.joueurs).every(x => !x.present));
e = re.etat;
t('reconnexion du joueur', a({ type: 'reconnexion', par: 'j1' }, plus(910)).ok && e.joueurs.j1.present);
t('sauvegarde d’un autre scénario refusée', !M.restaurer(sv, { ...S, id: 'autre' }).ok);
// Acte III : mots interdits
a({ type: 'acte_suivant', par: 'h' }, plus(1000));
t('acte III : « belle » refusé', !a({ type: 'repondre', par: 'j1', reponse: { texte: 'La personne, elle était belle.' } }, plus(1010)).ok);
t('acte III : réponse sans mot interdit acceptée', a({ type: 'repondre', par: 'j1', reponse: { texte: 'Le silence juste avant le dernier pas.' } }, plus(1010)).ok);
// Acte IV : objet + 3 phrases
a({ type: 'acte_suivant', par: 'h' }, plus(1300));
t('acte IV : 4 phrases refusées', !a({ type: 'repondre', par: 'j1', reponse: { choix: 'o5', texte: 'Une rose. Un lieu. Une heure. Viens.' } }, plus(1310)).ok);
t('acte IV : objet + 3 phrases acceptés', a({ type: 'repondre', par: 'j1', reponse: { choix: 'o5', texte: 'Une rose noire t’attend au vestiaire. Elle n’oblige à rien. Si tu la prends, je saurai.' } }, plus(1310)).ok);
t('carte d’événement tirée une seule fois', a({ type: 'evenement', par: 'h' }, plus(1320)).ok && !a({ type: 'evenement', par: 'h' }, plus(1321)).ok);
// Acte V : décision respectée + embranchement
a({ type: 'acte_suivant', par: 'h' }, plus(1600));
a({ type: 'repondre', par: 'j1', reponse: { choix: 'refuser' } }, plus(1610));
a({ type: 'repondre', par: 'j2', reponse: { choix: 'refuser', texte: 'Pas ce soir, mais merci.' } }, plus(1610));
a({ type: 'repondre', par: 'j3', reponse: { choix: 'accepter' } }, plus(1610));
t('refus = mêmes points qu’accepter (consentement)', (() => { const sc = M.scores(S, { ...e, reponses: { acte_5: e.reponses.acte_5 }, votes: {} }); const p = id => sc.find(x => x.joueur === id).points; return p('j1') === 10 && p('j3') === 10; })());
a({ type: 'acte_suivant', par: 'h' }, plus(1900));
t('embranchement : refus majoritaire → variante de l’acte VI', e.acteCourant === 'acte_6_refus' && e.parcours.join(',') === 'acte_1,acte_2,acte_3,acte_4,acte_5,acte_6_refus');
t('acte VI : réplique + réponse', a({ type: 'repondre', par: 'j2', reponse: { choix: 'r4', texte: 'Je suis le genre qui ne se range pas.' } }, plus(1910)).ok);
a({ type: 'acte_suivant', par: 'h' }, plus(2400));
t('fin des actes → phase de votes, fin alternative enregistrée', e.statut === 'votes' && e.fin === 'acte_6_refus');
// Votes
t('voter avant ouverture refusé', !a({ type: 'voter', par: 'j1', distinction: 'meilleure_repartie', cible: 'j2' }).ok);
a({ type: 'ouvrir_votes', par: 'h' });
t('vote valide', a({ type: 'voter', par: 'j1', distinction: 'meilleure_repartie', cible: 'j2' }).ok);
t('double vote refusé', !a({ type: 'voter', par: 'j1', distinction: 'meilleure_repartie', cible: 'j3' }).ok);
t('vote pour soi-même refusé', !a({ type: 'voter', par: 'j2', distinction: 'meilleure_repartie', cible: 'j2' }).ok);
t('vote pour un non-participant refusé', !a({ type: 'voter', par: 'j2', distinction: 'meilleure_repartie', cible: 'inconnu' }).ok);
t('l’hôte ne vote pas', !a({ type: 'voter', par: 'h', distinction: 'meilleure_repartie', cible: 'j2' }).ok);
t('distinction inconnue refusée', !a({ type: 'voter', par: 'j3', distinction: 'faux', cible: 'j2' }).ok);
a({ type: 'voter', par: 'j3', distinction: 'meilleure_repartie', cible: 'j2' });
a({ type: 'voter', par: 'j2', distinction: 'roi_reine_red_room', cible: 'j1' });
t('dépouillement', M.depouiller(e, 'meilleure_repartie').voix.j2 === 2 && M.depouiller(e, 'meilleure_repartie').gagnants[0] === 'j2');
t('titre attribuable seulement votes fermés', !a({ type: 'attribuer_titre', par: 'h', distinction: 'meilleure_repartie', joueur: 'j2' }).ok);
a({ type: 'fermer_votes', par: 'h' });
t('titre attribué', a({ type: 'attribuer_titre', par: 'h', distinction: 'meilleure_repartie', joueur: 'j2' }).ok && e.titres.meilleure_repartie[0] === 'j2');
// Modération et exclusion
t('modération : réponse masquée → 0 point pour cette réponse', (() => { const avant = M.scores(S, e).find(x => x.joueur === 'j1').points; a({ type: 'moderer', par: 'h', joueur: 'j1', acte: 'acte_3' }); return M.scores(S, e).find(x => x.joueur === 'j1').points === avant - 10; })());
t('exclusion sans motif refusée', !a({ type: 'exclure', par: 'h', joueur: 'j3', motif: ' ' }).ok);
t('exclusion : ses votes sont retirés', a({ type: 'exclure', par: 'h', joueur: 'j3', motif: 'Non-respect des règles' }).ok && M.depouiller(e, 'meilleure_repartie').voix.j2 === 1);
t('joueur exclu : toute action refusée, retour refusé', !a({ type: 'reconnexion', par: 'j3' }).ok && !a({ type: 'rejoindre', joueur: { id: 'j3', pseudo: 'Saphir2', role: 'joueur' } }).ok);
t('un hôte ne peut pas exclure la fondatrice', (a({ type: 'rejoindre', joueur: { id: 'f', pseudo: 'Fondatrice', role: 'fondatrice' } }), !a({ type: 'exclure', par: 'h', joueur: 'f', motif: 'x' }).ok));
t('fin de session', a({ type: 'terminer', par: 'h' }).ok && e.statut === 'terminee' && !a({ type: 'repondre', par: 'j1', reponse: { texte: 'encore' } }).ok);

// Atelier : import, duplication, publication
const md = `# Le secret du vestiaire\nUnivers : Wild Saloon · Intensité : 3 · Durée : 30-45 · Participants : 2-8\n- Pseudonymes uniquement\n## Acte I — Le comptoir\nSituation : Le barman pose un verre vide devant vous.\n> « Qu'est-ce que je vous sers, étranger ? »\nConsigne : Répondez en une phrase.\nPhrases max : 1\n## Acte II — La porte\nLa porte du fond grince.\n- Entrer\n- Rester au bar\n`;
const im = M.importerScenario(md, 'imp1');
t('import Markdown : titre, univers, intensité, 2 actes chaînés', im.ok && im.scenario.titre === 'Le secret du vestiaire' && im.scenario.univers === 'wild_saloon' && im.scenario.intensite === 3 && im.scenario.actes.length === 2 && im.scenario.actes[0].suivant === 'acte_2');
t('import Markdown : réplique, contrainte, options', im.ok && im.scenario.actes[0].replique === "Qu'est-ce que je vous sers, étranger ?" && im.scenario.actes[0].epreuve.contraintes.maxPhrases === 1 && im.scenario.actes[1].epreuve.options.length === 2);
t('import : toujours en brouillon', im.ok && im.scenario.statut === 'brouillon' && im.scenario.origine === 'import');
const js = M.importerScenario(JSON.stringify({ ...S, statut: 'publie', validePar: 'x' }), 'imp2');
t('import JSON : statut publié ignoré → brouillon, validation effacée', js.ok && js.scenario.statut === 'brouillon' && js.scenario.validePar === null);
t('import JSON illisible refusé', !M.importerScenario('{ pas du json', 'x').ok);
t('import avec renvoi vers un acte inconnu refusé', !M.importerScenario(JSON.stringify({ ...S, actes: [{ ...S.actes[0], suivant: 'nulle_part' }] }), 'x').ok);
const du = M.dupliquer(S, 'copie1');
t('duplication : nouvel id, brouillon, original intact', du.id === 'copie1' && du.statut === 'brouillon' && S.statut === 'en_revision' && du.actes.length === S.actes.length && du.actes !== S.actes);
t('publication sans validation humaine refusée', !M.publier(du, null).ok && M.publier(du, 'fondatrice').ok);

// Programme de la première session (Guyane)
const pg = R.programmeDate('2026-11-28', new Date('2026-11-28T18:20:00Z'));
t('15 h 00 Guyane = 18 h 00 UTC', pg.find(x => x.etape === 'Ouverture').debut === '2026-11-28T18:00:00.000Z');
t('9 étapes, annonce 14 h 45, votes 16 h 30', pg.length === 9 && pg[0].heure === '14:45' && pg[8].heure === '16:30');
t('étapes passées marquées « passée » (jamais présentées à venir)', pg.filter(x => x.passee).length === 4 && !pg[4].passee);
let erreur = ''; try { R.reprogrammer('2026-11-01', new Date('2026-11-24T12:00:00Z')); } catch (x) { erreur = x.message; }
t('reprogrammer vers une date passée refusé', /passée/.test(erreur));
t('annonce WhatsApp : texte à copier, mentions de consentement', /passer une épreuve/.test(R.texteAnnonce('samedi 28 novembre', 'https://exemple')));

// Nominations
const F = 'fondatrice-id', H = 'hote-id';
const fin = N.finMandat({ type: '7j' }, new Date('2026-11-24T00:00:00Z'));
t('mandat 7 jours', fin === '2026-12-01T00:00:00.000Z' && N.finMandat({ type: 'illimitee' }, new Date()) === null);
let er2 = ''; try { N.finMandat({ type: 'personnalisee' }, new Date()); } catch (x) { er2 = x.message; }
t('durée personnalisée sans date refusée', /date de fin/.test(er2));
t('un hôte ne peut pas proposer de nomination', N.controlerProposition({ userId: 'x', proposePar: H, fonctions: ['moderateur'], permissions: [], salles: ['*'] }, 'hote').length > 0);
t('permission interdite (lire les conversations privées) refusée', N.controlerProposition({ userId: H, proposePar: F, fonctions: ['hote_principal'], permissions: ['lire_conversations_privees'], salles: ['*'] }, 'fondatrice').some(x => /interdite/.test(x)));
t('auto-nomination refusée', N.controlerProposition({ userId: F, proposePar: F, fonctions: ['moderateur'], permissions: [], salles: ['*'] }, 'fondatrice').length > 0);
const nom = { id: 'n1', userId: H, fonctions: ['hote_titulaire', 'moderateur'], permissions: ['animer', 'lancer_actes', 'moderer_public'], salles: ['the_red_room'], debut: '2026-11-24T00:00:00Z', fin: '2026-11-25T00:00:00Z', statut: 'proposee', proposePar: F };
t('avant acceptation : aucune permission', !N.hotePeut([nom], H, 'animer', 'the_red_room', new Date('2026-11-24T12:00:00Z')));
t('un tiers ne peut pas accepter à sa place', !N.repondre(nom, 'autre', true).ok);
const acc = N.repondre(nom, H, true, new Date('2026-11-24T12:00:00Z'));
t('acceptation → permissions actives dans la salle attribuée', acc.ok && N.hotePeut([acc.nomination], H, 'lancer_actes', 'the_red_room', new Date('2026-11-24T12:00:00Z')));
t('hors de la salle attribuée : refusé', !N.hotePeut([acc.nomination], H, 'animer', 'golden_room', new Date('2026-11-24T12:00:00Z')));
t('permission non accordée : refusée', !N.hotePeut([acc.nomination], H, 'recompenser', 'the_red_room', new Date('2026-11-24T12:00:00Z')));
t('expiration automatique', N.statutEffectif(acc.nomination, new Date('2026-11-25T00:00:01Z')) === 'expiree' && !N.hotePeut([acc.nomination], H, 'animer', 'the_red_room', new Date('2026-11-25T01:00:00Z')));
t('répondre deux fois refusé', !N.repondre(acc.nomination, H, false).ok);
t('suspension : plus aucune permission', !N.hotePeut([{ ...acc.nomination, statut: 'suspendue' }], H, 'animer', 'the_red_room', new Date('2026-11-24T12:00:00Z')));
t('cumul de fonctions → deux badges (clé dorée + bouclier)', N.badgesActifs([acc.nomination], H, new Date('2026-11-24T12:00:00Z')).map(b => b.badge).join('') === '🔑🛡️');
t('« nommer_hotes » jamais accordé, même si présent', !N.hotePeut([{ ...acc.nomination, permissions: ['nommer_hotes'] }], H, 'nommer_hotes', 'the_red_room', new Date('2026-11-24T12:00:00Z')));
t('masque signature refusé à un membre', N.apparenceAutorisee({ masque: 'masque_red_mystery' }, false).length === 1);
t('masque signature autorisé à la fondatrice', N.apparenceAutorisee({ masque: 'masque_golden_secret' }, true).length === 0);
t('3 masques signature : Black Secret, Red Mystery, Golden Secret', N.MASQUES_SIGNATURE.map(m => m.nom).join('|') === 'Black Secret|Red Mystery|Golden Secret');
t('5 fonctions, badges conformes', N.FONCTIONS_HOTE.hote_principal.badge === '💎' && N.FONCTIONS_HOTE.hote_remplacant.libelleBadge === 'Clé argentée' && N.FONCTIONS_HOTE.moderateur.libelleBadge === 'Bouclier');

console.log(`RÉSULTAT : ${ok}/${n}`); if (ok !== n) process.exit(1);
