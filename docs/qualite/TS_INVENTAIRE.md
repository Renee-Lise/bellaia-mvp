# Inventaire des erreurs TypeScript

Généré le 2026-11-18 21:24 par `node scripts/ts-inventaire.mjs` — **1411 erreurs**.

## Par gravité

| Gravité | Nombre |
|---|---|
| critique | 394 |
| élevée | 4 |
| moyenne | 378 |
| faible | 635 |

## Code réellement chargé par l'application

**1009 erreurs** dans le code utilisé (dont 3 critiques, 4 élevées) — 402 dans des fichiers jamais chargés.

## Par fichier

| Fichier | Total | Critiques |
|---|---|---|
| src/components/BellaiaApp.tsx | 1000 | 0 |
| src/modules/events/ClientEvents.tsx _(non chargé)_ | 178 | 173 |
| src/modules/events/EventsCommandesF.tsx _(non chargé)_ | 73 | 73 |
| src/modules/events/EventsCatalogue.tsx _(non chargé)_ | 62 | 62 |
| src/modules/events/EventsDocumentsF.tsx _(non chargé)_ | 39 | 39 |
| src/modules/events/index.ts _(non chargé)_ | 18 | 16 |
| src/modules/assistant/assistantApi.ts _(non chargé)_ | 6 | 6 |
| src/modules/assistant/assistantUtils.ts _(non chargé)_ | 6 | 6 |
| src/modules/events/eventsTypes.ts _(non chargé)_ | 4 | 0 |
| src/modules/events/eventsUtils.ts _(non chargé)_ | 4 | 4 |
| src/modules/assistant/assistantRouter.ts _(non chargé)_ | 3 | 3 |
| src/modules/events/eventsConsts.ts _(non chargé)_ | 3 | 3 |
| src/app/api/payments/stripe/route.ts | 2 | 1 |
| src/modules/assistant/assistantPrompts.ts _(non chargé)_ | 2 | 2 |
| src/modules/events/EventsDemandesF.tsx _(non chargé)_ | 2 | 2 |
| src/modules/events/EventsPortail.tsx _(non chargé)_ | 2 | 2 |
| src/app/api/paiement/statut/route.ts | 1 | 0 |
| src/app/api/paiement/stripe-webhook/route.ts | 1 | 0 |
| src/app/api/paiement/stripe/route.ts | 1 | 1 |
| src/app/layout.tsx | 1 | 0 |
| src/modules/food/FoodCommandes.tsx | 1 | 0 |
| src/modules/food/FoodFournisseurs.tsx | 1 | 0 |
| src/modules/payments/PaymentCenter.tsx | 1 | 1 |

## Par code

| Code | Nombre |
|---|---|
| TS2339 | 622 |
| TS2304 | 351 |
| TS2739 | 207 |
| TS2322 | 114 |
| TS2345 | 33 |
| TS2459 | 24 |
| TS2741 | 19 |
| TS2305 | 15 |
| TS2353 | 6 |
| TS2300 | 4 |
| TS2367 | 3 |
| TS1117 | 3 |
| TS2551 | 2 |
| TS2362 | 2 |
| TS2363 | 2 |
| TS2724 | 2 |
| TS2306 | 2 |

## Détail — critique (394)

- `src/app/api/paiement/stripe/route.ts:45` TS2304 — Cannot find name 'stripe'.
- `src/app/api/payments/stripe/route.ts:175` TS2551 — Property 'catch' does not exist on type 'PostgrestFilterBuilder<any, any, any, null, "bellaia_notifications", unknown, "POST", false>'. Did you mean 'match'?
- `src/modules/assistant/assistantApi.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'DomaineIA'.
- `src/modules/assistant/assistantApi.ts:8` TS2724 — '"./assistantTypes"' has no exported member named 'Message'. Did you mean 'IAMessage'?
- `src/modules/assistant/assistantApi.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'ReponseIA'.
- `src/modules/assistant/assistantApi.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'TypeIntention'.
- `src/modules/assistant/assistantApi.ts:9` TS2305 — Module '"./assistantTypes"' has no exported member 'ActionProposee'.
- `src/modules/assistant/assistantApi.ts:9` TS2305 — Module '"./assistantTypes"' has no exported member 'ConfigurationProduit'.
- `src/modules/assistant/assistantPrompts.ts:7` TS2305 — Module '"./assistantTypes"' has no exported member 'DomaineIA'.
- `src/modules/assistant/assistantPrompts.ts:7` TS2305 — Module '"./assistantTypes"' has no exported member 'ContexteBellaiaStudio'.
- `src/modules/assistant/assistantRouter.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'DomaineIA'.
- `src/modules/assistant/assistantRouter.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'TypeIntention'.
- `src/modules/assistant/assistantRouter.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'IntentionDetectee'.
- `src/modules/assistant/assistantUtils.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'DomaineIA'.
- `src/modules/assistant/assistantUtils.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'TypeIntention'.
- `src/modules/assistant/assistantUtils.ts:8` TS2305 — Module '"./assistantTypes"' has no exported member 'ActionProposee'.
- `src/modules/assistant/assistantUtils.ts:9` TS2305 — Module '"./assistantTypes"' has no exported member 'TacheMemoire'.
- `src/modules/assistant/assistantUtils.ts:9` TS2305 — Module '"./assistantTypes"' has no exported member 'BrouillonMemoire'.
- `src/modules/assistant/assistantUtils.ts:9` TS2724 — '"./assistantTypes"' has no exported member named 'Message'. Did you mean 'IAMessage'?
- `src/modules/events/ClientEvents.tsx:6` TS2304 — Cannot find name 'useState'.
- `src/modules/events/ClientEvents.tsx:7` TS2304 — Cannot find name 'useState'.
- `src/modules/events/ClientEvents.tsx:8` TS2304 — Cannot find name 'useState'.
- `src/modules/events/ClientEvents.tsx:9` TS2304 — Cannot find name 'useState'.
- `src/modules/events/ClientEvents.tsx:11` TS2304 — Cannot find name 'useState'.
- `src/modules/events/ClientEvents.tsx:12` TS2304 — Cannot find name 'useState'.
- `src/modules/events/ClientEvents.tsx:30` TS2304 — Cannot find name 'genererReference'.
- `src/modules/events/ClientEvents.tsx:32` TS2304 — Cannot find name 'analyserDemandeClient'.
- `src/modules/events/ClientEvents.tsx:72` TS2304 — Cannot find name 'sbPost'.
- `src/modules/events/ClientEvents.tsx:80` TS2304 — Cannot find name 'ecrireAudit'.
- `src/modules/events/ClientEvents.tsx:113` TS2304 — Cannot find name 'today'.
- `src/modules/events/ClientEvents.tsx:126` TS2304 — Cannot find name 'creerNotification'.
- `src/modules/events/ClientEvents.tsx:148` TS2304 — Cannot find name 'EVENTS_CATEGORIES'.
- `src/modules/events/ClientEvents.tsx:156` TS2304 — Cannot find name 'PortailSuiviClient'.
- `src/modules/events/ClientEvents.tsx:160` TS2304 — Cannot find name 'EVENTS_CATEGORIES'.
- `src/modules/events/ClientEvents.tsx:161` TS2304 — Cannot find name 'EVENTS_PRESTATIONS'.
- `src/modules/events/ClientEvents.tsx:163` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:163` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:163` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:164` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:167` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:167` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:169` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:169` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:169` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:173` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:173` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:174` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:176` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:178` TS2304 — Cannot find name 'EVENTS_UNITE_FAMILLES'.
- `src/modules/events/ClientEvents.tsx:178` TS2304 — Cannot find name 'EVENTS_ANNIV_FAMILLES'.
- `src/modules/events/ClientEvents.tsx:184` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:185` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:185` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:187` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:187` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:188` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:188` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:188` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:190` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:191` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:192` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:194` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:194` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:194` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:195` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:195` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:212` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:214` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:214` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:214` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:215` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:215` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:215` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:220` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:220` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:220` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:221` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:222` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:222` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:223` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:223` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:223` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:227` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:227` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:228` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:229` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:231` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:231` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:232` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:233` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:237` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:245` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:253` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:253` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:256` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:257` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:258` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:270` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:270` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:274` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:275` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:321` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:321` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:325` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:326` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:338` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:338` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:342` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:343` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:354` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:354` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:360` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:362` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:362` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:377` TS2304 — Cannot find name 'analyserDemandeClient'.
- `src/modules/events/ClientEvents.tsx:383` TS2304 — Cannot find name 'LignesDevisAuto'.
- `src/modules/events/ClientEvents.tsx:386` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:386` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:400` TS2304 — Cannot find name 'WA'.
- `src/modules/events/ClientEvents.tsx:401` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:401` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:401` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:415` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:415` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:415` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:417` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:418` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:418` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:419` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:426` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:426` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:427` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:431` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:434` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:435` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:435` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:438` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:439` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:440` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:446` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:451` TS2304 — Cannot find name 'B'.
- `src/modules/events/ClientEvents.tsx:451` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:452` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:453` TS2304 — Cannot find name 'TimelineSuivi'.
- `src/modules/events/ClientEvents.tsx:458` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:458` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:459` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:459` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:459` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:460` TS2304 — Cannot find name 'WA'.
- `src/modules/events/ClientEvents.tsx:460` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:461` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:472` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:472` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:472` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:473` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:475` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:475` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:476` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:479` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:479` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:479` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:480` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:480` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:480` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:485` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:485` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:487` TS2304 — Cannot find name 'FS'.
- `src/modules/events/ClientEvents.tsx:487` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:488` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:492` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:492` TS2304 — Cannot find name 'SA'.
- `src/modules/events/ClientEvents.tsx:494` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:495` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:497` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:501` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:501` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:502` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:503` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:504` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:504` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:505` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:506` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:506` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:506` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:507` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:507` TS2304 — Cannot find name 'EVENTS_CONDITIONS'.
- `src/modules/events/ClientEvents.tsx:511` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:513` TS2304 — Cannot find name 'EVENTS_CATEGORIES'.
- `src/modules/events/ClientEvents.tsx:515` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:515` TS2304 — Cannot find name 'EV'.
- `src/modules/events/ClientEvents.tsx:517` TS2304 — Cannot find name 'EV'.
- `src/modules/events/EventsCatalogue.tsx:8` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsCatalogue.tsx:9` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsCatalogue.tsx:10` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsCatalogue.tsx:11` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsCatalogue.tsx:12` TS2304 — Cannot find name 'useP1Data'.
- `src/modules/events/EventsCatalogue.tsx:24` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:24` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:30` TS2304 — Cannot find name 'sbPatch'.
- `src/modules/events/EventsCatalogue.tsx:31` TS2304 — Cannot find name 'sbPost'.
- `src/modules/events/EventsCatalogue.tsx:38` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:38` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:40` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:40` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:40` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:40` TS2304 — Cannot find name 'SA'.
- `src/modules/events/EventsCatalogue.tsx:42` TS2304 — Cannot find name 'BE_FILTRES'.
- `src/modules/events/EventsCatalogue.tsx:43` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:43` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:43` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:43` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:43` TS2304 — Cannot find name 'SA'.
- `src/modules/events/EventsCatalogue.tsx:47` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:49` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:49` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:53` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:56` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:59` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:61` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:61` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:62` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:62` TS2304 — Cannot find name 'sbDelete'.
- `src/modules/events/EventsCatalogue.tsx:62` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:66` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:71` TS2304 — Cannot find name 'Mdl'.
- `src/modules/events/EventsCatalogue.tsx:72` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:72` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCatalogue.tsx:72` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:73` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:73` TS2304 — Cannot find name 'Sel'.
- `src/modules/events/EventsCatalogue.tsx:73` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:74` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:74` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCatalogue.tsx:74` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:75` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:75` TS2304 — Cannot find name 'Sel'.
- `src/modules/events/EventsCatalogue.tsx:75` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:76` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:76` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCatalogue.tsx:76` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:78` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:78` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCatalogue.tsx:78` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:79` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:79` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCatalogue.tsx:79` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCatalogue.tsx:82` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:83` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCatalogue.tsx:85` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:85` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:85` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:85` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCatalogue.tsx:86` TS2304 — Cannot find name 'Mdl'.
- `src/modules/events/EventsCommandesF.tsx:8` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsCommandesF.tsx:9` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsCommandesF.tsx:10` TS2304 — Cannot find name 'useP1Data'.
- `src/modules/events/EventsCommandesF.tsx:19` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:19` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:20` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:21` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:21` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:30` TS2304 — Cannot find name 'sbPatch'.
- `src/modules/events/EventsCommandesF.tsx:32` TS2304 — Cannot find name 'ecrireAudit'.
- `src/modules/events/EventsCommandesF.tsx:35` TS2304 — Cannot find name 'genererReference'.
- `src/modules/events/EventsCommandesF.tsx:37` TS2304 — Cannot find name 'sbPost'.
- `src/modules/events/EventsCommandesF.tsx:38` TS2304 — Cannot find name 'ecrireAudit'.
- `src/modules/events/EventsCommandesF.tsx:46` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:47` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:47` TS2304 — Cannot find name 'today'.
- `src/modules/events/EventsCommandesF.tsx:47` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:49` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:51` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:51` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:54` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:55` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:56` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:56` TS2304 — Cannot find name 'fmt'.
- `src/modules/events/EventsCommandesF.tsx:57` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:61` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:64` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsCommandesF.tsx:66` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:66` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:67` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:67` TS2304 — Cannot find name 'WA'.
- `src/modules/events/EventsCommandesF.tsx:67` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:68` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:68` TS2304 — Cannot find name 'sbDelete'.
- `src/modules/events/EventsCommandesF.tsx:68` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:74` TS2304 — Cannot find name 'Mdl'.
- `src/modules/events/EventsCommandesF.tsx:75` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:75` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:75` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:76` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:76` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:76` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:77` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:77` TS2304 — Cannot find name 'Sel'.
- `src/modules/events/EventsCommandesF.tsx:77` TS2304 — Cannot find name 'BE_FILTRES'.
- `src/modules/events/EventsCommandesF.tsx:77` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:79` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:79` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:79` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:80` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:80` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:80` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:82` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:82` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:82` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:84` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:84` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:84` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:85` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:85` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:85` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:87` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:87` TS2304 — Cannot find name 'Sel'.
- `src/modules/events/EventsCommandesF.tsx:87` TS2304 — Cannot find name 'BE_STATUTS_CMD'.
- `src/modules/events/EventsCommandesF.tsx:87` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:88` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:88` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsCommandesF.tsx:88` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsCommandesF.tsx:89` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:89` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:89` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:89` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsCommandesF.tsx:90` TS2304 — Cannot find name 'Mdl'.
- `src/modules/events/EventsDemandesF.tsx:8` TS2459 — Module '"./eventsUtils"' declares 'analyserDemandeClient' locally, but it is not exported.
- `src/modules/events/EventsDemandesF.tsx:9` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_CATEGORIES' locally, but it is not exported.
- `src/modules/events/EventsDocumentsF.tsx:8` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsDocumentsF.tsx:9` TS2304 — Cannot find name 'useState'.
- `src/modules/events/EventsDocumentsF.tsx:10` TS2304 — Cannot find name 'useP1Data'.
- `src/modules/events/EventsDocumentsF.tsx:19` TS2304 — Cannot find name 'sbPatch'.
- `src/modules/events/EventsDocumentsF.tsx:20` TS2304 — Cannot find name 'sbPost'.
- `src/modules/events/EventsDocumentsF.tsx:27` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:28` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:28` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:30` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:32` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:32` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:37` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:40` TS2304 — Cannot find name 'Bdg'.
- `src/modules/events/EventsDocumentsF.tsx:41` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:45` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:45` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:46` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:46` TS2304 — Cannot find name 'sbDelete'.
- `src/modules/events/EventsDocumentsF.tsx:46` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:53` TS2304 — Cannot find name 'Mdl'.
- `src/modules/events/EventsDocumentsF.tsx:54` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:54` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsDocumentsF.tsx:54` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:55` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:55` TS2304 — Cannot find name 'Sel'.
- `src/modules/events/EventsDocumentsF.tsx:55` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:56` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:56` TS2304 — Cannot find name 'Sel'.
- `src/modules/events/EventsDocumentsF.tsx:56` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:57` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:57` TS2304 — Cannot find name 'Inp'.
- `src/modules/events/EventsDocumentsF.tsx:57` TS2304 — Cannot find name 'Fld'.
- `src/modules/events/EventsDocumentsF.tsx:59` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:60` TS2304 — Cannot find name 'B'.
- `src/modules/events/EventsDocumentsF.tsx:62` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:62` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:62` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:62` TS2304 — Cannot find name 'Btn'.
- `src/modules/events/EventsDocumentsF.tsx:63` TS2304 — Cannot find name 'Mdl'.
- `src/modules/events/EventsPortail.tsx:9` TS2459 — Module '"./eventsConsts"' declares 'ETAPES_SUIVI' locally, but it is not exported.
- `src/modules/events/EventsPortail.tsx:10` TS2459 — Module '"./eventsUtils"' declares 'normaliserStatut' locally, but it is not exported.
- `src/modules/events/eventsConsts.ts:264` TS2304 — Cannot find name 'ENV'.
- `src/modules/events/eventsConsts.ts:266` TS2304 — Cannot find name 'ENV'.
- `src/modules/events/eventsConsts.ts:269` TS2304 — Cannot find name 'ENV'.
- `src/modules/events/eventsUtils.ts:8` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_PRESTATIONS' locally, but it is not exported.
- `src/modules/events/eventsUtils.ts:8` TS2459 — Module '"./eventsConsts"' declares 'FOOD_CATALOGUE_LIGHT' locally, but it is not exported.
- `src/modules/events/eventsUtils.ts:9` TS2459 — Module '"./eventsConsts"' declares 'DETECTION_MAP' locally, but it is not exported.
- `src/modules/events/eventsUtils.ts:9` TS2459 — Module '"./eventsConsts"' declares 'ETAPES_SUIVI' locally, but it is not exported.
- `src/modules/events/index.ts:24` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_CONDITIONS' locally, but it is not exported.
- `src/modules/events/index.ts:25` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_CATEGORIES' locally, but it is not exported.
- `src/modules/events/index.ts:26` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_UNITE_FAMILLES' locally, but it is not exported.
- `src/modules/events/index.ts:27` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_ANNIV_FAMILLES' locally, but it is not exported.
- `src/modules/events/index.ts:28` TS2459 — Module '"./eventsConsts"' declares 'EVENTS_PRESTATIONS' locally, but it is not exported.
- `src/modules/events/index.ts:29` TS2459 — Module '"./eventsConsts"' declares 'BE_FILTRES' locally, but it is not exported.
- `src/modules/events/index.ts:30` TS2459 — Module '"./eventsConsts"' declares 'BE_STATUTS_CMD' locally, but it is not exported.
- `src/modules/events/index.ts:31` TS2459 — Module '"./eventsConsts"' declares 'EV' locally, but it is not exported.
- `src/modules/events/index.ts:32` TS2459 — Module '"./eventsConsts"' declares 'FOOD_CATALOGUE_LIGHT' locally, but it is not exported.
- `src/modules/events/index.ts:33` TS2459 — Module '"./eventsConsts"' declares 'DETECTION_MAP' locally, but it is not exported.
- `src/modules/events/index.ts:34` TS2459 — Module '"./eventsConsts"' declares 'ETAPES_SUIVI' locally, but it is not exported.
- `src/modules/events/index.ts:39` TS2459 — Module '"./eventsUtils"' declares 'trouverPrestaEvents' locally, but it is not exported.
- `src/modules/events/index.ts:40` TS2459 — Module '"./eventsUtils"' declares 'trouverPrestaFood' locally, but it is not exported.
- `src/modules/events/index.ts:41` TS2459 — Module '"./eventsUtils"' declares 'construireLigne' locally, but it is not exported.
- `src/modules/events/index.ts:42` TS2459 — Module '"./eventsUtils"' declares 'analyserDemandeClient' locally, but it is not exported.
- `src/modules/events/index.ts:43` TS2459 — Module '"./eventsUtils"' declares 'normaliserStatut' locally, but it is not exported.
- `src/modules/payments/PaymentCenter.tsx:300` TS2551 — Property 'violetG' does not exist on type '{ bg: string; surface: string; card: string; card2: string; border: string; violet: string; violetL: string; violetD:

## Détail — élevée (4)

- `src/app/api/paiement/statut/route.ts:44` TS2322 — Type '"2024-06-20"' is not assignable to type '"2023-10-16"'.
- `src/app/api/paiement/stripe-webhook/route.ts:20` TS2322 — Type '"2024-06-20"' is not assignable to type '"2023-10-16"'.
- `src/app/api/payments/stripe/route.ts:18` TS2322 — Type '"2024-06-20"' is not assignable to type '"2023-10-16"'.
- `src/modules/food/FoodCommandes.tsx:146` TS2345 — Argument of type 'unknown' is not assignable to parameter of type 'SetStateAction<string>'.

