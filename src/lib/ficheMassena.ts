// ═══════════════════════════════════════════════════════════
// Lecture SANS IA d'une fiche technique structurée (modèle Massena
// Formations et fiches similaires : Matériel / Ingrédients / Durée /
// Progression / Astuce du chef / Bon à savoir).
// Règle : rien n'est inventé. Ce qui n'est pas trouvé reste null et
// figure dans « manquant ». Les allergènes ne sont jamais déduits.
// Renvoie null si la structure n'est pas reconnue (→ IA si autorisée).
// ═══════════════════════════════════════════════════════════

const PIED = /(massena|sasu\b|siret|rcs\b|naf\b|rue saint-antoine|75004|administration@|t[ée]l\.?\s*0\d|capital de|^\s*paris\s*$|formation fiche)/i;
const TITRES: [string, RegExp][] = [
  ["poste", /^pr[ée]paration (du )?poste de travail( et mat[ée]riel)?\s*:?/i],
  ["materiel", /^mat[ée]riels?\s*:?/i],
  ["ingredients", /^ingr[ée]dients?\s*:?/i],
  ["duree", /^dur[ée]es? de (pr[ée]paration|r[ée]alisation)\s*:?/i],
  ["progression", /^(progression|d[ée]roulement|[ée]tapes?|m[ée]thode|r[ée]alisation)\s*:?/i],
  ["astuce", /^astuces? du chef\s*:?/i],
  ["savoir", /^bon [àa] savoir\s*:?/i],
  ["conservation", /^conservation\s*:?/i],
  ["allergenes", /^allerg[èe]nes?\s*:?/i],
];
const UNITES = "kg|g|gr|mg|cl|ml|dl|l|litres?|c\\.?\\s?[àa]\\s?(?:soupe|caf[ée])|cuill[eè]res? [àa] (?:soupe|caf[ée])|cs|cc|sachets?|pinc[ée]es?|feuilles?|gousses?|branches?|tranches?|bottes?|pi[eè]ces?|pots?|bo[iî]tes?|zestes?|morceaux?";
const RE_INGR = new RegExp(`^(\\d+(?:[.,]\\d+)?(?:\\s*[\\/à-]\\s*\\d+(?:[.,]\\d+)?)?|½|¼|¾|une?|deux|trois|quelques)\\s*(${UNITES})?\\.?\\s*(?:d['’]\\s*|de\\s+|du\\s+|des\\s+)?(.+)$`, "i");
const DEBUT_ITEM = new RegExp(`(?=(?:^|\\s)(?:\\d+(?:[.,]\\d+)?\\s*(?:${UNITES})\\b|\\d+\\s+(?:[œo]e?ufs?|jaunes?|blancs?)\\b|\\d+\\s+sachets?\\b))`, "i");

export type FicheLue = { rubrique: string; confiance: number; resume: string; plat_represente: null; recette: any; manquant: string[]; contradictions: { sujet: string; extraits: string[] }[] };

function minutes(t: string): number | null {
  const h = /(\d+)\s*h(?:eures?)?\s*(\d+)?/i.exec(t); if (h) return Number(h[1]) * 60 + (Number(h[2]) || 0);
  const m = /(\d+)\s*(?:min|mn|minutes?)/i.exec(t); return m ? Number(m[1]) : null;
}

export function lireFicheStructuree(texte: string, meta: { titre?: string | null; code?: string | null; categorie?: string | null } = {}): FicheLue | null {
  const lignes = texte.split(/\n+/).map(l => l.replace(/\s+/g, " ").trim()).filter(l => l && !PIED.test(l));
  // Doublons de pied de page répétés (« 55 55 55 rue rue rue … ») : ignorés
  const propres = lignes.filter(l => !/^(\S+)( \1){2,}/.test(l));
  const sections: Record<string, string[]> = { tete: [] };
  let cour = "tete";
  for (const l of propres) {
    const t = TITRES.find(([, re]) => re.test(l));
    if (t) { cour = t[0]; const reste = l.replace(t[1], "").trim(); sections[cour] = sections[cour] || []; if (reste) sections[cour].push(reste); }
    else (sections[cour] = sections[cour] || []).push(l);
  }
  const ingrBrut = (sections.ingredients || []).join(" ");
  const progBrut = (sections.progression || []).join(" ");
  if (!ingrBrut || !progBrut) return null; // structure non reconnue

  // Ingrédients : un élément par quantité
  const items = ingrBrut.split(DEBUT_ITEM).map(x => x.trim()).filter(Boolean);
  const ingredients = items.map(it => {
    const m = RE_INGR.exec(it);
    if (!m) return { nom: it, quantite: null, unite: null, notes: "quantité non lue — à vérifier" };
    const q = m[1].replace(",", "."); const num = /^\d+(\.\d+)?$/.test(q) ? Number(q) : null;
    let unite = (m[2] || "").toLowerCase().replace(/^gr$/, "g") || null;
    let nom = m[3].trim().replace(/[.;,]$/, "");
    if (!unite && /^(?:[œo]e?ufs?|jaunes?|blancs?)/i.test(nom)) unite = "pièce";
    return { nom, quantite: num, unite, notes: num == null ? `quantité d'origine : « ${m[1]} »` : null };
  });

  // Durées
  const dureeTxt = (sections.duree || []).join(" ") + " " + (sections.tete || []).join(" ");
  const prep = /pr[ée]paration\s*:?\s*([^A-Z]*?(?:\d+\s*h(?:eures?)?\s*\d*|\d+\s*(?:min|mn|minutes?)))/i.exec(dureeTxt);
  const cuis = /cuisson\s*:?\s*([^A-Z]*?(?:\d+\s*h(?:eures?)?\s*\d*|\d+\s*(?:min|mn|minutes?)))/i.exec(dureeTxt);
  const repos = /repos(?:er)?\b[^.]{0,40}?(\d+\s*h(?:eures?)?\s*\d*|\d+\s*(?:min|mn|minutes?))/i.exec(dureeTxt + " " + progBrut);
  const temps_prepa = prep ? minutes(prep[1]) : null;
  const temps_cuisson = cuis ? minutes(cuis[1]) : null;
  const temps_repos = repos ? minutes(repos[1]) : null;
  const tempM = /(\d{2,3})\s*°\s*C/i.exec(progBrut);

  // Rendement
  const tete = (sections.tete || []).join(" ");
  const rend = /pour (?:environ )?([\d\s\-–àa]+\s*(?:pi[eè]ces?|personnes?|parts?|portions?|pers\.?|gâteaux?|g[âa]teaux?|cercles?|moules?|tartes?|plaques?|pots?|verrines?|kg|g)\b)/i.exec(tete + " " + dureeTxt);

  // Étapes : phrases de la progression
  const etapes = progBrut.split(/(?<=[.!])\s+(?=[A-ZÀÂÉÈÊÎÔÛÇ])/).map(s => s.trim()).filter(s => s.length > 3);
  const materiel: string[] = [];
  for (const morceau of (sections.materiel || []).join(" ").split(/(?=\b\d+\s+[a-zàâéèêîôûç])/i).map(x => x.trim()).filter(Boolean)) {
    const der = materiel[materiel.length - 1];
    if (der && (der.split("(").length > der.split(")").length)) materiel[materiel.length - 1] = der + " " + morceau; else materiel.push(morceau);
  }
  const astuces = [...(sections.astuce || []), ...(sections.savoir || [])].join(" ").trim();
  const conservation = (sections.conservation || []).join(" ").trim() || null;
  const allergenes = (sections.allergenes || []).join(" ").trim() || null;

  // Contradictions (extraits exacts)
  const contradictions: { sujet: string; extraits: string[] }[] = [];
  const cuisProg = /cuisson[^.]*?(\d+)\s*(?:[àa-]\s*(\d+))?\s*(?:mn|min)/i.exec(progBrut);
  if (cuisProg && temps_cuisson != null) {
    const a = Number(cuisProg[1]), b = Number(cuisProg[2] || cuisProg[1]);
    if (temps_cuisson < a || temps_cuisson > b) contradictions.push({ sujet: "Temps de cuisson", extraits: [`« ${cuis![0].trim()} »`, `« ${cuisProg[0].trim()} »`] });
  }
  const tempsTous = Array.from(progBrut.matchAll(/(\d{2,3})\s*°\s*C/gi)).map(x => Number(x[1]));
  const fours = Array.from(progBrut.matchAll(/(?:four|cuisson)[^.]{0,40}?(\d{2,3})\s*°\s*C/gi)).map(x => Number(x[1]));
  if (new Set(fours).size > 1) contradictions.push({ sujet: "Température du four", extraits: Array.from(new Set(fours)).map(t => `« ${t} °C »`) });

  const manquant: string[] = [];
  if (!rend) manquant.push("rendement / nombre de parts");
  if (temps_prepa == null) manquant.push("temps de préparation");
  if (temps_cuisson == null && /cuisson|four/i.test(progBrut)) manquant.push("temps de cuisson");
  if (!allergenes) manquant.push("allergènes (non indiqués sur la fiche)");
  if (!conservation) manquant.push("conservation");
  if (ingredients.some(i => i.quantite == null)) manquant.push("certaines quantités d'ingrédients");

  const cat = String(meta.categorie || "").toLowerCase();
  const categorie = /g[âa]teau|biscuit|p[âa]tisserie|viennoiserie|tarte|entremet|cr[èe]me|macaron|chocolat/.test(cat) ? "patisserie"
    : /dessert/.test(cat) ? "dessert" : /boisson|cocktail/.test(cat) ? "boisson" : /sauce/.test(cat) ? "sauce" : /plat|cuisine|viande|poisson/.test(cat) ? "plat" : "autre";
  const nom = (meta.titre || "").trim() || (sections.tete || []).find(l => l.length > 2 && !/^recette$/i.test(l)) || null;
  const lus = [ingredients.length >= 2, etapes.length >= 1, !!rend, temps_prepa != null].filter(Boolean).length;
  return {
    rubrique: categorie === "patisserie" ? "patisserie" : categorie === "dessert" ? "dessert" : categorie === "boisson" ? "boisson" : categorie === "sauce" ? "sauce" : categorie === "plat" ? "plat" : "recette",
    confiance: Math.min(0.95, 0.55 + lus * 0.1), resume: `Fiche technique lue sans IA (${ingredients.length} ingrédients, ${etapes.length} étapes).`, plat_represente: null,
    recette: { nom, code: meta.code || null, categorie, rendement: rend ? rend[1].replace(/\s+/g, " ").trim() : null, nb_parts: null, temps_prepa, temps_cuisson, temps_repos, temperature: tempM ? `${tempM[1]} °C` : null,
      ingredients, etapes, astuces: astuces ? [astuces] : [], materiel, conservation, allergenes_fiche: allergenes },
    manquant, contradictions,
  };
}
