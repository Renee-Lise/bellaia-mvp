# Ordre de déploiement sécurisé des migrations en attente (24/11/2026)
**Aucune n'est appliquée. Chaque étape demande ton accord explicite.** Après chaque étape : avis de sécurité Supabase, puis contrôle rapide sur iPhone.

| Étape | Quoi | Pourquoi à ce rang | Dépend de | Retour arrière | Test |
|---|---|---|---|---|---|
| 0 | **Sauvegarde complète**, restauration réelle, verdict « COMPLET » (`docs/deploiement/sauvegarde-iphone/PROCEDURE_IPHONE.md`) | Condition de toutes les migrations | — | — | Chaîne revérifiée le 24/11 : COMPLET ; 3 altérations détectées |
| 1 | Déploiement du **code** de la branche, sans migration | Le code fonctionne avant et après chaque migration (replis testés) | Étape 0 conseillée | Vercel : retour au déploiement précédent en un geste | Non-régression simulateur |
| 2 | **0142** : migration de sécurité (fichier conservé dans le Drive privé, hors du dépôt public, jusqu'à son application) | Priorité sécurité | Tables déjà en production ; code de l'étape 1 | Fichier de retour (Drive privé) | Testée sur base jetable (Drive privé) |
| 3 | **0134** : profils et privilèges | Sécurité des rôles | — | `rollback/0134…` | 13/13 |
| 4 | **0133** (messagerie), puis **0138** (droits par permission) | Sécurité | 0138 : `a_permission`, déjà en production | Fichiers de retour | 44/44 ; — |
| 5 | **0140** : tables `notifications`, `webhook_logs`, `pre_comptabilite` | Paiement SumUp et alertes | — | `rollback/0140…` | 11/11 |
| 6 | **0141** : BSH Secret Agenda | Continuité, preuves, studio, médiathèque | 0103 et 0128 (production) ; compatible après 0142 (vérifié) | `rollback/0141…` | 34/34 |
| 7 | **0135**, puis **0136**, puis **0137** | Candidatures, suspensions | 0134 avant 0135 ; 0137 après 0135 et 0136 | Fichiers de retour | 65/65 |
| 8 | **0139**, **0131**, **0130**, **0132**, **0129** | Fonctions secondaires | 0132 : 0128 (production) | Fichiers de retour | 8/8 ; testés |

**Limites connues :**
- Chaque migration est testée sur une base jetable qui reproduit les tables concernées. Ce n'est pas une copie complète de la production.
- La copie complète, c'est la restauration de l'étape 0. Elle ne peut pas être faite ici : aucun mot de passe de base n'est présent dans cet environnement, et il ne doit pas y en avoir.

**Points de sécurité restant à décider** : listés dans le rapport privé (Drive), non détaillés ici.
