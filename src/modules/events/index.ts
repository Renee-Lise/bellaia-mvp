// ═══════════════════════════════════════════════════════════
// MODULE BELLA'EVENTS — Point d'entrée unique
// BellaiaApp.tsx importe depuis ici.
//
// Phase 1 : extraction structurelle, sans changement fonctionnel.
// Phase 2 : les helpers Supabase (sbGet, sbPost…) seront
//           déplacés dans eventsApi.ts avec imports explicites.
// ═══════════════════════════════════════════════════════════

// Types
export type {
  EventsPrestation,
  EventsDemande,
  LigneDevis,
  EtapeSuivi,
  FoodItem,
  DemandeAnalyseParams,
} from "./eventsTypes";

// Constantes catalogue
export {
  EVENTS_CONDITIONS,
  EVENTS_CATEGORIES,
  EVENTS_UNITE_FAMILLES,
  EVENTS_ANNIV_FAMILLES,
  EVENTS_PRESTATIONS,
  BE_FILTRES,
  BE_STATUTS_CMD,
  EV,
  FOOD_CATALOGUE_LIGHT,
  DETECTION_MAP,
  ETAPES_SUIVI,
} from "./eventsConsts";

// Utilitaires
export {
  trouverPrestaEvents,
  trouverPrestaFood,
  construireLigne,
  analyserDemandeClient,
  normaliserStatut,
} from "./eventsUtils";

// API / sanitisation
export { sanitizeEventsDemandePayload } from "./eventsApi";

// Composants fondatrice
export { default as BellaEventsF }        from "./EventsDemandesF";
export { default as BellaEventsCatalogue } from "./EventsCatalogue";
export { default as BellaEventsCommandes } from "./EventsCommandesF";
export { default as BellaEventsDocuments } from "./EventsDocumentsF";

// Composants devis
export { default as ModalGenerationDevis } from "./EventsDevis";
export { default as DevisClientView }      from "./EventsDevis";

// Composants portail + client
export { default as LignesDevisAuto }    from "./EventsPortail";
export { default as TimelineSuivi }      from "./EventsPortail";
export { default as PortailSuiviClient } from "./EventsPortail";
export { default as ClientEvents }       from "./ClientEvents";
