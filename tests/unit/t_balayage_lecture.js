// Gestes de lecture (sens français). Usage : node tests/unit/t_balayage_lecture.js
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/lib/balayageLecture.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new M('b'); m._compile(js, 'b.js'); const { sensBalayage: s } = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
ok('01 droite → gauche = page suivante', s({ departX: 300, dx: -120, dy: 5 }) === 'suivante');
ok('02 gauche → droite = page précédente', s({ departX: 100, dx: 120, dy: 5 }) === 'precedente');
ok('03 geste trop court ignoré', s({ departX: 300, dx: -30, dy: 0 }) === null);
ok('04 défilement vertical ignoré', s({ departX: 300, dx: -80, dy: 120 }) === null);
ok('05 geste plus vertical qu\'horizontal ignoré', s({ departX: 300, dx: -70, dy: 45 }) === 'suivante' && s({ departX: 300, dx: -61, dy: 49 }) === 'suivante' && s({ departX: 300, dx: -40, dy: 45 }) === null);
ok('06 pendant un zoom : aucun changement de page', s({ departX: 300, dx: -150, dy: 0, echelle: 2 }) === null);
ok('07 à deux doigts : aucun changement de page', s({ departX: 300, dx: -150, dy: 0, doigts: 2 }) === null);
ok('08 depuis le bord gauche : laissé au retour de l\'application', s({ departX: 10, dx: 150, dy: 0 }) === null);
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
