// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Planning de production (table réelle
// food_planning, migration 0062).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch } from "./foodApi";
import type { PlanningProduction } from "./foodTypes";

function mapPlanningFromDb(row: any): PlanningProduction {
  return {
    id: row.id,
    commandeId: row.commande_id ?? "",
    nomCommande: row.nom_commande,
    dateLivraison: row.date_livraison,
    taches: Array.isArray(row.taches) ? row.taches : [],
    notesFondatrice: row.notes_fondatrice ?? undefined,
    alerte: row.alerte ?? undefined,
  };
}

function mapPlanningToDb(p: Partial<PlanningProduction>): Record<string, any> {
  const d: Record<string, any> = {};
  if (p.commandeId !== undefined) d.commande_id = p.commandeId;
  if (p.nomCommande !== undefined) d.nom_commande = p.nomCommande;
  if (p.dateLivraison !== undefined) d.date_livraison = p.dateLivraison;
  if (p.taches !== undefined) d.taches = p.taches;
  if (p.notesFondatrice !== undefined) d.notes_fondatrice = p.notesFondatrice;
  if (p.alerte !== undefined) d.alerte = p.alerte;
  return d;
}

export async function getPlanningsFoodAvecDiagnostic(): Promise<{ plannings: PlanningProduction[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { plannings: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_planning", "order=date_livraison.asc&limit=200");
  return { plannings: rows.map(mapPlanningFromDb), diagnostic: null };
}

export async function creerPlanningFood(p: Partial<PlanningProduction>): Promise<{ ok: boolean; planning?: PlanningProduction; error?: string }> {
  const res = await sbFoodPost<any>("food_planning", mapPlanningToDb(p));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, planning: row ? mapPlanningFromDb(row) : undefined };
}

export async function majPlanningFood(id: string, p: Partial<PlanningProduction>): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_planning", id, mapPlanningToDb(p));
}
