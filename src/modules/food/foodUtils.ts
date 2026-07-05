// ═══════════════════════════════════════════════════════════
// UTILS — Module Bella'Food — Partie I
// ═══════════════════════════════════════════════════════════
import type {
  ResultatCalculateur, Recette, Ingredient,
  StockItem, LigneCourses, UniteMesure, ImportRecette,
} from "./foodTypes";
import { FOOD_CATALOGUE } from "./foodConsts";

// ── Calculateur de coût et prix ────────────────────────────
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
  const cm  = params.coutMatiere         || 0;
  const cc  = params.coutConsommables    || 0;
  const ce  = params.coutEmballage       || 0;
  const cd  = params.coutDecoration      || 0;
  const cmo = params.coutMainOeuvre      || 0;
  const cl  = params.coutLivraison       || 0;
  const cch = params.coutCharges         || 0;
  const mg  = params.margeSouhaitee ?? 40;
  const sup = params.supplement          || 0;
  const rem = params.remise              || 0;
  const apc = params.acomptePct         ?? 30;

  const coutTotal = cm + cc + ce + cd + cmo + cl + cch;
  const prixMin   = coutTotal * (1 + mg / 100);
  const prixVente = prixMin + sup - rem;
  const margeBrute= prixVente - coutTotal;
  const tauxMarge = coutTotal > 0 ? Math.round((margeBrute / prixVente) * 100) : 0;
  const acompte   = Math.round(prixVente * (apc / 100) * 100) / 100;

  return {
    coutMatiere: cm, coutConsommables: cc, coutEmballage: ce,
    coutDecoration: cd, coutMainOeuvre: cmo, coutLivraison: cl, coutCharges: cch,
    coutTotal:            Math.round(coutTotal * 100) / 100,
    margeSouhaitee: mg,   supplement: sup, remise: rem,
    prixMinConseille:     Math.round(prixMin  * 100) / 100,
    prixVenteConseille:   Math.round(prixVente* 100) / 100,
    margeBrute:           Math.round(margeBrute*100) / 100,
    tauxMarge,
    beneficeEstime:       Math.round(margeBrute*100) / 100,
    acompte,
    solde: Math.round((prixVente - acompte) * 100) / 100,
  };
}

// ── Coût matière d'une recette ────────────────────────────
export function calculerCoutRecette(ingredients: Ingredient[]): number {
  return Math.round(
    ingredients.reduce((t, i) =>
      t + (i.coutUnitaire ? i.quantite * i.coutUnitaire : 0), 0
    ) * 100
  ) / 100;
}

// ── Temps total d'une recette ─────────────────────────────
export function calculerTempsTotal(r: Pick<Recette,"tempsPrepa"|"tempsCuisson"|"tempsRepos">): number {
  return (r.tempsPrepa || 0) + (r.tempsCuisson || 0) + (r.tempsRepos || 0);
}

// ── Recherche catalogue Food (pour liaison Events) ────────
export function rechercherProduitsFood(motsCles: string[]) {
  const texte = motsCles.join(" ").toLowerCase();
  return FOOD_CATALOGUE.filter(p => {
    const t = [p.nom, p.sousCat||"", p.description||""].join(" ").toLowerCase();
    return motsCles.some(m => t.includes(m.toLowerCase()));
  });
}

// ── Produits visibles côté Events ─────────────────────────
export function getProduitsVisiblesEvents() {
  return FOOD_CATALOGUE.filter(p => p.visibleEvents && p.disponible);
}

// ── Liste de courses intelligente ─────────────────────────
export function genererListeCourses(
  recettes: Recette[],
  stockActuel: Record<string, number>
): LigneCourses[] {
  // Fusionner tous les ingrédients
  const fusion: Record<string, LigneCourses> = {};

  for (const recette of recettes) {
    for (const ing of recette.ingredients) {
      const key = ing.id;
      if (!fusion[key]) {
        fusion[key] = {
          ingredientId:       ing.id,
          nom:                ing.nom,
          quantiteNecessaire: 0,
          quantiteEnStock:    stockActuel[ing.id] ?? 0,
          quantiteAacheter:   0,
          unite:              ing.unite,
          prixEstime:         ing.coutUnitaire,
          recettes:           [],
        };
      }
      fusion[key].quantiteNecessaire += ing.quantite;
      fusion[key].recettes!.push(recette.nom);
    }
  }

  // Calculer ce qui manque
  return Object.values(fusion)
    .map(l => ({
      ...l,
      recettes: [...new Set(l.recettes)],
      quantiteAacheter: Math.max(0, l.quantiteNecessaire - l.quantiteEnStock),
    }))
    .filter(l => l.quantiteAacheter > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

// ── Alertes stock ─────────────────────────────────────────
export function getAlerteStock<T extends { qteRestante?: number; qteDispo?: number; seuilAlerte: number; nom: string }>(
  items: T[]
): T[] {
  return items.filter(i => {
    const qte = i.qteRestante ?? i.qteDispo ?? 0;
    return qte <= i.seuilAlerte;
  });
}

// ── Budget estimatif liste de courses ─────────────────────
export function calculerBudgetCourses(lignes: LigneCourses[]): number {
  return Math.round(
    lignes.reduce((t, l) =>
      t + (l.prixEstime ? l.prixEstime * l.quantiteAacheter : 0), 0
    ) * 100
  ) / 100;
}

// ── Formatage prix ─────────────────────────────────────────
export function fmtPrix(n: number | null | undefined, suffix = "€"): string {
  if (n == null) return "Sur devis";
  return n.toFixed(2).replace(".", ",") + suffix;
}

// ── Formatage durée ────────────────────────────────────────
export function fmtDuree(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// ── OCR / Import simulé (architecture pour IA future) ─────
// Analyse un texte brut et tente d'en extraire une recette partielle
export function analyserTexteRecette(texte: string): Partial<Recette> {
  const result: Partial<Recette> = { statut: "brouillon" };
  const lignes = texte.split("\n").map(l => l.trim()).filter(Boolean);

  // Détection nom (première ligne non vide, < 80 chars)
  const premiereLigne = lignes[0];
  if (premiereLigne && premiereLigne.length < 80) {
    result.nom = premiereLigne;
  }

  // Détection durées
  const matchTemps = texte.match(/(\d+)\s*(min(?:utes?)?|heure?s?)/gi);
  if (matchTemps && matchTemps.length >= 1) {
    const mins = matchTemps.map(m => {
      const n = parseInt(m);
      return m.toLowerCase().includes("h") ? n * 60 : n;
    });
    if (mins[0]) result.tempsPrepa  = mins[0];
    if (mins[1]) result.tempsCuisson = mins[1];
  }

  // Détection température
  const matchTemp = texte.match(/(\d{3})°?C/);
  if (matchTemp) result.temperature = parseInt(matchTemp[1]);

  // Détection nombre de personnes / portions
  const matchParts = texte.match(/(\d+)\s*(personnes?|portions?|parts?)/i);
  if (matchParts) result.nbParts = parseInt(matchParts[1]);

  // Détection allergènes communs
  const allergenes: string[] = [];
  const MOTS_ALLERGENES: Record<string,string> = {
    "farine":"gluten","blé":"gluten","seigle":"gluten",
    "lait":"lait","crème":"lait","beurre":"lait","fromage":"lait",
    "oeuf":"oeufs","oeuvre":"oeufs",
    "arachide":"arachides","cacahuète":"arachides",
    "noix":"fruits à coque","amande":"fruits à coque","noisette":"fruits à coque",
    "soja":"soja","céleri":"céleri","moutarde":"moutarde",
    "crevette":"crustacés","homard":"crustacés","crabe":"crustacés",
    "saumon":"poisson","thon":"poisson","cabillaud":"poisson",
  };
  for (const [mot, allergene] of Object.entries(MOTS_ALLERGENES)) {
    if (texte.toLowerCase().includes(mot) && !allergenes.includes(allergene)) {
      allergenes.push(allergene);
    }
  }
  if (allergenes.length) result.allergenes = allergenes;

  // Source
  result.sourceType = "texte";
  result.dateImport = new Date().toISOString().split("T")[0];

  return result;
}

// ── Export liste de courses → texte WhatsApp ──────────────
export function exportCoursesWhatsApp(lignes: LigneCourses[], budget?: number): string {
  const lignesTexte = lignes.map(l =>
    `□ ${l.nom} — ${l.quantiteAacheter} ${l.unite}`
    + (l.fournisseurSuggere ? ` (${l.fournisseurSuggere})` : "")
  );
  const header = "*🛒 Liste de courses Bella'Food*\n";
  const body   = lignesTexte.join("\n");
  const footer = budget ? `\n\n💰 Budget estimé : ${fmtPrix(budget)}` : "";
  return header + body + footer;
}
