// Répertoire central et permissions par pôle — règles pures. Personnes fictives uniquement.
// Usage : node tests/unit/t_repertoire.js
const path = require('path'); const ts = require('typescript'); const fs = require('fs');
const src = fs.readFileSync(path.join(__dirname, '../../src/modules/repertoire/repertoire.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, require); const Rp = m.exports;
let ok = 0, n = 0; const t = (nom, v) => { n++; if (v) ok++; else console.log('ÉCHEC', nom); };
const C = [
  { id: 'a-000001', compte: true, prenom: 'Lina', nom: 'TESTEUR', email: 'lina.testeur@exemple.invalid', telephone: '+594 694 12 34 56', categories: ['hotes'], poles: ['VILDOR'] },
  { id: 'b-000001', compte: true, prenom: 'Marie', nom: 'Dupont', email: null, categories: ['clients'], poles: [] },
  { id: 'b-000002', compte: true, prenom: 'Marie', nom: 'DUPONT', entreprise: 'Atelier Rose', categories: ['clients'], poles: [] },
  { id: 'c-000001', compte: false, prenom: 'Hélène', nom: 'Éléonore', entreprise: 'Fournil du Sud', email: 'contact@fournil.invalid', categories: ['fournisseurs'], poles: ['FOOD'] },
];
t('recherche par prénom (insensible à la casse)', Rp.rechercher(C, 'lin').map(c => c.id).join() === 'a-000001');
t('recherche par nom', Rp.rechercher(C, 'testeur').length === 1);
t('recherche par e-mail partiel', Rp.rechercher(C, 'lina.tes').length === 1 && Rp.rechercher(C, 'fournil.inv').length === 1);
t('recherche sans accents (« helene eleonore »)', Rp.rechercher(C, 'helene eleonore').length === 1);
t('recherche par téléphone (chiffres partiels)', Rp.rechercher(C, '1234 56').length === 1);
t('recherche par entreprise', Rp.rechercher(C, 'atelier rose').length === 1);
t('nom complet en tête de liste', Rp.rechercher(C, 'marie dupont').length === 2);
t('filtre par catégorie et comptes seulement', Rp.rechercher(C, '', { categorie: 'fournisseurs' }).length === 1 && Rp.rechercher(C, '', { comptesSeulement: true }).length === 3);
t('liste complète sans saisie', Rp.rechercher(C, '').length === 4);
const h = Rp.homonymes(C);
t('homonymes détectés (2 Marie Dupont)', h.has('b-000001') && h.has('b-000002') && !h.has('a-000001'));
t('homonymes distingués (entreprise ou référence)', Rp.libelleContact(C[1], true) !== Rp.libelleContact(C[2], true) && /Atelier Rose/.test(Rp.libelleContact(C[2], true)));
t('e-mail masqué', Rp.emailMasque('lina.testeur@exemple.invalid') === 'l••••@exemple.invalid');
// Doublons et fusion
const d = Rp.detecterDoublons([...C, { id: 'x', compte: false, prenom: 'L', nom: 'T', email: 'LINA.TESTEUR@exemple.invalid', categories: [], poles: [] }, { id: 'y', compte: false, prenom: 'Z', nom: 'Z', telephone: '0694123456', categories: [], poles: [] }]);
t('doublon par e-mail (casse ignorée)', d.some(x => x.a === 'a-000001' && x.b === 'x' && x.raison === 'email'));
t('doublon par téléphone (+594 / 0694)', d.some(x => x.b === 'y' && x.raison === 'telephone'));
const f = Rp.fusionner(C[1], { ...C[2], email: 'm@exemple.invalid', categories: ['prospects'] });
t('fusion contrôlée : champs vides complétés, catégories additionnées', f.id === 'b-000001' && f.entreprise === 'Atelier Rose' && f.categories.join() === 'clients,prospects');
// CSV / VCF
const csv = Rp.versCSV(C);
const relu = Rp.depuisCSV(csv);
t('CSV aller-retour (4 fiches, catégories conservées)', relu.contacts.length === 4 && relu.contacts[3].categories[0] === 'fournisseurs' && relu.contacts[0].email === 'lina.testeur@exemple.invalid');
const csv2 = Rp.depuisCSV('Prénom,Nom,E-mail,Société\nAnna,Martin,anna@exemple.invalid,"Martin, fils & Cie"\n,,,\nBob,,pas-un-email,');
t('CSV séparateur virgule, guillemets, ligne vide ignorée, e-mail invalide vidé (numéro de ligne exact)', csv2.contacts.length === 2 && csv2.contacts[0].entreprise === 'Martin, fils & Cie' && csv2.contacts[1].email === null && csv2.erreurs.length === 1 && /Ligne 4/.test(csv2.erreurs[0]));
t('CSV sans colonnes reconnues refusé', Rp.depuisCSV('a;b\n1;2').contacts.length === 0);
const vcf = Rp.versVCF(C.slice(0, 1));
const v = Rp.depuisVCF(vcf);
t('VCF aller-retour', v.length === 1 && v[0].prenom === 'Lina' && v[0].nom === 'TESTEUR' && v[0].email === 'lina.testeur@exemple.invalid');
t('VCF importé = contact externe (aucun compte créé)', v[0].compte === false);
// Affectations : plan d'écriture
const base = [{ id: 'r1', role: 'hote', organisation_id: 'ORG', statut: 'actif' }, { id: 'r2', role: 'assistante', organisation_id: 'ORG', statut: 'actif' }, { id: 'r3', role: 'collaborateur', organisation_id: 'ORG', statut: 'revoque' }];
const p1 = Rp.planAffectations(base, [{ role: 'hote', organisation_id: 'ORG', statut: 'suspendu' }, { role: 'assistante', organisation_id: 'ORG', statut: 'actif' }]);
t('suspension : une seule modification, rien d’autre', p1.modifier.length === 1 && p1.modifier[0].id === 'r1' && !p1.ajouter.length && !p1.retirer.length);
const p2 = Rp.planAffectations(base, [{ role: 'hote', organisation_id: 'ORG', statut: 'actif' }]);
t('retrait d’une fonction : statut révoqué (pas de suppression), autres conservées', p2.retirer.join() === 'r2' && !p2.modifier.length);
const p3 = Rp.planAffectations(base, [...base.slice(0, 2), { role: 'collaborateur', organisation_id: 'ORG', statut: 'actif' }]);
t('rétablir une fonction révoquée : réactivation, aucun doublon', !p3.ajouter.length && p3.modifier.length === 1 && p3.modifier[0].id === 'r3');
const p4 = Rp.planAffectations(base, [...base.slice(0, 2), { role: 'assistante', organisation_id: null, statut: 'actif' }, { role: 'assistante', organisation_id: null, statut: 'actif' }]);
t('second pôle : un seul ajout même si saisi deux fois', p4.ajouter.length === 1 && p4.ajouter[0].organisation_id === null);
// Permissions
const pp = Rp.planPermissions([{ id: 'p1', permission: 'food.consulter', univers: 'FOOD' }], ['food.commandes']);
t('permissions : ajout avec le bon univers, retrait par identifiant', pp.accorder[0].univers === 'FOOD' && pp.retirer.join() === 'p1');
const md = Rp.appliquerModele(['bsh.membres_emails'], 'assistant_commercial');
t('modèle : ajoute sans retirer une autorisation d’un autre pôle', md.permissions.includes('bsh.membres_emails') && md.ajoutees.includes('food.commandes'));
t('aucun modèle n’accorde d’autorisation critique', Rp.MODELES.every(x => Rp.appliquerModele([], x.id).permissions.every(c => Rp.PERMISSIONS.find(p => p.code === c).sensibilite !== 'critique')));
t('finances, coûts, marges, coordonnées et crédits IA : autorisations critiques distinctes', ['food.revente.marges', 'paiements.creer_lien', 'ia.utiliser', 'bsh.membres_emails', 'acces_complet'].every(c => Rp.PERMISSIONS.find(p => p.code === c).sensibilite === 'critique'));
t('missions.gerer signalée comme transversale (tous les pôles)', /TOUS LES PÔLES/.test(Rp.PERMISSIONS.find(p => p.code === 'missions.gerer').portee));
t('14 catégories initiales, 9 pôles', Rp.CATEGORIES_INITIALES.length === 14 && Rp.POLES.length === 9);
console.log(`RÉSULTAT : ${ok}/${n}`); if (ok !== n) process.exit(1);
