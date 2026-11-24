# Bella'Food — aperçu des tarifs et des imports à valider (24/11/2026)

**Rien n'a été appliqué.** Aucun prix, aucun produit et aucun stock n'a été modifié en base. Ce document est un aperçu à valider ligne par ligne. Les prix « actuels » ont été relevés en lecture seule dans `catalogue_produits`, le 24/11.

Valeurs possibles de la colonne Statut :
- **inchangé** : le prix actuel correspond déjà à la grille ;
- **à appliquer** : la grille est claire, seule la validation de la fondatrice manque ;
- **à confirmer** : il y a une ambiguïté à trancher ;
- **à créer** : le produit n'existe pas encore (il serait créé en brouillon, non visible) ;
- **bloqué** : une règle n'est pas respectée (porc, alcool, marque).

## Lot 1 — grille tarifaire de la fondatrice

| Produit (catalogue) | Portion | Prix actuel | Prix de la grille | Statut | Remarque |
|---|---|---|---|---|---|
| Soupe créole | portion | 13,00 € | 13,00 € | inchangé | |
| Soupe z'habitants | portion | 13,00 € | 13,00 € | inchangé | |
| Riz au lait de coco | prestation | 10,00 € | 10,00 € (accompagnement seul) | inchangé | Unité « prestation » à corriger en « portion standard » ? |
| Riz djon-djon | prestation | 10,00 € | 10,00 € | inchangé | Même remarque sur l'unité |
| Bananes plantains frites | prestation | 5,00 € | 10,00 € ? | **à confirmer** | S'agit-il d'un accompagnement « seul » en portion standard ? Pas de hausse sans confirmation. |
| Riz nature (barquette) | barquette | — | 2,50 € | **à créer** | Le tarif de 10 € ne s'applique pas au riz nature |
| Frites (suppléments et barquettes) | — | 2 € à 5 € | inchangés | inchangé | Le tarif de 10 € ne s'applique pas aux frites |
| Poulet-frites, poulet boucané | barquette | 8,00 € (frites nature) · 9,00 € (frites maison) | 6,50 € | **à confirmer** | Quelle version passe à 6,50 € : nature, maison, ou un nouveau produit ? |
| Frites-merguez | barquette | 7,00 € (nature) · 8,00 € (maison) | 6,00 € | **à confirmer** | Même question. Merguez : vérifier sur l'étiquette du fournisseur l'absence de porc, y compris dans le boyau. |
| Petit pot de sauce | pot | 0,50 € (« Supplément sauce maison ») | 0,30 € | **à confirmer** | Le « supplément sauce maison » est-il bien ce petit pot ? |
| Bouteille de sauce 33 cl | bouteille | — | 3,00 € | **à créer** | Une fiche par sauce (composition, allergènes) |
| Sauce incluse avec un repas | règle | — | 1 sauce au choix offerte | à paramétrer | Règle de commande, pas un prix |
| Plats complets | — | variables | prix individualisés | inchangé | Aucune modification globale |

### Recherche de prix en Guyane (Sinnamary, Saint-Laurent-du-Maroni, Kourou, Cayenne)
Le 24/11, je n'ai trouvé **aucun prix constaté vérifiable** en ligne pour ces produits de snack dans les quatre villes. Les cartes publiées sont rares, souvent anciennes, et ne concernent que des restaurants. Je n'ai inventé aucun prix.

| Ville | Seules données trouvées | Source | Date | Comparable ? | Confiance |
|---|---|---|---|---|---|
| Kourou | Brochettes de poulet (×2) à 18 €, au restaurant | lewoodkourou.com/la-carte | carte non datée, ancienne | Non (service à table) | faible |
| Kourou | Sandwiches « à partir de 3,50 € » | petitfute (Le Snack Roméo's et Juliette's) | non datée | partiellement | faible |
| Saint-Laurent-du-Maroni | Plats avec riz à 14,50 € et 15,50 € | eat-list.fr (Le Saint Jean) | non datée | Non (restaurant) | faible |
| Sinnamary | Plat autour de 12 € (Le Pakira) ; pizzas de 8 à 12 € (Yramannis) | koifaire / petitfute | non datée | Non | faible |
| Cayenne | Aucune carte de snack avec prix trouvée | — | — | — | — |

**Pour obtenir des prix réellement constatés** : faire des relevés sur place (photos des cartes, avec la date) ou consulter les plateformes de livraison locales. Chaque relevé serait enregistré avec le prix provisoire, le prix constaté, la source, la date, la portion, le niveau de confiance et le statut, sans jamais écraser un prix déjà confirmé.

## Lot 2 — produits des affiches, à importer sans doublon

| Produit | Prix de l'affiche | Existant au catalogue | Statut | Contrôle porc / alcool |
|---|---|---|---|---|
| Bokit jambon-fromage | 6 € | non | **bloqué** tant que le jambon n'est pas confirmé de volaille | « Jambon » est souvent du porc : volaille ou dinde obligatoire |
| Bokit complet | 7 € | non | à créer | Composition à fournir (charcuterie ?) |
| Bokit poulet boucané | 8 € | non | à créer | ok |
| Bokit morue | 9 € | non | à créer | ok (allergène : poisson) |
| Supplément viande (bokit) | 2 € | non | à créer | Quelle viande ? |
| Box mini-bokits | à définir | non | à créer sans prix (non publiable) | Composition à définir |
| Bake poulet | 3 € | non | à créer | ok |
| Bake steak | 3 € | non | à créer | Steak de bœuf ? |
| Bake morue | 4 € | non | à créer | ok (poisson) |
| Bake thon | 3,50 € | non | à créer | ok (poisson) |
| Brochette de poulet | 2,50 € | **oui, à 3,50 €** | **à confirmer** | Doublon : faut-il modifier le prix existant (3,50 € → 2,50 €) ou garder 3,50 € ? |
| Saucisse fumée | 3 € | non (il existe « saucisse de poulet ») | **bloqué** tant que la viande n'est pas confirmée | La saucisse fumée est souvent au porc : volaille ou bœuf obligatoire |
| Cuisse de poulet | 3 € | seulement en barquette avec frites | à créer (vendue seule) | ok |
| Frites 3 € / 4 € / 5 € | 3, 4 et 5 € | barquette nature 3 €, maison 5 € | **à confirmer** | À quoi correspond la taille à 4 € ? |
| Jus de gingembre | 3 € | **oui, à 3 €** | inchangé (pas de doublon) | Contenance à valider |
| Jus de prune de Cythère | 3 € | non | à créer | Contenance à valider |
| Jus de maracuja | 3 € | non (seul un milkshake existe) | à créer | Contenance à valider |
| Ensemble à 7 € | 7 € | — | **à classer** | Menu ou formule ? Classement à valider |
| Livraison à 5 € | — | — | **non appliqué** | Conformément à la consigne |

Règles appliquées à chaque création :
- produit créé en brouillon, non visible ;
- fiche technique, composition, allergènes, unité et prix obligatoires avant toute publication ;
- aucun logo, nom ni visuel des affiches d'origine ;
- photos uniquement si leurs droits sont vérifiés.

## Décisions attendues de la fondatrice
1. Poulet-frites boucané à 6,50 € et frites-merguez à 6 € : quelle version (nature, maison, ou nouveau produit) ?
2. Bananes plantains frites : 10 € ?
3. Le « supplément sauce maison » correspond-il au petit pot à 0,30 € ?
4. Brochette de poulet : 2,50 € ou 3,50 € ?
5. Frites : à quoi correspond la taille à 4 € ?
6. Jambon et saucisse fumée : volaille ou bœuf, sinon retrait.
7. Contenances des jus ; classement de l'ensemble à 7 €.
