// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Achats (table réelle food_achats, migration 0055)
// + rapprochement menu → stock : à partir des besoins agrégés d'un
// menu (agregerIngredients, menusApi.ts) et des stocks réels, calcule
// ce qui manque pour construire un brouillon d'achat.
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import { construireLigneAchat } from "./foodUtils";
import type { Achat, LigneAchat, StockItem } from "./foodTypes";
import type { IngredientAgrege } from "./menusApi";

function mapAchatFromDb(row: any): Achat {
  return {
    id: row.id,
    reference: row.reference,
    fournisseurId: row.fournisseur_id ?? undefined,
    fournisseurNom: row.fournisseur_nom ?? "",
    date: row.date,
    dateReception: row.date_reception ?? undefined,
    facture: row.facture ?? undefined,
    categorie: row.categorie ?? undefined,
    lignes: Array.isArray(row.lignes) ? row.lignes : [],
    totalHT: row.total_ht ?? 0,
    totalTTC: row.total_ttc ?? 0,
    statut: row.statut ?? "brouillon",
    observations: row.observations ?? undefined,
  };
}

function mapAchatToDb(a: Partial<Achat>): Record<string, any> {
  const d: Record<string, any> = {};
  if (a.reference !== undefined) d.reference = a.reference;
  if (a.fournisseurId !== undefined) d.fournisseur_id = a.fournisseurId;
  if (a.fournisseurNom !== undefined) d.fournisseur_nom = a.fournisseurNom;
  if (a.date !== undefined) d.date = a.date;
  if (a.dateReception !== undefined) d.date_reception = a.dateReception;
  if (a.facture !== undefined) d.facture = a.facture;
  if (a.categorie !== undefined) d.categorie = a.categorie;
  if (a.lignes !== undefined) d.lignes = a.lignes;
  if (a.totalHT !== undefined) d.total_ht = a.totalHT;
  if (a.totalTTC !== undefined) d.total_ttc = a.totalTTC;
  if (a.statut !== undefined) d.statut = a.statut;
  if (a.observations !== undefined) d.observations = a.observations;
  return d;
}

export async function getAchatsFoodAvecDiagnostic(): Promise<{ achats: Achat[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { achats: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_achats", "order=date.desc&limit=200");
  return { achats: rows.map(mapAchatFromDb), diagnostic: null };
}

export async function creerAchatFood(a: Partial<Achat>): Promise<{ ok: boolean; achat?: Achat; error?: string }> {
  const res = await sbFoodPost<any>("food_achats", mapAchatToDb(a));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, achat: row ? mapAchatFromDb(row) : undefined };
}

export async function majAchatFood(id: string, a: Partial<Achat>): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_achats", id, mapAchatToDb(a));
}

export const supprimerAchatFood = (id: string) => sbFoodDelete("food_achats", id);

// ── Rapprochement menu → stock ─────────────────────────────
// Ne traite que les ingrédients dont la quantité est chiffrée
// (un "à confirmer"/"à doser" ne peut pas générer une ligne d'achat
// fiable — reste dans la liste de courses, à vérifier à la main).
// Rapprochement par stockItemId quand l'ingrédient est explicitement
// lié à une fiche de stock (fiable même si le nom diffère), sinon par
// nom exact (insensible à la casse/espaces) — jamais de correspondance
// approximative, pour ne jamais imputer une quantité au mauvais
// ingrédient.
export function construireLignesAchatDepuisManque(
  agreges: IngredientAgrege[],
  stocks: StockItem[]
): LigneAchat[] {
  const lignes: LigneAchat[] = [];
  for (const a of agreges) {
    if (a.quantite == null) continue;
    const stock = a.stockItemId
      ? stocks.find(s => s.id === a.stockItemId)
      : stocks.find(s => s.nom.trim().toLowerCase() === a.nom.trim().toLowerCase());
    const dejaEnStock = stock?.qteRestante ?? 0;
    const manque = Math.round((a.quantite - dejaEnStock) * 100) / 100;
    if (manque <= 0) continue;
    lignes.push(construireLigneAchat(a.nom, manque, stock?.prixAchat ?? 0, 5.5, a.unite, stock?.id));
  }
  return lignes;
}
