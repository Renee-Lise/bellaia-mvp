// ═══════════════════════════════════════════════════════════
// MODULE ASSISTANT BELLAÏA IA — Index LOT IX-A
// src/modules/assistant/index.ts
// ═══════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────
export type {
  DomaineIA,
  FournisseurIA,
  ConfigIA,
  RoleMessage,
  Message,
  Conversation,
  ContexteConversation,
  TypeIntention,
  IntentionDetectee,
  StatutAction,
  TypeAction,
  ActionProposee,
  ReponseIA,
  ClassementSuggere,
  AnalyseContenu,
  MemoreTravail,
  TacheMemoire,
  BrouillonMemoire,
  MemoreProjet,
  EntreeHistoriqueProjet,
  VersionProjet,
  ValidationProjet,
  AgentSpec,
  ContexteBellaiaStudio,
} from "./assistantTypes";

// ── Utilitaires ────────────────────────────────────────────
export {
  genMsgId,
  genActionId,
  genConvId,
  now,
  fmtDateHeure,
  tronquer,
  DOMAINE_LABELS,
  INTENTION_LABELS,
  msgUser,
  msgAssistant,
  msgSysteme,
  resumerConversation,
  resumerAction,
  actionsEnAttente,
  creerTache,
  creerBrouillon,
  SUGGESTIONS_PAR_DOMAINE,
  getSuggestions,
  requiertValidation,
  messageValidation,
} from "./assistantUtils";

// ── Prompts ────────────────────────────────────────────────
export {
  getPromptSysteme,
  getPromptRoutage,
  getPromptClassification,
} from "./assistantPrompts";

// ── Routeur ────────────────────────────────────────────────
export {
  routerLocal,
  parseReponseRouteur,
  fusionnerDetections,
  detecterQuestionRapide,
  QUESTIONS_RAPIDES,
} from "./assistantRouter";

// ── Composant principal (disponible depuis LOT IX-D) ───────
// export { default as BellaiaAssistant } from "./BellaiaAssistant";
// export { default as assistantApi }    from "./assistantApi";
// export { default as assistantMemory } from "./assistantMemory";
// export { default as assistantAgents } from "./assistantAgents";
// export { default as assistantActions }from "./assistantActions";
