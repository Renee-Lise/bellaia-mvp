# Contrôle avant mise en production — 23/11/2026
*Branche `claude/session-sdcuy0` ; production `main` 0bfd765. Rien n'a été déployé et aucune migration n'a été appliquée.*

## 1. Sauvegardes
| Point | État | Conséquence |
|---|---|---|
| Sauvegarde complète avec restauration réelle « COMPLET » | **Pas encore réalisée** (procédure iPhone prête : `sauvegarde-iphone/PROCEDURE_IPHONE.md`) | **Aucune migration** n'est possible |
| Sauvegardes automatiques Supabase | Non vérifiables depuis l'outil ; restauration jamais testée | Ne pas s'y fier seules |
| Retour arrière du **code** | Vercel permet de revenir en un geste au déploiement précédent | Un déploiement **sans migration** reste réversible immédiatement |

## 2. Dépendances des migrations (aucune appliquée)
Ordre imposé par les objets utilisés dans chaque fichier :
- **0134** (profils) : à passer en premier pour la sécurité ; prérequis de 0135.
- **0133** (messagerie) : indépendante.
- **0138** (droits par permission) : utilise `a_permission`, déjà en production.
- **0135** (candidatures), puis **0136** (suspensions, fonction `est_suspendu`), puis **0137**, qui utilise les deux précédentes.
- **0139** (demandes RGPD) : indépendante.
- **0131**, **0130**, **0132** (s'appuie sur `bsh_hotes`, issue de 0128, déjà en production), **0129** : indépendantes entre elles.
- **0140** (préparée le 23/11, non appliquée) : crée `notifications`, `webhook_logs` et `pre_comptabilite`, tables utilisées par le code mais jamais créées. Elle est indépendante des autres et utilise `est_staff_bellaia`, qui existe déjà en production.
- **0141** (préparée le 24/11, non appliquée) : BSH Secret Agenda (missions déléguées, preuves de publication, médiathèque, studio, mode Continuité). Elle dépend de 0103 et 0128, déjà en production, et est indépendante de 0129 à 0140. Testée 34/34 sur base jetable reproduisant le schéma et les règles de production.
- Restent sans migration, par choix : `missions_hote`, `collaborations_partenaire`, `factures_partenaire` (écrans remplacés par l'espace professionnel) et `contrats` (Vilo'Assistance, à concevoir).

Chaque migration a son retour arrière. Tests sur base jetable : 0133 (44/44), 0134 (13/13), 0135 à 0137 (65/65), 0139 (8/8), consignes (16/16), 0140 (11/11, appliquée deux fois, retour arrière puis réapplication vérifiés), 0141 (34/34, mêmes vérifications).

## 3. Autorisations d'accès (testées)
- **Assistante sans droit** : aucun accès à l'espace fondatrice, aux candidatures, aux consignes, au jeu ni au registre.
- **Rôle suspendu** : l'espace ne s'ouvre pas.
- **Compte Famille** : aucun accès à l'atelier ni au jeu.
- **Mineur** : univers réservés aux adultes fermés.
- **Visiteur anonyme** : aucune ligne visible dans les 11 vues contenant des données personnelles (contrôle en production, 23/11 à 17 h 47).
- **Consignes** : contrôlées avec les règles réelles de production (16/16).

## 4. Non-régression (simulateur iPhone et base simulée ; ce n'est pas un iPhone réel)
Batterie complète lancée le 23/11 au soir sur la branche (commit 3b86442), puis reprise des cas à examiner le 24/11.

**Tests unitaires : 12 fichiers, tous au vert.**
Actions 8/8, allergènes 17/17, atelier GS 34/34, balayage 8/8, candidatures 12/12, consignes 12/12, disponibilités 15/15, éditeur légal 9/9, jeu Mo Ti-Péyi 23/23, plan du site 9/9, sécurité du compte 12/12, BSH continuité 29/29.

**Tests d'écran (simulateur iPhone 13), tous au vert :**
| Domaine | Tests et résultats |
|---|---|
| Alertes et comptes | alertes fondatrice 5/5, candidatures 16/16, compte et espaces 17/17, sécurité du compte 14/14 |
| Contenus | consignes 14/14, lecteur 16/16, jeu de cartes 16/16 |
| Affichage | en-têtes 3/3 |
| Espaces | espace pro 18/18, portails mobiles 12/12, messagerie verrouillée 5/5 |
| Registre et BSH | registre 16/16, inventaire 13/13, photos BSH 15/15 |
| Secret Games | 15/15 et 8/8 (robustesse) |
| Bella'Food | photo Food 8/8 ; commandes : cliente 17/17, assistante 17/17, fondatrice 19/19 |
| Odyssée | 9/9 |
| Pages légales | 15 contrôles sur 15 (le 16ᵉ est une mesure informative) |
| BSH Secret Agenda | 42/42 : fondatrice, hôte titulaire, hôte remplaçante, cliente, et base avant 0141 |
| Boutons de l'accueil | fondatrice 74/74, cliente 49/49, assistante 42/42, 0 bouton sans effet |
| Agenda | 3 profils sans erreur ; catalogue sans erreur |

**Écarts examinés : aucune régression du code.**
- `t_photos_plan` (12/15 au premier passage) : environnement incomplet. Relancé dans l'environnement prévu : 15/15.
- `t_cal` et `t_boutons` assistante : scripts antérieurs au parcours « Mes espaces » (6e2bf15). Adaptés : sans erreur, 42/42.
- `t_valid` : remplacé par `t_photos_plan` depuis 7160a7b ; il dépend d'un téléchargement externe bloqué. Retiré de la batterie et signalé dans `tests/iphone/LISEZMOI.md`.
- `t_legal_accessibilite` 15/16 : le 16ᵉ contrôle est une mesure (taille d'un champ sous WebKit simulé), à vérifier sur un iPhone réel.

**Bases jetables :** 0133 44/44 ; 0134 13/13 ; 0135 à 0137 65/65 ; 0139 8/8 ; 0140 11/11 ; 0141 34/34 ; consignes 16/16.

## 5. Ce qui bloque, et ce qui peut partir sans migration
- **Sans migration**, déployable après ton essai sur iPhone :
  - lot 7 ;
  - portails, sécurité des rôles et du compte ;
  - en-têtes iPhone, accessibilité, pages légales (en l'état « document de travail ») ;
  - Odyssée, photo produit Food, alertes de la fondatrice, garde SumUp ;
  - consignes IA, jeu (prototype), TypeScript.
- **Bloqué par la sauvegarde « COMPLET »** : toutes les migrations, dont 0140.
- **Bloqué par des contenus ou des décisions** : photos, médiateur, régime de TVA, décisions Odyssée et BSH.
