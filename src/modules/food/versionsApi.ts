// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Versions de recettes (table réelle
// food_versions_recettes, migration 0062).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost } from "./foodApi";
import type { VersionRecette } from "./foodTypes";

function mapVersionFromDb(row: any): VersionRecette {
  return {
    id: row.id,
    recetteId: row.recette_id,
    recetteNom: row.recette_nom,
    typeVersion: row.type_version ?? "version_test",
    nomVersion: row.nom_version,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    coutMatiere: row.cout_matiere ?? 0,
    coutConsommables: row.cout_consommables ?? 0,
    tempsProduction: row.temps_production ?? 0,
    prixConseille: row.prix_conseille ?? null,
    prixPremium: row.prix_premium ?? null,
    margeEstimee: row.marge_estimee ?? null,
    notes: row.notes ?? undefined,
    statut: row.statut ?? "brouillon",
    dateCreation: row.date_creation,
  };
}

function mapVersionToDb(v: Partial<VersionRecette>): Record<string, any> {
  const d: Record<string, any> = {};
  if (v.recetteId !== undefined) d.recette_id = v.recetteId;
  if (v.recetteNom !== undefined) d.recette_nom = v.recetteNom;
  if (v.typeVersion !== undefined) d.type_version = v.typeVersion;
  if (v.nomVersion !== undefined) d.nom_version = v.nomVersion;
  if (v.ingredients !== undefined) d.ingredients = v.ingredients;
  if (v.coutMatiere !== undefined) d.cout_matiere = v.coutMatiere;
  if (v.coutConsommables !== undefined) d.cout_consommables = v.coutConsommables;
  if (v.tempsProduction !== undefined) d.temps_production = v.tempsProduction;
  if (v.prixConseille !== undefined) d.prix_conseille = v.prixConseille;
  if (v.prixPremium !== undefined) d.prix_premium = v.prixPremium;
  if (v.margeEstimee !== undefined) d.marge_estimee = v.margeEstimee;
  if (v.notes !== undefined) d.notes = v.notes;
  if (v.statut !== undefined) d.statut = v.statut;
  return d;
}

export async function getVersionsFoodAvecDiagnostic(): Promise<{ versions: VersionRecette[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { versions: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_versions_recettes", "order=date_creation.desc&limit=300");
  return { versions: rows.map(mapVersionFromDb), diagnostic: null };
}

export async function creerVersionFood(v: Partial<VersionRecette>): Promise<{ ok: boolean; version?: VersionRecette; error?: string }> {
  const res = await sbFoodPost<any>("food_versions_recettes", mapVersionToDb(v));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, version: row ? mapVersionFromDb(row) : undefined };
}
