// ═══════════════════════════════════════════════════════════
// Lecture publique des événements BSH Experiences publiés
// src/app/bsh/experiences/getEvenementsPublics.ts
//
// Lit bsh_evenements (migrations 0020/0068/0071/0072), filtré
// publie=true côté requête ET côté RLS (migration 0072) — double
// barrière, pas seulement applicative.
// ═══════════════════════════════════════════════════════════
export interface EvenementPublic {
  id: string;
  nom: string;
  ico: string | null;
  dateEvenement: string | null;
  ville: string | null;
  categorie: string | null;
  description: string | null;
  dureeMinutes: number | null;
  capacite: number;
  placesRestantes: number;
  prix: number;
  statut: string;
}

const SELECT = "id,nom,ico,date_evenement,ville,categorie,description,duree_minutes,capacite,places_restantes,prix,statut";

export interface ResultatEvenementsPublics {
  evenements: EvenementPublic[];
  diagnostic: string | null;
}

export async function getEvenementsBSHPublics(): Promise<ResultatEvenementsPublics> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { evenements: [], diagnostic: "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY absente sur ce déploiement." };
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/bsh_evenements?publie=eq.true&statut=in.(actif,complet)&select=${SELECT}&order=date_evenement.asc.nullslast&limit=50`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      return { evenements: [], diagnostic: `Échec HTTP ${res.status} — ${corps.slice(0, 300) || "(réponse vide)"}` };
    }
    const data = await res.json();
    const rows: any[] = Array.isArray(data) ? data : [];
    return {
      evenements: rows.map((r) => ({
        id: r.id, nom: r.nom, ico: r.ico, dateEvenement: r.date_evenement, ville: r.ville,
        categorie: r.categorie, description: r.description, dureeMinutes: r.duree_minutes,
        capacite: r.capacite, placesRestantes: r.places_restantes, prix: parseFloat(r.prix) || 0,
        statut: r.statut,
      })),
      diagnostic: null,
    };
  } catch (e: any) {
    return { evenements: [], diagnostic: `Requête impossible : ${e?.message || String(e)}` };
  }
}
