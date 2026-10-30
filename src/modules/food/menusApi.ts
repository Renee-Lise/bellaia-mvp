// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Menus (zone Menus / calcul de production)
// Table réelle : food_menus (migration 0054).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import type { Menu, LigneMenu } from "./foodTypes";

function mapMenuFromDb(row: any): Menu {
  return {
    id: row.id,
    nom: row.nom,
    type: row.type,
    nbPersonnes: row.nb_personnes ?? 1,
    lignes: Array.isArray(row.lignes) ? row.lignes : [],
    notes: row.notes ?? undefined,
    statut: row.statut ?? "brouillon",
    dateCreation: row.created_at ? row.created_at.slice(0, 10) : "",
  };
}

function mapMenuToDb(m: Partial<Menu>): Record<string, any> {
  const d: Record<string, any> = {};
  if (m.nom !== undefined) d.nom = m.nom;
  if (m.type !== undefined) d.type = m.type;
  if (m.nbPersonnes !== undefined) d.nb_personnes = m.nbPersonnes;
  if (m.lignes !== undefined) d.lignes = m.lignes;
  if (m.notes !== undefined) d.notes = m.notes;
  if (m.statut !== undefined) d.statut = m.statut;
  return d;
}

export async function getMenusFoodAvecDiagnostic(): Promise<{ menus: Menu[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { menus: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_menus", "order=created_at.desc&limit=200");
  return { menus: rows.map(mapMenuFromDb), diagnostic: null };
}

export async function creerMenuFood(m: Partial<Menu>): Promise<{ ok: boolean; menu?: Menu; error?: string }> {
  const res = await sbFoodPost<any>("food_menus", mapMenuToDb(m));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, menu: row ? mapMenuFromDb(row) : undefined };
}

export async function majMenuFood(id: string, m: Partial<Menu>): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_menus", id, mapMenuToDb(m));
}

export const supprimerMenuFood = (id: string) => sbFoodDelete("food_menus", id);

// ── Agrégation des ingrédients de toutes les lignes d'un menu ──
// Additionne les quantités d'un même ingrédient (par nom+unité)
// à travers plusieurs recettes — sert la liste de courses globale
// du menu, pas juste d'une recette isolée.
export interface IngredientAgrege {
  nom: string;
  unite: string;
  quantite: number | null;
  incertain: boolean; // au moins une recette contribue sans quantité connue
}

export function agregerIngredients(lignes: LigneMenu[], recettesParId: Map<string, any>): IngredientAgrege[] {
  const totaux = new Map<string, IngredientAgrege>();
  for (const ligne of lignes) {
    const recette = recettesParId.get(ligne.recetteId);
    if (!recette || !recette.nbParts) continue;
    const facteur = ligne.nbPortions / recette.nbParts;
    for (const ing of recette.ingredients as any[]) {
      const cle = `${ing.nom.toLowerCase()}__${ing.unite}`;
      const existant = totaux.get(cle);
      if (ing.quantite != null) {
        const q = Math.round(ing.quantite * facteur * 100) / 100;
        if (existant) {
          existant.quantite = (existant.quantite ?? 0) + q;
        } else {
          totaux.set(cle, { nom: ing.nom, unite: ing.unite, quantite: q, incertain: false });
        }
      } else {
        if (existant) existant.incertain = true;
        else totaux.set(cle, { nom: ing.nom, unite: ing.unite, quantite: null, incertain: true });
      }
    }
  }
  return Array.from(totaux.values()).sort((a, b) => a.nom.localeCompare(b.nom));
}
