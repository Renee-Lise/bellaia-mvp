// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Étiquettes (table réelle food_etiquettes,
// migration 0063).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost } from "./foodApi";
import type { Etiquette } from "./foodTypes";

function mapEtiquetteFromDb(row: any): Etiquette {
  return {
    id: row.id,
    nomProduit: row.nom_produit,
    dateFabrication: row.date_fabrication,
    dlc: row.dlc ?? undefined,
    ddm: row.ddm ?? undefined,
    numerLot: row.numero_lot ?? undefined,
    allergenes: Array.isArray(row.allergenes) ? row.allergenes : undefined,
    ingredients: row.ingredients ?? undefined,
    poids: row.poids ?? undefined,
    volume: row.volume ?? undefined,
    conditionsConservation: row.conditions_conservation ?? undefined,
    referenceProduction: row.reference_production ?? undefined,
    mention: row.mention ?? "client",
    format: row.format ?? "moyen",
  };
}

function mapEtiquetteToDb(e: Partial<Etiquette>): Record<string, any> {
  const d: Record<string, any> = {};
  if (e.nomProduit !== undefined) d.nom_produit = e.nomProduit;
  if (e.dateFabrication !== undefined) d.date_fabrication = e.dateFabrication;
  if (e.dlc !== undefined) d.dlc = e.dlc;
  if (e.ddm !== undefined) d.ddm = e.ddm;
  if (e.numerLot !== undefined) d.numero_lot = e.numerLot;
  if (e.allergenes !== undefined) d.allergenes = e.allergenes;
  if (e.ingredients !== undefined) d.ingredients = e.ingredients;
  if (e.poids !== undefined) d.poids = e.poids;
  if (e.volume !== undefined) d.volume = e.volume;
  if (e.conditionsConservation !== undefined) d.conditions_conservation = e.conditionsConservation;
  if (e.referenceProduction !== undefined) d.reference_production = e.referenceProduction;
  if (e.mention !== undefined) d.mention = e.mention;
  if (e.format !== undefined) d.format = e.format;
  return d;
}

export async function getEtiquettesFoodAvecDiagnostic(): Promise<{ etiquettes: Etiquette[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { etiquettes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_etiquettes", "order=date_fabrication.desc&limit=300");
  return { etiquettes: rows.map(mapEtiquetteFromDb), diagnostic: null };
}

export async function creerEtiquetteFood(e: Partial<Etiquette>): Promise<{ ok: boolean; etiquette?: Etiquette; error?: string }> {
  const res = await sbFoodPost<any>("food_etiquettes", mapEtiquetteToDb(e));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, etiquette: row ? mapEtiquetteFromDb(row) : undefined };
}
