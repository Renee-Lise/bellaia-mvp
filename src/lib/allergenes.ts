// ═══════════════════════════════════════════════════════════
// Moteur d'analyse des allergènes Bella'Food (14 allergènes à déclaration obligatoire — règlement UE 1169/2011, annexe II).
// Principes de sécurité :
//  • Une correspondance de mots n'est JAMAIS une preuve : elle produit au mieux « à vérifier » (suspicion).
//  • « Confirmé » ou « absent selon composition vérifiée » exigent une source vérifiée (fiche technique, étiquette,
//    composition validée) pour CHAQUE ingrédient, y compris les ingrédients composés (sauces, bases, toppings…).
//  • Jamais « sans allergènes » par simple absence de détection.
//  • Contamination croisée (« traces ») distinguée de la composition.
// ═══════════════════════════════════════════════════════════
export const ALLERGENES = [
  { code: "gluten", libelle: "Céréales contenant du gluten" },
  { code: "crustaces", libelle: "Crustacés" },
  { code: "oeufs", libelle: "Œufs" },
  { code: "poissons", libelle: "Poissons" },
  { code: "arachides", libelle: "Arachides" },
  { code: "soja", libelle: "Soja" },
  { code: "lait", libelle: "Lait (y compris lactose)" },
  { code: "fruits_coque", libelle: "Fruits à coque" },
  { code: "celeri", libelle: "Céleri" },
  { code: "moutarde", libelle: "Moutarde" },
  { code: "sesame", libelle: "Graines de sésame" },
  { code: "sulfites", libelle: "Anhydride sulfureux et sulfites (> 10 mg/kg ou 10 mg/l)" },
  { code: "lupin", libelle: "Lupin" },
  { code: "mollusques", libelle: "Mollusques" },
] as const;
export type CodeAllergene = typeof ALLERGENES[number]["code"];
export type StatutAllergene = "confirme" | "absent_verifie" | "a_verifier";

// Synonymes et dénominations courantes : servent UNIQUEMENT à signaler une suspicion (jamais à confirmer).
const SYNONYMES: Record<CodeAllergene, RegExp> = {
  gluten: /\b(bl[ée]|froment|farine(?! de (riz|ma[ïi]s|manioc|coco|ch[âa]taigne|sarrasin|pois))|seigle|orge|avoine|[ée]peautre|kamut|semoule|couscous|chapelure|p[âa]tes?\b|pain|brioche|biscuit|g[ée]noise|p[âa]te (feuillet|bris|sabl)|malt|bulgur|seitan)/i,
  crustaces: /\b(crevette|crabe|homard|langouste|langoustine|[ée]crevisse|cribiche|ouassou)/i,
  oeufs: /\b(oeufs?|œufs?|jaune d|blanc d|mayonnaise|meringue|g[ée]noise|albumine)/i,
  poissons: /\b(poisson|thon|saumon|morue|cabillaud|anchois|sardine|acoupa|machoiran|vivaneau|bar\b|dorade|colin|sauce poisson|nuoc)/i,
  arachides: /\b(arachide|cacahu[èe]te|beurre de cacahu)/i,
  soja: /\b(soja|soya|tofu|tamari|sauce soja|l[ée]cithine de soja|edamame)/i,
  lait: /\b(lait|cr[èe]me|beurre(?! de cacahu)|fromage|yaourt|yogourt|lactose|mascarpone|ricotta|mozzarella|parmesan|emmental|ghee|lactos[ée]rum|petit-lait|chantilly|glace|milkshake|lait concentr)/i,
  fruits_coque: /\b(amande|noisette|noix(?! de coco)|cajou|p[ée]can|pistache|macadamia|noix du br[ée]sil|praliné|frangipane|massepain|nougat)/i,
  celeri: /\bc[ée]leri/i,
  moutarde: /\bmoutarde/i,
  sesame: /\b(s[ée]same|tahin[ie]|gomasio)/i,
  sulfites: /\b(vin\b|vinaigre de vin|sulfite|e22[0-8]|fruits? secs?|raisins? secs?|abricots? secs?)/i,
  lupin: /\blupin/i,
  mollusques: /\b(moule|hu[îi]tre|calmar|calamar|encornet|poulpe|seiche|escargot|lambi|palourde|coquille saint)/i,
};

export type SourceVerifiee = { type: "fiche_technique" | "etiquette" | "composition_validee" | "reglementaire"; reference: string; le?: string };
export type Ingredient = {
  nom: string;
  quantite?: number | null;
  unite?: string | null;
  compose?: boolean;                       // sauce, base, topping… : composition propre requise
  sousIngredients?: Ingredient[];          // composition détaillée d'un ingrédient composé
  allergenesVerifies?: Partial<Record<CodeAllergene, "present" | "absent" | "traces">>; // depuis une source vérifiée
  source?: SourceVerifiee | null;          // sans source : aucune affirmation possible
  substituable?: { par: Ingredient; option: string }[]; // variantes (ex. lait végétal)
};

export type ResultatAllergene = { code: CodeAllergene; statut: StatutAllergene; traces: boolean; raisons: string[]; sources: string[] };
export type Analyse = {
  allergenes: ResultatAllergene[];
  presents: CodeAllergene[];               // confirmés
  aVerifier: CodeAllergene[];
  ingredientsNonDocumentes: string[];
  complete: boolean;                       // tous les ingrédients documentés par une source vérifiée
  mentionSansAllergene: false;             // jamais affirmé automatiquement
};

const estDocumente = (i: Ingredient) => !!i.source && !!i.allergenesVerifies;

/** Aplati la composition (ingrédients composés inclus). Un ingrédient composé sans détail ni fiche reste non documenté. */
function aplatir(liste: Ingredient[], chemin = ""): { i: Ingredient; chemin: string }[] {
  const out: { i: Ingredient; chemin: string }[] = [];
  for (const i of liste || []) {
    const c = chemin ? `${chemin} › ${i.nom}` : i.nom;
    if (i.sousIngredients?.length && !estDocumente(i)) out.push(...aplatir(i.sousIngredients, c));
    else out.push({ i, chemin: c });
  }
  return out;
}

export function analyserRecette(ingredients: Ingredient[], options: { substitutions?: string[] } = {}): Analyse {
  // Application des substitutions choisies (ex. « Boisson végétale amande » à la place du lait)
  const choisis = (ingredients || []).map(i => {
    const s = i.substituable?.find(x => options.substitutions?.includes(x.option));
    return s ? s.par : i;
  });
  const elements = aplatir(choisis);
  const nonDoc = elements.filter(e => !estDocumente(e.i)).map(e => e.chemin);
  const resultats: ResultatAllergene[] = ALLERGENES.map(({ code }) => {
    const raisons: string[] = []; const sources: string[] = []; let present = false; let suspicion = false; let traces = false;
    for (const { i, chemin } of elements) {
      const v = i.allergenesVerifies?.[code];
      if (estDocumente(i)) {
        if (v === "present") { present = true; raisons.push(`${chemin} : présent (source vérifiée)`); sources.push(`${i.source!.type} ${i.source!.reference}`); }
        if (v === "traces") { traces = true; raisons.push(`${chemin} : traces possibles (source vérifiée)`); sources.push(`${i.source!.type} ${i.source!.reference}`); }
      } else if (SYNONYMES[code].test(i.nom)) {
        suspicion = true; raisons.push(`${chemin} : le nom évoque cet allergène — non vérifié`);
      }
    }
    let statut: StatutAllergene;
    if (present) statut = "confirme";
    else if (!suspicion && nonDoc.length === 0 && elements.length > 0) statut = "absent_verifie";
    else { statut = "a_verifier"; if (!suspicion && nonDoc.length) raisons.push(`Ingrédient(s) sans information vérifiée : ${nonDoc.slice(0, 3).join(", ")}${nonDoc.length > 3 ? "…" : ""}`); if (!elements.length) raisons.push("Aucun ingrédient renseigné"); }
    return { code, statut, traces, raisons, sources };
  });
  return {
    allergenes: resultats,
    presents: resultats.filter(r => r.statut === "confirme").map(r => r.code),
    aVerifier: resultats.filter(r => r.statut === "a_verifier").map(r => r.code),
    ingredientsNonDocumentes: nonDoc,
    complete: elements.length > 0 && nonDoc.length === 0,
    mentionSansAllergene: false,
  };
}

// ── Classification des familles (une fiche peut appartenir à plusieurs) ──
export const FAMILLES = ["plats", "menus_enfants", "desserts", "patisseries", "jus", "thes_glaces", "milkshakes", "smoothies", "autres_boissons", "saisonniers", "traiteur"] as const;
export type Famille = typeof FAMILLES[number];
const PAR_SLUG: Record<string, Famille> = {
  entree: "plats", soupe: "plats", salade: "plats", viande: "plats", poisson: "plats", poulet: "plats", riz: "plats", pates: "plats", burger: "plats", sandwich: "plats", street_food: "plats", accompagnement: "plats", sauce: "plats", crepe: "plats",
  dessert: "desserts", glace: "desserts", patisserie: "patisseries", cake: "patisseries", cupcake: "patisseries", entremet: "patisseries", macaron: "patisseries", viennoiserie: "patisseries",
  jus: "jus", the_glace: "thes_glaces", milkshake: "milkshakes", smoothie: "smoothies", boisson: "autres_boissons", cocktail: "autres_boissons", mocktail: "autres_boissons",
  buffet: "traiteur", traiteur: "traiteur", repas_creole: "traiteur", repas_guyanais: "traiteur",
};
export function classerFamilles(p: { categorie_slug?: string | null; nom: string; tags?: string[] | null }): Famille[] {
  const f = new Set<Famille>();
  const s = PAR_SLUG[p.categorie_slug || ""]; if (s) f.add(s);
  if (/^milkshake/i.test(p.nom)) { f.delete("autres_boissons"); f.add("milkshakes"); }
  if (/\b(enfant|kids|ti moun)\b/i.test(p.nom) || p.tags?.includes("enfant")) f.add("menus_enfants");
  if (/\b(no[ëe]l|f[êe]te|p[âa]ques|carnaval|saison)\b/i.test(p.nom) || p.tags?.includes("saisonnier")) f.add("saisonniers");
  if (!f.size) f.add("plats");
  return [...f];
}

// ── Publication contrôlée ──
export type FichePublication = {
  analyse: Analyse; allergenesValidesParFondatrice: boolean; prixValide: boolean; prix: number | null;
  portionOuContenance: string | null; description: string | null; familles: Famille[];
};
export function decisionPublication(f: FichePublication, famillesAutoAutorisees: Famille[]): { publiable: boolean; automatique: boolean; blocages: string[] } {
  const b: string[] = [];
  if (!f.analyse.complete) b.push(`Recette incomplète ou ingrédients non documentés (${f.analyse.ingredientsNonDocumentes.length})`);
  if (f.analyse.aVerifier.length) b.push(`Allergènes à vérifier : ${f.analyse.aVerifier.length}`);
  if (!f.allergenesValidesParFondatrice) b.push("Fiche allergènes non validée par la fondatrice");
  if (!f.prixValide || f.prix == null) b.push("Prix non validé");
  if (!f.portionOuContenance) b.push("Portion ou contenance non renseignée");
  if (!f.description) b.push("Description commerciale manquante");
  const publiable = b.length === 0;
  const automatique = publiable && f.familles.length > 0 && f.familles.every(x => famillesAutoAutorisees.includes(x));
  return { publiable, automatique, blocages: b };
}

/** Texte client lisible sans pictogramme ni couleur. */
export function texteAllergenesClient(a: Analyse, tracesDocumentees: boolean): string {
  const lib = (c: CodeAllergene) => ALLERGENES.find(x => x.code === c)!.libelle;
  if (a.aVerifier.length) return "Informations allergènes en cours de vérification — produit non commandable pour le moment.";
  const presents = a.presents.map(lib);
  const traces = a.allergenes.filter(r => r.traces).map(r => lib(r.code));
  let t = presents.length ? `Contient : ${presents.join(", ")}.` : "Aucun des 14 allergènes réglementaires dans les ingrédients documentés.";
  if (traces.length) t += ` Traces possibles : ${traces.join(", ")}.`;
  if (!tracesDocumentees) t += " Risque de contamination croisée non évalué : demandez conseil avant de commander.";
  return t;
}
