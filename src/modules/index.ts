// ═══════════════════════════════════════════════════════════
// MODULE CRM BELLAÏA — Index LOT VII
// src/modules/crm/index.ts
// ═══════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────
export type {
  Client, StatutClient,
  Adresse, TypeAdresse,
  ContactLie,
  DocumentClient, TypeDocument,
  ConsentementClient, TypeConsentement,
  EntreeHistorique, TypeEntiteHistorique,
  ModuleBU,
  StatsClient,
  ResultatRechercheClient,
} from "./crmTypes";

// ── Utilitaires ────────────────────────────────────────────
export {
  genRefClient,
  nomComplet,
  fmtDate,
  fmtPrix,
  estAnniversaire,
  calculerAge,
  rechercherClientsLocal,
  rgpdValide,
  initiales,
  STATUT_COULEURS,
  MODULE_LABELS,
} from "./crmUtils";

// ── API Supabase ───────────────────────────────────────────
export {
  getClients,
  getClient,
  creerClient,
  majClient,
  rechercherOuCreerClient,
  ajouterAdresse,
  ajouterContact,
  ajouterHistorique,
  getHistoriqueClient,
} from "./crmApi";

// ── Composant principal ────────────────────────────────────
export { default as ClientCenter } from "./ClientCenter";
export { default } from "./ClientCenter";
