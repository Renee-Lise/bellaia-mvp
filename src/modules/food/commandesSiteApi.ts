// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Commandes du site (catalogue public)
// Table réelle : bellaia_commandes, filtrée bu='FOOD'. Distincte de
// food_commandes (outil interne "sur-mesure" de la fondatrice,
// voir migration 0059) : c'est ICI que tombent les commandes passées
// par une cliente depuis le catalogue public (ClientFood), donc la
// seule source pour "les commandes apparaissent dans l'interface
// fondatrice avec un statut et un historique" pour ces commandes-là.
// ═══════════════════════════════════════════════════════════
import { sbFoodGet } from "./foodApi";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
async function getToken(): Promise<string> {
  if (typeof window === "undefined") return SB_KEY;
  return localStorage.getItem("bellaia_token") || SB_KEY;
}

// Pas d'enum fermé ici : seule la valeur "BROUILLON" est confirmée
// (vue dans le code de création de commande client) ; les autres
// valeurs possibles de ce statut n'ont pas été vérifiées en base
// (pas de contrainte CHECK connue), donc le champ reste un texte
// libre côté UI plutôt qu'une liste de boutons inventée.
export type StatutCommandeSite = string;

export interface LigneCommandeSite {
  libelle: string;
  qte: number;
  prixUnitaire: number;
  total: number;
}

export interface CommandeSite {
  id: string;
  reference?: string;
  clientNom: string;
  clientTel?: string;
  statut: StatutCommandeSite;
  total: number;
  acompte?: number;
  dateCommande?: string;
  dateLivraison?: string;
  lignes: LigneCommandeSite[];
  notes?: string;
  createdAt?: string;
}

function mapFromDb(row: any): CommandeSite {
  let lignes: LigneCommandeSite[] = [];
  try { lignes = typeof row.lignes === "string" ? JSON.parse(row.lignes) : (row.lignes || []); }
  catch { lignes = []; }
  return {
    id: row.id,
    reference: row.reference ?? undefined,
    clientNom: row.client_nom ?? "",
    clientTel: row.client_tel ?? undefined,
    statut: row.statut ?? "BROUILLON",
    total: row.total ?? 0,
    acompte: row.acompte ?? undefined,
    dateCommande: row.date_commande ?? undefined,
    dateLivraison: row.date_livraison ?? undefined,
    lignes,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

export async function getCommandesSiteFoodAvecDiagnostic(): Promise<{ commandes: CommandeSite[]; diagnostic: string | null }> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!SB_URL) return { commandes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };
  const rows = await sbFoodGet<any>("bellaia_commandes", "bu=eq.FOOD&order=created_at.desc&limit=200");
  return { commandes: rows.map(mapFromDb), diagnostic: null };
}

// PATCH dédié (pas sbFoodPatch) : ce helper générique ajoute toujours
// un champ updated_at, dont on n'a pas vérifié l'existence sur
// bellaia_commandes — on ne veut pas répéter l'erreur 42703 déjà eue
// sur une autre table (colonne supposée plutôt que vérifiée).
export async function majStatutCommandeSite(id: string, statut: StatutCommandeSite): Promise<{ ok: boolean; error?: string }> {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/bellaia_commandes?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${await getToken()}`,
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify({ statut }),
    });
    if (!r.ok) return { ok: false, error: await r.text().catch(() => "Échec de l'enregistrement.") };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}
