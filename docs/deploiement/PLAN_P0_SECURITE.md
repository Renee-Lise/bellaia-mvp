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

## Ordre d'exécution
| Étape | Action | Durée | Effet visible |
|---|---|---|---|
| 0 | Vérifier la sauvegarde du jour (Supabase → Database → Backups) | — | aucun |
| 1 | Fusion de la branche vers `main` → build Vercel | ~2 min | aucun (ancien code en ligne pendant le build) |
| 2 | Contrôle du déploiement « Ready » | — | nouveau code en ligne |
| 3 | Exécution **0115** (salons) puis **0117** (fermeture prix d'achat / coûts Food, commandes à vérifier) | < 1 min | salons indisponibles entre 2 et 3 (~1 à 2 min) |
| 4 | Vérifications ci-dessous | ~5 min | — |

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
