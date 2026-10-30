// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Menu du jour + lieux de vente
// Table réelle : food_menu_jour (migration 0060).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch } from "./foodApi";
import type { MenuJour } from "./foodTypes";

function mapMenuJourFromDb(row: any): MenuJour {
  return {
    id: row.id,
    date: row.date,
    items: Array.isArray(row.items) ? row.items : [],
    lieux: Array.isArray(row.lieux) ? row.lieux : [],
    statut: row.statut ?? "brouillon",
    notes: row.notes ?? undefined,
  };
}

function mapMenuJourToDb(m: Partial<MenuJour>): Record<string, any> {
  const d: Record<string, any> = {};
  if (m.date !== undefined) d.date = m.date;
  if (m.items !== undefined) d.items = m.items;
  if (m.lieux !== undefined) d.lieux = m.lieux;
  if (m.statut !== undefined) d.statut = m.statut;
  if (m.notes !== undefined) d.notes = m.notes;
  return d;
}

// ── Vue fondatrice — historique récent, tous statuts ────────
export async function getMenuJourAvecDiagnostic(): Promise<{ menusJour: MenuJour[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { menusJour: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_menu_jour", "order=date.desc&limit=60");
  return { menusJour: rows.map(mapMenuJourFromDb), diagnostic: null };
}

export async function creerMenuJour(m: Partial<MenuJour>): Promise<{ ok: boolean; menuJour?: MenuJour; error?: string }> {
  const res = await sbFoodPost<any>("food_menu_jour", mapMenuJourToDb(m));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, menuJour: row ? mapMenuJourFromDb(row) : undefined };
}

export async function majMenuJour(id: string, m: Partial<MenuJour>): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_menu_jour", id, mapMenuJourToDb(m));
}

// ── Vue cliente — publique, clé anonyme, jour courant uniquement ──
// Même schéma que getCatalogueFoodPublic() : clé anon directe,
// jamais le token utilisateur, pour fonctionner identiquement que la
// session soit active ou non.
export async function getMenuJourPublicAujourdhui(): Promise<{ menusJour: MenuJour[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SB_URL || !SB_KEY) return { menusJour: [], diagnostic: "Configuration manquante." };
  try {
    const aujourdhui = new Date().toISOString().split("T")[0];
    const r = await fetch(`${SB_URL}/rest/v1/food_menu_jour?date=eq.${aujourdhui}&statut=eq.publie&order=created_at.desc`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const corps = await r.text().catch(() => "");
      return { menusJour: [], diagnostic: `Échec HTTP ${r.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const d = await r.json();
    const rows = Array.isArray(d) ? d : [];
    return { menusJour: rows.map(mapMenuJourFromDb), diagnostic: null };
  } catch (e: any) {
    return { menusJour: [], diagnostic: `Requête impossible : ${e?.message || String(e)}` };
  }
}
