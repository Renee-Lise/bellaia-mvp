// ═══════════════════════════════════════════════════════════
// Bibliothèque d'import (navigateur) — partagée Bella'Food / Vil'Dor.
//  • ZIP lu dans le navigateur (DecompressionStream « deflate-raw ») avec
//    garde-fous : 300 entrées max, 50 Mo par fichier, 300 Mo décompressés
//    au total, chemins suspects refusés (« .. », absolus), fichiers
//    cachés / système ignorés, ZIP imbriqués non ouverts, extensions
//    autorisées seulement.
//  • Word (.docx) → texte (document.xml). .doc ancien : conservé, à
//    convertir (non lisible sans outil dédié).
//  • Classement proposé SANS IA d'après le nom / dossier (comme la
//    médiathèque Bella'Events), affiné ensuite par l'analyse du contenu.
// ═══════════════════════════════════════════════════════════
export const ACCEPTES = /\.(pdf|docx?|txt|md|rtf|jpe?g|png|webp|gif|heic|heif|zip|mp3|m4a|wav|aac|ogg|mp4|mov|webm|csv)$/i;
const IGNORES = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)|(^|\/)\./i;
const LIMITES = { entrees: 300, parFichier: 50_000_000, total: 300_000_000 };

export const RUBRIQUES_FOOD: [string, string][] = [
  ["recette", "Recettes"], ["sous_recette", "Sous-recettes"], ["plat", "Plats"], ["dessert", "Desserts"], ["patisserie", "Pâtisseries"],
  ["boisson", "Boissons"], ["en_cas", "En-cas"], ["sauce", "Sauces"], ["ingredient", "Ingrédients"], ["fournisseur", "Fournisseurs"],
  ["achat", "Achats"], ["stock", "Stocks"], ["cout_marge", "Coûts et marges"], ["menu", "Menus"], ["hygiene", "Hygiène"],
  ["allergenes", "Allergènes"], ["tracabilite", "Traçabilité"], ["communication", "Communication"], ["a_classer", "À classer"],
];
const MOTS: [string, RegExp][] = [
  ["hygiene", /haccp|hygi[eè]ne|nettoyage|d[ée]sinfect|temp[ée]rature|pms|plan de ma[iî]trise|contr[oô]le sanitaire/i],
  ["tracabilite", /tra[cç]abilit|lot\b|dlc|ddm|[ée]tiquette (produit|lot)/i],
  ["allergenes", /allerg[eè]n/i],
  ["fournisseur", /fournisseur|catalogue (pro|fournisseur)|tarif/i],
  ["achat", /facture|ticket|re[çc]u|bon de commande|achat/i],
  ["stock", /stock|inventaire/i],
  ["cout_marge", /co[uû]t|marge|rentabilit/i],
  ["menu", /\bmenu|carte des|formule/i],
  ["communication", /affiche|flyer|visuel|banni[eè]re|post|story|logo/i],
  ["patisserie", /p[aâ]tisserie|g[aâ]teau|tarte|entremets|macaron|cake|madeleine|financier|meringue|cookie|brioche|cr[eè]me|ganache|glacage|glaçage|biscuit/i],
  ["boisson", /jus|boisson|smoothie|cocktail|sirop|th[ée]\b|caf[ée]/i],
  ["sauce", /sauce|vinaigrette|mayonnaise|marinade/i],
  ["recette", /recette|fiche technique|\bft\d+|\bfr\d+/i],
];
export function rubriqueParNom(nom: string, dossier = ""): string {
  const t = `${dossier} ${nom}`.replace(/[_-]+/g, " ");
  return MOTS.find(([, re]) => re.test(t))?.[0] || "a_classer";
}

export async function sha256(b: Blob) {
  const h = await crypto.subtle.digest("SHA-256", await b.arrayBuffer());
  return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, "0")).join("");
}

export const typeDe = (nom: string, type?: string) => {
  if (type && type !== "application/octet-stream") return type;
  const e = (nom.split(".").pop() || "").toLowerCase();
  return ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif", txt: "text/plain", md: "text/plain", csv: "text/csv", rtf: "text/rtf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword", zip: "application/zip",
    mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" } as Record<string, string>)[e] || "application/octet-stream";
};

async function inflerRaw(donnees: Uint8Array): Promise<Uint8Array> {
  const ds = new (window as any).DecompressionStream("deflate-raw");
  const flux = new Blob([donnees]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/** Liste les fichiers d'un ZIP (lecture du répertoire central). */
export async function lireZip(f: Blob): Promise<{ nom: string; chemin: string; blob: Blob }[]> {
  const buf = new Uint8Array(await f.arrayBuffer()); const dv = new DataView(buf.buffer);
  let fin = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error("Archive ZIP illisible.");
  const nb = dv.getUint16(fin + 10, true); if (nb > LIMITES.entrees) throw new Error(`Archive trop volumineuse (${nb} fichiers, ${LIMITES.entrees} max).`);
  let p = dv.getUint32(fin + 16, true); let total = 0; const out: { nom: string; chemin: string; blob: Blob }[] = [];
  const dec = new TextDecoder();
  for (let k = 0; k < nb; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Archive ZIP corrompue.");
    const methode = dv.getUint16(p + 10, true), tailleC = dv.getUint32(p + 20, true), tailleU = dv.getUint32(p + 24, true);
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const chemin = dec.decode(buf.subarray(p + 46, p + 46 + ln)); p += 46 + ln + le + lc;
    if (chemin.endsWith("/") || IGNORES.test(chemin)) continue;
    if (chemin.includes("..") || chemin.startsWith("/") || /^[a-z]:/i.test(chemin)) throw new Error("Archive refusée : chemin suspect.");
    const nom = chemin.split("/").pop() || chemin;
    if (!ACCEPTES.test(nom) || /\.zip$/i.test(nom)) continue;            // ZIP imbriqués et formats inconnus ignorés
    if (tailleU > LIMITES.parFichier) throw new Error(`« ${nom} » dépasse 50 Mo une fois décompressé.`);
    total += tailleU; if (total > LIMITES.total) throw new Error("Archive refusée : plus de 300 Mo une fois décompressée.");
    const lnL = dv.getUint16(off + 26, true), leL = dv.getUint16(off + 28, true), debut = off + 30 + lnL + leL;
    const brut = buf.subarray(debut, debut + tailleC);
    const donnees = methode === 0 ? brut : methode === 8 ? await inflerRaw(brut) : null;
    if (!donnees) continue;
    if (donnees.length > LIMITES.parFichier) throw new Error("Archive refusée : taille réelle incohérente.");
    out.push({ nom, chemin, blob: new Blob([donnees], { type: typeDe(nom) }) });
  }
  return out;
}

export async function texteDocx(f: Blob): Promise<string> {
  const entrees = await lireZipBrut(f, "word/document.xml");
  if (!entrees) throw new Error("Document Word illisible.");
  const xml = new TextDecoder().decode(entrees);
  return xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, "\n\n").trim();
}
async function lireZipBrut(f: Blob, cible: string): Promise<Uint8Array | null> {
  const buf = new Uint8Array(await f.arrayBuffer()); const dv = new DataView(buf.buffer); const dec = new TextDecoder();
  let fin = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) return null;
  let p = dv.getUint32(fin + 16, true); const nb = dv.getUint16(fin + 10, true);
  for (let k = 0; k < nb; k++) {
    const methode = dv.getUint16(p + 10, true), tailleC = dv.getUint32(p + 20, true), tailleU = dv.getUint32(p + 24, true);
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const chemin = dec.decode(buf.subarray(p + 46, p + 46 + ln)); p += 46 + ln + le + lc;
    if (chemin !== cible) continue;
    if (tailleU > LIMITES.parFichier) return null;
    const lnL = dv.getUint16(off + 26, true), leL = dv.getUint16(off + 28, true), debut = off + 30 + lnL + leL;
    const brut = buf.subarray(debut, debut + tailleC);
    return methode === 0 ? brut : methode === 8 ? inflerRaw(brut) : null;
  }
  return null;
}

/** Estimation AVANT traitement (prix configurables). Lien avec recette structurée = 0 €. */
export function estimerCout(items: { type: string; taille: number; texte?: number }[], prixEntree = 3, prixSortie = 15) {
  const jetons = items.reduce((s, it) => {
    const e = it.type.startsWith("image/") ? 2000 : it.type === "application/pdf" ? Math.max(3000, Math.round(it.taille / 170)) : /^(audio|video)\//.test(it.type) ? 0 : Math.round((it.texte || it.taille) / 3.5);
    const o = /^(audio|video)\//.test(it.type) ? 0 : 1500;
    return { e: s.e + e, o: s.o + o };
  }, { e: 0, o: 0 });
  return Math.round(((jetons.e * prixEntree + jetons.o * prixSortie) / 1_000_000) * 100) / 100;
}
