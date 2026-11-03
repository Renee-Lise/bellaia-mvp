// ═══════════════════════════════════════════════════════════
// API — Bella'Food — Commandes du site (catalogue public)
// Table réelle : bellaia_commandes, filtrée bu='FOOD'. Distincte de
// food_commandes (outil interne "sur-mesure" de la fondatrice,
// voir migration 0059) : c'est ICI que tombent les commandes passées
// par une cliente depuis le catalogue public (ClientFood), donc la
// seule source pour "les commandes apparaissent dans l'interface
// fondatrice avec un statut et un historique" pour ces commandes-là.
// ═══════════════════════════════════════════════════════════
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Jeton frais, avec rafraîchissement automatique si expiré — même
// fonction que celle exposée globalement par BellaiaApp.tsx (voir son
// commentaire : sans ça, un module "autonome" comme celui-ci retombe
// silencieusement sur la clé anonyme, jamais "la fondatrice" pour les
// policies RLS, d'où des écrans qui semblent vides sans aucune erreur).
async function getToken(): Promise<string> {
  if (typeof window === "undefined") return SB_KEY;
  if ((window as any).getTokenAsync) {
    try { return await (window as any).getTokenAsync(); } catch {}
  }
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
  if (!SB_URL) return { commandes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL absente sur ce déploiement." };

  const token = await getToken();
  // Un jeton retombé sur la clé anonyme = policy RLS fondatrice jamais
  // satisfaite (is_fondatrice() dépend de auth.uid()) : la requête
  // réussit quand même (200, liste vide), donc sans ce contrôle
  // explicite l'écran afficherait "Aucune commande" alors que la
  // vraie cause est une session expirée — jamais distingué sinon.
  if (token === SB_KEY) {
    return { commandes: [], diagnostic: "Session expirée — reconnectez-vous pour voir les commandes du site (les commandes déjà reçues ne sont pas perdues)." };
  }

  try {
    const r = await fetch(`${SB_URL}/rest/v1/bellaia_commandes?bu=eq.FOOD&order=created_at.desc&limit=200`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!r.ok) {
      const corps = await r.text().catch(() => "");
      return { commandes: [], diagnostic: `Échec HTTP ${r.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const rows = await r.json();
    return { commandes: Array.isArray(rows) ? rows.map(mapFromDb) : [], diagnostic: null };
  } catch (e: any) {
    return { commandes: [], diagnostic: `Impossible de contacter Supabase : ${e?.message || "erreur réseau"}.` };
  }
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
