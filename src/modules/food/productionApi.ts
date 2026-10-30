// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Productions (table réelle food_productions,
// migration 0058).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import type { Production, StatutProduction } from "./foodTypes";

function mapProductionFromDb(row: any): Production {
  return {
    id: row.id,
    numero: row.numero,
    recetteId: row.recette_id ?? undefined,
    recetteNom: row.recette_nom,
    date: row.date,
    operateur: row.operateur ?? undefined,
    quantite: row.quantite ?? 1,
    dureeMin: row.duree_min ?? undefined,
    materiel: Array.isArray(row.materiel) ? row.materiel : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    lotsUtilises: Array.isArray(row.lots_utilises) ? row.lots_utilises : undefined,
    statut: row.statut ?? "prevue",
    observations: row.observations ?? undefined,
    photos: Array.isArray(row.photos) ? row.photos : undefined,
    commandeId: row.commande_id ?? undefined,
  };
}

function mapProductionToDb(p: Partial<Production>): Record<string, any> {
  const d: Record<string, any> = {};
  if (p.numero !== undefined) d.numero = p.numero;
  if (p.recetteId !== undefined) d.recette_id = p.recetteId || null;
  if (p.recetteNom !== undefined) d.recette_nom = p.recetteNom;
  if (p.date !== undefined) d.date = p.date;
  if (p.operateur !== undefined) d.operateur = p.operateur;
  if (p.quantite !== undefined) d.quantite = p.quantite;
  if (p.dureeMin !== undefined) d.duree_min = p.dureeMin;
  if (p.materiel !== undefined) d.materiel = p.materiel;
  if (p.ingredients !== undefined) d.ingredients = p.ingredients;
  if (p.lotsUtilises !== undefined) d.lots_utilises = p.lotsUtilises;
  if (p.statut !== undefined) d.statut = p.statut;
  if (p.observations !== undefined) d.observations = p.observations;
  if (p.photos !== undefined) d.photos = p.photos;
  if (p.commandeId !== undefined) d.commande_id = p.commandeId;
  return d;
}

export async function getProductionsFoodAvecDiagnostic(): Promise<{ productions: Production[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { productions: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_productions", "order=date.desc&limit=200");
  return { productions: rows.map(mapProductionFromDb), diagnostic: null };
}

export async function creerProductionFood(p: Partial<Production>): Promise<{ ok: boolean; production?: Production; error?: string }> {
  const res = await sbFoodPost<any>("food_productions", mapProductionToDb(p));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, production: row ? mapProductionFromDb(row) : undefined };
}

export async function majStatutProduction(id: string, statut: StatutProduction): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_productions", id, { statut });
}

export const supprimerProductionFood = (id: string) => sbFoodDelete("food_productions", id);
