# Bilan TypeScript — 23/11/2026 : 408 → 0 erreur

**Méthode.**
1. Classement des 408 erreurs par fichier et par code.
2. Calcul, avec le compilateur, des fichiers réellement **atteignables** depuis les 71 points d'entrée de l'application (pages, routes, layouts) : 294 fichiers sont atteignables, 42 ne sont chargés par rien.
3. Aucune désactivation de contrôle : ni `any` ajouté en masse, ni `@ts-ignore`, ni exclusion dans `tsconfig`.

## Avant
| Origine | Fichiers | Erreurs | Criticité |
|---|---|---|---|
| Code **mort** : anciennes extractions Events et Assistant, jamais importées (13 avec un équivalent actif dans `BellaiaApp.tsx`, plus `eventsTypes.ts`) | 14 | 402 (dont 4 dans `eventsTypes.ts`) | Nulle à l'exécution (jamais chargés) ; brouillent tout contrôle |
| Odyssée : accord parental déclaré mais absent du formulaire | 1 | 1 | **Élevée** (conformité, mineurs) |
| Notification de devis Events : champ `user` ignoré | 1 | 1 | Faible |
| Stripe : `stripe` non défini dans une route | 1 | 1 | Élevée si activée (la route aurait échoué) ; désactivée aujourd'hui |
| Stripe : version d'API différente du SDK installé (14.25) | 3 | 3 | Moyenne si activée ; désactivé aujourd'hui |
| **Total** | | **408** | |

## Corrections
1. **13 fichiers morts supprimés (398 erreurs)** : `events/ClientEvents`, `EventsCatalogue`, `EventsCommandesF`, `EventsDocumentsF`, `EventsDemandesF`, `EventsPortail`, `eventsConsts`, `eventsUtils`, `events/index`, `assistant/assistantApi`, `assistantPrompts`, `assistantRouter`, `assistantUtils`.
   - Chacun a été comparé à son équivalent actif.
   - Restauration possible à tout moment : `git checkout 010b829 -- <fichier>`.
2. **Conservés, car ce sont des travaux sans équivalent :**
   - `events/EventsDevis.tsx` : éditeur de devis complet, non branché ;
   - `events/eventsTypes.ts` : ses 2 champs déclarés deux fois ont été corrigés (4 erreurs).
3. **Odyssée.**
   - L'accord parental est réellement demandé et enregistré (nom, lien, date). Une case permet à un adulte de réserver pour une personne mineure.
   - Les soins réservés aux majeurs sont bloqués.
   - **Défaut trouvé en testant :** le bouton Odyssée (`OBtn`) ignorait `disabled`. Tous les boutons « désactivés » d'Odyssée restaient cliquables ; c'est corrigé.
4. **Events** : le paramètre ignoré est retiré, sans changement de comportement.
5. **Stripe** (désactivé) : client créé là où il manquait, version d'API alignée sur le SDK installé.
6. **Compilation de production** :
   - `ignoreBuildErrors` passe à `false` : une erreur de typage bloque désormais tout déploiement au lieu de passer inaperçue ;
   - erreur révélée par cette compilation et corrigée : une route exportait une constante non autorisée (`food/import/traiter`).

## Après
- `tsc --noEmit` : **0 erreur**.
- `next build` : **réussi**, avec la vérification des types (65 pages).
- Tests : Odyssée 9/9 sur simulateur iPhone ; non-régression : voir le rapport final.

## Reste
- 28 fichiers morts sans erreur (anciens modules `core`, `payments`, `messaging`, etc.) : nettoyage possible, sans urgence.
- ESLint toujours ignoré à la compilation (`ignoreDuringBuilds`) : à traiter séparément.
