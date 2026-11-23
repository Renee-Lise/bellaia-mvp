# Avenant « Messagerie, design premium et veille » — plan, priorités, coûts (23/11/2026)

Phase en cours : **1 (audit) et 2 (vérification des outils)**. Phases 3 à 7 après validation.

## Livrables

| # | Livrable | Emplacement | État |
|---|---|---|---|
| 1 | Audit de la messagerie existante | Rapport privé (fondatrice) — contient des failles non corrigées | Fait |
| 2 | Cahier des charges fonctionnel et technique | `docs/messagerie/CAHIER_DES_CHARGES_MESSAGERIE.md` | Fait (v1) |
| 3 | Maquettes iPhone | `docs/messagerie/maquettes_iphone.html` (3 écrans, sombre et clair) | Fait (statiques) |
| 4 | Comparatif des 6 outils | `docs/veille/OUTILS_DESIGN_EVALUATION.md` | Fait — VoiceStudio et 10x non identifiés avec certitude |
| 5 | Registre des 21 vidéos | `docs/veille/REGISTRE_VEILLE_INSTAGRAM.md` | **Bloqué** : contenu non consultable, vidéos ou captures demandées |
| 6 | Améliorations priorisées | ci-dessous | Fait |
| 7 | Coûts et dépendances | ci-dessous | Fait (estimations) |
| 8 | Rapport de cybersécurité | Rapport privé (fondatrice) | Fait |
| 9 | Plan par lots | ci-dessous | Fait |
| 10 | Registre Bellaïa | Suivi des exigences E7.01 à E7.12 | Fait |

## Améliorations priorisées
1. **P1 — Sécuriser la messagerie existante** (lot M0) avant toute ouverture à un autre compte que la fondatrice.
2. **P1 — Supprimer le modèle de messagerie doublon** (après vérification qu'il est vide et non utilisé).
3. **P2 — Lot M1** (conversations, groupes, espaces par univers, réponses, réactions, modification, épingles, archivage, sourdine, recherche).
4. **P2 — Design system Bellaïa** (jetons communs + variantes par univers), appliqué d'abord à la messagerie.
5. **P3 — Lot M2** (photos, vidéos, documents, vocaux, aperçus de liens sûrs).
6. **P3 — Lot M3** (annonces, mentions, notifications, signalement, blocage, modération).
7. **P4 — Études M4** (appels, traduction, transcription, IA, clients, WhatsApp Business) : une fiche faisabilité/coût/sécurité chacune.

## Coûts et dépendances (estimations à confirmer)
| Élément | Coût | Dépendance |
|---|---|---|
| M0–M3 | 0 € de service supplémentaire (Supabase et Vercel existants) ; surveiller le stockage des médias et le nombre de connexions temps réel du forfait Supabase | Aucune nouvelle bibliothèque prévue |
| Appels audio/vidéo | Serveur TURN ou service WebRTC payant à la minute | À étudier |
| Transcription / traduction / IA | Facturé à l'usage (fournisseur à choisir) | Accord de dépense, données envoyées à un tiers |
| WhatsApp Business | API officielle de Meta, facturée par conversation ; compte Business vérifié | Accord, conformité |
| Mobbin Pro | ≈ 10–15 $/mois (à confirmer) | Accord |
| Aceternity Pro | ≈ 169 $/an ou 199 $ (à confirmer) — non recommandé | — |

## Design system Bellaïa (mission 4 — proposition)
- **Socle commun** déjà présent : `src/design/premium.ts` (`COQUE_PREMIUM` : fond `#10142b`, barre `#171c3a`, or `#d7c08f`, texte `#f8f3ea`, serif Cormorant Garamond) et `src/design/marques.ts` (couleurs par univers).
- À formaliser dans un `DESIGN.md` (structure inspirée de Refero Styles) : jetons couleurs (sombre/clair), typographie (serif titres, système pour le texte), espacements (4/8/12/16/24/32), rayons, ombres, durées d'animation (≤ 200 ms, désactivées si « réduire les animations »), cibles tactiles ≥ 44 px, contrastes AA.
- Composants : bouton, champ, liste, carte, tableau, barre d'onglets mobile, feuille modale, état de chargement, message d'erreur, bulle de message.
- Chaque univers garde sa couleur d'accent ; navigation commune.
- Méthode : prototypes statiques → validation → application par lots, écran par écran, sans remplacement brutal.

## Plan par lots
| Lot | Contenu | Validation requise |
|---|---|---|
| A (fait) | Audit, cahier des charges, maquettes, évaluation des outils, registre de veille | Lecture par la fondatrice |
| B | Migration M0 (règles d'accès, compartiment privé, temps réel) testée sur base isolée | **Accord migration** |
| C | `DESIGN.md` + composants de base + écrans M1 sur base simulée ; tests d'accès (non-membre, membre retiré, Famille) | Validation des maquettes |
| D | M2 puis M3 | Validation par lot |
| E | Études M4 | Accord de dépense éventuelle |
| F | Tests sécurité, accessibilité (VoiceOver), non-régression ; recette iPhone réel | — |
| G | Rapport de preuves, déploiement | **Accord de déploiement** |

## Économie de ressources (mesuré, non supposé)
- Instagram : 2 tentatives d'accès seulement (refus réseau), puis arrêt ; aucune répétition.
- Outils : 6 recherches web, aucune page relue deux fois.
- Les synthèses sont conservées dans ces fichiers et dans le registre, pour ne pas les régénérer.
