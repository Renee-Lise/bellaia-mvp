// ═══════════════════════════════════════════════════════════
// Bella'Food — hiérarchie du catalogue (lot 3 du 24/11/2026) et familles de sauces (lot 4).
// Règles PURES : elles calculent un APERÇU de reclassement ; rien n'est écrit en base ici.
// Les recettes, leurs identifiants et leurs historiques ne sont jamais touchés : seul le classement
// d'affichage (catégorie, sous-catégorie) serait modifié, après validation de la fondatrice.
// ═══════════════════════════════════════════════════════════

export type CategorieId = "repas" | "restauration_rapide" | "patisseries" | "gateaux" | "cupcakes" | "entremets" | "desserts" | "glacerie" | "boulangerie" | "boissons" | "sauces" | "preparations_techniques";

export const CATEGORIES: { id: CategorieId; libelle: string; ico: string }[] = [
  { id: "repas", libelle: "Repas", ico: "🍛" },
  { id: "restauration_rapide", libelle: "Restauration rapide", ico: "🍟" },
  { id: "patisseries", libelle: "Pâtisseries", ico: "🥐" },
  { id: "gateaux", libelle: "Gâteaux", ico: "🎂" },
  { id: "cupcakes", libelle: "Cupcakes", ico: "🧁" },
  { id: "entremets", libelle: "Entremets", ico: "🍰" },
  { id: "desserts", libelle: "Desserts", ico: "🍮" },
  { id: "glacerie", libelle: "Glacerie", ico: "🍨" },
  { id: "boulangerie", libelle: "Boulangerie", ico: "🥖" },
  { id: "boissons", libelle: "Boissons", ico: "🥤" },
  { id: "sauces", libelle: "Sauces", ico: "🥫" },
  { id: "preparations_techniques", libelle: "Préparations techniques", ico: "🧪" },
];

export type Produit = { id?: string; nom: string; categorie_slug?: string | null; sous_categorie?: string | null; statut?: string | null };
export type Classement = { categorie: CategorieId; sous_categorie: string; motif: string; a_valider: boolean };
export type Alerte = { type: "porc" | "alcool"; motif: string };

const sansAccent = (s: string) => s.replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Préparations techniques : jamais vendues comme « dessert » (la ganache n'est PAS un dessert).
const TECHNIQUES = /\b(ganache|creme patissiere|creme au beurre|pate a choux|pate sucree|pate brisee|pate feuilletee|genoise|biscuit joconde|praline pate|marinade|fond blanc|fond brun|sirop a puncher|nappage|glacage|insert|coulis de base|appareil a)\b/;
const GLACES = /\b(glace|sorbet|creme glacee|granite|esquimau)\b/;

/** Ancienne catégorie → [nouvelle catégorie, sous-catégorie]. */
const PAR_SLUG: Record<string, [CategorieId, string]> = {
  soupe: ["repas", "Soupes"], riz: ["repas", "Riz"], poulet: ["repas", "Volailles"], pates: ["repas", "Pâtes et gratins"],
  accompagnement: ["repas", "Accompagnements"], entree: ["boulangerie", "Salés"],
  street_food: ["restauration_rapide", "Barquettes et grillades"], burger: ["restauration_rapide", "Burgers"], crepe: ["restauration_rapide", "Crêpes salées"],
  bokit: ["restauration_rapide", "Bokits"], bake: ["restauration_rapide", "Bakes"],
  patisserie: ["patisseries", "Pâtisseries"], cake: ["gateaux", "Gâteaux"], cupcake: ["cupcakes", "Cupcakes"], entremet: ["entremets", "Entremets"],
  dessert: ["desserts", "Desserts"], glace: ["glacerie", "Glaces"],
  boisson: ["boissons", "Boissons"], jus: ["boissons", "Jus"], milkshake: ["boissons", "Milkshakes"], the_glace: ["boissons", "Thés glacés"], smoothie: ["boissons", "Smoothies"], cocktail: ["boissons", "Cocktails"],
  sauce: ["sauces", "Sauces"],
};

export function classer(p: Produit): Classement {
  const n = sansAccent(p.nom || "");
  if (TECHNIQUES.test(n)) return { categorie: "preparations_techniques", sous_categorie: /ganache/.test(n) ? "Ganaches" : /marinade/.test(n) ? "Marinades" : "Bases", motif: "préparation technique (jamais classée en dessert)", a_valider: false };
  if (GLACES.test(n)) return { categorie: "glacerie", sous_categorie: "Glaces", motif: "nom du produit", a_valider: false };
  const slug = (p.categorie_slug || "").toLowerCase();
  if (slug === "crepe" && /nutella|chocolat|sucre|chantilly|confiture|banane/.test(n)) return { categorie: "desserts", sous_categorie: "Crêpes sucrées", motif: "crêpe sucrée", a_valider: false };
  if (slug === "entree" && /tartelette/.test(n)) return { categorie: "patisseries", sous_categorie: "Tartelettes", motif: "tartelette (salée ou sucrée ?)", a_valider: true };
  if (slug === "accompagnement" && /^supplement/.test(n)) return { categorie: "repas", sous_categorie: "Suppléments", motif: "supplément d'un repas", a_valider: false };
  const m = PAR_SLUG[slug];
  if (m) return { categorie: m[0], sous_categorie: m[1], motif: `ancienne catégorie « ${slug} »`, a_valider: slug === "entree" };
  return { categorie: "repas", sous_categorie: "À classer", motif: `catégorie inconnue « ${slug || "aucune"} »`, a_valider: true };
}

/** Règle maison : ni porc ni alcool. Signale sans jamais modifier. */
export function alertes(p: Produit): Alerte[] {
  const n = sansAccent(p.nom || ""); const out: Alerte[] = [];
  if (/\b(jambon|lardons?|lard|bacon|porc|cochon|chorizo|saucisson|rillettes|andouille|boudin)\b/.test(n) && !/\b(volaille|dinde|poulet|halal)\b/.test(n)) out.push({ type: "porc", motif: "produit carné à base de porc (sauf mention volaille ou dinde)" });
  if (/\b(saucisse fumee|merguez)\b/.test(n) && !/\b(volaille|dinde|poulet|boeuf|agneau)\b/.test(n)) out.push({ type: "porc", motif: "à vérifier sur l'étiquette fournisseur (viande et boyau)" });
  if (!/sans alcool/.test(n) && /\b(liqueur|punch|rhum|vin|champagne|brut|demi-sec|spritz|biere|cocktail alcoolise|chandon|chenet)\b/.test(n)) out.push({ type: "alcool", motif: "boisson alcoolisée" });
  return out;
}

export type LigneApercu = Produit & Classement & { alertes: Alerte[]; change: boolean };
/** Aperçu de reclassement : ce qui changerait, sans rien écrire. */
export function apercuReclassement(produits: Produit[]): { lignes: LigneApercu[]; compteurs: Record<CategorieId, number>; aValider: number; alertes: number } {
  const compteurs = Object.fromEntries(CATEGORIES.map(c => [c.id, 0])) as Record<CategorieId, number>;
  const lignes = produits.map(p => { const c = classer(p); compteurs[c.categorie]++; return { ...p, ...c, alertes: alertes(p), change: true }; });
  return { lignes, compteurs, aValider: lignes.filter(l => l.a_valider).length, alertes: lignes.filter(l => l.alertes.length).length };
}

// ── Lot 4 : familles de sauces et compatibilité ─────────────
export type FamilleSauce = "repas" | "dessert";
export const SAUCES: { nom: string; famille: FamilleSauce }[] = [
  ...["Mayonnaise", "Ketchup", "Sauce chien", "Piment", "Barbecue", "Ail", "Poivre"].map(nom => ({ nom, famille: "repas" as const })),
  ...["Vanille", "Chocolat", "Chocolat noir", "Chocolat blanc", "Praliné", "Citron", "Citron-miel", "Coco aromatisée", "Fraise", "Framboise", "Caramel", "Caramel au sel", "Caramel au beurre", "Caramel beurre salé"].map(nom => ({ nom, famille: "dessert" as const })),
];
const FAMILLE_PAR_CATEGORIE: Record<CategorieId, FamilleSauce | null> = {
  repas: "repas", restauration_rapide: "repas", boulangerie: "repas",
  patisseries: "dessert", gateaux: "dessert", cupcakes: "dessert", entremets: "dessert", desserts: "dessert", glacerie: "dessert",
  boissons: null, sauces: null, preparations_techniques: null,
};
/** Sauces proposées pour un produit : seules les sauces adaptées (plusieurs possibles). */
export function saucesCompatibles(p: Produit): string[] {
  const f = FAMILLE_PAR_CATEGORIE[classer(p).categorie];
  return f ? SAUCES.filter(s => s.famille === f).map(s => s.nom) : [];
}
/** Vérifie une association demandée (refuse une sauce dessert sur un repas, et inversement). */
export function associationValide(p: Produit, sauces: string[]): { ok: boolean; refusees: string[] } {
  const permises = new Set(saucesCompatibles(p));
  const refusees = sauces.filter(s => !permises.has(s));
  return { ok: refusees.length === 0, refusees };
}
