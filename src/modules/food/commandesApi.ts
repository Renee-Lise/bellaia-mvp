// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Commandes (table réelle food_commandes).
// Préexistante à ce tour (comme food_recettes), jamais mappée
// correctement — foodApi.ts l'exposait en passant les objets tels
// quels (CommandeFood camelCase) alors que les colonnes réelles sont
// en snake_case (date_commande, prix_calcule...), et FoodCommandes.tsx
// ne l'a jamais appelée : tout restait en mémoire locale.
// ═══════════════════════════════════════════════════════════
import { sbFoodGet, sbFoodPost, sbFoodPatch, sbFoodDelete } from "./foodApi";
import type { CommandeFood, StatutCommande } from "./foodTypes";

function mapCommandeFromDb(row: any): CommandeFood {
  return {
    id: row.id,
    reference: row.reference ?? undefined,
    client: row.client ?? "",
    tel: row.tel ?? "",
    dateCommande: row.date_commande ?? "",
    dateLivraison: row.date_livraison ?? undefined,
    produit: row.produit ?? "",
    nbParts: row.nb_parts ?? undefined,
    saveur: row.saveur ?? undefined,
    theme: row.theme ?? undefined,
    options: row.options ?? undefined,
    supplements: row.supplements ?? undefined,
    allergies: row.allergies ?? undefined,
    contraintesAlimentaires: row.contraintes_alimentaires ?? undefined,
    prixCalcule: row.prix_calcule ?? undefined,
    acompte: row.acompte ?? undefined,
    solde: row.solde ?? undefined,
    paiement: row.paiement ?? undefined,
    statut: row.statut ?? "demande_recue",
    notes: row.notes ?? undefined,
  };
}

function mapCommandeToDb(c: Partial<CommandeFood> & { recetteId?: string }): Record<string, any> {
  const d: Record<string, any> = {};
  if (c.reference !== undefined) d.reference = c.reference;
  if (c.client !== undefined) d.client = c.client;
  if (c.tel !== undefined) d.tel = c.tel;
  if (c.dateCommande !== undefined) d.date_commande = c.dateCommande;
  if (c.dateLivraison !== undefined) d.date_livraison = c.dateLivraison || null;
  if (c.produit !== undefined) d.produit = c.produit;
  if (c.nbParts !== undefined) d.nb_parts = c.nbParts;
  if (c.saveur !== undefined) d.saveur = c.saveur;
  if (c.theme !== undefined) d.theme = c.theme;
  if (c.options !== undefined) d.options = c.options;
  if (c.supplements !== undefined) d.supplements = c.supplements;
  if (c.allergies !== undefined) d.allergies = c.allergies;
  if (c.contraintesAlimentaires !== undefined) d.contraintes_alimentaires = c.contraintesAlimentaires;
  if (c.prixCalcule !== undefined) d.prix_calcule = c.prixCalcule;
  if (c.acompte !== undefined) d.acompte = c.acompte;
  if (c.solde !== undefined) d.solde = c.solde;
  if (c.paiement !== undefined) d.paiement = c.paiement;
  if (c.statut !== undefined) d.statut = c.statut;
  if (c.notes !== undefined) d.notes = c.notes;
  if (c.recetteId !== undefined) d.recette_id = c.recetteId || null;
  return d;
}

export async function getCommandesFoodAvecDiagnostic(): Promise<{ commandes: CommandeFood[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { commandes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("food_commandes", "order=date_commande.desc&limit=200");
  return { commandes: rows.map(mapCommandeFromDb), diagnostic: null };
}

export async function creerCommandeFood(c: Partial<CommandeFood> & { recetteId?: string }): Promise<{ ok: boolean; commande?: CommandeFood; error?: string }> {
  const res = await sbFoodPost<any>("food_commandes", mapCommandeToDb(c));
  if (!res.ok) return { ok: false, error: typeof res.error === "string" ? res.error : res.error?.message || "Échec de l'enregistrement." };
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, commande: row ? mapCommandeFromDb(row) : undefined };
}

export async function majCommandeFood(id: string, c: Partial<CommandeFood> & { recetteId?: string }): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_commandes", id, mapCommandeToDb(c));
}

export async function majStatutCommandeFood(id: string, statut: StatutCommande): Promise<{ ok: boolean }> {
  return sbFoodPatch("food_commandes", id, { statut });
}

export const supprimerCommandeFood = (id: string) => sbFoodDelete("food_commandes", id);
