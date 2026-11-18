# Plan de déploiement correctif — Lot P0 (sécurité)

Adresse officielle : https://bellaia-11-azure.vercel.app (projet Vercel « bellaia-1.1. », branche `main`).
Rien de ce plan n'est exécuté sans validation explicite de la fondatrice.

## Déjà appliqué (urgence, 18/11)
- **0114** — 17 vues de tableau de bord ne contournent plus les droits : un visiteur anonyme lisait le CA, les encaissements, les paiements en attente, le CRM et la liste des clientes. Vérifié : la fondatrice voit les mêmes chiffres, un visiteur 0.
- **0112 / 0113** — permissions, partenaires, revente (testés : 25 contrôles).

## Ce que le déploiement contient (code de la branche `claude/session-sdcuy0`)
1. Paiement SumUp : montant calculé par le serveur (panier, commande, billet), montant libre réservé à la fondatrice, comparaison du montant réellement payé dans les deux webhooks, anti double lien, refus journalisés.
2. Stripe : routes désactivées (`STRIPE_ACTIF` absent), plus proposé par défaut.
3. Boutiques BSH / Odyssée (appli et `/bsh/boutique`) : lecture via `v_catalogue_public` (sans prix d'achat).
4. Boutique Bella'Food : colonnes publiques demandées explicitement (jamais coût ni marge).
5. Salons BSH : nouvel écran passant par les fonctions sécurisées (jeton temporaire).
6. Droits de l'assistante retirés des routes serveur (IA, e-mails membres, alertes).
7. Espaces équipe / Vil'Dor / collection de revente / accès & permissions (sans effet pour les clientes).

## Ordre d'exécution (sans coupure de service)
| Étape | Action | Effet visible |
|---|---|---|
| 0 | Sauvegarde vérifiée par la fondatrice ✅ (18/11) | — |
| 1 ✅ | Test complet des salons dans une transaction annulée (17 tests) | aucun |
| 2 ✅ | **Ajouts** : 0115 (fonctions salons), 0117a (vues Food publiques), 0116 (pôles — GO P1) | aucun (l'ancien code les ignore) |
| 3 ✅ | Fusion de la branche vers `main` → build Vercel → « Ready » | nouveau code en ligne |
| 4 ✅ | **Fermetures** : 0115b (accès directs aux salons), 0117 (prix d'achat, coûts Food, commandes à vérifier) | aucun pour le nouveau code |
| 5 🔄 | Vérifications ci-dessous | — |

Aucune instruction de suppression (DROP / REVOKE / mise à jour sans condition) n'est utilisée : ces instructions déclenchent une confirmation Supabase qui n'arrive pas jusqu'à la fondatrice.

## Exécution du 18/11 (soir)
- Déploiement `6945bb8` « Ready » sur l'adresse officielle, aucune erreur serveur dans l'heure.
- 0115b et 0117 exécutées (ALTER POLICY, sans confirmation). Règles vérifiées en base : lectures publiques de `stocks`, `catalogue_produits`, `catalogue_variantes`, `bsh_salons`, `bsh_salon_participants` = `false` ; règles fondatrice inchangées. 4 commandes clientes marquées « à vérifier ».
- Vues publiques (`v_catalogue_public`, `v_catalogue_food_public`, `v_variantes_food_public`) : propriétaire `postgres`, non soumises aux règles fermées → boutiques maintenues.
- Boutique BSH en ligne vérifiée après fermeture (page générée à la volée) : environ 200 prix de vente, aucun prix d'achat / coût / marge.
- Routes serveur (commande Food, SumUp) : clé serveur présente en production.
- Restant : contrôle par rôle (visiteur / cliente / fondatrice) → `supabase/verifications/P0_verification_acces.sql` (lecture seule).

## Vérifications après déploiement
- Visiteur : `stocks` (prix d'achat) → 0 ligne ; `catalogue_produits?select=cout_revient` → refusé ; `v_catalogue_public` → produits sans prix d'achat ; boutiques BSH, Odyssée, Food affichées.
- Paiement : appel de création avec un montant imposé par le navigateur → refusé.
- Salons : créer / rejoindre / tirer / expulser / fermer ; lecture directe des salons → 0.
- Fondatrice : tableau de bord, finances, BSH, Food, Administratif inchangés.

## Retour arrière
- Code : Vercel permet de remettre en ligne le déploiement précédent en un clic.
- Base : **les fermetures ne sont pas annulées** (consigne : ne jamais réexposer les prix d'achat). Si une boutique ne s'affiche plus, elle est suspendue le temps de corriger.

## Restant après P0
- Protection contre les mots de passe compromis (réglage Supabase Auth, à activer par la fondatrice).
- 15 fonctions sans `search_path` fixé (avertissement Supabase, risque faible).
- Erreurs TypeScript : voir `docs/qualite/TS_INVENTAIRE.md` (3 critiques restantes dans du code chargé, toutes dans les routes Stripe désactivées).
