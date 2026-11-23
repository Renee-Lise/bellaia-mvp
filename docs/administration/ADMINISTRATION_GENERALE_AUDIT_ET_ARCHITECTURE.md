# Administration générale centralisée — audit, architecture, permissions, tâches, plan (23/11/2026)

Statut : **proposition à valider**. Aucune migration, aucune donnée modifiée. Maquettes : `docs/administration/maquettes_admin.html`.

## 1. Audit de l'existant (base de production, comptages exacts)

| Domaine | Tables présentes (lignes) | Utilisées par le code | Constat |
|---|---|---|---|
| Personnes / comptes | `profiles` (13) | partout (rôle unique : fondatrice, assistante, cliente, hôte…) | Un seul rôle par compte ; la règle `profiles_staff_all` permet à tout le « personnel » de lire **et modifier** tous les profils → **à restreindre** (Red Team) |
| Clients | `bellaia_clients` (0), `clients` (0), `clientes_crm` (0), `prospects` (0), `bellaia_contacts` (0), `client_activities`, `bellaia_client_historique` | `crm/ClientCenter` (bellaia_clients), recherche globale (clients), mémoire (prospects) | **4 tables clients concurrentes, toutes vides** |
| Organisations / partenaires | `bellaia_organisations` (1) | Vil'Dor, revente Food, accès | Base saine pour les organisations |
| Fournisseurs | `bellaia_fournisseurs` (0, non utilisée), `food_fournisseurs` (0), fournisseurs BSH implicites (Concorde, dans les notes produits) | Food seulement | **Doublon** ; aucun répertoire commun utilisé |
| Pôles | `business_units` (15) | portails, équipe, packs | Référentiel des pôles existant |
| Rôles et permissions | `bellaia_roles` (0), `bellaia_permissions` (0), fonction `a_permission(code, univers)`, `bsh_hotes.permissions` (json) | `equipe/AccesPermissions`, `lib/permissions.ts`, paiements | **Modèle personne × permission × pôle × expiration déjà en place** (bien conçu, encore vide) |
| Tâches / missions | `bellaia_missions` (0, 28 colonnes : pôle, assigné, priorité, échéance, pièces jointes, livrables, temps passé…), `bellaia_missions_fil` (commentaires), `erp_taches` (5), `bsh_missions` (0, hôtes), `taches_editoriales` (0, non utilisée) | Espace équipe, portail assistante, calendrier ; `erp_taches` dans le tableau de bord | `bellaia_missions` + fil = bonne base ; **4 modèles de tâches** |
| Hôtes BSH | `bsh_hotes` (3), candidatures, disponibilités, documents, messages, missions, présences | Centre hôtes BSH | Espace dédié existant, règles strictes (l'hôte ne voit que sa fiche) |
| Journalisation | `audit_log` (74), `bellaia_journal` (0), `ia_journal`, `bsh_salon_journal` | Workflow, accès, paiements | 2 journaux généraux concurrents |
| Notifications / messagerie | `bellaia_notifications`, messagerie (sécurisation en attente, migration 0133) | — | Voir dossier messagerie |

## 2. Doublons et décision proposée (aucune suppression : les tables vides sont gelées, pas effacées)

| Doublon | Table de référence proposée | Autres tables |
|---|---|---|
| Clients | **`bellaia_personnes`** (nouvelle fiche unique) + `bellaia_clients` conservée comme « relation client » | `clients`, `clientes_crm`, `prospects` gelées (vides) |
| Fournisseurs | **`bellaia_fournisseurs`** (commune, pôles desservis) | `food_fournisseurs` gelée (vide) ; Concorde Pro / Passage du Désir créés comme fiches |
| Tâches | **`bellaia_missions`** + `bellaia_missions_fil` | `erp_taches` (5 lignes) reprises puis gelées ; `taches_editoriales` gelée ; `bsh_missions` **conservée** (missions d'hôtes rémunérées, confidentialité BSH) et reliée par `mission_id` |
| Journal | **`audit_log`** | `bellaia_journal` alimentée en parallèle jusqu'à bascule |
| Rôles | **`bellaia_permissions`** (+ `bellaia_roles` pour les fonctions) | `profiles.role` conservé comme rôle principal (compatibilité) |

## 3. Architecture centralisée

```
bellaia_personnes (fiche unique : identité, coordonnées, consentements RGPD, étiquettes, statut)
   │  1 personne = 1 fiche, même si elle est cliente de 3 pôles et assistante d'un 4e
   ├─< personne_roles (personne, catégorie : client | prospect | assistant | collaborateur | hôte | fournisseur-contact | prestataire | partenaire | responsable de pôle ; pôle ; statut ; dates)
   ├─< relations_pole (personne, pôle, historique propre au pôle — commandes, réservations, devis, réclamations)  ← cloisonné par pôle
   ├── profile_id → profiles (compte de connexion éventuel)
   └── organisation_id → bellaia_organisations (société, fournisseur, partenaire)
bellaia_fournisseurs (organisation, pôles desservis, conditions, délais, contacts → personnes, documents privés)
bellaia_missions (tâche : pôle, responsable, participants, priorité, échéance, instructions, pièces jointes, sous-tâches, validations, statut)
   └─< bellaia_missions_fil (commentaires, fichiers, changements de statut) ── lien vers la conversation de messagerie
bellaia_permissions (personne × code d'action × pôle × expiration) + audit_log (actions sensibles)
```

Données confidentielles par pôle : `relations_pole` est filtrée par pôle ; **BSH** reste dans ses tables (hôtes, membres, commandes) avec des règles plus strictes : la fiche centrale d'une personne cliente BSH n'affiche **que** « relation BSH : oui » à la fondatrice et aux personnes ayant `bsh.clients.lire`, jamais le détail aux autres pôles.

## 4. Profils et permissions

| Profil | Voit | Peut faire |
|---|---|---|
| Fondatrice | Tout (supervision) | Tout ; seules actions irréversibles ; journal complet |
| Responsable de pôle | Son pôle (personnes en relation avec le pôle, missions, stocks du pôle) | Créer/attribuer des missions dans son pôle ; valider |
| Assistant / collaborateur | **Ses missions** et les fiches strictement nécessaires (coordonnées de livraison d'une commande assignée…) | Mettre à jour ses missions, commenter, joindre des fichiers |
| Hôte BSH | Sa fiche, ses missions BSH, ses documents et messages | Répondre aux missions, déposer ses documents |
| Prestataire / partenaire | Les missions où il est participant | Commenter, livrer |
| Client / famille | Ses propres commandes, réservations, documents | Aucune donnée interne |

Codes d'action (exemples) : `annuaire.lire`, `annuaire.modifier`, `clients.lire:<pôle>`, `missions.gerer:<pôle>`, `missions.valider:<pôle>`, `fournisseurs.gerer`, `stocks.lire:<pôle>`, `bsh.clients.lire`, `admin.journal`.
Règles RLS : lecture d'une fiche = fondatrice OU personne elle-même OU permission `annuaire.lire` **et** relation avec un pôle autorisé ; les champs sensibles (date de naissance, notes internes, données BSH) dans des tables séparées à accès plus restreint ; **désactivation** = statut `inactif` + expiration immédiate de toutes les permissions + révocation des sessions (aucune suppression, historique conservé) ; toute attribution/révocation de permission et toute désactivation sont journalisées dans `audit_log`.

## 5. Gestionnaire de tâches
- Création depuis l'Administration générale : choix de la personne, du pôle, priorité, échéance, instructions, pièces jointes (stockage privé `equipe-prive/missions/<id>` déjà protégé), sous-tâches, validations requises.
- Statuts : à faire · en cours · en attente · à valider · terminée · annulée (correspondance avec les statuts actuels de `bellaia_missions` à établir lors de la migration).
- La mission apparaît **dans l'espace personnel** de la personne (portail assistante / espace hôte) et **dans le pôle concerné** (même enregistrement, pas de copie).
- Vues : liste, calendrier (CalendrierPremium existant), tableau Kanban.
- Passage à « à valider » → notification à la fondatrice ou au responsable de pôle ; le texte de la notification ne contient que le titre générique si le destinataire n'a pas le droit de lire le détail.
- Fil de mission relié à une conversation de messagerie (après application de la sécurisation 0133).

## 6. Tableau de bord Fondatrice
Synthèse transversale filtrable (pôle, personne, période, priorité) : collaborateurs actifs ; missions urgentes / en retard / à valider ; clients à suivre ; fournisseurs à relancer ; commandes et réservations à traiter ; alertes de stock (règle de disponibilité commune) ; messages importants ; notifications de sécurité ; activité récente (audit_log). Chaque carte ouvre la fiche détaillée en un appui (iPhone).

## 7. Plan d'intégration par lots

| Lot | Contenu | Autorisation |
|---|---|---|
| A0 (sans migration) | Maquettes, écrans en lecture seule sur l'existant (missions, permissions, journal), tableau de bord sur données existantes | Validation des maquettes |
| A1 | **Sécurité d'abord** : restreindre `profiles_staff_all` ; appliquer 0133 (messagerie) | **Migrations à autoriser** (après sauvegarde) |
| A2 | `bellaia_personnes`, `personne_roles`, `relations_pole` ; fournisseurs communs ; règles RLS | Migration à autoriser |
| A3 | Gestionnaire de tâches complet (sous-tâches, validations, Kanban, calendrier), reprise des 5 `erp_taches` | Migration à autoriser |
| A4 | CRM centralisé (vue par pôle, BSH cloisonné), annuaire, recherche globale | Migration à autoriser |
| A5 | Liaison messagerie, notifications, journal des actions sensibles | — |

## 8. Tests obligatoires (préparés pour chaque lot, sur base jetable puis simulée)
1. Une personne cliente de Food et d'Odyssée = **une** fiche, deux historiques.
2. Une tâche créée depuis l'Administration générale est visible dans le pôle et dans l'espace de la personne (même identifiant).
3. Un assistant ne voit que ses missions (et pas celles d'un autre assistant).
4. Un hôte ne lit aucune donnée d'un autre pôle ni d'un autre hôte.
5. Un fournisseur partagé entre Food et BSH n'existe qu'une fois.
6. Un client ne voit jamais les notes internes, les marges ni les données d'autres clients.
7. Désactiver un collaborateur révoque immédiatement ses accès (lecture refusée au prochain appel).
8. Notifications sans fuite d'information confidentielle.
9. iPhone et ordinateur.

## 9. Risques (Red Team)
- **Centralisation = surface d'attaque accrue** : une erreur de règle expose tous les pôles → tests d'attaque systématiques comme pour 0133.
- `profiles_staff_all` trop large (lecture/modification de tous les profils par le personnel).
- Doublons historiques (4 tables clients) : risque de saisie au mauvais endroit tant qu'elles ne sont pas gelées.
- Données BSH (sensibles) : cloisonnement obligatoire, pas d'export global.
- RGPD : finalités, durées de conservation, droit d'accès/effacement, registre des traitements.
- Pas de sauvegarde restaurable (forfait gratuit) : préalable à toute migration de ce chantier.
