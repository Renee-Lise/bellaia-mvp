// ═══════════════════════════════════════════════════════════
// MODULE SEARCH BELLAÏA — Index
// src/modules/search/index.ts
// ═══════════════════════════════════════════════════════════

export type {
  ModuleSearch, ProfilRecherche,
  CriteresRecherche, ResultatRecherche, ReponseRecherche,
  TypeResultat,
} from "./searchTypes";

export {
  rechercherGlobal,
  TYPE_LABELS, TYPE_COLORS,
  fmtPrix,
} from "./searchUtils";

export { default as GlobalSearch } from "./GlobalSearch";
export { default }                 from "./GlobalSearch";
