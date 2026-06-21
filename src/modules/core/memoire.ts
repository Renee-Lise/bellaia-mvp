// ═══════════════════════════════════════════════════════════
// MÉMOIRE CENTRALE BELLAÏA — Abstraction Supabase
// Retrouver, modifier, archiver, relier tout élément de l'écosystème
// ═══════════════════════════════════════════════════════════

import { sbSelect, sbInsert, sbUpdate, sbDelete } from "../shared/supabaseHelpers";

export type TypeElement =
  | "produit" | "prestation" | "fournisseur" | "tarif"
  | "client" | "prospect" | "projet" | "modele"
  | "document" | "stock" | "collection" | "categorie";

// ── Mapping type → table Supabase
const TABLE_MAP: Record<TypeElement, string> = {
  produit:      "stocks",
  prestation:   "events_catalogue",
  fournisseur:  "stocks",          // via notes/categorie jusqu'à table dédiée
  tarif:        "events_catalogue",
  client:       "clients",
  prospect:     "prospects",
  projet:       "erp_projets",
  modele:       "structure_modeles",
  document:     "documents",
  stock:        "stocks",
  collection:   "collections",
  categorie:    "business_units",
};

// ── Recherche universelle
export async function rechercher(
  type: TypeElement,
  opts: {
    q?: string;      // texte libre
    pole?: string;   // filtre par pôle/univers
    statut?: string; // filtre par statut
    limit?: number;
  } = {}
): Promise<any[]> {
  const table = TABLE_MAP[type];
  const filters: Record<string, string> = {};

  if (opts.pole)   filters["univers"] = `eq.${opts.pole}`;
  if (opts.statut) filters["statut"]  = `eq.${opts.statut}`;

  let results = await sbSelect(table, {
    order: "updated_at.desc",
    limit: opts.limit || 50,
    filters,
  });

  // Filtrage texte côté client (Supabase free tier sans full-text search)
  if (opts.q && results.length > 0) {
    const q = opts.q.toLowerCase();
    results = results.filter(r =>
      Object.values(r).some(v =>
        typeof v === "string" && v.toLowerCase().includes(q)
      )
    );
  }

  return results;
}

// ── Relier deux éléments (via notes ou metadata)
export async function relier(
  type: TypeElement,
  id: string,
  poles: string[]
): Promise<void> {
  const table = TABLE_MAP[type];
  await sbUpdate(table, id, {
    tags: poles,
    updated_at: new Date().toISOString(),
  } as any);
}

// ── Archiver un élément
export async function archiver(type: TypeElement, id: string): Promise<void> {
  const table = TABLE_MAP[type];
  await sbUpdate(table, id, { statut: "archivé" } as any);
}

// ── Dupliquer un élément pour un autre pôle
export async function dupliquerPourPole(
  type: TypeElement,
  sourceId: string,
  ciblePole: string
): Promise<any> {
  const table = TABLE_MAP[type];
  const [source] = await sbSelect(table, { filters: { id: `eq.${sourceId}` }, limit: 1 });
  if (!source) throw new Error("Élément source introuvable");

  const { id, created_at, updated_at, ...data } = source;
  return sbInsert(table, { ...data, univers: ciblePole });
}

// ── Stats mémoire globale (pour le Dashboard)
export async function statsMemoire(): Promise<{
  total_clients:     number;
  total_prospects:   number;
  total_produits:    number;
  total_projets:     number;
  total_documents:   number;
  total_modeles:     number;
  stocks_critiques:  number;
}> {
  const [cls, pros, prods, projs, docs, mods] = await Promise.all([
    sbSelect("clients",          { limit: 1 }).then(()=>0).catch(()=>0),
    sbSelect("prospects",        { limit: 1 }).then(()=>0).catch(()=>0),
    sbSelect("stocks",           { limit: 1 }).then(()=>0).catch(()=>0),
    sbSelect("erp_projets",      { limit: 1 }).then(()=>0).catch(()=>0),
    sbSelect("documents",        { limit: 1 }).then(()=>0).catch(()=>0),
    sbSelect("structure_modeles",{ limit: 1 }).then(()=>0).catch(()=>0),
  ]);

  // Stocks critiques via vue Supabase
  let critiques = 0;
  try {
    const sc = await sbSelect("v_stocks_critiques", { limit: 200 });
    critiques = sc.length;
  } catch {}

  return {
    total_clients:    cls,
    total_prospects:  pros,
    total_produits:   prods,
    total_projets:    projs,
    total_documents:  docs,
    total_modeles:    mods,
    stocks_critiques: critiques,
  };
}
