# Bella'Food — Régularisation progressive des recettes et des ingrédients (23/11/2026)

Règle absolue : **aucune composition, aucun grammage, aucun allergène n'est inventé**. Une information n'entre dans la fiche que si elle vient d'une recette réelle fournie par la fondatrice, d'une étiquette photographiée ou d'une fiche technique du fournisseur. Tant qu'un allergène nécessaire n'est pas vérifié, le produit reste **non commandable** (blocage serveur déjà en place) et n'est pas publié.

## Point de départ — 116 produits en vente (lecture de la base, 23/11)
| Palier | Produits | Prix | Allergènes renseignés | Portion / rendement | Travail restant |
|---|---|---|---|---|---|
| **A. Ingrédients et quantités complets** | 10 (crêpes et lots de crêpes) | 10 | 0 | 0 | Étiquettes / fiches des ingrédients composés, portion, validation |
| **B. Ingrédients sans toutes les quantités** | 11 (dont les 4 actuellement commandables) | 8 | 4 | 0 | Quantités, étiquettes, portion, validation |
| **C. Recette vide** | 93 | 93 | 0 | 0 | Recette réelle à fournir |
| **D. Sans recette liée** | 2 | 0 | 0 | 0 | Créer ou relier la recette |
Les 23 boissons créées le 23/11 restent en brouillon et suivent le même parcours.

## Vagues (dans cet ordre)
1. **Vague 1 — palier A (10 crêpes)** : pour chaque ingrédient composé ou acheté (pâte à tartiner, jambon, fromage, lardons, chantilly, béchamel maison…), photographier l'**étiquette** (liste des ingrédients et mentions d'allergènes) ou obtenir la fiche technique ; détailler la béchamel et la pâte à crêpes comme sous-recettes ; indiquer la portion. Le moteur calcule alors « confirmé / absent vérifié / à vérifier » et la fondatrice valide fiche par fiche.
2. **Vague 2 — palier B (11 plats, dont Beignets de crevettes, Dombrés aux crevettes, Gratin et Bananes plantains frites)** : compléter les quantités, étiqueter les produits transformés (lait de coco, épices en mélange, bouillons, sauces), préciser huile de friture et risque de contamination croisée en cuisine.
3. **Vague 3 — palier C (93 recettes vides)** : fiche de collecte par produit (ingrédients, quantités, marque, rendement, portion), **10 recettes par semaine**, par famille, en commençant par les produits les plus demandés (aujourd'hui 2 commandes en base : la priorité sera fixée par la fondatrice).
4. **Palier D** : relier ou créer les 2 recettes manquantes.

## Méthode pour chaque fiche
Recette réelle → ingrédients avec source (étiquette, fiche technique, composition validée) → analyse automatique (`src/lib/allergenes.ts`, 14 allergènes) → ingrédients non documentés listés → validation par la fondatrice (pas de validation groupée d'allergènes incertains) → publication selon les règles (prix validé, portion, description, famille autorisée).

## Dépendances
Le stockage structuré des ingrédients et de leurs sources (référentiel ingrédients, sous-recettes, statut par allergène) nécessite les migrations « allergènes » décrites dans `ALLERGENES_AUDIT_ET_PUBLICATION.md` §5. Elles ne sont pas encore écrites et seront préparées puis testées en base isolée sur votre accord. En attendant, la collecte (photos d'étiquettes, recettes) peut commencer sans rien modifier en production.
