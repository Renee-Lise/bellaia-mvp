// ═══════════════════════════════════════════════════════════
// Lecture des jeux publiés BSH Secret Games — getJeux.ts
//
// Depuis la migration 0041, bsh_jeux_cartes appartient à un jeu
// (bsh_jeux). Avant cette migration, un seul jeu existait de fait
// ("Amour, Gloire ou Audace") et getCartesBSH() lisait tout sans
// distinction — ça ne suffit plus avec plusieurs jeux en parallèle.
// Même esprit diagnostic que getCartes.ts/getProduits.ts.
// ═══════════════════════════════════════════════════════════
export interface JeuBSH {
  id: string;
  nom: string;
  description: string | null;
  icone: string;
  intensite: string;
  mode?: string;
}

export interface ResultatJeuxBSH {
  jeux: JeuBSH[];
  diagnostic: string | null;
}

// mode : 'communautaire' (par défaut) ou 'duo' — depuis la migration
// 0045, BSH Secret Duo vit dans les mêmes tables mais ne doit jamais
// apparaître dans le sélecteur communautaire de /bsh/secret-games,
// ni l'inverse.
export async function getJeuxBSH(mode: "communautaire" | "duo" = "communautaire"): Promise<ResultatJeuxBSH> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { jeux: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY absente sur ce déploiement." };
  }

  const query = `statut=eq.publie&mode=eq.${mode}&select=id,nom,description,icone,intensite,mode&order=ordre.asc&limit=50`;

  try {
    const res = await fetch(`${url}/rest/v1/bsh_jeux?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      return { jeux: [], diagnostic: `Échec HTTP ${res.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const data = await res.json();
    return { jeux: Array.isArray(data) ? data : [], diagnostic: null };
  } catch (e: any) {
    return { jeux: [], diagnostic: `Requête impossible : ${e?.message || String(e)}` };
  }
}
