// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Devis (table réelle food_devis, migration 0061).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import type { DevisFood, StatutDevisFood } from "./foodTypes";

function mapDevisFromDb(row: any): DevisFood {
  return {
    id: row.id,
    reference: row.reference,
    client: row.client,
    tel: row.tel ?? "",
    email: row.email ?? undefined,
    lignes: Array.isArray(row.lignes) ? row.lignes : [],
    conditions: row.conditions ?? "",
    dateCreation: row.date_creation,
    dateValidite: row.date_validite ?? "",
    acomptePct: row.acompte_pct ?? 30,
    statut: row.statut ?? "brouillon",
    notes: row.notes ?? undefined,
    commandeId: row.commande_id ?? undefined,
  };
}

function mapDevisToDb(d: Partial<DevisFood>): Record<string, any> {
  const r: Record<string, any> = {};
  if (d.reference !== undefined) r.reference = d.reference;
  if (d.client !== undefined) r.client = d.client;
  if (d.tel !== undefined) r.tel = d.tel;
  if (d.email !== undefined) r.email = d.email;
  if (d.lignes !== undefined) r.lignes = d.lignes;
  if (d.conditions !== undefined) r.conditions = d.conditions;
  if (d.dateCreation !== undefined) r.date_creation = d.dateCreation;
  if (d.dateValidite !== undefined) r.date_validite = d.dateValidite;
  if (d.acomptePct !== undefined) r.acompte_pct = d.acomptePct;
  if (d.statut !== undefined) r.statut = d.statut;
  if (d.notes !== undefined) r.notes = d.notes;
  if (d.commandeId !== undefined) r.commande_id = d.commandeId || null;
  return r;
}

export async function getDevisFoodAvecDiagnostic(): Promise<{ devis: DevisFood[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { devis: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_devis", "order=date_creation.desc&limit=200");
  return { devis: rows.map(mapDevisFromDb), diagnostic: null };
}

export async function creerDevisFood(d: Partial<DevisFood>): Promise<{ ok: boolean; devis?: DevisFood; error?: string }> {
  const res = await sbFoodPost<any>("food_devis", mapDevisToDb(d));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, devis: row ? mapDevisFromDb(row) : undefined };
}

export async function majStatutDevisFood(id: string, statut: StatutDevisFood): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_devis", id, { statut });
}

export const supprimerDevisFood = (id: string) => sbFoodDelete("food_devis", id);
