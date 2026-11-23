// Tests unitaires de l'atelier GS Mo Ti-Péyi : corrigés calculés depuis les mêmes données,
// lettres répétées, constellations, suites, bandes numériques, reproductibilité.
// Usage : node tests/unit/t_atelier_gs.js
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const racine = path.join(__dirname, '../../src/modules/motipy/atelierGS/'); const cache = {};
function charger(nom) {
  if (cache[nom]) return cache[nom].exports;
  const js = ts.transpileModule(fs.readFileSync(path.join(racine, nom + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = new M(nom); cache[nom] = m; m.require = r => (r.startsWith('./') ? charger(r.slice(2)) : require(r)); m._compile(js, nom + '.js'); return m.exports;
}
const Mo = charger('modeles'), F = charger('fonteTrait'), R = charger('rendu'), Ref = charger('references');
const res = []; const ok = (n, v) => res.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
// Éléments gris de la réponse (hors en-tête : lignes « Prénom » et « Date » à y = 19 mm, et pied de page en texte)
const gris = (page, k) => page.prims.filter(p => p.gris && p.k !== 'texte' && !(p.k === 'chemin' && / 19 L/.test(p.d)) && (!k || p.k === k));
const D = m => Mo.parDefaut(m, 12345);

// 1. Lettres répétées (exemple de la consigne : BANANE = 2 A et 2 N ; ANANAS = 3 A et 2 N)
ok('BANANE : A×2, N×2, B×1, E×1', JSON.stringify(Mo.compterLettres('BANANE')) === JSON.stringify({ B: 1, A: 2, N: 2, E: 1 }));
ok('ANANAS : A×3, N×2, S×1', JSON.stringify(Mo.compterLettres('ANANAS')) === JSON.stringify({ A: 3, N: 2, S: 1 }));
for (const mot of ['BANANE', 'ANANAS', 'ÉLÉPHANT', 'COCHON']) {
  const r = Mo.generer({ ...D('mots'), mots: mot, mode: 'retrouver' });
  const cercles = gris(r.corrige, 'cercle').length;
  ok(`retrouver « ${mot} » : corrigé = ${mot.length} lettres entourées, aucune erreur`, cercles === mot.length && r.erreurs.length === 0);
}
{ const r = Mo.generer({ ...D('mots'), mots: 'BANANE', mode: 'recopier' }); ok('recopier « BANANE » : 6 cases (lettres répétées conservées)', r.eleve.prims.filter(p => p.k === 'rect').length === 6); }
{ const r = Mo.generer({ ...D('mots'), mots: 'ANANAS', mode: 'reordonner' }); const v = r.verifications[0]; ok('remettre en ordre « ANANAS » : 6 cases et lettres réellement mélangées', r.eleve.prims.filter(p => p.k === 'rect').length === 6 && !/lettres mélangées A N A N A S →/.test(v)); }
{ const r = Mo.generer({ ...D('mots'), mots: 'LÉA, NOÉ, ZOÉ, LÉO', mode: 'retrouver' }); ok('retrouver : plus de 3 mots refusé (lisibilité A4)', r.erreurs.some(e => /3 mots maximum/.test(e))); }
{ const r = Mo.generer({ ...D('mots'), mots: 'MAÑANA', mode: 'recopier' }); ok('caractère non disponible en tracé refusé', r.erreurs.some(e => /non disponible/.test(e))); }
{ const r = Mo.generer({ ...D('mots'), mots: 'SOLEIL', mode: 'repasser', ecriture: 'script' }); ok('repasser en script : proposé en capitales seulement, signalé', r.verifications.some(v => /capitales uniquement/.test(v)) && r.corrige === null); }

// 2. Constellations de dé
ok('constellations 1 à 6 : nombre de points exact', [1, 2, 3, 4, 5, 6].every(n => Mo.CONSTELLATIONS[n].length === n));
{ const r = Mo.generer({ ...D('denombrement'), quantites: [3, 1, 5, 2, 4, 6], ronds: 6 }); const pts = r.eleve.prims.filter(p => p.k === 'cercle' && p.rempli === 'noir' && p.r < 3).length; const col = r.corrige.prims.filter(p => p.k === 'cercle' && p.rempli === 'gris').length;
  ok('dénombrement : 21 points dessinés et 21 ronds coloriés dans le corrigé (3+1+5+2+4+6)', pts === 21 && col === 21 && r.erreurs.length === 0); }

// 3. Suites logiques
for (const st of ['AB', 'AAB', 'ABB', 'ABC', 'AABB']) {
  const r = Mo.generer({ ...D('suites'), structures: [st], lignes: 1, visibles: 2, aCompleter: 3, formes: ['rond', 'carre', 'triangle'] });
  const per = Mo.STRUCTURES[st].length; const m = (r.verifications[0] || '').match(/— (\d+) formes visibles/); const vis = m ? Number(m[1]) : 0;
  const aComp = Number((r.verifications[0] || '').match(/, (\d+) à compléter/)[1]);
  ok(`suite ${st} : au moins 2 motifs complets visibles (${vis} formes), corrigé = ${gris(r.corrige).length} formes pour ${aComp} cases`, vis >= 2 * per && gris(r.corrige).length === aComp && aComp >= 1);
}
{ // Le corrigé prolonge la même suite : on reconstruit la suite attendue depuis la vérification
  const r = Mo.generer({ ...D('suites'), structures: ['ABC'], lignes: 1, visibles: 6, aCompleter: 3, formes: ['rond', 'carre', 'triangle'] });
  const v = r.verifications[0]; const formes = v.match(/\(([^)]+)\)/)[1].split(', '); const attendu = [0, 1, 2].map(k => formes[(6 + k) % 3]).join(', ');
  ok('suite ABC : les 3 formes du corrigé prolongent exactement la suite', v.endsWith(`à compléter : ${attendu}.`));
}
ok('suites : moins de 2 formes refusé', Mo.generer({ ...D('suites'), formes: ['rond'] }).erreurs.length > 0);

// 4. Lettres : capitales ↔ script
{ const r = Mo.generer({ ...D('lettres'), lettres: 'AEIOUY' }); const lignes = gris(r.corrige, 'chemin').length; const ordre = r.verifications[0].match(/mélangé \(([^)]+)\)/)[1].split(' ');
  ok('relier : 6 traits de corrigé, aucune lettre face à sa correspondance', lignes === 6 && ordre.every((l, i) => l !== 'aeiouy'[i])); }
{ const r = Mo.generer({ ...D('lettres'), mode: 'entourer', cible: 'E', difficulte: 3 }); const n = gris(r.corrige, 'cercle').length;
  ok('entourer E (difficile) : 7 cercles = 7 occurrences annoncées', n === 7 && /présente 7 fois/.test(r.verifications[0])); }

// 5. Bande numérique
{ const r = Mo.generer({ ...D('numeration'), fin: 5, lignes: 5, trous: 2 }); const trous = r.eleve.prims.filter(p => p.k === 'cercle').length; const chiffresCorriges = new Set(gris(r.corrige, 'trait').map(p => `${p.x}-${p.y}`)).size;
  ok('bande 1-5 : 10 ronds vides et 10 nombres dans le corrigé', trous === 10 && chiffresCorriges === 10); }
{ let toujours1 = true; for (let g = 1; g < 60; g++) { const r = Mo.generer({ ...D('numeration'), difficulte: 1, graine: g, trous: 2 }); if (r.verifications.some(v => /manquants (1,|1 )/.test(v) || /manquants 1 \(/.test(v))) toujours1 = false; } ok('niveau facile : le 1 reste toujours visible (60 essais)', toujours1); }
{ const r = Mo.generer({ ...D('numeration'), mode: 'repasser', fin: 5 }); ok('chiffres à repasser : corrigé non nécessaire', r.corrige === null && r.erreurs.length === 0); }

// 6. Graphisme, reproductibilité, rendu
ok('graphisme : corrigé non nécessaire', Mo.generer(D('graphisme')).corrige === null);
ok('graphisme dessin : corrigé non nécessaire', Mo.generer({ ...D('graphisme'), dessin: true }).corrige === null);
ok('même graine = même fiche (reproductible pour réédition)', JSON.stringify(Mo.generer(D('mots'))) === JSON.stringify(Mo.generer(D('mots'))));
ok('graine différente = autre variante', JSON.stringify(Mo.generer(D('lettres')).eleve) !== JSON.stringify(Mo.generer({ ...D('lettres'), graine: 999 }).eleve));
ok('6 modèles de démonstration sans erreur', Mo.MODELES.every(m => Mo.generer(Mo.parDefaut(m.id)).erreurs.length === 0));
ok('toutes les formes restent dans la page A4 (marges)', Mo.MODELES.every(m => Mo.generer(Mo.parDefaut(m.id)).eleve.prims.every(p => p.k !== 'cercle' || (p.cx - p.r >= 8 && p.cx + p.r <= 202 && p.cy + p.r <= 290))));
ok('aperçu SVG A4 (viewBox 210×297)', R.pageEnSvg(Mo.generer(D('suites')).eleve).includes('viewBox="0 0 210 297"'));
ok('police trait : 26 capitales, 10 chiffres et accents disponibles', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÉÈÊËÀÂÎÏÔÙÛÇ'.split('').every(F.disponible));
ok('index des références : 12 pages, empreintes uniques', Ref.REFERENCES_GS.length === 12 && new Set(Ref.REFERENCES_GS.map(r => r.sha256)).size === 12 && Ref.REFERENCES_GS.every((r, i) => r.page === i + 1));
console.log(res.join('\n')); console.log(`${res.filter(x => x.endsWith('OK')).length}/${res.length}`);
