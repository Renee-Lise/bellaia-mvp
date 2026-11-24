# Ordre de déploiement sécurisé des migrations en attente (24/11/2026, complété le soir : 0144 et 0145)
**Aucune n'est appliquée. Chaque étape demande ton accord explicite.** Après chaque étape : avis de sécurité Supabase, puis contrôle rapide sur iPhone.

| Étape | Quoi | Pourquoi à ce rang | Dépend de | Retour arrière | Test |
|---|---|---|---|---|---|
| 0 | **Sauvegarde complète**, restauration réelle, verdict « COMPLET » (`docs/deploiement/sauvegarde-iphone/PROCEDURE_IPHONE.md`) | Condition de toutes les migrations | — | — | Chaîne revérifiée le 24/11 : COMPLET ; 3 altérations détectées |
| 1 | Déploiement du **code** de la branche, sans migration | Le code fonctionne avant et après chaque migration (replis testés) | Étape 0 conseillée | Vercel : retour au déploiement précédent en un geste | Non-régression simulateur |
| 2 | **0142** : migration de sécurité (fichier conservé dans le Drive privé, hors du dépôt public, jusqu'à son application) | Priorité sécurité | Tables déjà en production ; code de l'étape 1 | Fichier de retour (Drive privé) | Testée sur base jetable (Drive privé) |
| 3 | **0134** : profils et privilèges | Sécurité des rôles | — | `rollback/0134…` | 13/13 |
| 4 | **0133** (messagerie), puis **0138** (droits par permission) | Sécurité | 0138 : `a_permission`, déjà en production | Fichiers de retour | 44/44 ; — |
| 5 | **0140** : tables `notifications`, `webhook_logs`, `pre_comptabilite` | Paiement SumUp et alertes | — | `rollback/0140…` | 11/11 |
| 6 | **0141** : BSH Secret Agenda (+ rôle principale/secondaire du personnage officiel, une seule principale garantie) | Continuité, preuves, studio, médiathèque, personnage | 0103 et 0128 (production) ; compatible après 0142 (vérifié) | `rollback/0141…` | 45/45 (24/11) |
| 6 bis | **0143** : vues publiques Bella'Food limitées à l'offre publiée du jour | Lot 5 : un produit non coché n'est plus lisible publiquement (le serveur refuse déjà de le vendre dès l'étape 1) | 0060 (production), `is_fondatrice()`, `food_produit_commandable()` | `rollback/0143…` (vues d'origine relevées en production) | 8/8, idempotence, retour arrière, réapplication |
| 7 | **0135**, puis **0136**, puis **0137** | Candidatures, suspensions | 0134 avant 0135 ; 0137 après 0135 et 0136 | Fichiers de retour | 65/65 |
| 7 · 1 | **0146** : gestion des missions cloisonnée par pôle (`missions.gerer` vérifiée pour le pôle de chaque mission ; « * » = tout Bellaïa) | Permet de limiter la gestion des missions d'une collaboratrice à Vil’Dor Pâtisse (demande du 24/11) | **Après 0137** (0137 corrigée le 24/11 pour utiliser le pôle réel `univers`) ; politiques missions, fil, Storage `equipe-prive`, `mission_ajouter_livrable` | `rollback/0146…` (état de production relevé le 24/11) | Chaîne : 6/6 (cloisonnement) |
| 7 bis | **0145** : répertoire central, unicité des fonctions (index sur compte + fonction + organisation), auteur dans le journal des droits | Corrige l'absence de contrainte d'unicité de `bellaia_roles` (le « on conflict do nothing » de `fondatrice_lier_compte` était inopérant) ; ouvre la recherche par e-mail sur tous les comptes (fondatrice seule) | **Après 0137** : l'acceptation d'invitation de 0137 a été rendue compatible (`on conflict do nothing`, 24/11) ; 0 doublon en production vérifié le 24/11 | `rollback/0145…` | 19/19 ; chaîne 0134→0145→0144 : 65/65 + 5/5 |
| 7 ter | **0144** : BSH Private Club, Secret World, nominations des hôtes, masques signature, Secret Coins, canaux temps réel | Club et monde en ligne (sans elle : mode local et maquette seulement) | Objets de production (`profiles`, `bsh_hotes`, `bsh_evenements`, `bsh_musique`, `bellaia_missions`, `realtime.messages`) ; ne modifie ni `a_permission` (0136) ni le journal ; testée après 0145 dans la chaîne | `rollback/0144…` | 115/115 (9 comptes) ; chaîne : sans erreur |
| 8 | **0139**, **0131**, **0130**, **0132**, **0129** | Fonctions secondaires | 0132 : 0128 (production) | Fichiers de retour | 8/8 ; testés |

**Effets à connaître dès l'étape 1 (code seul, sans migration)** :
- Bella'Food : les clientes ne voient et ne peuvent commander **que l'offre publiée du jour**. Juste après le déploiement, la fondatrice doit publier une première offre (Bella'Food › Offre & tarifs › cocher › « Valider et publier »). Sinon le catalogue client est vide, ce qui est voulu mais doit être anticipé.
- Les écritures de données préparées (tarifs, masquage porc/alcool, variantes, classement, fiches sauces) ne partent **que sur clic et confirmation de la fondatrice**. Aucune n'est faite par le déploiement.

**Limites connues :**
- Chaque migration est testée sur une base jetable qui reproduit les tables concernées. Ce n'est pas une copie complète de la production.
- La copie complète, c'est la restauration de l'étape 0. Elle ne peut pas être faite ici : aucun mot de passe de base n'est présent dans cet environnement, et il ne doit pas y en avoir.

**Points de sécurité restant à décider** : listés dans le rapport privé (Drive), non détaillés ici.
