// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Fournisseurs (table réelle food_fournisseurs,
// migration 0061).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import type { Fournisseur } from "./foodTypes";

function mapFournisseurFromDb(row: any): Fournisseur {
  return {
    id: row.id,
    nom: row.nom,
    logo: row.logo ?? undefined,
    tel: row.tel ?? undefined,
    email: row.email ?? undefined,
    siteInternet: row.site_internet ?? undefined,
    adresse: row.adresse ?? undefined,
    contact: row.contact ?? undefined,
    categoriesVendues: Array.isArray(row.categories_vendues) ? row.categories_vendues : undefined,
    delaiMoyen: row.delai_moyen ?? undefined,
    minimumCommande: row.minimum_commande ?? undefined,
    note: row.note ?? undefined,
    notes: row.notes ?? undefined,
    actif: row.actif ?? true,
    createdAt: row.created_at ?? undefined,
  };
}

function mapFournisseurToDb(f: Partial<Fournisseur>): Record<string, any> {
  const d: Record<string, any> = {};
  if (f.nom !== undefined) d.nom = f.nom;
  if (f.logo !== undefined) d.logo = f.logo;
  if (f.tel !== undefined) d.tel = f.tel;
  if (f.email !== undefined) d.email = f.email;
  if (f.siteInternet !== undefined) d.site_internet = f.siteInternet;
  if (f.adresse !== undefined) d.adresse = f.adresse;
  if (f.contact !== undefined) d.contact = f.contact;
  if (f.categoriesVendues !== undefined) d.categories_vendues = f.categoriesVendues;
  if (f.delaiMoyen !== undefined) d.delai_moyen = f.delaiMoyen;
  if (f.minimumCommande !== undefined) d.minimum_commande = f.minimumCommande;
  if (f.note !== undefined) d.note = f.note;
  if (f.notes !== undefined) d.notes = f.notes;
  if (f.actif !== undefined) d.actif = f.actif;
  return d;
}

export async function getFournisseursFoodAvecDiagnostic(): Promise<{ fournisseurs: Fournisseur[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { fournisseurs: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_fournisseurs", "order=nom.asc&limit=200");
  return { fournisseurs: rows.map(mapFournisseurFromDb), diagnostic: null };
}

export async function creerFournisseurFood(f: Partial<Fournisseur>): Promise<{ ok: boolean; fournisseur?: Fournisseur; error?: string }> {
  const res = await sbFoodPost<any>("food_fournisseurs", mapFournisseurToDb(f));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, fournisseur: row ? mapFournisseurFromDb(row) : undefined };
}

export async function majFournisseurFood(id: string, f: Partial<Fournisseur>): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_fournisseurs", id, mapFournisseurToDb(f));
}

export const supprimerFournisseurFood = (id: string) => sbFoodDelete("food_fournisseurs", id);
