// BSH Secret World (phase 1) : salles, projection isométrique, collisions, chemins, joystick, apparence — règles pures.
// Usage : node tests/unit/t_bsh_monde.js
const path = require('path'); const ts = require('typescript'); const fs = require('fs');
const charger = rel => { const src = fs.readFileSync(path.join(__dirname, '../../src/modules', rel), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, require); return m.exports; };
const W = charger('bshMonde/monde.ts');
let ok = 0, n = 0; const t = (nom, v) => { n++; if (v) ok++; else console.log('ÉCHEC', nom); };
const H = W.SALLES.grand_hall, R = W.SALLES.the_red_room;

t('phase 1 : Grand Hall et Red Room disponibles', H.disponible && R.disponible && Object.keys(W.SALLES).length === 2);
t('7 salles prévues sur la carte, marquées « à venir »', W.SALLES_PREVUES.length === 7 && W.SALLES_PREVUES.every(s => s.phase >= 3));
t('salles cohérentes (départ libre, portes, arrivées, sièges)', W.controlerSalle(H).length === 0 && W.controlerSalle(R).length === 0);
t('portes aller-retour Grand Hall ⇄ Red Room', H.portes.some(p => p.vers === 'the_red_room') && R.portes.some(p => p.vers === 'grand_hall'));
t('le seul autre personnage est un PNJ (aucun faux joueur)', H.pnj.length === 1 && R.pnj.length === 0);
// Projection
const o = { x: 300, y: 100 };
const e = W.versEcran(3, 5, o, 1); const c = W.versCase(e.x, e.y, o, 1);
t('projection isométrique réversible', Math.abs(c.x - 3) < 1e-9 && Math.abs(c.y - 5) < 1e-9);
t('projection avec zoom réversible', (() => { const p = W.versEcran(7.25, 2.5, o, 0.7); const q = W.versCase(p.x, p.y, o, 0.7); return Math.abs(q.x - 7.25) < 1e-9 && Math.abs(q.y - 2.5) < 1e-9; })());
// Collisions
t('comptoir d’accueil bloquant', W.bloquee(H, 5.5, 5.5) && W.obstacleEn(H, 6.2, 6.9).nom === 'Accueil');
t('hors limites bloqué', W.bloquee(H, -0.1, 3) && W.bloquee(H, 12, 3) && W.bloquee(H, 3, 12.01));
t('PNJ bloquant (on ne marche pas à travers)', W.bloquee(H, 7.5, 7.5));
// Chemins
const ch = W.chemin(H, { x: 4, y: 5 }, { x: 8, y: 5 });
t('chemin contourne le comptoir', ch.length > 0 && ch.every(p => !W.bloquee(H, p.x, p.y)) && ch[ch.length - 1].x === 8);
t('chemin sans couper les angles', ch.every((p, i) => { const prev = i ? ch[i - 1] : { x: 4, y: 5 }; const dx = p.x - prev.x, dy = p.y - prev.y; return !(dx && dy) || (!W.bloquee(H, prev.x + dx, prev.y) && !W.bloquee(H, prev.x, prev.y + dy)); }));
t('destination bloquée → aucun chemin', W.chemin(H, { x: 4, y: 5 }, { x: 5, y: 5 }).length === 0);
t('chemin vers la porte de la Red Room', (() => { const c2 = W.chemin(H, H.depart, { x: 11, y: 5 }); return c2.length > 0 && W.porteEn(H, c2[c2.length - 1].x + 0.5, c2[c2.length - 1].y + 0.5).vers === 'the_red_room'; })());
// Déplacement continu
const p1 = W.deplacer(H, { x: 4.5, y: 5.5 }, 0.5, 0);
t('obstacle : pas de traversée du comptoir', p1.x === 4.5 && p1.y === 5.5);
const p2 = W.deplacer(H, { x: 3.5, y: 3.5 }, 0.2, 0.2);
t('déplacement libre en diagonale', Math.abs(p2.x - 3.7) < 1e-9 && Math.abs(p2.y - 3.7) < 1e-9);
const p3 = W.deplacer(H, { x: 4.5, y: 5.5 }, 0.3, 0.2);
t('glissement le long d’un obstacle (x bloqué, y libre)', p3.x === 4.5 && Math.abs(p3.y - 5.7) < 1e-9);
const p4 = W.deplacer(H, { x: 0.35, y: 3.5 }, -0.2, 0);
t('mur : on ne sort pas de la salle', p4.x === 0.35);
const a = W.avancer({ x: 0.5, y: 0.5 }, { x: 2, y: 0 }, 3, 0.1);
t('avancer vers la case cible', Math.abs(a.x - 0.8) < 1e-9 && !a.atteint && W.avancer({ x: 2.45, y: 0.5 }, { x: 2, y: 0 }, 3, 0.1).atteint);
// Joystick
const jh = W.joystickVersGrille(0, -1), jb = W.joystickVersGrille(0, 1), jd = W.joystickVersGrille(1, 0);
t('joystick vers le haut = vers le fond (x et y diminuent)', jh.dx < 0 && jh.dy < 0);
t('joystick vers le bas = vers l’avant', jb.dx > 0 && jb.dy > 0);
t('joystick à droite = x augmente, y diminue', jd.dx > 0 && jd.dy < 0);
t('zone morte du joystick', W.joystickVersGrille(0.05, 0.05).dx === 0);
const ecran = W.versEcran(jd.dx, jd.dy, { x: 0, y: 0 }, 1);
t('joystick : la direction à l’écran correspond au geste', ecran.x > 0 && Math.abs(ecran.y) < 1e-9);
// Sièges, piste
t('fauteuil proche détecté pour s’asseoir', !!W.siegeProche(R, 1.6, 7.1) && W.siegeProche(R, 5, 5) === null);
t('piste de danse de la Red Room', W.surPiste(R, 5, 4) && !W.surPiste(R, 1, 1));
// Apparence
const ap = W.normaliserApparence({ pseudo: '  <Rubis>  ', coiffure: 'afro', masque: 'masque_red_mystery', carnation: '#000000' });
t('apparence : valeur inconnue → défaut ; balises retirées du pseudo', ap.coiffure === 'afro' && ap.carnation === W.APPARENCE_DEFAUT.carnation && ap.pseudo === 'Rubis');
t('masque signature retiré pour un membre', ap.masque === 'aucun');
t('masque signature conservé pour la fondatrice', W.normaliserApparence({ masque: 'masque_red_mystery' }, ['masque_red_mystery']).masque === 'masque_red_mystery');
t('choix d’avatar : 13 catégories (morphologie à expression)', Object.keys(W.CHOIX_AVATAR).length === 13 && W.CHOIX_AVATAR.carnation.length === 6);

console.log(`RÉSULTAT : ${ok}/${n}`); if (ok !== n) process.exit(1);
