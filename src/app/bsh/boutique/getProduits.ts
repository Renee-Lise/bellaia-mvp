// ═══════════════════════════════════════════════════════════
// Lecture des produits BSH — src/app/bsh/boutique/getProduits.ts
//
// Lit la table partagée `stocks` (celle déjà utilisée par tous les
// pôles), filtrée sur univers=BSH et statut=actif — la même table
// que gère la fondatrice depuis "📦 Stocks" dans le back-office.
// Aucune nouvelle table créée : la boutique lit la source unique de
// vérité, comme prévu à l'Étape 2.
//
// Simple fetch REST avec la clé anonyme (comme partout ailleurs dans
// l'app) plutôt que le SDK @supabase/supabase-js, pour ne pas
// ajouter une dépendance supplémentaire à cette seule page.
// ═══════════════════════════════════════════════════════════
export interface ProduitBSH {
  id: string;
  nom: string;
  categorie: string | null;
  notes: string | null;
  tailles: string | null;
  composition: string | null;
  usage_conseils: string | null;
  entretien: string | null;
}

const SELECT = "id,nom,categorie,notes,tailles,composition,usage_conseils,entretien";

// `categorie` optionnel : par ex. "Coffrets & Expériences" pour la page
// dédiée. Filtré côté serveur (PostgREST), pas en mémoire après coup.
export async function getProduitsBSH(categorie?: string): Promise<ProduitBSH[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  let query = `univers=eq.BSH&statut=eq.actif&select=${SELECT}&order=categorie.asc,nom.asc&limit=200`;
  if (categorie) {
    query = `univers=eq.BSH&statut=eq.actif&categorie=eq.${encodeURIComponent(categorie)}&select=${SELECT}&order=nom.asc&limit=200`;
  }

  try {
    const res = await fetch(`${url}/rest/v1/stocks?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
