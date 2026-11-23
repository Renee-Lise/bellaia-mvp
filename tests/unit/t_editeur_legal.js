// Mise en forme de l'identité de l'éditeur (données FICTIVES). Usage : node tests/unit/t_editeur_legal.js
const ts = require('typescript'), fs = require('fs'), path = require('path'), M = require('module');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/modules/legal/editeur.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new M('e'); m._compile(js, 'e.js'); const { formaterEditeur: f, siretValide } = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
const luhn = b => { for (let d = 0; d < 10; d++) if (siretValide(b + d)) return b + d; };
const SIRET = luhn('1234567890001');
ok('01 contrôle de SIRET (clé de Luhn)', siretValide(SIRET) && !siretValide('12345678900011') && !siretValide('123'));
const e = f({ raison_sociale: 'Studio Fictif', forme_juridique: 'EI', siret: SIRET, adresse: '1 rue Exemple, Bâtiment A Apparemment 2', code_postal: '97300', ville: 'Ville', pays: 'Guyane française', telephone: '0600000000', email: 'contact@exemple.invalid', rcs_rm: 'RCS', mention_tva: null, tva_defaut: 0 });
const val = l => e.champs.find(c => c.libelle === l).valeur;
ok('02 champs saisis repris tels quels (aucune invention)', val('Dénomination') === 'Studio Fictif' && val('SIRET') === SIRET && val('E-mail') === 'contact@exemple.invalid' && val('TVA') === null);
ok('03 faute de frappe « Apparemment » signalée', e.aValider.some(a => /Apparemment/.test(a)));
ok('04 immatriculation « RCS » seule signalée incomplète', e.aValider.some(a => /Immatriculation incomplète/.test(a)));
ok('05 TVA à 0 % sans mention : renvoi au comptable (art. 293 B), pas de mention inventée', e.aValider.some(a => /293 B/.test(a)) && val('TVA') === null);
ok('06 médiateur toujours signalé obligatoire', e.aValider.some(a => /Médiateur/.test(a)));
ok('07 EI : rappel nom et prénom + « EI »', e.aValider.some(a => /Entrepreneur individuel/.test(a)));
ok('08 SIRET à clé correcte : vérification au registre à confirmer (pas affirmée)', e.aValider.some(a => /à confirmer/.test(a) && /SIRET/.test(a)));
ok('09 fiche absente : aucun champ, consigne de compléter', f(null).champs.length === 0 && /introuvable/.test(f(null).aValider[0]));
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
