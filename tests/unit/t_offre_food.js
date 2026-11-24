// Bella'Food (24/11) : offre du jour, contrôle serveur, tarifs, conformité — règles pures.
// Usage : node tests/unit/t_offre_food.js
const path = require('path'); const ts = require('typescript'); const fs = require('fs');
const charger = (rel, deps = {}) => { const src = fs.readFileSync(path.join(__dirname, '../../src/modules/food', rel), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, x => deps[x] || require(x)); return m.exports; };
const H = charger('hierarchieCatalogue.ts'); const O = charger('offreFood.ts', { './hierarchieCatalogue': H });
let ok = 0, n = 0; const t = (nom, v) => { n++; if (v) ok++; else console.log('ÉCHEC', nom); };
const P = [
  { id: 'a', nom: 'Barquette poulet boucané (frites nature)', prix: 8, statut: 'actif', categorie_slug: 'street_food', allergenes: ['gluten'] },
  { id: 'b', nom: 'Soupe créole', prix: 13, statut: 'actif', categorie_slug: 'soupe', allergenes: ['céleri'] },
  { id: 'c', nom: 'Crêpe Jambon + Fromage', prix: 3, statut: 'actif', categorie_slug: 'crepe', allergenes: ['gluten'] },
  { id: 'd', nom: 'Jus de gingembre', prix: 3, statut: 'actif', categorie_slug: 'jus', allergenes: [] },
  { id: 'e', nom: 'Brouillon', prix: 2, statut: 'brouillon', categorie_slug: 'jus', allergenes: ['x'] },
];
// Dates
t('date Cayenne : 02 h UTC le 25 → encore le 24 en Guyane', O.dateCayenne(new Date('2026-11-25T02:00:00Z')) === '2026-11-24');
// Sélection par cases à cocher
let it = O.basculerPlat([], P[0], true); it = O.basculerPlat(it, P[1], true);
t('cocher deux produits → 2 plats du jour', it.length === 2 && it.every(i => i.type === 'plat'));
t('décocher → retiré', O.basculerPlat(it, P[1], false).length === 1);
t('cocher deux fois le même → pas de doublon', O.basculerPlat(it, P[0], true).length === 2);
t('sélection collective (catégorie entière) puis désélection', O.basculerPlusieurs([], P.slice(0, 2), true).length === 2 && O.basculerPlusieurs(it, P.slice(0, 2), false).length === 0);
// Menu : activer un produit dans un menu ne le publie pas seul
const menu = { cle: O.cleMenu('Ensemble à 7 €'), type: 'menu', nom: 'Ensemble à 7 €', prix: 7, composition: [{ produit_id: 'a', nom: P[0].nom }, { produit_id: 'd', nom: P[3].nom }] };
const offre = [O.basculerPlat([], P[1], true)[0], menu];
t('produit inclus dans un menu mais non coché : NON commandable seul', O.controlerLigne(offre, { produitId: 'a', qte: 1 }).ok === false);
t('le menu est commandable, au prix du menu', (() => { const d = O.controlerLigne(offre, { cleMenu: menu.cle, qte: 1 }); return d.ok && d.prix === 7; })());
t('produit non sélectionné → refusé côté serveur', O.controlerLigne(offre, { produitId: 'c', qte: 1 }).ok === false);
t('produit sélectionné → accepté', O.controlerLigne(offre, { produitId: 'b', qte: 2 }).ok === true);
t('quantité limitée : dépassement refusé', O.controlerLigne([{ ...offre[0], quantite: 3 }], { produitId: 'b', qte: 2 }, 2).ok === false);
// Visibilité
const J = [{ date: '2026-11-24', statut: 'publie', items: offre }, { date: '2026-11-25', statut: 'publie', items: [offre[0]] }, { date: '2026-11-24', statut: 'brouillon', items: [O.basculerPlat([], P[2], true)[0]] }];
t('cliente : seule la journée publiée du jour (2 éléments)', O.offreVisible(J, '2026-11-24').length === 2);
t('offre expirée (date passée) : rien', O.offreVisible(J, '2026-11-26').length === 0);
t('brouillon jamais visible', !O.offreVisible(J, '2026-11-24').some(i => i.produit_id === 'c'));
t('ancien élément en texte libre : ignoré (non commandable)', O.offreVisible([{ date: '2026-11-24', statut: 'publie', items: [{ nom: 'Plat libre', prix: 9 }] }], '2026-11-24').length === 0);
// Duplication et programmation
const dup = O.dupliquerJournee(J[0], '2026-11-30');
t('duplication : nouvelle date, en brouillon, mêmes éléments', dup.date === '2026-11-30' && dup.statut === 'brouillon' && dup.items.length === 2 && dup.items[0] !== J[0].items[0]);
// Contrôles avant publication
t('offre vide : bloquante', O.controlerOffre([], P).some(a => a.bloquant));
t('produit non actif : bloquant', O.controlerOffre(O.basculerPlat([], P[4], true), P).some(a => a.bloquant));
t('produit au porc : bloquant', O.controlerOffre(O.basculerPlat([], P[2], true), P).some(a => a.bloquant && /porc/.test(a.message)));
t('allergènes absents : signalés (le serveur refusera)', O.controlerOffre(O.basculerPlat([], P[3], true), P).some(a => /allergènes/.test(a.message)));
t('menu d\'un seul élément : bloquant', O.controlerOffre([{ ...menu, composition: [menu.composition[0]] }], P).some(a => a.bloquant && /2 éléments/.test(a.message)));
t('offre conforme : aucune anomalie bloquante', !O.controlerOffre(O.basculerPlat([], P[1], true), P).some(a => a.bloquant));
// Sauces
t('sauce associée acceptée, autre refusée', O.controlerSauce({ metadata: { sauces: ['Sauce chien'] } }, 'Sauce chien').ok && !O.controlerSauce({ metadata: { sauces: ['Sauce chien'] } }, 'Caramel').ok);
// Tarifs
const g = O.GRILLE_24_11;
t('grille : poulet boucané frites classiques 8 → 6,50', g.find(x => x.nom === 'Barquette poulet boucané (frites nature)').propose === 6.5);
t('grille : frites-merguez 6, brochette 2,50', g.find(x => x.nom === 'Barquette de frites nature + merguez').propose === 6 && g.find(x => x.nom === 'Brochette de poulet').propose === 2.5);
t('grille : portions 3 / 4 / 5', ['Sans supplément', 'Moyenne portion', 'Grande portion'].map(v => g.find(x => x.variante === v).propose).join() === '3,4,5');
t('grille : frites maison conservées en variante distincte (9 €)', g.find(x => x.nom === 'Barquette poulet boucané (frites maison)').propose === 9);
t('grille : riz nature 2,50 (pas 10 €)', g.find(x => /Riz nature/.test(x.nom)).propose === 2.5);
t('grille : box mini-bokits sans prix inventé', g.find(x => /mini-bokits/.test(x.nom)).propose === null);
t('variantes porc absentes de la grille (jambon de volaille, saucisse volaille/bœuf)', !g.some(x => /jambon-fromage$|^Saucisse fumée$/.test(x.nom)));
t('estimation provisoire clairement signalée (jus 3 €)', (() => { const e = O.estimationProvisoire({ nom: 'Jus de goyave', categorie_slug: 'jus' }); return e.propose === 3 && e.source === 'estimation_provisoire' && /PROVISOIRE/.test(e.justification); })());
t('pas d\'estimation inventée pour une marinade', O.estimationProvisoire({ nom: 'Marinade créole', categorie_slug: 'sauce' }) === null);
t('calcul indicatif : coût 2+0,3+(6 min à 15 €/h)=3,80 ; marge 40 % → 6,33 ; arrondi 6,50', (() => { const r = O.tarifIndicatif({ ingredients: 2, conditionnement: 0.3, minutes: 6, tauxHoraire: 15, marge: 0.4 }); return r.cout === 3.8 && r.prix === 6.33 && r.prixArrondi === 6.5; })());
t('calcul indicatif : données absentes → aucun prix', O.tarifIndicatif({ ingredients: NaN, conditionnement: 0, minutes: 0, tauxHoraire: 0, marge: 0.3 }) === null);
t('prix confirmé : jamais écrasé', O.patchTarif({ prix: 9, metadata: { prix: { statut: 'confirme' } } }, 6, 'grille_fondatrice').ok === false);
t('application : historique conservé, statut validé fondatrice', (() => { const r = O.patchTarif({ prix: 8, metadata: { x: 1 } }, 6.5, 'grille_fondatrice', 'T'); return r.ok && r.patch.prix === 6.5 && r.patch.metadata.x === 1 && r.patch.metadata.prix.historique[0].prix === 8 && r.patch.metadata.prix.statut === 'valide_fondatrice'; })());
t('estimation appliquée : statut provisoire', O.patchTarif({ prix: null }, 3, 'estimation_provisoire').patch.metadata.prix.statut === 'provisoire');
// Conformité
const cands = O.aMasquer([{ id: 'c', nom: 'Crêpe Lardon + Fromage + Béchamel', visible_client: true }, { id: 'f', nom: 'Punch Coco', visible_client: true }, { id: 'g', nom: 'Soupe créole', visible_client: true }]);
t('à masquer : lardons et punch, pas la soupe', cands.map(c => c.id).join() === 'c,f');
const pm = O.patchMasquage({ id: 'c', nom: 'x', visible_client: true, disponible: true, statut: 'actif', metadata: { a: 1 } }, 'porc', 'T');
t('masquage réversible : invisible, état précédent mémorisé, rien supprimé', pm.visible_client === false && pm.metadata.masquage.avant.visible_client === true && pm.metadata.a === 1);
const re = O.patchRetablissement({ id: 'c', nom: 'x', metadata: pm.metadata });
t('rétablissement : visibilité restaurée, trace conservée', re.visible_client === true && !re.metadata.masquage && re.metadata.masquages_passes.length === 1);
t('déjà masqué : non reproposé', O.aMasquer([{ id: 'c', nom: 'Crêpe Lardon', metadata: pm.metadata }]).length === 0);
const v = O.ligneVariante(O.VARIANTES_COMPATIBLES[0]);
t('variante compatible : brouillon, invisible, à vérifier, classée', v.statut === 'brouillon' && v.visible_client === false && v.disponible === false && v.metadata.a_verifier.length > 0 && v.metadata.hierarchie.categorie === 'restauration_rapide');
t('variantes compatibles : aucune alerte porc/alcool', O.VARIANTES_COMPATIBLES.every(x => H.alertes({ nom: x.nom }).length === 0));
t('cocktails sans alcool : sans prix inventé', O.VARIANTES_COMPATIBLES.filter(x => /sans alcool/.test(x.nom)).every(x => x.prix === null));
console.log(`${ok}/${n}`);
