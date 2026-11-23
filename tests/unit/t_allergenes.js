// Moteur allergènes Bella'Food : cas obligatoires de la directive. Usage : node tests/unit/t_allergenes.js
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/lib/allergenes.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new M('al'); m._compile(js, 'al.js'); const A = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
const src = ref => ({ type: 'fiche_technique', reference: ref });
const doc = (nom, presents = [], extra = {}) => ({ nom, source: src('FT-' + nom), allergenesVerifies: Object.fromEntries(A.ALLERGENES.map(a => [a.code, presents.includes(a.code) ? 'present' : 'absent'])), ...extra });
const st = (an, code) => an.allergenes.find(r => r.code === code).statut;

// 1. Recette contenant du lait (documentée)
let a = A.analyserRecette([doc('Lait entier', ['lait']), doc('Sucre')]);
ok('01 lait documenté → « confirmé », recette complète', st(a, 'lait') === 'confirme' && a.complete && a.aVerifier.length === 0);
// 2. Recette contenant des œufs
a = A.analyserRecette([doc('Œufs frais', ['oeufs']), doc('Farine de riz')]);
ok('02 œufs documentés → « confirmé » ; farine de riz sans gluten (fiche) → absent vérifié', st(a, 'oeufs') === 'confirme' && st(a, 'gluten') === 'absent_verifie');
// 3. Produit composé contenant du gluten (base non détaillée, puis détaillée)
a = A.analyserRecette([{ nom: 'Pâte brisée maison', compose: true }, doc('Beurre', ['lait'])]);
ok('03a ingrédient composé non documenté → gluten « à vérifier » (jamais absent)', st(a, 'gluten') === 'a_verifier' && !a.complete);
a = A.analyserRecette([{ nom: 'Pâte brisée maison', compose: true, sousIngredients: [doc('Farine de blé T55', ['gluten']), doc('Beurre', ['lait'])] }]);
ok('03b composé détaillé → gluten et lait « confirmés » à travers la sous-recette', st(a, 'gluten') === 'confirme' && st(a, 'lait') === 'confirme' && a.complete);
// 4. Sauce contenant de la moutarde (non documentée)
a = A.analyserRecette([{ nom: 'Sauce moutarde-miel', compose: true }, doc('Poulet')]);
ok('04 sauce à la moutarde sans fiche → moutarde « à vérifier » (suspicion, pas confirmation)', st(a, 'moutarde') === 'a_verifier' && !a.presents.includes('moutarde') && a.allergenes.find(r => r.code === 'moutarde').raisons.some(x => /non vérifié/.test(x)));
// 5. Substitution d'un ingrédient
const recette = [{ ...doc('Lait de vache', ['lait']), substituable: [{ option: 'amande', par: doc('Boisson végétale amande', ['fruits_coque']) }] }, doc('Mangue')];
const base = A.analyserRecette(recette), sub = A.analyserRecette(recette, { substitutions: ['amande'] });
ok('05 substitution lait → amande : lait retiré, fruits à coque confirmé', st(base, 'lait') === 'confirme' && st(sub, 'lait') === 'absent_verifie' && st(sub, 'fruits_coque') === 'confirme');
// 6. Ingrédient sans fiche fournisseur
a = A.analyserRecette([doc('Mangue'), { nom: 'Sirop de canne' }]);
ok('06 ingrédient sans fiche → tous les allergènes « à vérifier », jamais « sans allergène »', a.aVerifier.length === 14 && a.mentionSansAllergene === false && a.ingredientsNonDocumentes.includes('Sirop de canne'));
// 7. Modification d'une recette déjà publiée → réévaluation
const fiche = (an) => ({ analyse: an, allergenesValidesParFondatrice: true, prixValide: true, prix: 5, portionOuContenance: '33 cl', description: 'Jus frais', familles: ['jus'] });
const avant = A.decisionPublication(fiche(A.analyserRecette([doc('Orange')])), ['jus']);
const apres = A.decisionPublication(fiche(A.analyserRecette([doc('Orange'), { nom: 'Nouveau sirop maison' }])), ['jus']);
ok('07 recette publiée modifiée (ingrédient non documenté ajouté) → n\'est plus publiable', avant.publiable && avant.automatique && !apres.publiable);
// 8. Contamination croisée non documentée
a = A.analyserRecette([doc('Orange')]);
ok('08 traces non évaluées → avertissement client explicite', /contamination croisée non évalué/.test(A.texteAllergenesClient(a, false)) && !/contamination/.test(A.texteAllergenesClient(a, true)));
const tr = A.analyserRecette([{ ...doc('Chocolat'), allergenesVerifies: { ...doc('x').allergenesVerifies, fruits_coque: 'traces' } }]);
ok('08b traces documentées affichées séparément de la composition', tr.allergenes.find(r => r.code === 'fruits_coque').traces && st(tr, 'fruits_coque') === 'absent_verifie' && /Traces possibles : Fruits à coque/.test(A.texteAllergenesClient(tr, true)));
// 9. Boisson sans sucre ajouté (variante sans le sucre)
a = A.analyserRecette([doc('Jus de goyave'), { ...doc('Sucre de canne'), substituable: [{ option: 'sans_sucre', par: doc('Eau') }] }], { substitutions: ['sans_sucre'] });
ok('09 boisson sans sucre ajouté : analyse complète sur la variante choisie', a.complete && a.presents.length === 0 && /Aucun des 14 allergènes réglementaires dans les ingrédients documentés/.test(A.texteAllergenesClient(a, true)));
// 10. Produit sans prix validé
const sansPrix = A.decisionPublication({ ...fiche(A.analyserRecette([doc('Orange')])), prixValide: false, prix: null }, ['jus']);
ok('10 produit sans prix validé → non publiable, motif indiqué', !sansPrix.publiable && sansPrix.blocages.includes('Prix non validé'));
// Règles complémentaires
ok('11 recette vide → rien n\'est affirmé', A.analyserRecette([]).aVerifier.length === 14 && !A.analyserRecette([]).complete);
ok('12 publication automatique seulement pour une famille autorisée', !A.decisionPublication(fiche(A.analyserRecette([doc('Orange')])), ['smoothies']).automatique);
ok('13 publication refusée si fiche allergènes non validée par la fondatrice', A.decisionPublication({ ...fiche(A.analyserRecette([doc('Orange')])), allergenesValidesParFondatrice: false }, ['jus']).blocages.some(x => /non validée/.test(x)));
ok('14 classification : milkshake (slug « boisson ») → famille milkshakes ; plusieurs familles possibles', A.classerFamilles({ nom: 'Milkshake vanille', categorie_slug: 'boisson' }).join() === 'milkshakes' && A.classerFamilles({ nom: 'Bûche de Noël', categorie_slug: 'patisserie' }).length === 2);
ok('15 « noix de coco » n\'est pas un fruit à coque ; « beurre de cacahuète » = arachide, pas lait', st(A.analyserRecette([{ nom: 'Noix de coco râpée' }]), 'fruits_coque') === 'a_verifier' && !A.analyserRecette([{ nom: 'Noix de coco râpée' }]).allergenes.find(r => r.code === 'fruits_coque').raisons.some(x => /évoque/.test(x)) && A.analyserRecette([{ nom: 'Beurre de cacahuète' }]).allergenes.find(r => r.code === 'lait').raisons.every(x => !/évoque/.test(x)));
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
