# Planning réaliste jusqu'au 10 décembre 2026 (établi le 25/11)

Principe : lots indépendants, chacun mis en service dès qu'il est sûr. **Rien n'est promis comme « terminé » sans test réel** (base isolée, puis prévisualisation, puis iPhone réel).

## Prérequis bloquants (dépendent de la fondatrice)
| Étape | Qui | Durée | Débloque |
|---|---|---|---|
| Créer le dépôt `bellaia-sauvegardes` + 4 secrets | Fondatrice (iPhone) | 15 min | Sauvegarde réelle |
| Lancer la sauvegarde → « COMPLET » | Fondatrice + Claude | 15 min | **Toutes** les migrations |
| Clés Stripe de TEST dans Vercel (prévisualisation seulement) | Fondatrice | 10 min | Tests de paiement |
| Textes BSH (30 animations, Dirty Edition, Devil's Playground) | Fondatrice | — | Import fidèle |

## Calendrier
| Dates | Lot | Contenu | Mise en service visée |
|---|---|---|---|
| 25–27/11 | Sécurité | 0134a (urgence) puis 0134 complète, 0142, 0133 | **Oui** (après « COMPLET ») |
| 26–29/11 | Boutique numérique | Écrans catalogue, panier, « Mes achats et documents », téléchargement ; tests Stripe en mode test ; 0148 | Prévisualisation le 29/11 ; production après validation |
| 27/11–2/12 | Premiers produits | 3 à 5 documents réellement complets, aperçus, fiches commerciales (prix = propositions) | Avec la boutique |
| 28/11–3/12 | Bella'Food | Service pilote : capacités, réservation temporaire pendant le paiement, commandes WhatsApp dans le même registre | Service pilote réel |
| 29/11–4/12 | Permissions | 0135–0137, 0146, 0145, 0147 ; Elsa (fondatrice Vil'Dor, Food, Events, hôte BSH) ; permissions Bella'Events | Oui, migration par migration |
| 1–5/12 | Bellaïa Today | Tableau de bord sur données réelles (fondatrice ; vues limitées par rôle) | Oui |
| 2–6/12 | WhatsApp | Remplacement des 23 boutons « parcours client » (audit du 25/11) par les parcours natifs livrés | Progressif |
| 3–8/12 | BSH | Atelier d'import TXT/Markdown/JSON, référentiel 50/25/15/10, intensité 1–10 ; Rooms : présence et salles réelles (0144) | Import : oui ; Rooms : **prévisualisation seulement** |
| 4–9/12 | WordPress | Audit en lecture seule, sauvegarde, structure du futur site sur une copie de travail | Prévisualisation |
| 5–10/12 | Bellaïa Core | Mémoire des décisions, registre des missions, briefing écrit ; voix (dictée et lecture Safari) en essai | Version écrite ; voix à l'essai |

## Ne sera PAS terminé au 10/12 (à dire clairement)
- Rooms multijoueurs complètes avec avatars semi-réalistes, dressing et animations (plusieurs semaines de production graphique et de tests sur appareils).
- Bellaïa Core « J.A.R.V.I.S. » complet (agents, proactivité, voix permanente — impossible en arrière-plan sur iPhone).
- Contrôle parental et Bellaïa Junior : aucun espace enfant ouvert avant la validation de l'isolation.
- Bella'Structure complet (studio graphique, validation client, exports imprimeur).
- Synchronisation automatique WordPress ↔ Bellaïa.

## Charge
Environ 80 % du temps de développement disponible est absorbé par : sécurité et migrations (≈ 15 %), boutique et produits (≈ 30 %), Food pilote (≈ 15 %), Today (≈ 10 %), BSH (≈ 15 %), WordPress et Core (≈ 15 %).
