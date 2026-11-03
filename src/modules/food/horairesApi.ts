// ═══════════════════════════════════════════════════════════
// Horaires, jours fermés et quota — Bella'Food (migration 0078)
// src/modules/food/horairesApi.ts
//
// Une seule ligne attendue dans food_horaires_config. Tant qu'elle
// n'existe pas ou que actif=false, /api/food/commandes/create
// n'applique aucune restriction — jamais de règle inventée par défaut.
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch } from "./foodApi";

export interface HorairesConfig {
  id?: string;
  actif: boolean;
  joursFermes: number[]; // 0=dimanche .. 6=samedi
  heureOuverture?: string | null; // "HH:MM"
  heureFermeture?: string | null;
  quotaCommandesJour?: number | null;
}

const mapFromDb = (r: any): HorairesConfig => ({
  id: r.id, actif: !!r.actif, joursFermes: Array.isArray(r.jours_fermes) ? r.jours_fermes : [],
  heureOuverture: r.heure_ouverture ? String(r.heure_ouverture).slice(0,5) : null,
  heureFermeture: r.heure_fermeture ? String(r.heure_fermeture).slice(0,5) : null,
  quotaCommandesJour: r.quota_commandes_jour ?? null,
});

export async function getHorairesConfig(): Promise<HorairesConfig | null> {
  const rows = await sbFoodGet<any>("food_horaires_config", "limit=1");
  return rows.length > 0 ? mapFromDb(rows[0]) : null;
}

export async function sauvegarderHorairesConfig(c: HorairesConfig): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    actif: c.actif, jours_fermes: c.joursFermes,
    heure_ouverture: c.heureOuverture || null, heure_fermeture: c.heureFermeture || null,
    quota_commandes_jour: c.quotaCommandesJour ?? null,
  };
  if (c.id) return sbFoodPatch("food_horaires_config", c.id, payload);
  const res = await sbFoodPost<any>("food_horaires_config", payload);
  return { ok: res.ok, error: typeof res.error === "string" ? res.error : res.error?.message };
}
