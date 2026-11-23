# Bellaïa — Tableau de livraison (mis à jour le 23/11/2026)

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
| Moteur de règles des candidatures (IA désactivée par défaut) | Oui (`src/lib/candidatures.ts`) | Unitaires 12/12 | Non (pas encore d'écran) | Non |
| Moteur allergènes (14 allergènes, 3 statuts) | Oui (`src/lib/allergenes.ts`) | Unitaires 17/17 | Non (pas encore d'écran) | Non |
| Écrans Gestion › Candidatures et accès, fiche profil, formulaires publics | **Non** — maquettes seulement | — | Non | Non |
| Sauvegarde complète gratuite (structure, données, comptes, fichiers) + contrôle de restauration | Oui (scripts) | Chaîne 5/5 sur imitation ; **vraie sauvegarde pas encore faite** (à lancer par vous) | — | — |
| B0 — 6 boissons non commandables ; citronnelle consolidée | Appliqué (données) | Vérifié en base | Oui (données) | Non |
| B1 — 23 boissons en brouillon | Appliqué (données) | 0 produit exposé (vérifié en base) | Oui (brouillons invisibles) | Non |
| Régularisation des recettes Food | Plan (`docs/food/REGULARISATION_RECETTES.md`) | — | — | — |
| Demandes de devis (4 fournisseurs) | Rédigées (Drive privé) | — | Non envoyées | — |
| Médiathèque : documents de candidature privés, journal de consultation | Côté base (0135) | Inclus dans les 65/65 | Non | Non |

## Ce qui rendra Bellaïa réellement opérationnelle, dans l'ordre
1. **Sauvegarde réelle** : vous lancez `supabase/sauvegarde/sauvegarde_complete.sh` (≈ 10 min) et déposez les fichiers indiqués dans le Drive privé ; je fais le contrôle de restauration et vous présente le résultat.
2. **Déploiement du paquet lot 7** (4 corrections, 9 fichiers) sur votre autorisation, puis **votre vérification sur votre iPhone** (liste de contrôle ci-dessous).
3. **0134 puis 0133** sur votre autorisation, après sauvegarde « COMPLET ».
4. **0135 → 0137** puis écrans Candidatures et accès, fiche profil et formulaires (développement après validation des maquettes).

## Contrôle sur votre iPhone après déploiement (5 minutes)
- Menu : « Actions requises · 60 » (ou le nombre réel du jour), pas « 50 » ; l'onglet « En attente » ne montre ni actions annulées ni ligne de registre.
- Messages : accessible pour vous ; avec un compte assistante : écran « en cours de sécurisation ».
- BSH › Réglages › bas de page : bouton « Inventaire physique » visible et utilisable au-dessus de la barre de navigation.
- Food : famille « Milkshakes » proposée dans les recettes.
