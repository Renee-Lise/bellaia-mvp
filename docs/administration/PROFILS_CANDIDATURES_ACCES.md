# Administration générale › Gestion — profils, candidatures et accès (23/11/2026)

Complète `ADMINISTRATION_GENERALE_AUDIT_ET_ARCHITECTURE.md` (architecture centrale, tâches, tableau de bord) **sans la répéter** : ce document traite des actions requises, de l'administration des profils, des candidatures, de l'agent de classement et des accès.
Aucune migration appliquée, aucun déploiement, aucun compte fictif créé en production.

## 1. Cause des « 50 actions requises » — corrigée dans le code (commit db46ae4, non déployé)
| Constat | Détail |
|---|---|
| Portail fondatrice | requête limitée à **50 lignes** (`limit=50`) puis affichage de `actions.length` → le chiffre ne pouvait jamais dépasser 50 |
| Badge du menu | comptait `statut ≠ fait` **et** `priorité ≤ 2`, en incluant la ligne technique du registre (`suivi_exigences`) → 48 + 2 = 50 par coïncidence |
| Réel (23/11) | **60 à traiter** (dont 12 en priorité 1 et 1 échue) + 2 en cours = 62 ouvertes (hors ligne technique) |

Correction : règle unique `src/lib/actionsRequises.ts` utilisée par le portail, le badge et l'écran « Actions requises » ; ligne technique exclue ; statuts fermés explicites (`fait`, `annule(e)`, `abandonne`, `sans_objet`) ; plus aucune limite ; tests 8/8. Le portail affiche la liste détaillée cliquable (écran Actions requises existant). **Aucune donnée supprimée.**
Règles de clôture : une action se ferme seulement par changement de statut (avec date et auteur dans l'historique), jamais par suppression. Action candidate à la clôture (décision fondatrice) : « URGENT : 57 produits BSH visibles avec prix provisoire » (résolue par le masquage des 58). Libellés d'univers à harmoniser (BSH / Bella'Secret Home, FOOD / Bella'Food) — affichage seulement.

## 2. Profils administrables aujourd'hui
| Profil | Où | Ce qui fonctionne | Ce qui manque |
|---|---|---|---|
| Comptes (`profiles`, 13) | Accès & permissions | relier un compte existant par e-mail à un rôle ; accorder/retirer des permissions ; journal | aucune fiche consolidée ; pas de suspension par pôle ; pas de révocation de sessions |
| Rôles (`bellaia_roles`, 0) / permissions (`bellaia_permissions`, 0) | Accès & permissions | structure en place, RLS fondatrice | non utilisés à ce jour |
| Hôtes BSH (`bsh_hotes`, 3) | Centre Hôtes BSH | statut, autorisation de missions réelles, permissions (jsonb) | séparé des autres profils |
| Candidatures hôtes (`bsh_hotes_candidatures`, 0) | Centre Hôtes BSH › Candidatures | dépôt, lecture par la candidate, décision fondatrice | uniquement pour les hôtes BSH |
| Assistants, modèles, membres, collaborateurs, responsables de pôle, prestataires, partenaires, comptes Vil'Dor | — | rôle textuel seulement | aucune fiche, aucun formulaire |
| Missions (`bellaia_missions`, 0 ; `erp_taches`, 5) | Équipe › Missions | création, assignation, fil | accusé de réception, progression |

**Opérations qui ne fonctionnent pas** : suspension et désactivation non prises en compte côté serveur ; pas de révocation de sessions ; retrait de permission par suppression de ligne (historique uniquement dans le journal) ; pas de formulaire hors hôtes BSH ; pas d'agent de classement ; deux tables de dépôt de documents vides et doublonnées (à geler, pas à supprimer).
Les constats de sécurité correspondants (et la correction 0134) sont détaillés **dans le rapport privé**, pas dans ce dépôt public.

## 3. Composants réutilisables (pas de doublon)
`AccesPermissions.tsx` (attribution) · `bellaia_roles` / `bellaia_permissions` + `a_permission()` / `est_staff_bellaia()` · `bellaia_missions` + `bellaia_missions_fil` · `audit_log` (74 lignes, champs ancien/nouveau statut, motif = `commentaire`) · `bsh_hotes_candidatures` (modèle de formulaire minimal déjà conforme : majeur confirmé, charte, sans pièce d'identité) · Centre Hôtes BSH (onglets candidatures, invitations, documents) · stockage privé `equipe-prive` · médiathèque `events_medias` (719) · règle de compteur `actionsRequises.ts` · écran Actions requises.

## 4. Quatre niveaux d'action, tous côté serveur, motivés, confirmés, journalisés
| Action | Effet | Réversible | Données |
|---|---|---|---|
| **Suspension** (temporaire, par pôle ou globale) | permissions du pôle inactives jusqu'à une date ou levée ; sessions révoquées | oui (« Réactiver ») | conservées |
| **Révocation** (d'un rôle ou d'un accès précis) | la ligne de rôle/permission passe à `revoque` avec date, auteur, motif (plus de `DELETE`) | nouvelle attribution nécessaire | conservées |
| **Désactivation** du compte | `profiles.statut = 'inactif'` + toutes les permissions expirées + sessions révoquées ; connexion refusée | oui, par la fondatrice | conservées |
| **Suppression** | uniquement sur demande RGPD de la personne, après délai légal ; anonymisation des données liées | **non** — accord explicite de la fondatrice à chaque fois | anonymisées |

Règles : motif obligatoire ; double confirmation pour révocation, désactivation, suppression ; personne ne modifie ses propres privilèges (déjà dans 0134) ; seuls la fondatrice (et un responsable de pôle pour **son** pôle, sans rôle privilégié) suspendent ; `est_staff_bellaia()` et `a_permission()` vérifient le statut du compte et la suspension du pôle (sinon le blocage n'est qu'affiché) ; révocation des sessions par fonction serveur (`auth.sessions`, `security definer`, fondatrice seule).

## 5. Formulaires de candidature (données minimales)
Socle commun (repris de `bsh_hotes_candidatures`) : prénom, nom ou pseudonyme, e-mail, téléphone (facultatif), ville, motivation, expérience, disponibilités, langues, **déclaration « je suis majeur(e) »** (case + date de naissance **non** demandée à ce stade), consentement RGPD, acceptation de la charte.
| Type | Champs spécifiques | Exclus volontairement |
|---|---|---|
| Hôte | événements souhaités, mobilité | pièce d'identité (demandée seulement après acceptation, consultée puis non conservée : on garde « âge vérifié le … par … ») |
| Assistant | pôles souhaités, compétences (liste), outils | situation familiale, santé, photo |
| Modèle | **types de missions acceptés** (liste fermée : produits, mode, beauté, événementiel…) et **limites** (liste fermée + champ libre), portfolio facultatif | toute question intime, mensurations non nécessaires, orientation, religion, origine |
| Accès Membres | univers demandé, parrainage éventuel | — |
| Autre | objet, message | — |
Pièces jointes : stockage privé, liées au dossier (médiathèque, § 8).

## 6. Statuts, critères et agent de classement
Statuts : Nouvelle candidature · Dossier incomplet · À analyser · À contacter · Entretien à programmer · Présélectionné · Accepté · Refusé · En attente · Suspendu · Archivé.
Critères objectifs (pondération réglable par la fondatrice) : complétude du dossier ; adéquation disponibilités ↔ besoins du pôle ; expérience déclarée en lien avec le rôle ; langues utiles ; zone géographique ; respect des limites déclarées (modèles) ; charte et majorité confirmées (bloquant).
**Agent** : lit uniquement les champs ci-dessus ; produit un statut proposé (jamais « Accepté » ni « Refusé »), un score par critère et **une explication en phrases** ; signale les dossiers incomplets ; ne reçoit pas les champs non pertinents (photo, âge exact, genre, nom de famille) pour ne pas classer sur des caractéristiques protégées ; chaque proposition est journalisée (version des critères, date) ; la décision finale est toujours humaine. Fonctionne sans IA (règles) ; l'appel à un modèle d'IA pour la synthèse de la motivation est optionnel et consomme des crédits → à autoriser.

## 7. Après validation humaine
Création ou liaison du compte (jamais de doublon : recherche par e-mail) → invitation sécurisée à usage unique (lien expirant, 72 h) → acceptation des conditions (horodatée) → attribution du rôle et des pôles **non privilégiés** ; tout rôle privilégié (`acces_complet`, responsable de pôle, accès BSH sensibles) reste une action manuelle de la fondatrice.

## 8. Missions et médiathèque
Missions : réutilise `bellaia_missions` (ajouts : `accuse_reception_le`, `progression` 0–100 %) ; visible dans le pôle et l'espace personnel (même enregistrement) ; fil relié à la messagerie après 0133.
Médiathèque intelligente : documents de candidature dans `equipe-prive/candidatures/<id>/`, référencés dans la médiathèque avec l'étiquette « dossier de candidature », visibles fondatrice seulement ; conservation : refusé → suppression à 6 mois (sauf accord de la personne pour 2 ans) ; accepté → durée du contrat + délai légal ; journal de chaque consultation.

## 9. Migrations nécessaires (à autoriser après sauvegarde vérifiée)
| N° | Contenu |
|---|---|
| 0134 (prête, testée 13/13) | verrou des privilèges des profils |
| 0133 (prête, testée 44/44 ; 20 attaques — le message du commit indiquait 24 par erreur) | sécurité messagerie |
| 0135 | `bellaia_candidatures` générique (type, champs communs, `donnees` jsonb par type, statut, proposition de l'agent, décision humaine) ; **reprise** de `bsh_hotes_candidatures` (vue de compatibilité, pas de suppression) |
| 0136 | suspensions par pôle (`bellaia_suspensions` : personne, pôle, motif, du, au, par) ; `bellaia_permissions`/`bellaia_roles` : statut `revoque` + motif au lieu du `DELETE` ; prise en compte dans `a_permission()` et `est_staff_bellaia()` ; fonction de révocation de sessions |
| 0137 | missions : accusé de réception, progression ; invitations à usage unique |

## 10. Tests obligatoires (18) — base PostgreSQL jetable puis application simulée ; jamais de faux utilisateurs en production
1 compteur = liste détaillée ; 2 aucune ligne supprimée par une clôture ; 3 inscription « fondatrice » forcée en cliente ; 4 personne ne modifie ses propres privilèges ; 5 seule la fondatrice attribue un rôle privilégié ; 6 suspension d'un pôle → refus immédiat sur ce pôle, autres pôles intacts ; 7 réactivation ; 8 révocation conservée dans l'historique ; 9 désactivation → connexion et API refusées, sessions révoquées ; 10 suppression impossible sans confirmation fondatrice ; 11 dépôt de candidature anonyme sans lecture des autres ; 12 candidate ne lit que son dossier ; 13 l'agent ne propose jamais Accepté/Refusé ; 14 l'agent n'utilise aucun champ exclu ; 15 acceptation → invitation unique, expirée après usage ; 16 aucun rôle privilégié automatique ; 17 mission visible dans le pôle et l'espace personnel avec accusé de réception ; 18 documents de candidature invisibles hors fondatrice + journal de consultation. Plus : iPhone (simulateur, présenté comme tel) et ordinateur.

## 11. Plan de déploiement
1. **Sauvegarde** complète vérifiée (procédure de `docs/deploiement/RECETTE_ISOLEE_ET_SAUVEGARDES.md`) ;
2. 0134 puis 0133 (accord explicite) ; contrôles après application ; retour arrière prêt ;
3. Déploiement du code déjà prêt (compteur, verrou messagerie, inventaire, famille Milkshakes) — accord explicite ;
4. 0135–0137 testées en base jetable, puis accord ;
5. Écrans « Gestion › Candidatures et accès » et fiche profil (maquettes : `maquettes_candidatures_acces.html`) ;
6. Formulaires publics publiés seulement après validation des textes par la fondatrice.

## 12. Red Team
Formulaire public = vecteur de spam et de dépôt de fichiers malveillants → limitation de débit, types de fichiers fermés, taille maximale, pas d'aperçu automatique. Agent : risque de biais et d'injection de consignes dans la motivation → texte traité comme donnée, jamais comme instruction ; explication obligatoire. Suspension uniquement affichée = faux sentiment de sécurité → contrôle dans les fonctions de droits. Données de modèles et d'hôtes BSH = sensibles : cloisonnement, pas d'export global, durée de conservation courte.
