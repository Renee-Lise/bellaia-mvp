# Actions requises — revue individuelle du 20/11/2026

Chaque action a été vérifiée en base ou dans le code. **Seules les actions dont la résolution est prouvée ont été clôturées** ; pour chacune, la preuve est inscrite dans le champ « réponse » et l'historique de l'action (rien n'a été supprimé).

Preuves relevées le 20/11 : 0 appareil abonné aux notifications ; 0 paiement enregistré ; profils = 1 fondatrice + 7 clientes (aucun compte assistante ni hôte) ; aucune permission d'équipe accordée ; bibliothèque Food = 8 fiches à valider + 111 à importer ; lexique créole = 6 mots candidats ; revente = 0/14 prix confirmés ; protection des mots de passe compromis toujours désactivée (avertissement Supabase).

## Bilan chiffré

| | 49 initiales | 14 ajoutées le 19/11 | 3 ajoutées le 20/11 |
|---|---|---|---|
| **Terminées (preuve)** | 4 | 1 | 0 |
| À faire par vous (réglage, test sur iPhone) | 5 | 0 | 0 |
| Bloquées : fichier ou information manquante | 11 | 1 | 0 |
| Démarches externes (rectorat, DAAF, immatriculation, contrat) | 6 | 0 | 0 |
| En attente de votre décision ou validation | 22 | 11 | 3 |
| En cours côté développement | 1 | 1 | 0 |

## Les 49 actions initiales

| # | Action | État | Preuve / ce qui manque |
|---|---|---|---|
| 1 | Notifications sur iPhone | À faire par vous | Clés VAPID présentes sur Vercel ; 0 appareil abonné |
| 2 | PayPal : garder ou retirer | Décision | — |
| 3 | Régime fiscal et mention TVA | Décision (comptable) | — |
| 4 | Tester un vrai paiement SumUp | À faire par vous | 0 paiement ; aucun paiement déclenché par Claude |
| 5 | Coordonnées par activité | Décision (relecture) | 8 fiches émetteur |
| 6 | Quatre recettes à compléter | Bloquée | grammages, rendement, temps |
| 7 | Barquette frites / poulet boucané | Bloquée | composition, portion, prix |
| 8 | Coûts réels des ingrédients | Bloquée | tickets d'achat |
| 9 | Manuscrits Ti-Colibri | Bloquée | 16 tomes importés, 4 pages avec texte attesté ; manuscrits manquants |
| 10 | Les neuf pièces du registre | Bloquée | planches tracées mais non déposées ; 80 originaux et logo manquants |
| 11 | Validation des mots créoles | Décision | 6 candidats ; relectrice à désigner |
| 12 | Le P'tit Lion : médias | Bloquée | fichiers |
| 13 | Ebooks : 3 questions | Décision | + accord écrit du témoin |
| 14 | Prix des ebooks | Décision | — |
| 15 | Dimensions papeterie | Bloquée | mesures en mm |
| 16 | Comptes des deux hôtes | Bloquée | e-mails réels |
| 17 | Date anniversaire BSH | Décision | — |
| 18 | Crédits et budget IA | Décision (dépense) | — |
| 19 | Connexion Canva | À faire par vous | application Canva Connect |
| 20 | Compte de la partenaire | Bloquée | e-mail ; aucun compte assistante aujourd'hui |
| 21 | Facturation électronique | Décision (comptable) | — |
| 22–27 | Vil'Dor : cumul pâtisserie, cumul assistante, cumul hôtesse, immatriculation, sanitaire, contrat | Démarches externes | réponses écrites, SIRET, récépissé, contrat |
| 28 | Prix de revente | Décision | 0/14 confirmés |
| 29 | Fiches de la collection | Bloquée | fiches techniques fournisseur |
| 30 | Frais et cotisations revente | Décision | — |
| 31 | Répartition des paiements | Décision (comptable) | — |
| 32 | Cadre des missions | Décision | — |
| 33 | Fermer la lecture publique des prix d'achat | **Terminée** | règles publiques `stocks` = false depuis le 18/11 |
| 34 | Mots de passe compromis | À faire par vous | réglage Supabase Auth |
| 35 | Sauvegarde avant P0 | **Terminée (sans objet)** | P0 appliqué le 18/11 ; aucune sauvegarde tracée → à vérifier avant toute prochaine migration |
| 36 | Mise en production P0 | **Terminée** | déploiement 6945bb8, 0114/0115b/0117 |
| 37 | Migration P1 (pôles) | Décision (migration) | contrainte à 4 pôles toujours en place |
| 38 | Anciens fichiers non chargés | Décision (suppression) | — |
| 39 | Allergènes : produits bloqués | Décision (validation des fiches) | blocage vérifié : 3 commandables / 116 |
| 40 | Valider 8 recettes importées | Décision | 8 « à valider » |
| 41 | Droits Massena | Bloquée | justificatif |
| 42 | RGPD : notification CNIL | Décision | — |
| 43 | Mots de passe compromis (doublon) | **Terminée — fusionnée** avec la n° 34 | — |
| 44 | Accès Food de l'assistante | Décision | dépend du compte (n° 20) |
| 45 | Lot de test réel import (2 €) | Décision (dépense) | — |
| 46 | 7 packs administratifs | Décision (validation graphique) | — |
| 47 | Photos Concorde Pro | Validation (diagnostic fait) | 279/390 rapprochés, 1 035 images accessibles ; rattachement préparé non exécuté |
| 48 | Lot d'essai Massena (gratuit) | À faire par vous | 111 fiches « à importer » |
| 49 | Transmission sécurisée des documents hôtes | En cours (à développer) | non commencée |

## Les 14 actions ajoutées le 19/11

| Action | État |
|---|---|
| Valider la refonte des boutiques (aperçu) | Décision |
| Valider l'espace hôtes BSH (aperçu) | Décision |
| Anciennes entrées à confirmer | **Terminée** (cette revue) |
| Programme premium phase 1 | Décision |
| Migration 0129 Secret Stories | Décision (migration) |
| Secret Stories : prestataire de paiement | Décision (réponses écrites des prestataires) |
| Portails assistante et cliente (aperçu) | Décision |
| Secret Stories : ligne éditoriale et quota IA | Décision |
| Documents éditoriaux attendus (Hélios, logo noir et or) | Bloquée (fichiers) |
| Studio Secret Stories (aperçu) | Décision |
| Rôle assistante → espace fondatrice | Décision (GO production) ; aucun compte assistante aujourd'hui |
| GO visuels premium en production | Décision |
| Plan de correction TypeScript | Décision |
| Boutiques premium : raccorder au vrai panier | En cours (développement) |

## Ajoutées le 20/11

Migrations 0130 / 0131 · Arbitrages éditoriaux Ti-Colibri · Envoi de la demande technique à Céline Benitez.

## Sécurité vérifiée

- Calendrier : la règle « Assistante lit le calendrier » repose sur `is_assistante()` = fondatrice **ou** permission « accès complet » accordée explicitement. Une assistante sans permission ne lit rien ; aucune permission n'est accordée aujourd'hui. Aucune migration nécessaire.
- L'agenda de l'assistante (application) n'affiche que ses propres missions.
