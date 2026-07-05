// ═══════════════════════════════════════════════════════════
// API — Module Bella'Food — Partie I
// Accès Supabase autonome (sans dépendance à BellaiaApp.tsx)
// Tables : food_recettes, food_stocks, food_commandes,
//          food_materiel, food_consommables
// ═══════════════════════════════════════════════════════════
import type { CommandeFood, Recette, StockItem, Materiel, Consommable } from "./foodTypes";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// ── Token frais (via helper global si disponible) ──────────
async function getFoodToken(): Promise<string> {
  if (typeof window !== "undefined" && (window as any).getTokenAsync) {
    try { return await (window as any).getTokenAsync(); } catch {}
  }
  return SB_KEY;
}

// ── Fetch helpers Food (autonomes) ─────────────────────────
export async function sbFoodGet<T = any>(table: string, params = ""): Promise<T[]> {
  if (!SB_URL) return [];
  try {
    const token = await getFoodToken();
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey:SB_KEY, Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

export async function sbFoodPost<T = any>(
  table: string, data: Partial<T>
): Promise<{ ok: boolean; data?: T; error?: any }> {
  if (!SB_URL) return { ok:false, error:"SB_URL non configuré" };
  try {
    const token = await getFoodToken();
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method:"POST",
      headers:{ apikey:SB_KEY, Authorization:`Bearer ${token}`,
        "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(data),
    });
    const d = await r.json();
    return { ok:r.ok, data:d, error:r.ok?undefined:d };
  } catch(e) { return { ok:false, error:e }; }
}

export async function sbFoodPatch(
  table: string, id: string, data: object
): Promise<{ ok: boolean }> {
  if (!SB_URL) return { ok:false };
  try {
    const token = await getFoodToken();
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:"PATCH",
      headers:{ apikey:SB_KEY, Authorization:`Bearer ${token}`,
        "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify({ ...data, updated_at:new Date().toISOString() }),
    });
    return { ok:r.ok };
  } catch { return { ok:false }; }
}

export async function sbFoodDelete(table: string, id: string): Promise<{ ok: boolean }> {
  if (!SB_URL) return { ok:false };
  try {
    const token = await getFoodToken();
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:"DELETE",
      headers:{ apikey:SB_KEY, Authorization:`Bearer ${token}` },
    });
    return { ok:r.ok };
  } catch { return { ok:false }; }
}

// ── API Recettes ───────────────────────────────────────────
export const getRecettesFood  = () => sbFoodGet<Recette>("food_recettes","order=nom.asc");
export const creerRecette     = (r: Partial<Recette>) => sbFoodPost<Recette>("food_recettes",r);
export const majRecette       = (id:string, d:Partial<Recette>) => sbFoodPatch("food_recettes",id,d);
export const supprimerRecette = (id:string) => sbFoodDelete("food_recettes",id);

// ── API Commandes ──────────────────────────────────────────
export const getCommandesFood  = () => sbFoodGet<CommandeFood>("food_commandes","order=date_commande.desc&limit=100");
export const creerCommande     = (c:Partial<CommandeFood>) => sbFoodPost<CommandeFood>("food_commandes",c);
export const majStatutCommande = (id:string,statut:string) => sbFoodPatch("food_commandes",id,{statut});

// ── API Stocks ─────────────────────────────────────────────
export const getStocksFood = () => sbFoodGet<StockItem>("food_stocks","order=nom.asc");
export const majStock      = (id:string,qteRestante:number) => sbFoodPatch("food_stocks",id,{qte_restante:qteRestante});

// ── API Matériel ───────────────────────────────────────────
export const getMaterielFood = () => sbFoodGet<Materiel>("food_materiel","order=nom.asc");

// ── API Consommables ───────────────────────────────────────
export const getConsommablesFood = () => sbFoodGet<Consommable>("food_consommables","order=nom.asc");
