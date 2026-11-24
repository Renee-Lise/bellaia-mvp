# BSH Secret Agenda — matrice du complément au cahier des charges (24/11/2026)

## Colonnes et légende
- **Existant** : présent avant ce complément.
- **Réutilisé** : élément existant sur lequel la fonctionnalité s'appuie.
- **Nouveau** : ajouté sur la branche `claude/session-sdcuy0`.
- **Testé** :
  - **U** : tests unitaires (`tests/unit/t_bsh_continuite.js`, 29/29) ;
  - **SQL** : base PostgreSQL jetable reproduisant le schéma et les règles d'accès de production (`supabase/tests/0141_bsh`, 34/34) ;
  - **É** : écran sur **simulateur** iPhone 13, encoche imposée (`tests/iphone/t_bsh_agenda.js`, 42/42).
- **Déployé** : **rien**. La production reste sur `main` 0bfd765.

**Aucune vérification sur un iPhone réel n'a été faite.** La migration 0141 est **préparée, non appliquée**.

## 1. Continuité communautaire
| Exigence | Existant / réutilisé | Nouveau | Testé | Déployé |
|---|---|---|---|---|
| Préparer les animations sur plusieurs semaines | Programmation par jour (0103), « Préparer la semaine » | Préparation sur 1 à 8 semaines : brouillons sur les créneaux libres, texte validé de départ | U, É (24 brouillons, aucun le samedi) | Non |
| Hôte principal et remplaçant | `bsh_hotes` (0128) | Mode « Continuité BSH » (`bsh_agenda_reglages.continuite_*`) | SQL, É | Non (0141) |
| Scénarios, textes et visuels validés | — | Médiathèque : seules les ressources validées aux droits établis sont proposées et confiées | SQL, É | Non (0141) |
| Reports et annulations | Statuts « reporté » et « annulé » (0103) | Report (nouvelle date, motif) et annulation de mission, répercutés sur la publication liée | É | Non (0141) |
| Suivi des missions réalisées | `bsh_missions` (0014/0128) | Statut d'exécution et compte rendu, compteurs | SQL, É | Non (0141) |
| Alerte sans responsable disponible | Disponibilités des hôtes (0128) | Alertes : titulaire, puis remplaçant, puis mode Continuité ; affichage seul, aucune notification envoyée | U, É | Non (fonctionne aussi avant 0141) |
| Programmation ≠ publication | — | Garde en base : « publié » exige validation **et** preuve ; écran en 4 étapes | U, SQL, É | Non (0141) |

## 2. Studio créatif
| Exigence | Existant / réutilisé | Nouveau | Testé | Déployé |
|---|---|---|---|---|
| Affiches, stories, sondages, cartes de jeu, invitations, événements, campagnes, scénographies | Palette BSH, stockage `bsh-visuels` | 8 formats au format réel (1080 × 1350, 1080 × 1920, 750 × 1050, 1600 × 1000) | U, É | Non (0141) |
| Ambiances glamour, sensuelle, dark romance | Palette BSH | 3 ambiances | É | Non |
| Personnage féminin principal validé | — | Utilisé **uniquement** s'il est déposé et validé dans la médiathèque. Il n'en existe aucun aujourd'hui : rien n'est inventé | É | Non |
| Brouillons, variantes, aperçu, corrections, historique | — | Versions en ajout seul (garanti par la base), notes de correction, variantes liées, aperçu, export PNG vers la médiathèque (à valider) | SQL, É | Non (0141) |
| Lien avec le studio de Bellaïa | Médiathèque Events (719 médias), outils de stockage | Médias Events réutilisés par référence | É | Non |

## 3. Gestion des contenus
| Exigence | Existant / réutilisé | Nouveau | Testé | Déployé |
|---|---|---|---|---|
| Médiathèque commune Agenda / Games / Rewards | `events_medias` (Events) | `bsh_ressources` : univers, campagne, espace, date, type, auteur, validation, droits | SQL, É | Non (0141) |
| Pas de doublons avec les modules existants | — | Empreinte SHA-256 unique (base) ; média Events référencé sans copie ; contrôle titre + type + univers pour les textes | U, SQL, É | Non (0141) |

## 4. Délégation aux hôtes
| Exigence | Existant / réutilisé | Nouveau | Testé | Déployé |
|---|---|---|---|---|
| Responsable, remplaçant facultatif, horaire, espace, consignes, ressources, statut d'exécution, compte rendu | `bsh_missions` (responsable, horaire, consignes) | Remplaçant, espace, publication et animation liées, ressources autorisées, statut d'exécution, compte rendu | SQL, É | Non (0141) |
| Permissions côté serveur et dans Supabase | Règles « hôte attribuée » (0103), `bsh_mon_hote` (0128) | Remplaçant inclus dans les règles d'accès ; déclarations par fonctions contrôlées ; report et annulation réservés à la fondatrice ; modification directe refusée | SQL (34/34) | Non (0141) |
| Écran de l'hôte | Espace hôte BSH (aperçu fondatrice seulement) | Bloc « Missions Bella'Secret Home » dans l'espace professionnel réel de l'hôte, affiché seulement si la base la reconnaît | É | Non |

## 5. Publication et automatisation
| Opération | Où | Testé |
|---|---|---|
| 1. Génération | Brouillon (éditeur, préparation, import, studio) | U, É |
| 2. Validation | « ✓ Valider » : date de validation enregistrée | U, SQL, É |
| 3. Programmation | Exige la validation et une date. Rien n'est envoyé | U, SQL, É |
| 4. Publication confirmée | Preuve obligatoire (fondatrice ou hôte de la mission), dans une table séparée, jamais publique | U, SQL, É |

**Automatisation : rien n'est envoyé automatiquement, et aucun envoi n'est simulé.**
- L'interface officielle des groupes WhatsApp (Cloud API) existe, mais :
  - elle est limitée à 8 participants ;
  - elle exige un compte professionnel officiel ;
  - elle ne fonctionne que pour des groupes créés par l'interface ;
  - elle est facturée par membre atteint.
- Aucune interface officielle n'est confirmée pour les chaînes et communautés.
- Elle ne convient donc pas aux espaces BSH actuels.

L'automatisation possible reste interne : préparation, rappels (fichier calendrier), copie du texte, ouverture de WhatsApp, puis confirmation avec preuve.

## 6. Christmas Secrets 2026
- **Ce qui est prêt** :
  - création de la campagne (17/11 → 25/12/2026, brouillon) ;
  - import avec aperçu ;
  - dates passées **archivées en programmation historique** ou **replanifiées** ;
  - doublons ignorés ;
  - samedi de pause et heures hors 8 h / 21 h signalés ;
  - fuseau America/Cayenne.
- **Ce qui manque** : le calendrier détaillé n'a pas été transmis. Il n'est ni dans le Drive, ni dans le dépôt, ni joint au message. **Aucune publication n'a été inventée ni créée en production.**
- **À trancher** : une campagne « Noël BSH » (01/12 → 26/12, brouillon) existe déjà en production. L'écran le signale, pour éviter un doublon.

## 7. Contrôle qualité (simulateur, base simulée ; ce n'est pas un iPhone réel)
| Point demandé | Couverture |
|---|---|
| Affichage sur iPhone | É : aucun débordement horizontal, encoche à 47 px (fondatrice et hôte) |
| Calendriers et récurrences | U : 68 créneaux pour la campagne, 21 h Cayenne = 00 h UTC ; É : préparation sur 2 semaines |
| Persistance | É : chaque action est vérifiée dans l'état de la base simulée ; SQL : écritures réelles PostgreSQL |
| Permissions des hôtes | SQL 34/34 ; É : la remplaçante ne voit que sa mission et la ressource autorisée |
| Changements de statut | U 29/29, SQL, É |
| Continuité en cas d'absence | U (cas 21 à 25), É (cas 19 et 20) |
| Duplication | U, É (copie en brouillon, sans validation) |
| Restrictions d'accès aux jeux BSH | Non-régression Secret Games : 15/15 et 8/8 (robustesse) |
| Liens Agenda / Games / Rewards | Ressources liées à un jeu ou à une campagne Rewards ; cartes de jeu exportées dans l'univers Secret Games |
| Base avant migration | É : comportement honnête (refus expliqué, rien n'est marqué publié) |

## Défauts trouvés dans l'existant et corrigés sur la branche
1. **« Marquer comme publié »** faisait passer une publication à « publié » sans aucune preuve. Bouton remplacé par la confirmation avec preuve ; « Publié » est retiré de la liste des statuts de l'éditeur.
2. **Colonnes lisibles publiquement** : 0141 limite la lecture publique d'une publication aux seules colonnes destinées au public (détail dans le rapport privé).
3. **Espace hôte BSH complet** : il n'était accessible qu'en aperçu fondatrice. Les missions d'animation sont désormais dans l'espace réel de l'hôte.
4. **Missions du remplaçant** : elles n'étaient visibles nulle part. Elles sont désormais incluses, en lecture seule pour la mission elle-même.

## Pour passer en production (ton accord est nécessaire)
1. Sauvegarde avec restauration réelle « COMPLET ».
2. Application de 0141. Elle dépend de 0103 et 0128, déjà en production, et est indépendante des migrations 0129 à 0140.
3. Déploiement de la branche.
4. Essai sur ton iPhone.
5. Transmission du calendrier Christmas Secrets, puis import, puis validation ligne par ligne.
