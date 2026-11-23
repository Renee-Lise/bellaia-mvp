// Moteur du jeu de cartes Mo Ti-Péyi. Usage : node tests/unit/t_motipy_jeu.js
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/lib/motipyJeu.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new M('j'); m._compile(js, 'j.js'); const { DEFIS, executer, solutionMinimale, compterCartes, premiereCarteFautive } = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
const D = id => DEFIS.find(d => d.id === id); const F = d => ({ t: 'fleche', d }); const A = { t: 'avancer' }, G = { t: 'gauche' }, Dr = { t: 'droite' };
ok('01 12 défis, 3 par niveau (PS, MS, GS, CP)', DEFIS.length === 12 && ['PS', 'MS', 'GS', 'CP'].every(n => DEFIS.filter(d => d.niveau === n).length === 3));
for (const d of DEFIS.filter(d => !d.cartes.includes('repeter'))) {
  const s = solutionMinimale(d);
  ok(`02 ${d.id} faisable dans la limite (${s ? compterCartes(s) : '—'} ≤ ${d.maxCartes} cartes)`, !!s && compterCartes(s) <= d.maxCartes && executer(d, s).statut === 'reussi');
}
ok('03 cp-2 : la boucle fait le tour de la mare en 6 cartes', executer(D('cp-2'), [{ t: 'repeter', n: 2, corps: [{ t: 'repeter', n: 4, corps: [A] }, Dr] }, { t: 'repeter', n: 4, corps: [A] }]).statut === 'reussi');
ok('04 cp-2 : sans boucle, la limite de 9 cartes empêche de réussir', (() => { const s = solutionMinimale({ ...D('cp-2'), maxCartes: 99 }); return s && compterCartes(s) > 9; })());
ok('05 cp-3 : « répéter 7 × si obstacle → tourner, sinon avancer » réussit', executer(D('cp-3'), [{ t: 'repeter', n: 7, corps: [{ t: 'si_obstacle', alors: [Dr], sinon: [A] }] }]).statut === 'reussi');
const g3 = D('gs-3');
ok('06 débogage gs-3 : le programme donné échoue, carte fautive n° 2', executer(g3, g3.debogage).statut !== 'reussi' && premiereCarteFautive(g3, g3.debogage) === 1);
ok('07 débogage gs-3 : remplacer UNE carte suffit', executer(g3, g3.debogage.map((c, i) => i === 1 ? F('S') : c)).statut === 'reussi');
ok('08 sortie du plateau détectée', executer(D('ps-1'), [F('N')]).statut === 'hors_plateau');
ok('09 obstacle détecté (le tronc)', executer(D('ms-1'), [F('E')]).statut === 'obstacle');
ok('10 programme trop long refusé avant exécution', executer(D('ps-1'), [F('E'), F('E'), F('E'), F('O'), F('E')]).statut === 'trop_long');
ok('11 fruit oublié : « fruits manquants »', executer(D('ms-2'), [F('E'), F('E'), F('E'), F('S'), F('S'), F('S')]).statut === 'fruits_manquants');
ok('12 un fruit ramassé deux fois ne compte qu\'une fois', executer({ ...D('ms-2'), fruits: [{ x: 2, y: 0 }, { x: 3, y: 0 }], maxCartes: 20 }, [F('E'), F('E'), { t: 'ramasser' }, { t: 'ramasser' }, F('E'), F('S'), F('S'), F('S')]).statut === 'fruits_manquants');
ok('13 boucle sans fin arrêtée (garde-fou)', executer({ ...D('cp-1'), maxCartes: 99 }, [{ t: 'repeter', n: 10, corps: [{ t: 'repeter', n: 10, corps: [{ t: 'repeter', n: 10, corps: [G] }] }] }]).statut === 'trop_long');
ok('14 trace : une étape par mouvement (animation)', executer(D('ps-1'), [F('E'), F('E'), F('E')]).trace.length === 4);
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
