# Audit des catalogues — classement

Date : 19/11/2026. Lecture seule : **aucun article n'a été publié, modifié ni complété** pendant cet audit. Aucune caractéristique, photo, promotion, stock ou avis n'a été inventé.

## Règles de classement

| Classe | Définition |
|---|---|
| **Commercialisable** | prix confirmé, informations obligatoires présentes (allergènes pour l'alimentaire), photo réelle, statut validé |
| **Brouillon** | informations obligatoires présentes, mais photo ou description manquante, ou statut non validé |
| **Prestation à confirmer** | prix « sur devis » / « à confirmer », ou prix public non confirmé par la fondatrice |
| **Sans informations obligatoires** | prix absent, ou allergènes non renseignés pour un produit alimentaire |

## Résultats

| Catalogue | Commercialisables | Brouillons | À confirmer | Sans infos obligatoires | Visibles côté client |
|---|---|---|---|---|---|
| Bella'Food — `catalogue_produits` (125) | 0 | 10 (allergènes renseignés, aucune photo) | 0 | 115 (allergènes non renseignés, dont 6 sans prix) | 116 |
| Bella'Event — `events_catalogue` (68) | 35 | 0 | 33 (prix « sur devis » / note de prix) | 0 | 68 |
| Collection saisonnière — `food_revente_produits` (14) | 0 | 0 | 14 (prix de revente non confirmé) | 14 (allergènes non vérifiés) | 0 |
| BSH — `stocks` (390) | 0 | 309 (prix présent, aucune photo) | 81 (prix public « à compléter ») | 0 | 0 |

## Protection déjà en place (vérifiée)

- Bella'Food : la vue `v_catalogue_food_public` ne marque **commandables que 3 produits sur 116** visibles. Les 113 autres s'affichent avec « Allergènes non renseignés — demandez-nous », et le bouton d'ajout au panier est bloqué ; le serveur (`/api/food/commandes/create`) revérifie la règle. Aucune fiche allergènes n'est encore validée dans l'assistant de régularisation (0/125).
- BSH : aucun produit n'est visible côté client.
- Aucune photo de produit n'est présente dans les catalogues Food et BSH : rien n'a été illustré avec des images inventées.

## Ce qui débloquerait les catalogues

1. **Bella'Food** : valider les fiches allergènes dans *Food › Allergènes — suivi des fiches* (assistant de régularisation), puis déposer les photos réelles des plats.
2. **Bella'Event** : confirmer les 33 prix « sur devis » ou les laisser explicitement en devis.
3. **Collection saisonnière** : confirmer les 14 prix de revente et vérifier les allergènes.
4. **BSH** : images Concorde Pro (voir `docs/concorde/DIAGNOSTIC_IMAGES_CONCORDE_PRO.md` — 279 produits rapprochables après accord sur les droits) et prix publics des 81 produits « à compléter ».

## Mise à jour du 20/11

- **Espace fondatrice › Stocks › Catalogue** : chaque fiche incomplète porte désormais un badge « Brouillon — manque : … » (prix, allergènes non validés) calculé avec la même règle que la boutique ; filtre « Brouillons incomplets ». Constat seulement : aucune fiche modifiée, aucun produit publié ou retiré.
- **Côté cliente** : inchangé et vérifié — les produits incomplets restent non commandables (3 commandables sur 116 visibles).
- **Complément depuis les données existantes (Bella'Food)** : 123 produits sur 125 sont liés à une recette, mais seules 12 de ces recettes portent des allergènes ; aucune recette de même nom n'est restée non liée. **Il n'existe donc pas d'autre donnée fiable** pour compléter les allergènes : ils doivent venir des fiches techniques ou de votre validation dans l'assistant de régularisation. Rien n'a été déduit ni inventé.
- **BSH** : classement des 390 produits (170 prêts techniquement, 38 incomplets, 71 en attente de validation, 111 introuvables) — voir `docs/concorde/DIAGNOSTIC_IMAGES_CONCORDE_PRO.md` § 8.
