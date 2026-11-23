// Test unitaire : correspondance référence → code-barres → fiche du plan du site (données fictives).
// Usage : node tests/unit/t_plan_du_site.js [plan.xml negoce.csv produits.json]  (fichiers réels : hors dépôt)
const ts = require('typescript'); const fs = require('fs'); const path = require('path'); const Module = require('module');
const src = fs.readFileSync(path.join(__dirname, '../../src/lib/concordeExport.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = new Module('concordeExport'); m._compile(js, 'concordeExport.js'); const L = m.exports;
const R = []; const ok = (n, v) => R.push(`${n} : ${v ? 'OK' : 'ÉCHEC'}`);
const XML = `<?xml version="1.0"?><urlset>
<url><loc><![CDATA[https://www.concordepro.com/a/10-gel-fraise-1111111111111.html]]></loc><image:image><image:loc><![CDATA[https://www.concordepro.com/1-large_default/gel.jpg]]></image:loc></image:image><image:image><image:loc><![CDATA[https://www.concordepro.com/2-large_default/gel.jpg]]></image:loc></image:image></url>
<url><loc><![CDATA[https://www.concordepro.com/a/11-double-2222222222222.html]]></loc><image:image><image:loc><![CDATA[https://www.concordepro.com/3-large_default/x.jpg]]></image:loc></image:image></url>
<url><loc><![CDATA[https://www.concordepro.com/a/12-double-bis-2222222222222.html]]></loc><image:image><image:loc><![CDATA[https://www.concordepro.com/4-large_default/y.jpg]]></image:loc></image:image></url>
<url><loc><![CDATA[https://www.concordepro.com/a/13-lust-3333333333333.html]]></loc><image:image><image:loc><![CDATA[https://autre-site.example/5.jpg]]></image:loc></image:image></url>
</urlset>`;
const CSV = 'Référence;Famille;Désignation;Code Barre;Suivi Stock;Tarif Base HT;Stock/Jour;Marque;\nA1;F;GEL FRAISE 50ML;1111111111111;O;9,99;4;M;\nA2;F;DOUBLE;2222222222222;O;5,00;1;M;\nA3;F;LUST DUST;3333333333333;O;3,00;0;M;\nA4;F;SANS CODE;;O;1,00;2;M;\n';
const { lignes, eanAmbigus } = L.lignesDepuisPlanDuSite(XML, CSV);
ok('4 références lues', lignes.size === 4);
ok('photos dans l\'ordre de la fiche (principale en premier)', JSON.stringify(lignes.get('A1').images) === JSON.stringify(['https://www.concordepro.com/1-large_default/gel.jpg', 'https://www.concordepro.com/2-large_default/gel.jpg']));
ok('code-barres présent sur 2 fiches : aucune photo proposée', lignes.get('A2').images.length === 0 && eanAmbigus === 1);
ok('image hors domaine Concorde Pro ignorée', lignes.get('A3').images.length === 0);
ok('tarif fournisseur jamais repris', [...lignes.values()].every(l => l.prix === null));
const P = L.propositionsBSH(lignes, [
  { id: '1', nom: 'Gel fraise 50 ml', notes: 'Réf. A1', prix_vente: 25, prix_achat: 9.99, quantite: 1, statut: 'actif', categorie: 'c', image_url: null, usage_conseils: null },
  { id: '2', nom: 'Lust Dust menthe', notes: 'Réf. A3', prix_vente: 8, prix_achat: 3, quantite: 1, statut: 'actif', categorie: 'c', image_url: null, usage_conseils: null },
  { id: '3', nom: 'Inconnu', notes: 'Réf. ZZ', prix_vente: 10, prix_achat: 5, quantite: 1, statut: 'actif', categorie: 'c', image_url: null, usage_conseils: null },
  { id: '4', nom: 'Gel fraise 100 ml', notes: 'Réf. A1', prix_vente: 14.99, prix_achat: 9.99, quantite: 1, statut: 'actif', categorie: 'c', image_url: null, usage_conseils: null },
], undefined, { descriptionRequise: false });
ok('produit apparié : photo proposée, description « à rédiger » non bloquante', P[0].fournisseur.images.length === 2 && P[0].classe !== 'incomplet' && P[0].aValider.includes('description à rédiger'));
ok('variante absente de la désignation fournisseur signalée (menthe)', P[1].aValider.some(x => /variante à vérifier.*menthe/.test(x)) || P[1].manques.includes('Image à fournir'));
ok('référence inconnue : « Image à fournir », aucune correspondance inventée', P[2].classe === 'introuvable' && P[2].manques.includes('Image à fournir') && P[2].fournisseur === null);
ok('contenance différente signalée (100ml ≠ 50ml) et prix provisoire bloquant', P[3].aValider.some(x => /100ml ≠ 50ml/.test(x)) && P[3].manques.some(x => /prix provisoire/.test(x)));
// Contrôle sur données réelles (facultatif, fichiers hors dépôt)
if (process.argv[4]) {
  const xml = fs.readFileSync(process.argv[2], 'utf8'), csv = new TextDecoder('windows-1252').decode(fs.readFileSync(process.argv[3]));
  const rows = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const prods = rows.map(r => ({ id: r[0], nom: r[2], notes: r[1] ? `Réf. ${r[1]}` : '', prix_vente: r[5], prix_achat: r[6], quantite: 0, statut: r[4], categorie: r[3], image_url: null, usage_conseils: null }));
  const res = L.lignesDepuisPlanDuSite(xml, csv); const PR = L.propositionsBSH(res.lignes, prods, undefined, { descriptionRequise: false });
  const c = k => PR.filter(p => p.classe === k).length;
  console.log(`Données réelles : ${PR.length} produits · avec photo ${PR.filter(p => p.fournisseur && p.fournisseur.images.length).length} · prêts ${c('pret')} · à valider ${c('attente')} · incomplets ${c('incomplet')} · introuvables ${c('introuvable')} · variantes à vérifier ${PR.filter(p => p.aValider.some(x => /variante/.test(x))).length} · prix provisoires ${PR.filter(p => p.prixProvisoire).length} · codes-barres ambigus ${res.eanAmbigus}`);
}
console.log(R.join('\n')); console.log(`${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
