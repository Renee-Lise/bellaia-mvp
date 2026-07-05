// ═══════════════════════════════════════════════════════════
// MODULE BELLA'EVENTS — Point d'entrée unique
// BellaiaApp.tsx importe depuis ici.
// Phase 1 : extraction structurelle.
// Phase 2 : helpers Supabase dans eventsApi.ts.
// ═══════════════════════════════════════════════════════════

// Types
export type {
  EventsPrestation,
  EventsDemande,
  LigneDevis,
  LigneDevisEditee,
  DevisGenere,
  EtapeSuivi,
  FoodItem,
  DemandeAnalyseParams,
  PaiementDemande,
  LocationVaisselle,
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
  setFoodCatalogueExterne,
} from "./eventsUtils";

// API / sanitisation
export { sanitizeEventsDemandePayload } from "./eventsApi";

// Composants fondatrice (named exports)
export { BellaEventsF }          from "./EventsDemandesF";
export { BellaEventsF as default } from "./EventsDemandesF";

// Composants devis (named exports)
export {
  EditeurLignesDevis,
  ModalGenerationDevis,
  DevisClientView,
  buildDevisHTML,
} from "./EventsDevis";

// Composants portail + estimation (named exports)
export {
  LignesDevisAuto,
  TimelineSuivi,
  PortailSuiviClient,
} from "./EventsPortail";

// Portail client
export { ClientEvents } from "./ClientEvents";
