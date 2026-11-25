# Plan consolidé des migrations en attente — 25/11/2026

**Rien n'est appliqué en production.** Condition préalable : sauvegarde complète réelle, restaurée avec le verdict « COMPLET » (`sauvegarde-iphone/PROCEDURE_IPHONE.md`), puis autorisation explicite de la fondatrice, migration par migration.

## 1. Inventaire relevé en production (lecture seule, 25/11)

| Migration | Objet | En production ? | Preuve relevée |
|---|---|---|---|
| 0127 | Modèles Structure sans fichier masqués | **Appliquée** (effet constaté) | 0 modèle concerné encore visible |
| 0128 | Espace hôtes BSH | **Appliquée** | colonne `bsh_hotes.pseudo_scene` présente |
| 0129 | BSH Secret Stories | Non | table `ss_collections` absente |
| 0130 | Éditions pédagogiques | Non | colonne `histoires_scenes.texte_creole` absente |
| 0131 | Agenda : disponibilités | Non | table `agenda_disponibilites` absente |
| 0132 | Documents des hôtes | Non | fonction `bsh_hote_document_depose` absente |
| 0133 | Messagerie : sécurité | Non | colonne `bellaia_conversations.cree_par` absente |
| 0134 | Profils et privilèges (**priorité sécurité**) | Non | ancienne version de `handle_new_user` en place |
| 0135 | Candidatures | Non | table `bellaia_candidatures` absente |
| 0136 | Suspensions d'accès | Non | colonne `bellaia_permissions.statut` absente |
| 0137 | Missions et invitations | Non | colonne `bellaia_missions.nature` absente |
| 0138 | Droits par permission (paiements, réservations BSH) | Non | ancienne politique `stripe_fondatrice` en place |
| 0139 | Demandes clients (dont RGPD) | Non | table `bellaia_demandes` absente |
| 0140 | Tables `notifications`, `webhook_logs`, `pre_comptabilite` | Non | table `notifications` absente |
| 0141 | BSH Secret Agenda (continuité, studio) | Non | colonne `bsh_communications.valide_par` absente |
| 0142 | Sécurité (fichier dans le Drive privé) | Non | — |
| 0143 | Bella'Food : offre publiée du jour | Non | fonction `food_offre_produits_du_jour` absente |
| 0144 | BSH Private Club, Secret World, nominations | Non | table `bsh_club_charte` absente |
| 0145 | Répertoire central | Non | table `bellaia_repertoire` absente |
| 0146 | Missions cloisonnées par pôle | Non | fonction `peut_gerer_mission` absente ; politique `missions_equipe` = portée « * » seule |
| 0134a | **Correctif d'urgence** (sous-ensemble de 0134 ; fichier, retour arrière et test dans le Drive privé) | Non | — |
| 0148 | Boutique numérique : droits d'accès, téléchargements, facture automatique (numérotation FAC existante) | Non | table `boutique_droits` absente |
| 0147 | Fonctions rattachées à un pôle ; fonction « fondatrice de pôle » (préparée le 25/11) | Non | colonne `bellaia_roles.pole` absente |

**22 migrations en attente** (0129 à 0148 et 0134a ; 0142 et 0134a hors dépôt public).

## 2. Suivi des migrations par Supabase : mécanisme réel

- La table de suivi de Supabase (`supabase_migrations.schema_migrations`) ne contient que **2 entrées** : `0125_assistant_allergenes` et `0126_durcissement_allergenes`. Les migrations antérieures ont été exécutées par l'éditeur SQL, donc **sans trace dans cette table**.
- Les fichiers du dépôt portent des numéros (`0001` à `0146`), alors que Supabase enregistre une version horodatée. **Ne jamais lancer `supabase db push` sur ce dépôt** : l'outil considérerait les 146 fichiers comme non appliqués et tenterait de tous les rejouer.
- **Procédure retenue** : chaque migration est appliquée **une à une**, par l'outil d'application de migrations de Supabase, sous son nom de fichier (ex. `0134_profils_privileges`). Supabase l'inscrit alors avec l'heure d'application : l'ordre réel est celui de l'application, pas celui des numéros. Le présent plan fixe cet ordre.
- Si l'outil en ligne de commande de Supabase devait être utilisé un jour, il faudrait d'abord réaligner l'historique (`supabase migration repair`), une opération à préparer à part.

## 3. Ordre technique (les numéros ne le reflètent pas)

| Rang | Migration | Raison du rang |
|---|---|---|
| 0 | Sauvegarde complète restaurée : « COMPLET » | Condition de tout le reste |
| 0 bis | **0134a** (Drive privé) | Correctif d'urgence réversible en une instruction, sans modification de données : peut précéder la sauvegarde **si la fondatrice le décide** |
| 1 | **0142** (Drive privé) | Sécurité |
| 2 | **0134** | Sécurité des rôles ; prérequis de 0135 et de 0138 |
| 3 | **0133** | Sécurité de la messagerie |
| 4 | **0138** | Droits par permission ; après 0134 |
| 5 | **0140** | Tables utilisées par les paiements et les alertes |
| 6 | **0141** | Secret Agenda ; dépend de 0103 et 0128 (en production) |
| 7 | **0143** | Offre Bella'Food du jour |
| 8 | **0135 → 0136 → 0137** | Candidatures, suspensions, missions ; 0137 après 0135 et 0136 |
| 9 | **0146** | Après 0137 (même politique de missions) |
| 10 | **0145** | Après 0137 (acceptation d'invitation rendue compatible) |
| 10 bis | **0147** | Après 0145 (remplace l'index d'unicité des fonctions par un index incluant le pôle) |
| 10 ter | **0148** | Boutique ; indépendante (testée après 0147) |
| 11 | **0144** | Après 0145 et 0147 (testée dans cet ordre) |
| 12 | **0139, 0131, 0130, 0132, 0129** | Fonctions secondaires ; 0132 dépend de 0128 (en production) |

L'ordre demandé `0134 → 0135 → 0136 → 0137 → 0145 → 0144` est respecté. Il s'y ajoute **0146 entre 0137 et 0145**, et les autres migrations aux rangs ci-dessus.

## 4. Test de la chaîne complète sur une réplique de la production (25/11)

`supabase/tests/chaine_complete/executer.sh`, sur PostgreSQL 16 jetable (la production est en version 17). Toutes les personnes sont fictives.

**Réplique** : la structure réelle de la production a été relevée en lecture seule : 203 tables avec leurs colonnes, valeurs par défaut, colonnes d'identité, contraintes et 174 index ; 94 fonctions ; 20 vues ; 373 politiques ; 43 déclencheurs ; tables Auth et Storage. Elle est conservée **hors du dépôt public**. Aucune donnée réelle n'y figure.

| Contrôle | Résultat |
|---|---|
| 19 migrations du dépôt appliquées dans l'ordre du §3, chacune deux fois (idempotence) | **19/19 sans erreur** |
| Scénarios, chacun sur une base neuve (réplique + chaîne complète) | 0134 : 13/13 · 0135–0137 : 65/65 · accès et pôles : 11/11 · 0133 : 38/38 · 0140 : 10/10 · 0141 : 44/44 · 0143 : 8/8 · 0144 : 117/117 · 0145 : 20/20 · 0147 : 10/10 · 0148 : 24/24 · 0139 : 8/8 · 0131 : 17/17 · 0130 : 20/20 — **405/405** (plus 2 étapes de préparation) |
| Retours arrière des 19 migrations en ordre inverse | **Tous appliqués sans erreur** (0138 : fichier de retour dans le Drive privé, non testé ici) |
| Comparaison de 7 734 objets avant la chaîne et après tous les retours arrière | Identiques, sauf : (a) **27 colonnes et 13 contraintes conservées volontairement** (dont `bellaia_roles.pole`) ; tables et colonnes de la boutique conservées après retour arrière (pièces comptables), pour ne perdre aucune donnée saisie entre-temps ; (b) les 3 politiques de 0138 (retour privé) |
| Réapplication complète après les retours arrière | **19/19 sans erreur** |

### Défauts trouvés grâce à la réplique, et corrigés
1. **0133** : 2 anciennes règles d'accès aux pièces jointes existent en production. Comme ces règles s'additionnent, elles auraient affaibli les nouvelles règles de 0133. → 0133 les retire, et son retour arrière les rétablit à l'identique. Résultat : 38/38.
2. **0145** : l'index d'unicité des fonctions existe **déjà** en production (`bellaia_roles_unique`). L'affirmation inverse du plan précédent était erronée. → 0145 ne crée l'index que si aucun index équivalent n'existe.
3. **0137** : la politique `missions_assignee_lecture` de production est réservée aux comptes connectés. → 0137 et son retour arrière conservent cette restriction.
4. **Retour arrière de 0141** : une contrainte était rétablie sans être revalidée. → elle est revalidée lorsque les données le permettent.
5. **Banc de test** : identifiants auto-numérotés, valeurs par défaut, droits par défaut de Supabase et comptes fictifs manquants. Ces lacunes ont été complétées. Elles ne concernaient pas les migrations elles-mêmes.

### Limites
- La réplique reproduit la **structure** de la production, pas ses **données** réelles. Le test sur données réelles, c'est la restauration de la sauvegarde (rang 0).
- Versions de PostgreSQL : 16 pour le test, 17 en production.
- 0142 et le retour arrière de 0138 sont dans le Drive privé : ils ne font pas partie de ce test public.

## 5. Procédure pour chaque migration (après autorisation)
1. Vérifier dans la production que la migration est toujours absente (requête du §1).
2. L'appliquer sous son nom de fichier ; contrôler son inscription dans la table de suivi.
3. Contrôles immédiats : avis de sécurité Supabase ; requête de contrôle propre à la migration ; ouverture de l'application sur iPhone avec le compte de la fondatrice.
4. En cas d'anomalie : appliquer le fichier de retour arrière (`rollback/`), vérifier, puis signaler.
5. Inscrire le résultat au registre central.

## 6. Risques principaux
| Risque | Mesure |
|---|---|
| Données réelles différentes de la réplique (doublons, valeurs inattendues) | Contrôles de données avant chaque migration ; sauvegarde restaurée |
| 0136 retire l'ancienne contrainte d'unicité des permissions | Remplacée par un contrôle tenant compte du statut ; testée 65/65 |
| 0143 vide le catalogue public tant qu'aucune offre du jour n'est publiée | Publier une offre juste après l'application |
| Écart de version de PostgreSQL (16 et 17) | Aucune fonction propre à la version 17 utilisée ; contrôle par les avis de sécurité après chaque étape |
