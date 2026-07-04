// ═══════════════════════════════════════════════════════════
// API — Module Bella'Food
// Accès Supabase — tables food_commandes, food_recettes, food_stocks
// Phase 1 : état local + Supabase optionnel
// Phase 2 : toutes les tables branchées
// ═══════════════════════════════════════════════════════════
import type { CommandeFood, Recette, StockItem } from "./foodTypes";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Helper fetch générique (sans dépendance aux helpers de BellaiaApp.tsx)
async function sbFoodGet(table: string, params?: string): Promise<any[]> {
  if (!SB_URL) return [];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params || ""}`, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

async function sbFoodPost(table: string, data: object): Promise<{ ok: boolean; data?: any }> {
  if (!SB_URL) return { ok: false };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const d = await r.json();
    return { ok: r.ok, data: d };
  } catch {
    return { ok: false };
  }
}

async function sbFoodPatch(table: string, id: string, data: object): Promise<{ ok: boolean }> {
  if (!SB_URL) return { ok: false };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return { ok: r.ok };
  } catch {
    return { ok: false };
  }
}

// ── Commandes Food ─────────────────────────────────────────
export async function getCommandesFood(): Promise<CommandeFood[]> {
  return sbFoodGet("food_commandes", "order=date_commande.desc&limit=100");
}

export async function creerCommandeFood(cmd: Partial<CommandeFood>) {
  return sbFoodPost("food_commandes", { ...cmd, created_at: new Date().toISOString() });
}

export async function majStatutCommande(id: string, statut: string) {
  return sbFoodPatch("food_commandes", id, { statut, updated_at: new Date().toISOString() });
}

// ── Stocks Food ───────────────────────────────────────────
export async function getStocksFood(): Promise<StockItem[]> {
  return sbFoodGet("food_stocks", "order=nom.asc");
}

export async function majStock(id: string, qteRestante: number) {
  return sbFoodPatch("food_stocks", id, { qte_restante: qteRestante });
}

// ── Recettes Food ─────────────────────────────────────────
export async function getRecettesFood(): Promise<Recette[]> {
  return sbFoodGet("food_recettes", "order=nom.asc");
}
