// ═══════════════════════════════════════════════════════════
// Lecture des cartes BSH Secret Games — getCartes.ts
//
// Même esprit que src/app/bsh/boutique/getProduits.ts : lecture
// publique (clé anon) de public.bsh_jeux_cartes, avec un diagnostic
// explicite en cas d'échec plutôt qu'un vide silencieux indiscernable
// de "pas encore de carte" — ce silence a déjà coûté une session
// entière de diagnostic sur la boutique, pas question de répéter
// l'erreur ici.
// ═══════════════════════════════════════════════════════════
export interface CarteBSH {
  id: string;
  emoji: string;
  nom: string;
  question: string;
}

export interface ResultatCartesBSH {
  cartes: CarteBSH[];
  diagnostic: string | null;
}

// jeuId optionnel : depuis la migration 0041, les cartes appartiennent
// à un jeu (bsh_jeux). Sans jeuId, on lit tout (comportement d'avant,
// gardé pour compatibilité) — la page passe désormais le jeu choisi.
export async function getCartesBSH(jeuId?: string): Promise<ResultatCartesBSH> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { cartes: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY absente sur ce déploiement." };
  }

  const filtreJeu = jeuId ? `&jeu_id=eq.${encodeURIComponent(jeuId)}` : "";
  const query = `statut=eq.active${filtreJeu}&select=id,emoji,nom,question&order=ordre.asc&limit=100`;

  try {
    const res = await fetch(`${url}/rest/v1/bsh_jeux_cartes?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      return { cartes: [], diagnostic: `Échec HTTP ${res.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const data = await res.json();
    return { cartes: Array.isArray(data) ? data : [], diagnostic: null };
  } catch (e: any) {
    return { cartes: [], diagnostic: `Requête impossible : ${e?.message || String(e)}` };
  }
}
