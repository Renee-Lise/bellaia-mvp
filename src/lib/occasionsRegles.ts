// ═══════════════════════════════════════════════════════════
// Règles pures — dates des occasions calendaires françaises
// src/lib/occasionsRegles.ts
//
// Aucune dépendance Supabase/Next ici volontairement (même principe
// que foodCommandeRegles.ts) — testable isolément.
//
// Règles retenues (approximation usuelle, pas une source officielle
// unique — à ajuster si Renée-Lise connaît une règle différente) :
//   - Saint-Valentin : 14 février (fixe)
//   - Noël : 25 décembre (fixe)
//   - Fête des Grand-Mères : 1er dimanche de mars
//   - Fête des Mères : dernier dimanche de mai
//   - Fête des Pères : 3e dimanche de juin
//   - Fête des Grands-Pères : 1er dimanche d'octobre
// ═══════════════════════════════════════════════════════════

export type Occasion =
  | "fete_saint_valentin" | "fete_grands_meres" | "fete_meres"
  | "fete_peres" | "fete_grands_peres" | "fete_noel";

// mois: 0=janvier .. 11=décembre (convention JS Date)
function nieme_dimanche(annee: number, mois: number, n: number): { mois: number; jour: number } {
  const d = new Date(Date.UTC(annee, mois, 1));
  const decalage = (7 - d.getUTCDay()) % 7; // jours jusqu'au 1er dimanche
  const jour = 1 + decalage + (n - 1) * 7;
  return { mois, jour };
}

function dernier_dimanche(annee: number, mois: number): { mois: number; jour: number } {
  // 1er dimanche du mois suivant, moins 7 jours.
  const moisSuivant = mois === 11 ? 0 : mois + 1;
  const anneeSuivante = mois === 11 ? annee + 1 : annee;
  const premierDuSuivant = nieme_dimanche(anneeSuivante, moisSuivant, 1);
  const d = new Date(Date.UTC(anneeSuivante, premierDuSuivant.mois, premierDuSuivant.jour));
  d.setUTCDate(d.getUTCDate() - 7);
  return { mois: d.getUTCMonth(), jour: d.getUTCDate() };
}

// Renvoie l'occasion du jour (mois 1-12, jour 1-31 — convention humaine,
// pas l'index JS) s'il y en a une, sinon null. Une seule occasion
// possible par jour dans ce calendrier (aucune des dates ne se
// chevauche jamais).
export function occasionDuJour(annee: number, moisHumain: number, jour: number): Occasion | null {
  if (moisHumain === 2 && jour === 14) return "fete_saint_valentin";
  if (moisHumain === 12 && jour === 25) return "fete_noel";

  const gm = nieme_dimanche(annee, 2, 1); // mars, 1er dimanche
  if (moisHumain === 3 && jour === gm.jour) return "fete_grands_meres";

  const fm = dernier_dimanche(annee, 4); // mai, dernier dimanche
  if (moisHumain === 5 && jour === fm.jour) return "fete_meres";

  const fp = nieme_dimanche(annee, 5, 3); // juin, 3e dimanche
  if (moisHumain === 6 && jour === fp.jour) return "fete_peres";

  const gp = nieme_dimanche(annee, 9, 1); // octobre, 1er dimanche
  if (moisHumain === 10 && jour === gp.jour) return "fete_grands_peres";

  return null;
}

// Un client est-il né ce jour (mois+jour, année ignorée) ? dateNaissance
// au format "YYYY-MM-DD" (tel que renvoyé par Postgres pour une colonne
// "date").
export function estAnniversaire(dateNaissance: string | null | undefined, moisHumain: number, jour: number): boolean {
  if (!dateNaissance) return false;
  const [, m, j] = dateNaissance.split("-").map((n) => parseInt(n, 10));
  return m === moisHumain && j === jour;
}
