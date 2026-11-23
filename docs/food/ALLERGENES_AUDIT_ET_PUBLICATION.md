# Bella'Food — Allergènes : audit, moteur de classification, publication contrôlée (23/11/2026)

## 1. Audit des fiches existantes (base de production, lecture seule)

| Mesure | Nombre |
|---|---|
| Produits Bella'Food | 148 (dont 23 boissons en brouillon créées le 23/11) |
| En vente (actif et visible) | 116 |
| **Réellement commandables** (règle actuelle : fiche allergènes validée ou allergènes renseignés sans mention « à vérifier ») | **4** — Gratin de bananes plantains, Dombrés aux crevettes, Bananes plantains frites (fiche validée), Beignets de crevettes |
| Sans recette liée | 2 |
| Recette liée **sans aucun ingrédient** | 93 |
| Avec ingrédients | 53 (dont 16 avec toutes les quantités) |
| Allergènes renseignés (produit ou recette) | 15 |
| Fiches allergènes validées par la fondatrice | 2 |
| Avec variantes ou options (substitutions) | 18 |
| Contenant un ingrédient composé (sauce, base, pâte, crème, sirop, mix…) | 19 |
| Valeurs ambiguës (« à vérifier », « selon composition »…) | 6 |
| **Ingrédients documentés par une fiche technique ou une étiquette** | **0 sur 220** |
| Sans prix | 29 |

Contrôle de l'affichage : les allergènes vus par la cliente proviennent de la fusion produit + recette (`food_allergenes_produits`) — vérifié sur les 4 produits commandables (ex. « Beignets de crevettes » : crustacés, gluten, œufs, lait si choisi).

**Conséquence** : aucune fiche ne peut aujourd'hui atteindre le statut « absent selon composition vérifiée », car aucun ingrédient n'a de source vérifiée. Le chantier principal est la **documentation des ingrédients** (fiches techniques fournisseurs, étiquettes), pas l'algorithme.

## 2. Moteur (`src/lib/allergenes.ts`, sans migration) — testé 17/17
- 14 allergènes de l'annexe II du règlement (UE) n° 1169/2011.
- Trois statuts par allergène : **confirmé** (source vérifiée) · **absent selon composition vérifiée** (tous les ingrédients documentés, y compris ceux des ingrédients composés) · **à vérifier** (sinon).
- Les synonymes et dénominations (ex. « crème », « chapelure », « tahini », « ouassou », « lambi ») ne produisent qu'une **suspicion « à vérifier »**, jamais une confirmation ; exclusions gérées (« noix de coco » ≠ fruit à coque ; « beurre de cacahuète » = arachide, pas lait ; farines de riz, maïs, manioc…).
- Ingrédients composés analysés récursivement ; substitutions (lait végétal, sans sucre ajouté) recalculées ; **contamination croisée (traces) séparée** de la composition.
- Jamais « sans allergènes » par absence de détection : le texte client indique « Aucun des 14 allergènes réglementaires dans les ingrédients documentés » seulement si tout est documenté, et ajoute « Risque de contamination croisée non évalué » tant que les traces ne sont pas documentées.

Cas testés (`tests/unit/t_allergenes.js`) : recette au lait ; aux œufs ; produit composé avec gluten (non détaillé puis détaillé) ; sauce à la moutarde ; substitution ; ingrédient sans fiche ; recette publiée modifiée ; contamination croisée non documentée et documentée ; boisson sans sucre ajouté ; produit sans prix validé ; recette vide ; publication automatique limitée aux familles autorisées ; fiche non validée ; classification ; faux amis.

## 3. Règles de classification
Familles : plats et accompagnements · menus enfants · desserts · pâtisseries · jus locaux · thés glacés · milkshakes · smoothies · autres boissons · produits saisonniers · prestations traiteur. Attribution par la catégorie existante (`categorie_slug`, 148/148 classables automatiquement), complétée par le nom et les étiquettes (enfant, saison/fêtes) ; une fiche peut avoir plusieurs familles ; la fondatrice peut corriger.
Correction proposée : les 5 milkshakes en vente sont classés « boisson » → famille « milkshakes ».

## 4. Publication contrôlée
Publiable seulement si : recette complète et ingrédients documentés · aucun allergène « à vérifier » · fiche allergènes validée par la fondatrice · prix validé · portion ou contenance · description commerciale. **Publication automatique** uniquement pour les familles que la fondatrice a autorisées. Toute modification d'ingrédient, de fournisseur ou de composition rend la fiche non publiable jusqu'à nouvelle validation. La disponibilité dépend en plus des règles de stock et de capacité (règle de disponibilité commune).

**Fiches prêtes à publier selon ces règles : 0** (aucun ingrédient documenté). Les 4 produits commandables restent commandables selon la règle actuelle (en production) ; le passage à la règle stricte est une décision de la fondatrice.

## 5. Migrations nécessaires (à autoriser, après sauvegarde)
1. `food_ingredients` (référentiel : nom, fournisseur, fiche technique privée, 14 états + traces, source, date, vérifié par) — relié aux achats/stocks (`stock_global`).
2. Lien recette → ingrédients référencés (au lieu du texte libre) et sous-recettes (sauces, bases).
3. `food_allergenes_fiches` : statut par allergène (confirmé / absent vérifié / à vérifier) et sources (la table existe déjà avec `etats`, `sources`, `historique` → extension, pas de nouvelle table).
4. Réglage « publication automatique » par famille + journal des publications.
5. Déclencheur de réévaluation à toute modification de recette ou d'ingrédient (passage automatique « à valider »).

## 6. Plan de publication
1. Documenter les ingrédients des produits les plus vendus (fiches fournisseurs, étiquettes photographiées) ;
2. Analyse automatique + validation par la fondatrice (pas de validation groupée d'allergènes incertains) ;
3. Publication famille par famille ;
4. Tableau de contrôle fondatrice : analysés, complets, confirmés, à vérifier, prêts, publiés, bloqués (motifs).
