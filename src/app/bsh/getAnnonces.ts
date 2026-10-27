// ═══════════════════════════════════════════════════════════
// Lecture des annonces publiques BSH — src/app/bsh/getAnnonces.ts
//
// Même esprit que getProduits.ts/getCartes.ts : lecture publique
// (clé anon) de bsh_communications, filtrée statut='publie' et
// cible='tous' côté serveur (RLS le garantit aussi, mais le filtre
// explicite évite de compter sur la seule RLS pour l'affichage).
// ═══════════════════════════════════════════════════════════
export interface AnnonceBSH {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  publiee_le: string | null;
}

export async function getAnnoncesBSH(): Promise<AnnonceBSH[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/bsh_communications?statut=eq.publie&cible=eq.tous&select=id,titre,contenu,type,publiee_le&order=publiee_le.desc&limit=5`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
