// ═══════════════════════════════════════════════════════════
// Actions requises — règle de comptage unique (accueil, badge du menu, écran « Actions requises »).
// Corrige le « 50 » permanent : l'accueil lisait au plus 50 lignes (limit=50) et affichait ce plafond ;
// le badge comptait une autre sélection (priorité ≤ 2) et incluait la ligne technique du registre.
// Règles explicites :
//  • « à traiter » = statut a_faire (attend une décision de la fondatrice) ;
//  • « en cours »  = statut en_cours (décision prise, travail en cours) — affiché à part ;
//  • fermées       = fait, annule(e), abandonne, sans_objet — jamais comptées ;
//  • lignes techniques (ex. le registre des exigences, cle = suivi_exigences) — jamais comptées.
// ═══════════════════════════════════════════════════════════
export const CLES_TECHNIQUES = ["suivi_exigences"];
export const STATUTS_FERMES = ["fait", "annule", "annulee", "abandonne", "sans_objet"];
export const REQUETE_ACTIONS = "select=id,cle,titre,univers,priorite,date_limite,statut,decision,bloque&order=priorite.asc,date_limite.asc.nullslast";

type ActionMin = { statut?: string | null; cle?: string | null; priorite?: number | null; date_limite?: string | null };

export const estTechnique = (a: ActionMin) => CLES_TECHNIQUES.includes(a.cle || "");
export const estOuverte = (a: ActionMin) => !estTechnique(a) && !STATUTS_FERMES.includes(a.statut || "");
export const aTraiter = (a: ActionMin) => estOuverte(a) && a.statut === "a_faire";

export function compterActions(actions: ActionMin[], aujourdhui = new Date()) {
  const ouvertes = actions.filter(estOuverte);
  const jour = aujourdhui.toISOString().slice(0, 10);
  return {
    aTraiter: ouvertes.filter(a => a.statut === "a_faire").length,
    enCours: ouvertes.filter(a => a.statut === "en_cours").length,
    urgentes: ouvertes.filter(a => a.statut === "a_faire" && a.priorite === 1).length,
    echues: ouvertes.filter(a => !!a.date_limite && (a.date_limite as string) < jour).length,
    ouvertes: ouvertes.length,
  };
}
