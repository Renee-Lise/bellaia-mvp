# Bella'Food — méthode de recette sans effet sur les commandes réelles

Décision du 23/11/2026 : **aucune commande fictive dans la base de production**.

## Constat (Red Team)

- Les prévisualisations Vercel utilisent aujourd'hui **les mêmes variables Supabase que la production** : une commande passée sur une prévisualisation est une vraie commande (référence FOOD, stock, notifications).
- Il n'existe ni drapeau « commande de test », ni base de recette.

## Niveau 1 — base simulée locale (disponible, utilisé)

- Simulateur `tests/iphone/mockapp.js` : reproduit les tables, les règles d'accès (fondatrice / assistante / cliente / famille), l'anti-doublon (clé d'idempotence) et le stockage privé.
- Application lancée en local contre ce simulateur (`next dev`), aucune connexion à Supabase.
- Tests : `node tests/iphone/t_food.js <fondatrice|assistante|cliente> <sorties> [iphone|ordinateur]`.
- Résultats du 23/11 :

| Profil | iPhone 13 simulé | Ordinateur 1366×900 |
|---|---|---|
| Fondatrice | 19/19 | 19/19 |
| Assistante | 17/17 | 17/17 |
| Cliente | 17/17 | 17/17 |

- Limite : ce n'est ni un iPhone physique ni la vraie base (triggers, politiques RLS réelles, fonctions SQL).

## Niveau 2 — base de recette isolée (recommandé, à autoriser)

1. Créer une **branche Supabase** (copie du schéma et des migrations, données de démonstration uniquement). Coût facturé à l'heure par Supabase : **dépense à autoriser**. Elle sert aussi au test de restauration demandé avant les migrations 0129–0132.
2. Créer une prévisualisation Vercel dont les variables `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` pointent vers cette branche (variables limitées à la branche Git de recette) : **modification de configuration à autoriser**.
3. Afficher un bandeau « Base de recette » quand l'adresse Supabase n'est pas celle de production (petit changement de code, aucun effet en production).
4. Dérouler `RECETTE_FOOD_IPHONE_REEL.md` sur l'iPhone de la fondatrice, puis supprimer la branche.

## Niveau 3 — en production, après ouverture (lecture seule)

- Contrôle de l'affichage, des prix et des allergènes **sans envoyer de commande**.
- La première vraie commande est une commande réelle d'une cliente, suivie par la fondatrice.

## Ce qui est interdit

- Créer, annuler ou supprimer des commandes « TEST » dans la base de production.
- Tester l'envoi de commande sur une prévisualisation branchée sur la production.
