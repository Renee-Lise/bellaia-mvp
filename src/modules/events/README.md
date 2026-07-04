# Module Bella'Events — Architecture modulaire

## Phase 1 (livraison actuelle)

Les fichiers du module sont **créés et structurés** dans `src/modules/events/`.
`BellaiaApp.tsx` reste intact pour l'instant — le build ne change pas.

Les fichiers du module contiennent le code extrait tel quel depuis `BellaiaApp.tsx`.
Ils ne sont **pas encore importés** dans `BellaiaApp.tsx` car ils dépendent
de helpers globaux (`sbPost`, `sbGet`, `useP1Data`, `B`, `FS`, etc.)
qui sont encore dans `BellaiaApp.tsx`.

## Phase 2 (prochaine étape)

Déplacer les helpers partagés dans des fichiers dédiés :

```
src/lib/
  supabaseClient.ts   — sbGet, sbPost, sbPatch, sbDelete, getTokenAsync
  uiHelpers.ts        — B (couleurs), FS, SA, fmt, today, WA
  hooks.ts            — useP1Data, useBSHSupabase
  notifications.ts    — creerNotification
  references.ts       — genererReference
  audit.ts            — ecrireAudit
  planning.ts         — creerEvenementPlanning, verifierConflitPlanning
```

Une fois `src/lib/` en place, chaque module Events pourra importer explicitement :

```ts
import { sbPost, useP1Data } from "../../lib/supabaseClient";
import { B, FS } from "../../lib/uiHelpers";
```

Et `BellaiaApp.tsx` pourra remplacer ses blocs Events par :

```ts
import { BellaEventsF } from "../modules/events/EventsDemandesF";
import { ClientEvents }  from "../modules/events/ClientEvents";
```

## Phase 3

Découpage des autres modules (BSH, Odyssée, Planning, Notifications...)
sur le même schéma.

## Structure actuelle

```
src/modules/events/
  index.ts              — re-exports (prêt pour Phase 3)
  eventsTypes.ts        — interfaces TypeScript
  eventsConsts.ts       — EVENTS_PRESTATIONS, EVENTS_CATEGORIES, EV, etc.
  eventsUtils.ts        — analyserDemandeClient, normaliserStatut, etc.
  eventsApi.ts          — sanitizeEventsDemandePayload
  EventsDemandesF.tsx   — BellaEventsF (fondatrice — onglet Demandes)
  EventsCatalogue.tsx   — BellaEventsCatalogue (fondatrice — onglet Catalogue)
  EventsCommandesF.tsx  — BellaEventsCommandes (fondatrice — onglet Commandes)
  EventsDocumentsF.tsx  — BellaEventsDocuments (fondatrice — onglet Documents)
  EventsDevis.tsx       — ModalGenerationDevis + DevisClientView
  EventsPortail.tsx     — PortailSuiviClient + TimelineSuivi + LignesDevisAuto
  ClientEvents.tsx      — ClientEvents (portail client)
  README.md             — ce fichier
```
