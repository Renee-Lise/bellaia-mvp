// ═══════════════════════════════════════════════════════════
// API — Bella'Food — HACCP (food_haccp_releves, food_haccp_nettoyage,
// food_haccp_tracabilite, migration 0063).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost } from "./foodApi";
import type { RelevéTemperature, FicheNettoyage, TraçabiliteProduit } from "./foodTypes";

// ── Relevés de température ──────────────────────────────────
function mapReleveFromDb(row: any): RelevéTemperature {
  return {
    id: row.id,
    zone: row.zone,
    temperature: row.temperature,
    dateHeure: row.date_heure,
    operateur: row.operateur ?? "—",
    conforme: row.conforme ?? true,
    action: row.action ?? undefined,
  };
}

export async function getRelevesHaccpAvecDiagnostic(): Promise<{ releves: RelevéTemperature[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { releves: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_haccp_releves", "order=date_heure.desc&limit=200");
  return { releves: rows.map(mapReleveFromDb), diagnostic: null };
}

export async function creerReleveHaccp(r: Partial<RelevéTemperature>): Promise<{ ok: boolean; releve?: RelevéTemperature; error?: string }> {
  const payload: Record<string, any> = {
    zone: r.zone, temperature: r.temperature, date_heure: r.dateHeure,
    operateur: r.operateur, conforme: r.conforme, action: r.action,
  };
  const res = await sbFoodPost<any>("food_haccp_releves", payload);
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, releve: row ? mapReleveFromDb(row) : undefined };
}

// ── Fiches de nettoyage ──────────────────────────────────────
function mapFicheFromDb(row: any): FicheNettoyage {
  return {
    id: row.id,
    zone: row.zone,
    date: row.date,
    heure: row.heure ?? "",
    operateur: row.operateur ?? "—",
    produitUtilise: row.produit_utilise ?? undefined,
    valide: row.valide ?? true,
    signature: row.signature ?? undefined,
    observations: row.observations ?? undefined,
  };
}

export async function getFichesNettoyageAvecDiagnostic(): Promise<{ fiches: FicheNettoyage[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { fiches: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_haccp_nettoyage", "order=date.desc&limit=200");
  return { fiches: rows.map(mapFicheFromDb), diagnostic: null };
}

export async function creerFicheNettoyage(f: Partial<FicheNettoyage>): Promise<{ ok: boolean; fiche?: FicheNettoyage; error?: string }> {
  const payload: Record<string, any> = {
    zone: f.zone, date: f.date, heure: f.heure, operateur: f.operateur,
    produit_utilise: f.produitUtilise, valide: f.valide, observations: f.observations,
  };
  const res = await sbFoodPost<any>("food_haccp_nettoyage", payload);
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, fiche: row ? mapFicheFromDb(row) : undefined };
}

// ── Traçabilité ───────────────────────────────────────────────
function mapTracabiliteFromDb(row: any): TraçabiliteProduit {
  return {
    id: row.id,
    productionId: row.production_id ?? undefined,
    recetteNom: row.recette_nom,
    dateProduction: row.date_production,
    lotsIngredients: Array.isArray(row.lots_ingredients) ? row.lots_ingredients : [],
    operateur: row.operateur ?? "",
    temperatureCuisson: row.temperature_cuisson ?? undefined,
    temperatureConservation: row.temperature_conservation ?? undefined,
    dlc: row.dlc ?? undefined,
    observations: row.observations ?? undefined,
  };
}

export async function getTracabilitesAvecDiagnostic(): Promise<{ tracabilites: TraçabiliteProduit[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { tracabilites: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_haccp_tracabilite", "order=date_production.desc&limit=200");
  return { tracabilites: rows.map(mapTracabiliteFromDb), diagnostic: null };
}

export async function creerTracabilite(t: Partial<TraçabiliteProduit>): Promise<{ ok: boolean; tracabilite?: TraçabiliteProduit; error?: string }> {
  const payload: Record<string, any> = {
    production_id: t.productionId || null, recette_nom: t.recetteNom, date_production: t.dateProduction,
    lots_ingredients: t.lotsIngredients || [], operateur: t.operateur,
    temperature_cuisson: t.temperatureCuisson, temperature_conservation: t.temperatureConservation,
    dlc: t.dlc, observations: t.observations,
  };
  const res = await sbFoodPost<any>("food_haccp_tracabilite", payload);
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, tracabilite: row ? mapTracabiliteFromDb(row) : undefined };
}
