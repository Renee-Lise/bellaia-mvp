# Bellaïa — Tableau de livraison (mis à jour le 23/11/2026, nuit — sprint du 26/11)

Légende : **Testé** précise le type de test. « Simulateur iPhone » = Playwright, profil iPhone 13 ; ce n'est **pas** un iPhone physique. **Déployé** = en production. Production actuelle : commit `0bfd765` (18/11) — **rien n'a été déployé depuis**.

| Fonction | Développé | Testé | Déployé | Vérifié sur iPhone réel |
|---|---|---|---|---|
| Compteur exact des actions requises (fin du « 50 ») + onglet « En attente » cohérent | Oui (paquet lot 7) | Unitaires 8/8 ; écran 7/7 simulateur iPhone et ordinateur, sur la compilation de production | **Non** — attend votre autorisation | Non |
| Messagerie réservée à la fondatrice (verrou d'interface) | Oui (paquet lot 7) | Écran 5/5 simulateur iPhone | **Non** | Non |
| Inventaire physique BSH (fiche, saisie, correction tracée, annulation) | Oui (paquet lot 7) | Écran 13/13 simulateur iPhone + 13/13 ordinateur ; défaut corrigé : bas de page masqué par la barre de navigation sur iPhone | **Non** | Non |
| Famille « Milkshakes » | Oui (paquet lot 7) | Compilation et typage | **Non** | Non |
| 0134 — verrou des rôles et statuts des profils | Oui (migration) | 13/13 base jetable (6 failles reproduites avant) ; retour arrière vérifié | **Non** — après sauvegarde vérifiée | Sans objet |
| 0133 — sécurité de la messagerie | Oui (migration) | 44/44 base jetable (20 attaques) ; retour arrière vérifié | **Non** — après sauvegarde vérifiée | Sans objet |
| 0135 — candidatures (5 formulaires côté base, historique, documents privés, purge RGPD) | Oui (migration) | 65/65 (avec 0136 et 0137) base jetable ; idempotence, retour arrière, réapplication | **Non** | Sans objet |
| 0136 — suspension par pôle, révocation tracée, désactivation, révocation des sessions | Oui (migration) | idem | **Non** | Sans objet |
| 0137 — missions (réception, avancement, transfert), invitations à usage unique | Oui (migration) | idem | **Non** | Sans objet |
| Moteur de règles des candidatures (IA désactivée par défaut) | Oui (`src/lib/candidatures.ts`), branché sur l'écran Candidatures | Unitaires 12/12 | Non | Non |
| Moteur allergènes (14 allergènes, 3 statuts) | Oui (`src/lib/allergenes.ts`) | Unitaires 17/17 | Non (pas encore d'écran) | Non |
| Administration › Candidatures : liste, dossier, proposition par règles, décision humaine (refus motivé), historique, documents consultés avec trace, invitation à usage unique remise par vous | Oui (branche) — actif après 0135 / 0137, écran d'attente avant | 16/16 simulateur iPhone (avec et sans la table, acceptation d'invitation, assistante sans accès) | Non | Non |
| Formulaires publics de candidature | **Non** — volontairement : aucune ouverture publique avant les tests de sécurité et 0135 | — | Non | Non |
| Espace professionnel commun hôte / partenaire : missions (accusé de réception, avancement, pièce jointe, signalement, demande de transfert, soumission à validation), agenda, documents, profil professionnel ; plus de WhatsApp | Oui (branche) — fonctionne avec la base actuelle | 18/18 simulateur iPhone ; non-régression 17/17, 12/12, 5/5, 16/16 | Non | Non |
| Correction commune : une fonction sans valeur de retour n'est plus prise pour une erreur | Oui (branche) | Défaut trouvé par le test 18/18, non-régression OK | Non | Non |
| Compte client (profil, notifications, confidentialité, aide), agenda à part, « Mes espaces » multirôle | Oui (branche) | 17/17 simulateur iPhone | Non | Non |
| Mo Ti-Péyi : 5 articles au catalogue réel en brouillon, sans prix, non commandables | Appliqué (données) + branche | 0 exposé (vérifié en base) ; 17/17 | Brouillons invisibles | Non |
| Mo Ti-Péyi : jeu de cartes pédagogique (prototype, fondatrice uniquement) — 12 défis PS à CP, flèches, avancer/tourner, boucles, condition, débogage | Oui (branche) | Moteur 23/23 (chaque défi vérifié faisable ; 2 défis faux détectés et corrigés) ; écran 16/16 simulateur iPhone ; compte Famille sans accès | Non | Non |
| Livres : inventaire réel et éléments manquants (P'tit Lion T1–T4 : 4 couvertures, 15 illustrations, 19 textes alternatifs proposés) | Dossier (Drive privé) | Lecture seule de la base | Aucun tome publié | — |
| Rapport différentiel production / branche | `docs/deploiement/RAPPORT_DIFFERENTIEL.md` | Migrations vérifiées objet par objet en production | — | — |
| Sauvegarde complète gratuite (structure, données, comptes, fichiers) + contrôle de restauration | Oui (scripts) | Chaîne 5/5 sur imitation ; **vraie sauvegarde pas encore faite** (à lancer par vous) | — | — |
| B0 — 6 boissons non commandables ; citronnelle consolidée | Appliqué (données) | Vérifié en base | Oui (données) | Non |
| B1 — 23 boissons en brouillon | Appliqué (données) | 0 produit exposé (vérifié en base) | Oui (brouillons invisibles) | Non |
| Régularisation des recettes Food | Plan (`docs/food/REGULARISATION_RECETTES.md`) | — | — | — |
| Demandes de devis (4 fournisseurs) | Rédigées (Drive privé) | — | Non envoyées | — |
| Médiathèque : documents de candidature privés, journal de consultation | Côté base (0135) | Inclus dans les 65/65 | Non | Non |
| Zones de sécurité iPhone (heure, encoche) et hauteur réelle : 17 portails client/hôte/partenaire + accueils premium client et assistante | Oui (branche) | Contrôle 12/12 sur 4 rôles (aucun débordement) ; la zone d'encoche n'est **pas reproductible** en simulateur | Non | Non |
| Boutons « ‹ Portail » 44 px, onglets Mo Ti-Péyi lisibles | Oui (branche) | Mesuré 44 px (simulateur) | Non | Non |
| Retour cohérent : historique du navigateur, geste natif de Safari, balayage depuis le bord gauche dans l'application installée ; retour vers l'accueil client | Oui (branche) | 16/16 (dont retour lecteur → histoires → portail) | Non | Non |
| Lecteur de livres : pages au glissement (sens français), jamais pendant un zoom, marque-page, progression, illustration plein écran | Oui (branche) | 16/16 + 8/8 unitaires | Non | Non |
| Carte « Mo Ti-Péyi » de l'accueil client qui n'ouvrait rien (défaut introduit puis corrigé le jour même, jamais en production) | Corrigé | 16/16 | — | — |
| Jeux : inventaire | — | Jeux BSH inchangés (Secret Games, Duo, Salons, restrictions d'accès conservées) ; jeu de cartes Mo Ti-Péyi commencé (prototype) ; aucun jeu Odyssée ou jeunesse | — | — |

## Ce qui rendra Bellaïa réellement opérationnelle, dans l'ordre
1. **Sauvegarde réelle depuis l'iPhone** : dépôt GitHub privé + tâche « Sauvegarde Bellaïa » (`docs/deploiement/sauvegarde-iphone/PROCEDURE_IPHONE.md`) ; le résultat doit être « COMPLET ».
2. **Déploiement du paquet lot 7** (4 corrections, 9 fichiers) sur votre autorisation, puis **votre vérification sur votre iPhone** (liste de contrôle ci-dessous).
3. **0134 puis 0133** sur votre autorisation, après sauvegarde « COMPLET ».
4. **Lot portails et sécurité des rôles** (sans migration), puis **0138**, puis **0135 → 0137** (les écrans sont prêts), puis 0139 et les autres (voir `docs/deploiement/RAPPORT_DIFFERENTIEL.md`).

## Contrôle sur votre iPhone après déploiement (5 minutes)
- Menu : « Actions requises · 60 » (ou le nombre réel du jour), pas « 50 » ; l'onglet « En attente » ne montre ni actions annulées ni ligne de registre.
- Messages : accessible pour vous ; avec un compte assistante : écran « en cours de sécurisation ».
- BSH › Réglages › bas de page : bouton « Inventaire physique » visible et utilisable au-dessus de la barre de navigation.
- Food : famille « Milkshakes » proposée dans les recettes.


## Tests manuels sur votre iPhone (à faire après déploiement, ≈ 10 minutes)
1. **Mo Ti-Péyi (cliente)** : l'en-tête « 🌿 Mo Ti-Péyi » ne touche plus l'heure ; « ‹ Portail » facile à toucher.
2. **Retour** : ouvrir un univers puis faire le geste retour (Safari) ou, dans l'application installée, glisser depuis le bord gauche → retour à l'accueil, l'application reste ouverte.
3. **Lecteur** : ouvrir une histoire publiée → glisser vers la gauche = page suivante ; vers la droite = précédente ; zoom à deux doigts sur une illustration → aucune page ne tourne ; 🔖 puis rouvrir → « Aller au marque-page ».
4. **Assistante** : se connecter avec un compte assistante → portail assistante (pas l'espace fondatrice).
5. **Secret Games** (adulte) : ouvrir, tirer une carte, quitter.
6. **Actions requises** : le compteur affiche le nombre réel, pas 50.
