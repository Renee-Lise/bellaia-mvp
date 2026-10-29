// ═══════════════════════════════════════════════════════════
// API — Module Bella'Food — Partie I
// Accès Supabase autonome (sans dépendance à BellaiaApp.tsx)
// Tables : food_recettes, food_stocks, food_commandes,
//          food_materiel, food_consommables
// ═══════════════════════════════════════════════════════════
import type { CommandeFood, Recette, StockItem, Materiel, Consommable } from "./foodTypes";

// ── Mapping food_recettes (snake_case en base) ↔ Recette (camelCase) ──
// La table réelle existe déjà dans Supabase (vérifié le 29/10) avec un
// schéma qui correspond champ à champ au type Recette, juste en
// snake_case — aucune migration de schéma n'était nécessaire, juste
// cette conversion.
function mapRecetteFromDb(row: any): Recette {
  return {
    id: row.id,
    nom: row.nom,
    photo: row.photo ?? undefined,
    galerie: row.galerie ?? undefined,
    video: row.video ?? undefined,
    categorie: row.categorie,
    sousCat: row.sous_cat ?? undefined,
    tags: row.tags ?? undefined,
    couleurDominante: row.couleur_dominante ?? undefined,
    saison: row.saison ?? undefined,
    feteAssociee: row.fete_associee ?? undefined,
    paysOrigine: row.pays_origine ?? undefined,
    langue: row.langue ?? undefined,
    auteur: row.auteur ?? undefined,
    tempsPrepa: row.temps_prepa ?? 0,
    tempsCuisson: row.temps_cuisson ?? 0,
    tempsRepos: row.temps_repos ?? undefined,
    tempsTotal: row.temps_total ?? undefined,
    temperature: row.temperature ?? undefined,
    modeCuisson: row.mode_cuisson ?? undefined,
    difficulte: (row.difficulte ?? 3) as 1 | 2 | 3 | 4 | 5,
    nbParts: row.nb_parts ?? 1,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    etapes: Array.isArray(row.etapes) ? row.etapes : [],
    astuces: row.astuces ?? undefined,
    variantes: row.variantes ?? undefined,
    accompagnements: row.accompagnements ?? undefined,
    allergenes: row.allergenes ?? undefined,
    conservation: row.conservation ?? undefined,
    nutritionnel: row.nutritionnel ?? undefined,
    coutMatiere: row.cout_matiere ?? undefined,
    coutConsommables: row.cout_consommables ?? undefined,
    prixRevient: row.prix_revient ?? undefined,
    prixConseille: row.prix_conseille ?? undefined,
    prixPremium: row.prix_premium ?? undefined,
    margeEstimee: row.marge_estimee ?? undefined,
    tempsProduction: row.temps_production ?? undefined,
    statut: row.statut ?? "brouillon",
    dateImport: row.date_import ?? undefined,
    source: row.source ?? undefined,
    sourceType: row.source_type ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapRecetteToDb(r: Partial<Recette>): Record<string, any> {
  const d: Record<string, any> = {};
  if (r.nom !== undefined) d.nom = r.nom;
  if (r.photo !== undefined) d.photo = r.photo;
  if (r.galerie !== undefined) d.galerie = r.galerie;
  if (r.video !== undefined) d.video = r.video;
  if (r.categorie !== undefined) d.categorie = r.categorie;
  if (r.sousCat !== undefined) d.sous_cat = r.sousCat;
  if (r.tags !== undefined) d.tags = r.tags;
  if (r.couleurDominante !== undefined) d.couleur_dominante = r.couleurDominante;
  if (r.saison !== undefined) d.saison = r.saison;
  if (r.feteAssociee !== undefined) d.fete_associee = r.feteAssociee;
  if (r.paysOrigine !== undefined) d.pays_origine = r.paysOrigine;
  if (r.langue !== undefined) d.langue = r.langue;
  if (r.auteur !== undefined) d.auteur = r.auteur;
  if (r.tempsPrepa !== undefined) d.temps_prepa = r.tempsPrepa;
  if (r.tempsCuisson !== undefined) d.temps_cuisson = r.tempsCuisson;
  if (r.tempsRepos !== undefined) d.temps_repos = r.tempsRepos;
  if (r.temperature !== undefined) d.temperature = r.temperature;
  if (r.modeCuisson !== undefined) d.mode_cuisson = r.modeCuisson;
  if (r.difficulte !== undefined) d.difficulte = r.difficulte;
  if (r.nbParts !== undefined) d.nb_parts = r.nbParts;
  if (r.ingredients !== undefined) d.ingredients = r.ingredients;
  if (r.etapes !== undefined) d.etapes = r.etapes;
  if (r.astuces !== undefined) d.astuces = r.astuces;
  if (r.variantes !== undefined) d.variantes = r.variantes;
  if (r.accompagnements !== undefined) d.accompagnements = r.accompagnements;
  if (r.allergenes !== undefined) d.allergenes = r.allergenes;
  if (r.conservation !== undefined) d.conservation = r.conservation;
  if (r.nutritionnel !== undefined) d.nutritionnel = r.nutritionnel;
  if (r.coutMatiere !== undefined) d.cout_matiere = r.coutMatiere;
  if (r.coutConsommables !== undefined) d.cout_consommables = r.coutConsommables;
  if (r.prixRevient !== undefined) d.prix_revient = r.prixRevient;
  if (r.prixConseille !== undefined) d.prix_conseille = r.prixConseille;
  if (r.prixPremium !== undefined) d.prix_premium = r.prixPremium;
  if (r.margeEstimee !== undefined) d.marge_estimee = r.margeEstimee;
  if (r.tempsProduction !== undefined) d.temps_production = r.tempsProduction;
  if (r.statut !== undefined) d.statut = r.statut;
  if (r.source !== undefined) d.source = r.source;
  if (r.sourceType !== undefined) d.source_type = r.sourceType;
  if (r.notes !== undefined) d.notes = r.notes;
  return d;
}

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
// getRecettesFoodAvecDiagnostic distingue "aucune recette" d'un échec
// réseau/RLS — même raison que getProduitsBSH côté BSH : un échec
// silencieux rendu comme "liste vide" a déjà coûté plusieurs
// allers-retours de diagnostic sur ce projet.
export async function getRecettesFoodAvecDiagnostic(): Promise<{ recettes: Recette[]; diagnostic: string | null }> {
  if (!SB_URL) return { recettes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  try {
    const token = await getFoodToken();
    const r = await fetch(`${SB_URL}/rest/v1/food_recettes?order=nom.asc&limit=500`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const corps = await r.text().catch(() => "");
      return { recettes: [], diagnostic: `Échec HTTP ${r.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const d = await r.json();
    return { recettes: Array.isArray(d) ? d.map(mapRecetteFromDb) : [], diagnostic: null };
  } catch (e: any) {
    return { recettes: [], diagnostic: `Requête impossible : ${e?.message || String(e)}` };
  }
}

export const getRecettesFood = async (): Promise<Recette[]> => (await getRecettesFoodAvecDiagnostic()).recettes;

export async function creerRecette(r: Partial<Recette>): Promise<{ ok: boolean; recette?: Recette; error?: string }> {
  const res = await sbFoodPost<any>("food_recettes", mapRecetteToDb(r));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, recette: row ? mapRecetteFromDb(row) : undefined };
}

export async function majRecette(id: string, d: Partial<Recette>): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_recettes", id, mapRecetteToDb(d));
}

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
