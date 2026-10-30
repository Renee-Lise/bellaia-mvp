// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Catalogue & Variantes (zone 2)
// Table réelle : catalogue_produits / catalogue_variantes — table
// partagée au niveau Bellaïa (colonne business_unit), filtrée sur
// business_unit='FOOD' ici. Existait déjà côté Supabase, jamais
// utilisée par aucun écran avant ce tour (vérifié le 29/10).
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import type { Produit } from "./foodTypes";

export interface Variante {
  id: string;
  produitId: string;
  nom: string;
  prix: number | null;
  attributs?: Record<string, any>;
  disponible: boolean;
}

function mapProduitFromDb(row: any): Produit {
  return {
    id: row.id,
    nom: row.nom,
    categorie: row.categorie_slug ?? "autre",
    sousCat: row.sous_categorie ?? undefined,
    description: row.description_courte ?? undefined,
    prix: row.prix ?? null,
    unite: row.unite ?? undefined,
    tempsPrepa: row.temps_preparation ?? undefined,
    tempsTotal: row.duree_min ?? undefined,
    recetteId: row.recette_id ?? undefined,
    disponible: row.disponible ?? true,
    photo: Array.isArray(row.galerie_photos) ? row.galerie_photos[0] : undefined,
    allergenes: row.allergenes ?? undefined,
    tags: row.tags ?? undefined,
    statut: row.statut ?? "brouillon",
  };
}

function mapProduitToDb(p: Partial<Produit> & { visibleClient?: boolean }): Record<string, any> {
  const d: Record<string, any> = { business_unit: "FOOD" };
  if (p.nom !== undefined) d.nom = p.nom;
  if (p.categorie !== undefined) d.categorie_slug = p.categorie;
  if (p.sousCat !== undefined) d.sous_categorie = p.sousCat;
  if (p.description !== undefined) d.description_courte = p.description;
  if (p.prix !== undefined) d.prix = p.prix;
  if (p.unite !== undefined) d.unite = p.unite;
  if (p.tempsPrepa !== undefined) d.temps_preparation = p.tempsPrepa;
  if (p.tempsTotal !== undefined) d.duree_min = p.tempsTotal;
  if (p.recetteId !== undefined) d.recette_id = p.recetteId || null;
  if (p.disponible !== undefined) d.disponible = p.disponible;
  if (p.photo !== undefined) d.galerie_photos = p.photo ? [p.photo] : [];
  if (p.allergenes !== undefined) d.allergenes = p.allergenes;
  if (p.tags !== undefined) d.tags = p.tags;
  if (p.statut !== undefined) d.statut = p.statut;
  if (p.visibleClient !== undefined) d.visible_client = p.visibleClient;
  return d;
}

function mapVarianteFromDb(row: any): Variante {
  return {
    id: row.id,
    produitId: row.produit_id,
    nom: row.nom,
    prix: row.prix ?? null,
    attributs: row.attributs ?? undefined,
    disponible: row.disponible ?? true,
  };
}

function mapVarianteToDb(v: Partial<Variante>): Record<string, any> {
  const d: Record<string, any> = {};
  if (v.produitId !== undefined) d.produit_id = v.produitId;
  if (v.nom !== undefined) d.nom = v.nom;
  if (v.prix !== undefined) d.prix = v.prix;
  if (v.attributs !== undefined) d.attributs = v.attributs;
  if (v.disponible !== undefined) d.disponible = v.disponible;
  return d;
}

// ── Produits (vue fondatrice — tous statuts, visible_client inclus) ──
export async function getCatalogueFoodAvecDiagnostic(): Promise<{ produits: (Produit & { visibleClient?: boolean })[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { produits: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("catalogue_produits", "business_unit=eq.FOOD&order=ordre.asc,nom.asc&limit=300");
  return {
    produits: rows.map(r => ({ ...mapProduitFromDb(r), visibleClient: r.visible_client ?? false })),
    diagnostic: null,
  };
}

// Avant de publier une recette au catalogue, vérifie qu'elle n'y est
// pas déjà (évite un doublon si on clique deux fois).
export async function getProduitCatalogueParRecette(recetteId: string): Promise<Produit | null> {
  const rows = await sbFoodGet<any>("catalogue_produits", `business_unit=eq.FOOD&recette_id=eq.${recetteId}&limit=1`);
  return rows.length > 0 ? mapProduitFromDb(rows[0]) : null;
}

export async function creerProduitCatalogue(p: Partial<Produit> & { visibleClient?: boolean }): Promise<{ ok: boolean; produit?: Produit; error?: string }> {
  const res = await sbFoodPost<any>("catalogue_produits", mapProduitToDb(p));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, produit: row ? mapProduitFromDb(row) : undefined };
}

export async function majProduitCatalogue(id: string, p: Partial<Produit> & { visibleClient?: boolean }): Promise<{ ok: boolean }> {
  return sbFoodPatch("catalogue_produits", id, mapProduitToDb(p));
}

export const supprimerProduitCatalogue = (id: string) => sbFoodDelete("catalogue_produits", id);

// ── Variantes ────────────────────────────────────────────────
export async function getVariantesProduit(produitId: string): Promise<Variante[]> {
  const rows = await sbFoodGet<any>("catalogue_variantes", `produit_id=eq.${produitId}&order=nom.asc`);
  return rows.map(mapVarianteFromDb);
}

export async function creerVariante(v: Partial<Variante>): Promise<{ ok: boolean; variante?: Variante; error?: string }> {
  const res = await sbFoodPost<any>("catalogue_variantes", mapVarianteToDb(v));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, variante: row ? mapVarianteFromDb(row) : undefined };
}

export const majVariante = (id: string, v: Partial<Variante>) => sbFoodPatch("catalogue_variantes", id, mapVarianteToDb(v));
export const supprimerVariante = (id: string) => sbFoodDelete("catalogue_variantes", id);

// ── Public (ClientFood — colonnes restreintes par GRANT, lignes par RLS) ──
export interface ProduitPublicFood {
  id: string;
  nom: string;
  categorie: string;
  sousCat?: string;
  description?: string;
  prix: number | null;
  tags?: string[];
}

export async function getCatalogueFoodPublic(): Promise<{ produits: ProduitPublicFood[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SB_URL || !SB_KEY) return { produits: [], diagnostic: "Configuration manquante." };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/catalogue_produits?business_unit=eq.FOOD&order=ordre.asc,nom.asc&limit=200`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const corps = await r.text().catch(() => "");
      return { produits: [], diagnostic: `Échec HTTP ${r.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const d = await r.json();
    const rows = Array.isArray(d) ? d : [];
    return {
      produits: rows.map((row: any) => ({
        id: row.id, nom: row.nom, categorie: row.categorie_slug ?? "autre",
        sousCat: row.sous_categorie ?? undefined, description: row.description_courte ?? undefined,
        prix: row.prix ?? null, tags: row.tags ?? undefined,
      })),
      diagnostic: null,
    };
  } catch (e: any) {
    return { produits: [], diagnostic: `Requête impossible : ${e?.message || String(e)}` };
  }
}
