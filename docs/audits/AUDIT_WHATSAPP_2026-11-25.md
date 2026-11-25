# Audit des redirections WhatsApp — version de production (main, 0b3c20a), 25/11/2026

Règle de la fondatrice (25/11) : **seules les commandes Bella'Food peuvent passer par WhatsApp**. Pour tout le reste (commandes, paiements, réservations, demandes, messagerie, suivi, livraison, téléchargements), WhatsApp ne doit plus être nécessaire. La communication communautaire BSH peut continuer dans ses espaces.

Relevé : **31 liens directs** et **28 appels** de l'utilitaire `WA()` dans `BellaiaApp.tsx`, soit environ 59 points de sortie vers WhatsApp.

## A. À CONSERVER — commandes Bella'Food
| Endroit | Usage |
|---|---|
| `BellaiaApp.tsx` l. 2072, 2322, 3284 (parcours de commande Food) | Envoi de la commande Food à la fondatrice |
| `BellaiaApp.tsx` l. 3519 | Question sur Bella'Food |

## B. À REMPLACER EN PRIORITÉ — substituts à une fonction manquante (parcours client)
| Endroit | Ce que fait le bouton aujourd'hui | Remplacement natif prévu |
|---|---|---|
| l. 2690, 2692 (Éditions) | « Je souhaite acheter / accéder gratuitement à… » | Boutique numérique : panier, paiement Stripe, bibliothèque client |
| l. 11906 | « Je souhaite télécharger le document… » | Téléchargement authentifié depuis « Mes achats et documents » |
| l. 13415 + `PaymentSelector.tsx` (virement) + `app/paiement/*` (3 pages) | Demander les modalités de paiement / signaler un paiement | Paiement en ligne et confirmation par le serveur ; aide via la messagerie interne |
| l. 2830 (Mo Ti-Péyi) | Passer une commande | Boutique numérique |
| l. 13141, 13168, 13178 (Bella'Structure) | Obtenir un modèle, en commander un personnalisé | Catalogue Bella'Structure, commande personnalisée avec devis |
| l. 2148 | Commander un produit | Panier |
| l. 12586, 13014, `EventsPortail.tsx` l. 416 | Suivi d'un dossier par sa référence | Espace client : suivi du dossier et messagerie interne |
| l. 2630 (Vilo'Assistance), 2756 (Éditions), 2926 (Mo Ti-Péyi), 3615, 8219, 2394, 8515 | Contact ou demande d'information | Formulaire de demande (table `bellaia_demandes`, migration 0139) et messagerie interne |
| l. 9239, 9264, 9298, 9310 (partenaires) | Collaboration, signature, profil | Espace partenaire : signature et mise à jour dans Bellaïa |
| `app/bsh/cercle`, `lounge`, `experiences` (`bshWaLink`) | « Rejoindre » un espace BSH | Demande d'adhésion dans Bellaïa (le lien de la communauté reste possible après validation) |
| `secret-games`, `secret-duo`, `secret-salons` | Inviter à une partie par WhatsApp | **Invitation interne** (lien Bellaïa et notification) ; le partage WhatsApp devient facultatif |

## C. ACCEPTABLES — outils de la fondatrice ou de l'équipe (message sortant facultatif)
`FoodAchats.tsx`, `FoodCourses.tsx`, `FoodFournisseurs.tsx`, `FoodDevis.tsx`, `FoodExports.tsx` (fournisseurs et courses), `EventsDevis.tsx`, `EventsDemandesF.tsx`, `AdministratifF.tsx`, `ClientCenter.tsx`, `MessagingCenter.tsx`, `workflowUtils.ts`, `BellaiaApp.tsx` l. 2498, 4996, 6444, 8649, 10090, 11329, 12098, 12580, 12906, 3027.
→ Ils ne remplacent aucune fonction : la fondatrice choisit d'envoyer un message. À compléter par l'envoi d'un document dans Bellaïa lorsqu'il s'agit d'un client.

## D. AUTORISÉS — communication communautaire BSH
`BshPublications.tsx` (partage d'une publication), `BshSondages.tsx`, `BshExperiencesF.tsx` l. 800.

## Ordre de remplacement
1. Boutique et téléchargements (B, lignes Éditions, téléchargement, paiement), en même temps que le parcours d'achat.
2. Demandes et suivi de dossier (formulaire `bellaia_demandes` et espace client).
3. Invitations BSH internes, avec les Rooms.
4. Partenaires.
Chaque remplacement retire le bouton WhatsApp **seulement une fois le parcours natif testé**.
