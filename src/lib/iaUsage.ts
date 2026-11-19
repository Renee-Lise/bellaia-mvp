// ═══════════════════════════════════════════════════════════
// Consommation IA : quotas journaliers, budget mensuel, alerte,
// journal de chaque appel (jetons + coût estimé). Client SERVEUR
// uniquement (clé service) : la table ia_consommation n'est lisible
// que par la fondatrice et inscriptible par le serveur.
// Les prix par million de jetons sont des ESTIMATIONS configurables
// (table ia_limites) — à ajuster d'après la facturation réelle.
// ═══════════════════════════════════════════════════════════
export type Limites = { appels_jour: number; budget_mensuel_eur: number; alerte_pct: number; prix_entree_mtok: number; prix_sortie_mtok: number; suspendu: boolean };
const DEFAUT: Limites = { appels_jour: 200, budget_mensuel_eur: 20, alerte_pct: 80, prix_entree_mtok: 3, prix_sortie_mtok: 15, suspendu: false };

export async function limitesIA(admin: any, espace = "GENERAL"): Promise<Limites> {
  try {
    const { data } = await admin.from("ia_limites").select("*").eq("espace", espace).maybeSingle();
    return { ...DEFAUT, ...(data || {}) };
  } catch { return DEFAUT; }
}

/** Refuse l'appel si quota du jour, budget du mois ou suspension atteints. */
export async function verifierQuota(admin: any, userId: string | null, espace = "GENERAL"): Promise<{ ok: boolean; raison?: string; alerte?: string; limites: Limites; depenseMois: number }> {
  const lim = await limitesIA(admin, espace);
  if (lim.suspendu) return { ok: false, raison: "Traitement IA suspendu par la fondatrice (Bibliothèque → Coûts IA).", limites: lim, depenseMois: 0 };
  const debutJour = new Date(); debutJour.setUTCHours(0, 0, 0, 0);
  const debutMois = new Date(Date.UTC(debutJour.getUTCFullYear(), debutJour.getUTCMonth(), 1));
  try {
    const [{ count }, { data: mois }] = await Promise.all([
      admin.from("ia_consommation").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", debutJour.toISOString()),
      admin.from("ia_consommation").select("cout_estime_eur").gte("created_at", debutMois.toISOString()).limit(20000),
    ]);
    const depenseMois = (mois || []).reduce((s: number, r: any) => s + Number(r.cout_estime_eur || 0), 0);
    if ((count || 0) >= lim.appels_jour) return { ok: false, raison: `Limite de ${lim.appels_jour} analyses IA par jour atteinte.`, limites: lim, depenseMois };
    if (depenseMois >= lim.budget_mensuel_eur) return { ok: false, raison: `Budget IA du mois atteint (${depenseMois.toFixed(2)} € / ${lim.budget_mensuel_eur} €).`, limites: lim, depenseMois };
    const alerte = depenseMois >= lim.budget_mensuel_eur * lim.alerte_pct / 100 ? `Attention : ${Math.round(depenseMois / lim.budget_mensuel_eur * 100)} % du budget IA du mois consommé.` : undefined;
    return { ok: true, alerte, limites: lim, depenseMois };
  } catch {
    // Table absente ou erreur : on n'empêche pas l'usage, mais rien n'est journalisé.
    return { ok: true, limites: lim, depenseMois: 0 };
  }
}

export const coutEstime = (lim: Limites, entree: number, sortie: number) =>
  Math.round(((entree * lim.prix_entree_mtok + sortie * lim.prix_sortie_mtok) / 1_000_000) * 10000) / 10000;

export async function journaliserIA(admin: any, e: { userId: string | null; route: string; modele?: string; entree?: number; sortie?: number; cout?: number; cible?: string; ok?: boolean }) {
  try {
    await admin.from("ia_consommation").insert({ user_id: e.userId, route: e.route, modele: e.modele || null, jetons_entree: e.entree || 0, jetons_sortie: e.sortie || 0, cout_estime_eur: e.cout ?? null, cible: e.cible || null, ok: e.ok !== false });
  } catch { /* journal best-effort */ }
}
