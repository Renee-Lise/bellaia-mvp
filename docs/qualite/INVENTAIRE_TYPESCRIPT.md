# Inventaire des erreurs TypeScript — 19/11/2026

Une compilation réussie ne prouve pas que le code est sain : le build ignore les erreurs TypeScript (`ignoreBuildErrors`). Cet inventaire sert de base à un chantier de correction **progressif**, sans retrait de fonctionnalité.

## 1. Vue d'ensemble

| | Erreurs |
|---|---|
| Total (`npx tsc --noEmit`) | **1 416** (1 418 avant les deux corrections ci-dessous) |
| Dans du **code mort** (40 fichiers jamais chargés par l'application) | 403 |
| Dans le **code chargé** | 1 013 |

Méthode « code mort » :
- graphe des imports calculé depuis toutes les pages, mises en page et routes API (`src/app/**`) ;
- les imports dynamiques de l'application ont tous des chemins littéraux, ils sont donc pris en compte ;
- résultat : 260 fichiers atteignables, 40 jamais chargés.

## 2. Gravité — code chargé (1 013)

| Gravité | Nombre | Nature | Risque réel |
|---|---|---|---|
| **Élevée** | 1 (+2 corrigées) | Code qui plante à l'exécution | Voir § 3 |
| **Moyenne** | 16 | Clés en double, comparaisons toujours vraies ou fausses, propriétés inconnues, calculs sur dates | Comportement inattendu possible, à vérifier une à une |
| **Faible — props non typées** | 594 | Composants écrits sans types (`{}`) dans `BellaiaApp.tsx` | Aucun à l'exécution : documentation absente, aucune protection |
| **Faible — props manquantes** | 226 | Typage déduit des valeurs par défaut | Aucun en général. Exception : un rappel obligatoire absent (`onSucces`), déjà protégé par un `if` |
| **Faible — types incompatibles** | 176 | Versions d'API Stripe, `unknown`, `Uint8Array` | Faible |

Par module (code chargé) :
- `components/BellaiaApp.tsx` : 1 000 erreurs ;
- routes API de paiement : 4 ;
- routes import et assistant : 3 ;
- Bella'Food : 5 ;
- `layout.tsx` : 1.

## 3. Erreurs à risque réel (code chargé)

| Fichier | Problème | État |
|---|---|---|
| `app/api/payments/stripe/route.ts` | `.catch()` appelé sur une requête Supabase (la méthode n'existe pas). Après un paiement réussi, la vérification aurait renvoyé « erreur » à la cliente, alors que le paiement était bien enregistré. | ✅ **Corrigé** (19/11). Effet nul aujourd'hui : Stripe désactivé depuis le 18/11. |
| `modules/food/FoodF.tsx` | Titre manquant pour la section Bibliothèque (en-tête vide) | ✅ **Corrigé** |
| `app/api/paiement/stripe/route.ts` l.45 | Variable `stripe` jamais définie : cette route planterait si Stripe était réactivé | ⏳ À corriger **avant** toute réactivation de Stripe (route neutralisée aujourd'hui) |
| `BellaiaApp.tsx` l.14816-14817 | Deux pages déclarées deux fois (`documents`, `vilo`) : la seconde déclaration écrase la première | ⏳ Arbitrage : quelle version garder ? Aujourd'hui, la seconde s'affiche. |
| `BellaiaApp.tsx` l.723 | Comparaisons `accent !== false` sur une chaîne | ⏳ Sans effet visible ; simplification |

## 4. Dépendances

- **Monolithe** : 1 000 erreurs sur 1 013 viennent de `BellaiaApp.tsx` (15 000 lignes). Les corriger en masse risquerait des régressions. Il vaut mieux typer à chaque fois qu'un écran est extrait dans un module (comme les portails, Secret Stories ou les boutiques, qui ont 0 erreur).
- **Stripe** : trois routes figent une ancienne version d'API (`2024-06-20`) incompatible avec les types de la bibliothèque installée. À traiter ensemble lors de la réactivation, après validation.
- **Bella'Even's** : quatre anciens écrans orphelins (voir § 5) dépendaient de constantes qui ne sont plus exportées. Les écrans réellement utilisés vivent dans `BellaiaApp.tsx` et `modules/events/Events*Atelier*`.

## 5. Code mort (403 erreurs, 40 fichiers) — proposition, rien supprimé

- **Principaux fichiers en erreur :**
  - `modules/events/ClientEvents.tsx` (178), `EventsCommandesF.tsx` (73), `EventsCatalogue.tsx` (62), `EventsDocumentsF.tsx` (39), `index.ts` (18), plus `EventsPortail`, `EventsDemandesF`, `EventsDevis`, `eventsApi/Consts/Types/Utils` ;
  - `modules/assistant/assistant{Api,Prompts,Router,Utils}.ts` : l'assistant chargé, `BellaiaAssistant.tsx`, ne les utilise pas ;
  - `modules/core/*`, `modules/payments/*`, `modules/compta/{moteur,types}.ts` ;
  - `modules/food/{FoodImport,calculs,data,index}.ts(x)` : `FoodImport` a été remplacé par `AtelierImport` ;
  - `lib/{supabase,useSupabase}.ts`, `components/PaymentSelector.tsx`, `modules/{crm,docs,messaging}/index.ts`.
- **Proposition (après validation)** : déplacer ces fichiers dans `archives/`, exclu de la vérification. Ils restent consultables et récupérables. C'est un déplacement, pas une suppression, et aucune fonctionnalité de l'application n'est touchée, puisque rien ne les charge.

## 6. Plan progressif proposé

1. **Lot 1 — sécurité des paiements** : corriger la route `paiement/stripe` et aligner la version d'API Stripe, **avant** toute réactivation.
2. **Lot 2 — archivage** du code mort (−403), après validation.
3. **Lot 3 — erreurs moyennes** (16) : examen une à une, avec arbitrage des doublons `documents` et `vilo`.
4. **Lot 4 — typage des composants partagés** de `BellaiaApp.tsx` (`Btn`, `Fld`, `Inp`, `Sel`, `Card`, etc.). Quelques déclarations de props suppriment une grande partie des 820 erreurs « props ».
5. **Lot 5 — extraction progressive** des écrans du monolithe vers des modules typés, au fil des phases premium.
6. **Objectif** : vérification TypeScript sans erreur, puis activation de la vérification au build.

Suivi : relancer `npx tsc --noEmit -p . | grep -c "error TS"` à chaque lot et noter le chiffre ici.

## Suivi

| Date | Lot | Erreurs | Vérification |
|---|---|---|---|
| 19/11 | Inventaire | 1 416 | — |
| 20/11 | Lot 4 (partiel) : formulaires `useState({})` et props des composants partagés de `BellaiaApp.tsx` typés | **481** (`BellaiaApp.tsx` : 1 001 → 66) | JavaScript produit identique avant / après (`tests/iphone/t_js.js`) ; audit des boutons sans régression |

Reste : 405 erreurs dans les anciens écrans Bella'Even's jamais chargés (lot 2 — archivage soumis à votre accord), 66 dans `BellaiaApp.tsx` (lot 3 : doublons `documents` / `vilo` à arbitrer, comparaisons, champs inconnus), 10 dans les routes Stripe désactivées (lot 1 — avant toute réactivation, avec votre accord).
