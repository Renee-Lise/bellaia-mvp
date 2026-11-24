// Atelier papeterie (24/11) : patrons originaux, fond perdu, zone de sécurité, page imprimeur — géométrie pure.
// Usage : node tests/unit/t_patrons_originaux.js
const path = require('path'); const ts = require('typescript'); const fs = require('fs');
const charger = (rel, deps = {}) => { const src = fs.readFileSync(path.join(__dirname, '../../src/modules/events', rel), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} }; new Function('module', 'exports', 'require', 'process', js)(m, m.exports, x => deps[x] || require(x), { env: {} }); return m.exports; };
const L = charger('eventsAtelierLib.ts'); const O = charger('patronsOriginaux.ts');
let ok = 0, n = 0; const t = (nom, v) => { n++; if (v) ok++; else console.log('ÉCHEC', nom); };
const boite = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
const dansPage = g => g.contenu.reperes.traits.every(tr => tr.points.every(([x, y]) => x >= 0 && y >= 0 && x <= g.largeur_mm + 0.01 && y <= g.hauteur_mm + 0.01));
const tous = O.PATRONS_ORIGINAUX.map(o => o.creer(Object.fromEntries(o.champs.map(([k, , d]) => [k, d]))));
t('7 patrons originaux générés', tous.length === 7);
t('chaque patron : une coupe fermée, des dimensions positives, tous les traits dans la page', tous.every(g => g.largeur_mm > 0 && g.hauteur_mm > 0 && g.contenu.reperes.traits.some(x => x.type === 'coupe' && x.ferme) && dansPage(g)));
t('chaque patron : zones de décor nommées, marqué « original »', tous.every(g => g.contenu.calques.some(c => c.zone === 'PRENOM') && g.contenu.parametres.original === true));
const sac = O.patronSacCadeau({ largeur: 100, soufflet: 60, hauteur: 140 });
const bs = boite(sac.contenu.reperes.traits[0].points);
t('sac cadeau 100×60×140 : développé 2×100 + 2×60 = 320 mm + colle 12', Math.abs((bs.x1 - bs.x0) - 332) < 0.01);
t('sac cadeau : hauteur = revers 30 + 140 + fond (0,6×60+5 = 41) = 211 mm', Math.abs((bs.y1 - bs.y0) - 211) < 0.01);
t('sac cadeau : plis verticaux des 4 panneaux + soufflets + fond', sac.contenu.reperes.traits.filter(x => x.type === 'pli').length >= 10);
t('sac cadeau : décor sur les 2 grandes faces uniquement (2 prénoms)', sac.contenu.calques.filter(c => c.zone === 'PRENOM').length === 2);
const cube = O.patronBoiteCube({ cote: 70 }); const bc = boite(cube.contenu.reperes.traits[0].points);
t('boîte cube 70 : 4 faces + colle en largeur (292 mm), 3 faces + 2 languettes en hauteur (252 mm)', Math.abs((bc.x1 - bc.x0) - 292) < 0.01 && Math.abs((bc.y1 - bc.y0) - 252) < 0.01);
t('boîte cube : tient sur A3, pas sur A4 (signalé par la taille du patron)', cube.largeur_mm > 210 && cube.largeur_mm <= 420);
const tube = O.patronTube({ diametre: 75, hauteur: 230, couvercle: true });
t('tube Ø75 : habillage = π×75 + 8 = 243,6 mm ; couvercle rond ajouté', Math.abs(tube.contenu.parametres.perimetre_mm - 235.6) < 0.1 && Math.abs(boite(tube.contenu.reperes.traits[0].points).x1 - boite(tube.contenu.reperes.traits[0].points).x0 - 243.6) < 0.1 && tube.contenu.reperes.traits.filter(x => x.type === 'coupe').length === 2);
t('canette 33 cl : Ø66 par défaut', O.patronCanette().type_support === 'canette' && /Ø66/.test(O.patronCanette().nom));
const tag = O.patronEtiquetteCadeau({ largeur: 50, hauteur: 80 });
t('étiquette cadeau : trou de passage (2ᵉ coupe circulaire de Ø5)', (() => { const tr = tag.contenu.reperes.traits[1]; const b = boite(tr.points); return tr.type === 'coupe' && Math.abs((b.x1 - b.x0) - 5) < 0.2; })());
const fan = O.patronFanion({ largeur: 140, hauteur: 180 });
t('fanion : languette repliée (pli + repère de pliage)', fan.contenu.reperes.traits.some(x => x.type === 'pli') && fan.contenu.reperes.pliage.length === 1);
// Fond perdu
const img = { id: 'i', type: 'image', x: 0, y: 0, w: 100, h: 50, image: { url: 'u' } };
const e = L.etendreAuDebord(img, 100, 150, 3);
t('fond perdu : une image pleine largeur touchant le bord haut est prolongée de 3 mm (x −3, largeur 106)', e.x === -3 && e.y === -3 && e.w === 106 && e.h === 53);
t('fond perdu : un élément intérieur n\'est pas modifié', JSON.stringify(L.etendreAuDebord({ ...img, x: 10, y: 10, w: 20, h: 20 }, 100, 150, 3)) === JSON.stringify({ ...img, x: 10, y: 10, w: 20, h: 20 }));
t('fond perdu : élément tourné jamais déformé', L.etendreAuDebord({ ...img, rotation: 15 }, 100, 150, 3).w === 100);
// Zone de sécurité
const doc = { fond: '#fff', calques: [{ id: 'a', type: 'texte', x: 1, y: 10, w: 50, h: 10, texte: { contenu: 'Trop près' } }, { id: 'b', type: 'texte', x: 10, y: 10, w: 50, h: 10, texte: { contenu: 'OK' } }, { id: 'c', type: 'forme', x: 0, y: 0, w: 100, h: 150 }], reperes: { zone_sure_mm: 3 } };
t('zone de sécurité : texte à 1 mm du bord signalé, texte correct et fond ignorés', L.horsZoneSure(doc, 100, 150).map(x => x.id).join() === 'a');
// Page imprimeur
const pg = L.pageImprimeur(100, 150, 3);
t('page imprimeur : format fini + 2×(3 mm de fond perdu + 10 mm de marge) = 126 × 176 mm', pg.largeurMm === 126 && pg.hauteurMm === 176 && pg.decalage === 13);
console.log(`${ok}/${n}`);
