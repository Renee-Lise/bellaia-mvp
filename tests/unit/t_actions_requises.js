// Règle de comptage des actions requises (correction du « 50 » permanent). Usage : node tests/unit/t_actions_requises.js
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/lib/actionsRequises.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new M('ar'); m._compile(js, 'ar.js'); const { compterActions, aTraiter } = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
// Répartition réelle relevée en production le 23/11 : 60 à faire (12 en priorité 1, 1 échue), 3 en cours dont la ligne du registre, 13 faites
const L = [];
for (let i = 0; i < 60; i++) L.push({ statut: 'a_faire', cle: 'a' + i, priorite: i < 12 ? 1 : 2, date_limite: i === 0 ? '2026-11-21' : null });
L.push({ statut: 'en_cours', cle: 'x1', priorite: 2 }, { statut: 'en_cours', cle: 'x2', priorite: 2 }, { statut: 'en_cours', cle: 'suivi_exigences', priorite: 1 });
for (let i = 0; i < 13; i++) L.push({ statut: 'fait', cle: 'f' + i, priorite: 1 });
const c = compterActions(L, new Date('2026-11-23T12:00:00Z'));
ok('60 à traiter (et non 50 plafonnées)', c.aTraiter === 60);
ok('2 en cours, la ligne technique du registre exclue', c.enCours === 2);
ok('12 urgentes', c.urgentes === 12);
ok('1 échue', c.echues === 1);
ok('les 13 faites ne comptent pas', c.ouvertes === 62);
ok('une action annulée disparaît du compteur', compterActions([{ statut: 'annule', cle: 'z' }]).ouvertes === 0);
ok('aucun plafond : 500 actions → 500', compterActions(Array.from({ length: 500 }, (_, i) => ({ statut: 'a_faire', cle: 'k' + i }))).aTraiter === 500);
ok('le filtre de liste garde uniquement les actions à traiter', L.filter(aTraiter).length === 60);
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
