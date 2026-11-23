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
- Restent sans migration, par choix : `missions_hote`, `collaborations_partenaire`, `factures_partenaire` (écrans remplacés par l'espace professionnel) et `contrats` (Vilo'Assistance, à concevoir).

Chaque migration a son retour arrière. Tests sur base jetable : 0133 (44/44), 0134 (13/13), 0135 à 0137 (65/65), 0139 (8/8), consignes (16/16), 0140 (11/11, appliquée deux fois, retour arrière puis réapplication vérifiés).

## 3. Autorisations d'accès (testées)
- **Assistante sans droit** : aucun accès à l'espace fondatrice, aux candidatures, aux consignes, au jeu ni au registre.
- **Rôle suspendu** : l'espace ne s'ouvre pas.
- **Compte Famille** : aucun accès à l'atelier ni au jeu.
- **Mineur** : univers réservés aux adultes fermés.
- **Visiteur anonyme** : aucune ligne visible dans les 11 vues contenant des données personnelles (contrôle en production, 23/11 à 17 h 47).
- **Consignes** : contrôlées avec les règles réelles de production (16/16).

## 4. Non-régression (simulateur iPhone et base simulée ; ce n'est pas un iPhone réel)
Voir la section « Résultats » ci-dessous.

## 5. Ce qui bloque, et ce qui peut partir sans migration
- **Sans migration**, déployable après ton essai sur iPhone :
  - lot 7 ;
  - portails, sécurité des rôles et du compte ;
  - en-têtes iPhone, accessibilité, pages légales (en l'état « document de travail ») ;
  - Odyssée, photo produit Food, alertes de la fondatrice, garde SumUp ;
  - consignes IA, jeu (prototype), TypeScript.
- **Bloqué par la sauvegarde « COMPLET »** : toutes les migrations, dont 0140.
- **Bloqué par des contenus ou des décisions** : photos, médiateur, régime de TVA, décisions Odyssée et BSH.
