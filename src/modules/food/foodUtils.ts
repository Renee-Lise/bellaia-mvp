// ═══════════════════════════════════════════════════════════
// UTILS — Module Bella'Food
// Calcul coûts, recherche catalogue, liste de courses
// ═══════════════════════════════════════════════════════════
import type { ResultatCalculateur, Recette, Ingredient } from "./foodTypes";
import { FOOD_CATALOGUE } from "./foodConsts";

// ── Calcul du prix de revient et prix de vente conseillé ──
export function calculerPrix(params: {
  coutMatiere: number;
  coutConsommables?: number;
  coutEmballage?: number;
  coutDecoration?: number;
  coutMainOeuvre?: number;
  coutLivraison?: number;
  coutCharges?: number;
  margeSouhaitee?: number;    // %
  supplement?: number;
  remise?: number;
  acomptePct?: number;        // %
}): ResultatCalculateur {
  const cm   = params.coutMatiere       || 0;
  const cc   = params.coutConsommables  || 0;
  const ce   = params.coutEmballage     || 0;
  const cd   = params.coutDecoration    || 0;
  const cmo  = params.coutMainOeuvre    || 0;
  const cl   = params.coutLivraison     || 0;
  const cch  = params.coutCharges       || 0;
  const marge= params.margeSouhaitee    ?? 40;
  const sup  = params.supplement        || 0;
  const rem  = params.remise            || 0;
  const apct = params.acomptePct        ?? 30;

  const coutTotal = cm + cc + ce + cd + cmo + cl + cch;
  const prixMin   = coutTotal * (1 + marge / 100);
  const prixVente = prixMin + sup - rem;
  const margeBrute= prixVente - coutTotal;
  const tauxMarge = coutTotal > 0 ? Math.round((margeBrute / prixVente) * 100) : 0;
  const acompte   = Math.round(prixVente * (apct / 100));

  return {
    coutMatiere: cm, coutConsommables: cc, coutEmballage: ce,
    coutDecoration: cd, coutMainOeuvre: cmo, coutLivraison: cl, coutCharges: cch,
    coutTotal: Math.round(coutTotal * 100) / 100,
    margeSouhaitee: marge, supplement: sup, remise: rem,
    prixMinConseille: Math.round(prixMin * 100) / 100,
    prixVenteConseille: Math.round(prixVente * 100) / 100,
    margeBrute: Math.round(margeBrute * 100) / 100,
    tauxMarge, beneficeEstime: Math.round(margeBrute * 100) / 100,
    acompte, solde: Math.round((prixVente - acompte) * 100) / 100,
  };
}

// ── Calcul coût matière d'une recette ─────────────────────
export function calculerCoutRecette(ingredients: Ingredient[]): number {
  return ingredients.reduce((total, ing) => {
    if (!ing.coutUnitaire) return total;
    return total + ing.quantite * ing.coutUnitaire;
  }, 0);
}

// ── Recherche dans le catalogue Food (pour liaison Events) ─
export function rechercherProduitsFood(motsCles: string[]): typeof FOOD_CATALOGUE {
  const texte = motsCles.join(" ").toLowerCase();
  return FOOD_CATALOGUE.filter(p => {
    const t = (p.nom + " " + (p.sousCat || "") + " " + (p.description || "")).toLowerCase();
    return motsCles.some(m => t.includes(m.toLowerCase()));
  });
}

// ── Produits visibles côté Events (liaison Bella'Events) ──
export function getProduitsVisiblesEvents() {
  return FOOD_CATALOGUE.filter(p => p.visibleEvents && p.disponible);
}

// ── Générateur de liste de courses simplifié ──────────────
export function genererListeCourses(
  ingredients: Ingredient[],
  stockActuel: Record<string, number>
): { ingredient: string; manquant: number; unite: string }[] {
  const liste: { ingredient: string; manquant: number; unite: string }[] = [];
  for (const ing of ingredients) {
    const enStock = stockActuel[ing.id] ?? 0;
    const manquant = Math.max(0, ing.quantite - enStock);
    if (manquant > 0) {
      liste.push({ ingredient: ing.nom, manquant, unite: ing.unite });
    }
  }
  return liste;
}

// ── Alertes stock ─────────────────────────────────────────
export function getAlerteStock<T extends { qteRestante: number; seuilAlerte: number; nom: string }>(
  items: T[]
): T[] {
  return items.filter(i => i.qteRestante <= i.seuilAlerte);
}

// ── Formatage prix ─────────────────────────────────────────
export function fmtPrix(n: number | null | undefined, suffix = "€"): string {
  if (n == null) return "Sur devis";
  return n.toFixed(2).replace(".", ",") + suffix;
}

// ── Formatage durée ────────────────────────────────────────
export function fmtDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
