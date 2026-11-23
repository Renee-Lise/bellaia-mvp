# Rapport différentiel — production / branche complète
*Établi le 23/11/2026. Production : `main` 0bfd765. Branche complète : `claude/session-sdcuy0` 5fda5b5 (63 commits d'avance, 208 fichiers, +15 053 / −446 lignes). Prévisualisation privée à jour : commit 5fda5b5.*

> La prévisualisation utilise la **base de production** : toute action réelle (commande, envoi, modification) y est réelle.

## 1. Base de données : ce qui est réellement appliqué
Vérification objet par objet en production le 23/11. L'historique Supabase ne trace que 0125 et 0126 ; les autres ont été appliquées autrement, d'où ce contrôle.

| Migration | Objet | En production |
|---|---|---|
| 0127 | Modèles de structure masqués aux clientes | oui |
| 0128 | Espace hôtes BSH (colonnes) | oui |
| 0129 | BSH Secret Stories | **non** |
| 0130 | Éditions pédagogiques (versions, créole, traductions) | **non** |
| 0131 | Disponibilités d'agenda | **non** |
| 0132 | Documents des hôtes (dépôt privé) | **non** |
| 0133 | Messagerie interne : règles d'accès | **non** |
| 0134 | Profils : durcissement des droits | **non** |
| 0135 | Candidatures et demandes d'accès | **non** |
| 0136 | Suspensions, révocations, désactivation de compte | **non** |
| 0137 | Missions (réception, avancement, transfert) et invitations | **non** |
| 0138 | Droits par permission explicite (paiements, réservations BSH) | **non** |
| 0139 | Demandes des clientes (aide, contact, droits RGPD) | **non** |

Condition préalable à toute migration : une sauvegarde dont la **restauration réelle** conclut « COMPLET » (procédure : `docs/deploiement/sauvegarde-iphone/PROCEDURE_IPHONE.md`), puis votre autorisation migration par migration.

## 2. Fonctionnalités de la branche et leur dépendance
« Repli » : sans la migration, l'écran reste utilisable ou affiche un message d'attente, sans erreur. Tous les replis ont été testés sur simulateur.

### A. Déployables sans aucune migration
| Fonctionnalité | Tests (simulateur iPhone, sauf mention) |
|---|---|
| Lot 7 (branche limitée `deploiement/lot7`) : compteur et filtre des actions, verrou de la messagerie, inventaire BSH, Milkshakes | prêts, 9 fichiers |
| Sécurité des rôles : l'espace fondatrice réservé au rôle fondatrice ; rôle inconnu refusé ; `/apercu` protégé | inclus dans les tests des portails |
| Portails : une identité, plusieurs rôles, sélecteur « Mes espaces », accueil client, 4 rubriques du compte, agenda à part | 17/17, 12/12 |
| Espace professionnel commun (hôte, partenaire) : missions, agenda, documents, profil ; plus de redirection WhatsApp. Utilise les fonctions de mission déjà en production | 18/18 |
| Navigation : retour du navigateur, geste de retour, zones de sécurité iPhone | 16/16 |
| Lecteur d'histoires : gestes de page, marque-page, progression | 8/8 (unitaires) + 16/16 |
| Mo Ti-Péyi : catalogue en brouillon, « Tarif en cours de validation », aucune commande possible | inclus dans 17/17 |
| Mo Ti-Péyi : jeu de cartes (prototype réservé à la fondatrice) | 23/23 (unitaires) + 16/16 |
| Atelier pédagogique GS | tests de l'atelier |
| BSH Secret Games : refonte, Retour, robustesse multijoueur (restrictions d'accès inchangées) | 15/15, 8/8 |
| Concorde : diagnostic, inventaire, validation des photos | tests d'inventaire |
| Suivi des exigences, allergènes (moteur de classification) | 16/16 |
| Appels de fonctions sans valeur de retour traités comme réussis (correction commune) | non-régression 17/17, 12/12, 5/5 |

### B. Visibles mais inactives tant que la migration n'est pas appliquée (repli testé)
| Fonctionnalité | Migration | Comportement sans migration |
|---|---|---|
| Administration › Candidatures, invitations à usage unique | 0135 (+0137 pour l'invitation) | « en attente d'activation » ; aucun formulaire public |
| Compte client › Demandes (aide, contact, RGPD) | 0139 | rubriques visibles ; contact par les moyens actuels |
| Missions : accusé de réception, avancement en % | 0137 | traces dans le fil de la mission (déjà autorisé) ; statut via la fonction existante |
| Messagerie interne | 0133 | reste verrouillée (lot 7) |
| Disponibilités d'agenda | 0131 | conservées sur l'appareil seulement |
| Éditeur Ti-Colibri (versions, créole, traductions) | 0130 | lecture seule des données existantes |
| Dépôt des documents des hôtes BSH | 0132 | message « indisponible » |
| Studio et bibliothèque Secret Stories | 0129 | simulation, rien n'est enregistré |
| Suspension, révocation, désactivation | 0136 | non disponibles |
| Durcissement des droits | 0134, 0138 | droits actuels inchangés |

### C. Ne pas mettre en production sans votre validation visuelle
Visuels premium (Centre de direction, boutiques premium). La vitrine premium n'a pas encore de validation de commande raccordée : les boutiques actuelles restent en place.

## 3. Ordre de mise en production proposé
1. **Lot 7** (déjà prêt, 9 fichiers) : dès votre GO.
2. **Lot portails et sécurité des rôles** (groupe A, sans migration) : après votre essai sur iPhone de la prévisualisation.
3. **Sauvegarde « COMPLET »** sur une vraie restauration. Aucune migration avant cette étape.
4. **Migrations de sécurité** : 0134, puis 0133, puis 0138, une à la fois, chacune vérifiée.
5. **Migrations fonctionnelles** : 0135, 0136, 0137 (dans cet ordre, interdépendantes), puis 0139, 0131, 0130, 0132 et 0129, selon vos priorités.
6. **Visuels premium** : après validation.

Chaque migration dispose d'un script de retour arrière. Les tests en base isolée sont enregistrés pour 0135 à 0137 (65/65) et pour 0139 (8/8). Le test et le retour arrière de 0138 sont conservés dans le Drive privé.

## 4. Limites
- Les tests d'écran tournent sur un **simulateur** d'iPhone avec une base simulée ; ils ne remplacent pas votre essai sur l'iPhone réel.
- La prévisualisation est construite sur la base de production : les écrans en attente de migration y montrent leur repli, ce qui est voulu.
- TypeScript : 408 erreurs, toutes antérieures et non aggravées. Elles se trouvent surtout dans d'anciens fichiers non chargés.
