# Fichiers non chargés par l'application — analyse avant toute décision

Aucun fichier n'est supprimé. Ils restent dans Git (historique complet) ; une archive dédiée sera faite avant toute suppression, sur accord de la fondatrice.

Méthode (18/11) : recherche des imports depuis l'application, puis comparaison fonction par fonction avec le code chargé (`BellaiaApp.tsx`, `modules/assistant/BellaiaAssistant.tsx`).

| Fichier | Lignes | Erreurs TS | Équivalent dans le code chargé | Recommandation |
|---|---|---|---|---|
| events/ClientEvents.tsx | 530 | 178 | `ClientEvents` présent dans BellaiaApp | Doublon — archiver |
| events/EventsCommandesF.tsx | 95 | 73 | présent | Doublon — archiver |
| events/EventsCatalogue.tsx | 91 | 62 | `BellaEventsCatalogue` présent | Doublon — archiver |
| events/EventsDocumentsF.tsx | 72 | 39 | présent | Doublon — archiver |
| events/EventsPortail.tsx | 461 | 2 | `PortailSuiviClient` présent (sécurisé le 18/11) | Doublon — archiver |
| events/EventsDemandesF.tsx | 792 | 2 | partiel : **`BlocActionsFondatrice`, `LignesDevisAutoF` absents** | Comparer à l'écran Demandes actuel avant archivage |
| events/eventsUtils.ts | 140 | 4 | partiel : **`getFoodPrestations`, `setFoodCatalogueExterne` absents** (liaison Events ↔ Food) | À examiner (possible fonctionnalité à recâbler) |
| events/eventsConsts.ts, eventsTypes.ts, index.ts | 594 | 25 | constantes / types des fichiers ci-dessus | Suivent la décision des fichiers ci-dessus |
| assistant/assistantApi.ts | 318 | 6 | **absent** : `envoyerMessage`, `chargerContexteLive`, `classifierContenu`, `extraireActionsDeLaReponse`… | **Fonctionnalité non branchée** — à recâbler, ne pas supprimer |
| assistant/assistantRouter.ts | 326 | 3 | **absent** : routage local des questions, questions rapides | Idem |
| assistant/assistantPrompts.ts | 264 | 2 | **absent** : prompts système, routage, classification | Idem |
| assistant/assistantUtils.ts | 250 | 6 | **absent** : brouillons, tâches, suggestions par domaine, validation | Idem |

## Plan proposé
1. Archiver (tag Git `archive/events-anciens-2026-11`) les 6 doublons Events confirmés, puis les retirer — **sur accord**.
2. Comparer `EventsDemandesF` et `eventsUtils` à l'existant ; récupérer ce qui manque.
3. Moteur de l'assistant : le recâbler dans `BellaiaAssistant` (lot IA), en corrigeant ses 17 erreurs.
