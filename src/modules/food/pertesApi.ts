// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Pertes (table réelle food_pertes, migration 0062).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch } from "./foodApi";
import type { Perte } from "./foodTypes";

function mapPerteFromDb(row: any): Perte {
  return {
    id: row.id,
    date: row.date,
    produit: row.produit,
    recetteId: row.recette_id ?? undefined,
    quantite: row.quantite ?? 1,
    unite: row.unite ?? "pièce",
    coutEstime: row.cout_estime ?? 0,
    cause: row.cause,
    description: row.description ?? undefined,
    responsable: row.responsable ?? undefined,
    photo: row.photo ?? undefined,
    actionCorrective: row.action_corrective ?? undefined,
    statut: row.statut ?? "ouverte",
  };
}

function mapPerteToDb(p: Partial<Perte>): Record<string, any> {
  const d: Record<string, any> = {};
  if (p.date !== undefined) d.date = p.date;
  if (p.produit !== undefined) d.produit = p.produit;
  if (p.recetteId !== undefined) d.recette_id = p.recetteId || null;
  if (p.quantite !== undefined) d.quantite = p.quantite;
  if (p.unite !== undefined) d.unite = p.unite;
  if (p.coutEstime !== undefined) d.cout_estime = p.coutEstime;
  if (p.cause !== undefined) d.cause = p.cause;
  if (p.description !== undefined) d.description = p.description;
  if (p.responsable !== undefined) d.responsable = p.responsable;
  if (p.photo !== undefined) d.photo = p.photo;
  if (p.actionCorrective !== undefined) d.action_corrective = p.actionCorrective;
  if (p.statut !== undefined) d.statut = p.statut;
  return d;
}

export async function getPertesFoodAvecDiagnostic(): Promise<{ pertes: Perte[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { pertes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_pertes", "order=date.desc&limit=300");
  return { pertes: rows.map(mapPerteFromDb), diagnostic: null };
}

export async function creerPerteFood(p: Partial<Perte>): Promise<{ ok: boolean; perte?: Perte; error?: string }> {
  const res = await sbFoodPost<any>("food_pertes", mapPerteToDb(p));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, perte: row ? mapPerteFromDb(row) : undefined };
}

export async function majStatutPerteFood(id: string, statut: Perte["statut"]): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_pertes", id, { statut });
}
