# Procédure de déploiement progressif de Bellaïa

Rédigée le 23/11/2026. Elle s'applique à chaque mise en production : code (Vercel) et, séparément, base de données (migrations Supabase).

**Règle** : rien ne part en production sans l'accord écrit de la fondatrice pour la liste exacte des fonctions concernées. Rien n'est appliqué en base sans une sauvegarde vérifiée.

## 0. Principes

1. **Le code et la base se déploient séparément.**
   - Le code part d'abord. Il doit fonctionner avec ou sans la migration correspondante : un message « pas encore activé » s'affiche tant que la migration n'est pas appliquée (déjà le cas pour les documents des hôtes).
   - Les migrations partent ensuite, une par une.
2. **Petits lots.** Un lot = un ensemble cohérent de fonctions, testé ensemble, réversible ensemble.
3. **Fonctions activables.** Les nouveautés visibles des clientes restent derrière un réglage. Exemples : `PREMIUM_ACTIF`, et le parcours de commande Food premium, qui n'est affiché que dans l'aperçu fondatrice. On les active seulement après la vérification en production.
4. **Preuves.**
   - Chaque étape est notée dans le registre « Suivi des exigences » : commit, identifiant de déploiement Vercel (`dpl_…`), résultats des tests.
   - Le statut « Déployé » est refusé sans identifiant de déploiement de production.

## 1. Avant le déploiement : branche de prévisualisation

| Étape | Contrôle | Preuve |
|---|---|---|
| 1.1 | Tests automatisés sur base simulée (`tests/iphone/*.js`, `tests/unit/*.js`) | sorties « n/n » |
| 1.2 | Tests SQL des migrations du lot sur base jetable (`supabase/tests/*/executer.sh`) | `resultats_*.txt` |
| 1.3 | Compilation TypeScript : aucune nouvelle erreur dans les fichiers modifiés | décompte |
| 1.4 | Déploiement de prévisualisation Vercel à l'état READY | `dpl_…` de prévisualisation |
| 1.5 | **Recette sur iPhone réel, sur la prévisualisation (base réelle), par la fondatrice**, avec les fiches de recette (`docs/recette/`) | fiche signée « OK / KO » |
| 1.6 | Revue Red Team du lot : droits, données sensibles, prix, imports | section RED TEAM du rapport |

⚠️ La prévisualisation utilise **la même base de données que la production**. Ce qu'on y écrit est réel. La recette s'y fait donc avec des commandes et fiches de test clairement nommées « TEST », supprimées ou annulées ensuite par la fondatrice.

## 2. Déploiement du code (Vercel)

1. **Repérer le déploiement de production actuel**, qui servira au retour arrière. Le 23/11 : commit `0bfd765`.
2. **Fusionner** la branche validée vers `main`. Le déploiement de production est créé automatiquement.
3. **Attendre l'état READY.** Noter l'identifiant `dpl_…`.
4. **Vérifications de fumée** dans les 15 minutes :
   - connexion fondatrice, cliente et assistante ;
   - accueil de chaque espace ;
   - une boutique ;
   - le registre des exigences.
5. **Surveillance** pendant 24 h : erreurs serveur Vercel et retours des utilisatrices.
6. **Activation progressive** des fonctions visibles des clientes, une à la fois et sur GO.

### Retour arrière du code (moins de 5 minutes)
- Dans Vercel, sur le déploiement de production précédent : « Promote to Production » (ou « Instant Rollback »). Aucune donnée n'est touchée.
- Ensuite : `git revert` du lot sur `main` pour que le code reflète l'état réel, puis correction sur la branche de prévisualisation.

## 3. Déploiement d'une migration (Supabase)

Ordre conseillé : 0131 → 0132 → 0130 → 0129 (voir `PLAN_MIGRATIONS_0129_0132.md`).

| Étape | Action |
|---|---|
| 3.1 | **Sauvegarde vérifiée.** Sauvegarde ou export manuel depuis le tableau de bord Supabase, puis contrôle qu'elle existe (date, taille). Sans preuve de sauvegarde, la migration n'est pas lancée. |
| 3.2 | Relecture des prérequis (requêtes en lecture seule du plan). |
| 3.3 | Application de **la seule** migration concernée. |
| 3.4 | Contrôles après : tables, règles d'accès, alertes de sécurité Supabase. |
| 3.5 | Test fonctionnel de l'écran concerné sur iPhone, puis consignation dans le registre. |

### Retour arrière d'une migration
- Script `supabase/migrations/rollback/<numéro>_*.sql` (testé sur base jetable).
- ⚠️ Les scripts 0130 et 0131 suppriment les données saisies après l'application : faire d'abord un export.

## 4. Opérations sur les données (exemple : masquage BSH du 23/11)

1. Vérification de la liste exacte : comptage et empreinte des identifiants.
2. Copie intégrale des fiches concernées dans l'espace privé de la fondatrice.
3. Opération en une seule transaction, avec contrôles avant et après : tout est annulé si un compte ne correspond pas.
4. Script de retour arrière conservé avec la copie.

## 5. Critères d'arrêt immédiat (retour arrière)

- Une utilisatrice ne peut plus se connecter ou voit l'espace d'un autre rôle.
- Un prix, un total ou une remise diffère du calcul serveur attendu.
- Des données d'un professionnel ou d'une cliente sont visibles par un autre compte.
- Une erreur serveur répétée sur une route de commande ou de paiement.
