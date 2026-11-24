# Audit fonctionnel — lot 7 (24/11/2026, branche `claude/session-sdcuy0`)

**Tous les tests d'écran cités tournent sur simulateur** (Chromium, profil iPhone 13). Ce n'est **pas** un iPhone réel. La production reste au commit `0bfd765` : rien n'y a été déployé.

## Méthode
1. **Présence et effet de chaque bouton** (`t_boutons.js`). Résultats :

   | Profil | Boutons | Effet visible | Message d'état seulement |
   |---|---|---|---|
   | Fondatrice | 75 | 68 | 7 |
   | Cliente | 49 | 46 | 3 |
   | Assistante | 42 | 42 | 0 |

   Ce test ne prouve **que** l'existence d'une réaction : il ne vérifie pas ce qui est écrit en base.
2. **Résultat réel** : chaque test dédié contrôle le contenu exact de l'écriture (table, champs, valeurs) ou la réponse du serveur. Liste ci-dessous.
3. **Analyse du code** : recherche des fonctions simulées, des données gardées seulement sur l'appareil, des liens externes, des pages en construction et des renvois incorrects.

## Constats transversaux
| Sujet | Constat |
|---|---|
| Renvoi silencieux à l'accueil | **Corrigé** (P0) : plus aucun rechargement automatique, alerte explicite avec le module nommé (38 modules), garde-fou par rubrique, écran et onglets mémorisés. Changement de version testé dans Secret Agenda (17/17), Bella'Food et l'atelier papeterie (6/6). |
| Données jamais enregistrées | L'ancien stockage local `useStore` n'est **plus utilisé nulle part**. Ce qui reste sur l'appareil : session, préférences d'affichage, favoris de la vitrine, mémorisation de l'écran, journal de diagnostic. Aucune donnée métier. |
| Fonctions simulées | Centre des hôtes et espace hôte BSH : « Simulation » affichée tant que **0128** n'est pas appliquée. Studio Secret Stories : simulation (0129). Notifications e-mail, SMS et WhatsApp : **non branchées** (« Phase 2 », note interne seulement, et l'écran le dit). Paiement de la vitrine premium : non branché (aperçu). Rien de tout cela n'est présenté comme opérationnel. |
| Liens externes | Environ 30 liens `wa.me` de **partage manuel** (le message s'ouvre dans WhatsApp, rien n'est envoyé automatiquement, ce qui est conforme à la règle). Liens Canva des packs achetés : désormais qualifiés « consultation seule » ou « lien de modèle », jamais présentés comme modifiables. |
| Pages incomplètes | Mo Ti-Péyi : une page « en construction » (sans boutique). Lecteur d'histoires : versions audio et illustrée « bientôt disponibles », signalées comme telles. |
| Tables absentes de la base | `notifications` (404 relevés dans les journaux de production le 24/11), `webhook_logs`, `pre_comptabilite` : créées par **0140** (non appliquée). `missions_hote`, `contrats`, `collaborations_partenaire`, `factures_partenaire` : aucune migration prévue, fonctionnalités défectueuses. |

## État par univers
Légende : **F** fonctionnel · **D** défectueux · **I** incomplet · **ND** non développé · **B** bloqué (attend une migration ou une décision) · **Sim** testé sur simulateur · **Prod** vérifié en production · **iPhone** vérifié sur iPhone réel.

| Univers · fonction | État (branche) | Sim | Prod | iPhone | Résultat réel contrôlé par |
|---|---|---|---|---|---|
| **BSH** · Secret Agenda (13 rubriques) | F (fonctions sans 0141) / B (fonctions 0141) | Oui | Non | **Non : E12.01 ouvert** | `t_bsh_agenda` 65/65 (écritures vérifiées dans la base simulée) |
| BSH · ouverture après une mise en ligne (P0) | F | Oui | Non | **Non** | `t_p0_version` 17/17 |
| BSH · personnage officiel (10 visuels, principale, secondaires) | B (0141) | Oui | Non | Non | `t_bsh_personnage` 10/10, base jetable 45/45 |
| BSH · Secret Games | F | Oui | Oui (avant le 24/11) | Non | `t_sg` 15/15, `t_sg_robuste` 8/8 |
| BSH · Centre des hôtes | I (simulation avant 0128) | Oui | Non | Non | `t_espace_pro` 18/18 |
| BSH · inventaire | F | Oui | Non | Non | `t_inventaire` 13/13 |
| **Bella'Food** · offre du jour (cases à cocher, menus, prix et quantités du jour, publication) | F | Oui | Non | Non | `t_food_pilotage` 24/24 (contenu de chaque écriture vérifié) |
| Food · refus serveur hors offre (produit non coché, menu seul, date passée, brouillon, quantités, sauces) | F (code serveur) ; lecture publique fermée après **0143** | Oui | Non | Non | `t_offre_serveur` 10/10, base jetable 0143 8/8 |
| Food · commande cliente | F (dans l'offre) | Oui | Non | Non | `t_food` 19/19 |
| Food · catégories (12 grandes tuiles), sauces repas et desserts | F (aperçu, puis application sur clic) | Oui | Non | Non | `t_food_pilotage`, unitaires 22/22 |
| Food · tarifs à valider | F (rien n'est écrit sans cocher et confirmer) | Oui | Non | Non | `t_food_pilotage` (prix, historique, aucune autre écriture) |
| Food · masquage porc/alcool, variantes compatibles | F (préparé, **non exécuté**) | Oui | Non | Non | `t_food_pilotage`, unitaires 43/43 |
| **Events** · atelier papeterie (éditeur, patrons originaux, fonds perdus, PDF imprimeur à l'échelle) | F | Oui | Non | Non | `t_atelier_imprimeur` 11/11 (taille du PDF mesurée), unitaires 18/18 |
| Events · import de la médiathèque | F | Oui | Non | Non | `t_mediatheque_import` 12/12 |
| Events · patrons Canva achetés | I (copie à créer par la fondatrice dans Canva) | — | — | — | audit en lecture seule (11 patrons) |
| **Odyssée** · rendez-vous, accord parental | F | Oui | Non | Non | 9/9 (tests antérieurs) |
| **Vil'Dor** (partenaire) · espace partenaire | F (missions, agenda, documents) / D (collaborations, factures : tables absentes) | Oui | Non | Non | `t_espace_pro` 18/18 |
| **Vilo'Assistance** · contrats | D (table `contrats` absente) | — | — | — | — |
| **Mo Ti-Péyi** · atelier GS, jeu de cartes | F / I (prototype) | Oui | Non | Non | 47/47, 23/23 + 16/16 |
| Mo Ti-Péyi · boutique | ND (page en construction) | — | — | — | — |
| **Éditions** · lecteur d'histoires | F (lecture) / I (audio, illustré) | Oui | Non | Non | 16/16 |
| **Administration** · candidatures, accès | B (0135 à 0137) | Oui | Non | Non | 16/16 + 65/65 |
| Administration · notifications internes | D en production (table absente) / B (0140) | — | Non | Non | — |
| **Espaces pro** (hôte, partenaire, assistante) | F | Oui | Non | Non | 18/18, 17/17 |
| Compte et sécurité | F | Oui | Non | Non | `t_securite_compte` 14/14, `t_compte_espaces` 17/17 |

## Ce qui reste à vérifier
- **Sur l'iPhone réel de la fondatrice**, en priorité : Secret Agenda (E12.01), puis l'offre du jour, l'atelier papeterie (import, puis PDF imprimeur imprimé à 100 % et mesuré à la règle) et le personnage officiel.
- **En production**, après accord : rien de ce qui est listé ici n'y est déployé.
