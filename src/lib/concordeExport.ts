// Analyse des exports catalogue Concorde Pro (fonctions pures, sans réseau).
/** Analyse CSV (RFC 4180 : guillemets, virgules et retours à la ligne dans les champs). */
export function lireCsv(texte: string, sep = ","): string[][] {
  const lignes: string[][] = []; let ligne: string[] = []; let champ = ""; let guill = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guill) {
      if (c === '"') { if (texte[i + 1] === '"') { champ += '"'; i++; } else guill = false; }
      else champ += c;
    } else if (c === '"') guill = true;
    else if (c === sep) { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); champ = ""; if (ligne.some(x => x !== "")) lignes.push(ligne); ligne = [];
    } else champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); if (ligne.some(x => x !== "")) lignes.push(ligne); }
  return lignes;
}

/** Analyse du contenu d'export (fonction pure, testable sans réseau). */
export function analyserExport(texte: string, referencesBsh: string[]) {
  const premiere = texte.slice(0, texte.indexOf("\n") > 0 ? texte.indexOf("\n") : 2000);
  const sep = (premiere.match(/;/g) || []).length > (premiere.match(/,/g) || []).length ? ";" : ",";
  const lignes = lireCsv(texte, sep);
  const entetes = (lignes[0] || []).map(h => h.trim());
  const col = (...noms: string[]) => entetes.findIndex(h => noms.some(n => h.toLowerCase() === n.toLowerCase()));
  const iSku = col("Variant SKU", "SKU", "Référence", "Reference"), iImg = col("Image Src", "Images", "Image");
  const iStock = col("Variant Inventory Qty", "Stock", "Quantité"), iPrix = col("Variant Price", "Prix", "Price");
  const iEan = col("Variant Barcode", "EAN", "Code Barre"), iNom = col("Title", "Nom", "Désignation");
  const produits = new Map<string, { images: string[]; stock: boolean; prix: boolean; ean: boolean; nom: boolean }>();
  for (const l of lignes.slice(1)) {
    const sku = iSku >= 0 ? (l[iSku] || "").trim() : ""; if (!sku) continue;
    const imgs = iImg >= 0 ? (l[iImg] || "").split(/[,|;\s]+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s)) : [];
    const p = produits.get(sku) || { images: [], stock: false, prix: false, ean: false, nom: false };
    imgs.forEach(u => { if (!p.images.includes(u)) p.images.push(u); });
    p.stock ||= iStock >= 0 && (l[iStock] || "").trim() !== "";
    p.prix ||= iPrix >= 0 && (l[iPrix] || "").trim() !== "";
    p.ean ||= iEan >= 0 && (l[iEan] || "").trim() !== "";
    p.nom ||= iNom >= 0 && (l[iNom] || "").trim() !== "";
    produits.set(sku, p);
  }
  const liste = Array.from(produits.values());
  const refs = new Set(referencesBsh.map(r => r.trim()).filter(Boolean));
  const rapproches = Array.from(refs).filter(r => produits.has(r));
  const avecImages = rapproches.filter(r => (produits.get(r)!.images.length > 0));
  const domaines = Array.from(new Set(liste.flatMap(p => p.images).map(u => { try { return new URL(u).hostname; } catch { return "?"; } }))).slice(0, 5);
  return {
    format: iImg >= 0 && iSku >= 0 ? "Shopify / Store Commander" : iSku >= 0 ? "liste d'articles sans colonne image" : "non reconnu",
    separateur: sep, colonnes: entetes, lignes: Math.max(0, lignes.length - 1),
    references: produits.size,
    avec_nom: liste.filter(p => p.nom).length,
    avec_image: liste.filter(p => p.images.length > 0).length,
    avec_images_secondaires: liste.filter(p => p.images.length > 1).length,
    images_total: liste.reduce((s, p) => s + p.images.length, 0),
    avec_stock: liste.filter(p => p.stock).length, avec_prix: liste.filter(p => p.prix).length, avec_ean: liste.filter(p => p.ean).length,
    domaines_images: domaines,
    bsh: { produits: refs.size, rapproches: rapproches.length, rapproches_avec_images: avecImages.length, absents: refs.size - rapproches.length },
    echantillon_images: avecImages.slice(0, 5).map(r => produits.get(r)!.images[0]),
  };
}


// ── Propositions de rattachement (fondatrice) ──────────────────────────────
// Pour chaque produit BSH de Bellaïa : correspondance EXACTE par référence
// (Variant SKU), puis par code-barres seulement s'il figure déjà dans la fiche.
// Aucune correspondance approximative. Classement : prêt / incomplet /
// en attente de validation / introuvable.
export type LigneExport = { sku: string; titre: string; description: string; marque: string; collection: string; stock: number | null; prix: number | null; ean: string; images: string[]; statut: string };
export type ProduitBellaia = { id: string; nom: string | null; notes: string | null; prix_vente: number | null; prix_achat?: number | null; quantite: number | null; statut: string | null; categorie: string | null; image_url: string | null; usage_conseils: string | null };
export type Proposition = {
  id: string; ref: string | null; nom: string; categorie: string | null; statutBellaia: string | null; enLigne: boolean;
  prixVente: number | null; prixProvisoire: boolean; prixACompleter: boolean; imageActuelle: string | null; descriptionActuelle: boolean;
  classe: "pret" | "incomplet" | "attente" | "introuvable"; manques: string[]; aValider: string[];
  fournisseur: null | { titre: string; marque: string; collection: string; stock: number | null; prix: number | null; ean: string; images: string[]; description: string; correspondance: "reference" | "code_barres" };
};

const sansHtml = (h: string) => String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const RX_INGERE = /g[ée]lule|compl[ée]ment alimentaire|comprim[ée]|capsule|ampoule|sirop|boisson|chocolat|bonbon|à croquer|a croquer/i;
const RX_POPPERS = /poppers?/i;
const RX_CONTACT = /lubrifiant|huile|cr[èe]me|gel |s[ée]rum|baume|parfum|bougie de massage|spray/i;

export function lignesExport(texte: string): Map<string, LigneExport> {
  const premiere = texte.slice(0, texte.indexOf("\n") > 0 ? texte.indexOf("\n") : 2000);
  const sep = (premiere.match(/;/g) || []).length > (premiere.match(/,/g) || []).length ? ";" : ",";
  const lignes = lireCsv(texte, sep); const h = (lignes[0] || []).map(x => x.trim().toLowerCase());
  const c = (...n: string[]) => h.findIndex(x => n.includes(x));
  const i = { sku: c("variant sku", "sku", "référence", "reference"), titre: c("title", "nom", "désignation"), desc: c("body (html)", "description"), marque: c("vendor", "marque"), coll: c("collection"), stock: c("variant inventory qty", "stock"), prix: c("variant price", "prix", "price"), ean: c("variant barcode", "ean", "code barre"), img: c("image src", "images", "image"), st: c("status") };
  const m = new Map<string, LigneExport>();
  for (const l of lignes.slice(1)) {
    const sku = (l[i.sku] || "").trim(); if (!sku || m.has(sku)) continue;
    const num = (v?: string) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
    m.set(sku, { sku, titre: (l[i.titre] || "").trim(), description: sansHtml(l[i.desc] || ""), marque: l[i.marque] || "", collection: l[i.coll] || "", stock: num(l[i.stock]), prix: num(l[i.prix]), ean: (l[i.ean] || "").trim(),
      images: i.img >= 0 ? (l[i.img] || "").split(/[,|;\s]+/).map(s => s.trim()).filter(s => /^https:\/\//i.test(s)) : [], statut: (l[i.st] || "").trim() });
  }
  return m;
}

// Mots qui distinguent une variante (parfum, couleur, taille, contenance) : s'ils figurent dans le nom Bellaïa
// mais pas dans la désignation du fournisseur, la photo peut montrer une autre variante → contrôle visuel exigé.
const VARIANTES = ["fraise","menthe","cerise","vanille","chocolat","framboise","coco","peche","pêche","pomme","fruits","banane","caramel","champagne","noir","noire","blanc","blanche","rouge","rose","violet","violette","bleu","bleue","vert","verte","dore","doree","argent","nude","chair","transparent","xs","s/m","m/l","l/xl","xl","xxl"];
const sansAccents = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function varianteAVerifier(nomBellaia: string, designationFournisseur: string): string[] {
  const n = ` ${sansAccents(nomBellaia).replace(/[^a-z0-9/]+/g, " ")} `, f = ` ${sansAccents(designationFournisseur).replace(/[^a-z0-9/]+/g, " ")} `;
  const tailles = (t: string) => (t.match(/\b\d+([.,]\d+)?\s?(ml|cm|g|mm)\b/g) || []).map(x => x.replace(/\s/g, ""));
  const ecarts = VARIANTES.filter(v => n.includes(` ${sansAccents(v)} `) && !f.includes(` ${sansAccents(v)} `));
  const tn = tailles(n), tf = tailles(f); if (tn.length && tf.length && !tn.some(x => tf.includes(x))) ecarts.push(`${tn.join("/")} ≠ ${tf.join("/")}`);
  return ecarts;
}

// Source publique (sans jeton) : plan du site officiel de Concorde Pro (adresse de chaque fiche, terminée par le code-barres,
// et ses photos dans l'ordre de la fiche) + fichier « article_negoce.csv » (référence → code-barres, désignation, marque, stock).
// Les tarifs du fichier ne sont PAS repris (prix d'achat confidentiels) ; le plan du site ne contient pas de description.
export function lignesDepuisPlanDuSite(planDuSiteXml: string, negoceCsv: string): { lignes: Map<string, LigneExport>; eanAmbigus: number } {
  const parEan = new Map<string, { url: string; images: string[] }[]>();
  for (const bloc of planDuSiteXml.split("<url>").slice(1)) {
    const loc = (bloc.match(/<loc>(?:<!\[CDATA\[)?([^<\]]+)/) || [])[1] || "";
    const ean = (loc.match(/-(\d{8,14})\.html$/) || [])[1]; if (!ean) continue;
    const images = Array.from(bloc.matchAll(/<image:loc>(?:<!\[CDATA\[)?([^<\]]+)/g)).map(m => m[1].trim()).filter(u => /^https:\/\/www\.concordepro\.com\//.test(u));
    parEan.set(ean, [...(parEan.get(ean) || []), { url: loc, images }]);
  }
  const lignes = new Map<string, LigneExport>(); let eanAmbigus = 0;
  const csv = lireCsv(negoceCsv, ";"); const h = (csv[0] || []).map(x => x.trim().toLowerCase());
  const c = (n: string) => h.indexOf(n); const i = { ref: c("référence"), des: c("désignation"), ean: c("code barre"), stock: c("stock/jour"), marque: c("marque"), fam: c("famille") };
  for (const l of csv.slice(1)) {
    const ref = (l[i.ref] || "").trim(), ean = (l[i.ean] || "").trim(); if (!ref || lignes.has(ref)) continue;
    const fiches = ean ? parEan.get(ean) || [] : [];
    if (fiches.length > 1) eanAmbigus++;
    const fiche = fiches.length === 1 ? fiches[0] : null;   // aucune correspondance si le code-barres est ambigu
    const st = parseFloat(String(l[i.stock] ?? "").replace(",", "."));
    lignes.set(ref, { sku: ref, titre: (l[i.des] || "").trim(), description: "", marque: (l[i.marque] || "").trim(), collection: (l[i.fam] || "").trim(), stock: Number.isFinite(st) ? st : null, prix: null, ean, images: fiche ? fiche.images : [], statut: fiche ? "active" : "absent du plan du site" });
  }
  return { lignes, eanAmbigus };
}

export function propositionsBSH(exp: Map<string, LigneExport>, produits: ProduitBellaia[], imagesAccessibles?: (url: string) => boolean, options: { descriptionRequise?: boolean } = {}): Proposition[] {
  const descriptionRequise = options.descriptionRequise !== false;
  const parEan = new Map<string, LigneExport>(); exp.forEach(v => { if (v.ean) parEan.set(v.ean, v); });
  return produits.map(p => {
    const ref = (String(p.notes || "").match(/R[ée]f\.?\s?([0-9A-Za-z\-]+)/) || [])[1] || null;
    const eanFiche = (String(p.notes || "").match(/\b(\d{13})\b/) || [])[1];
    let f = ref ? exp.get(ref) : undefined; let corr: "reference" | "code_barres" = "reference";
    if (!f && eanFiche && parEan.has(eanFiche)) { f = parEan.get(eanFiche); corr = "code_barres"; }
    const pv = p.prix_vente != null ? Number(p.prix_vente) : null; const pa = p.prix_achat != null ? Number(p.prix_achat) : null;
    const prixProvisoire = pv != null && pa != null && pa > 0 && Math.abs(pv - pa - 5) < 0.011;
    const prixACompleter = /à compléter|non visible/i.test(p.notes || "");
    const base = { id: p.id, ref, nom: p.nom || ref || "—", categorie: p.categorie, statutBellaia: p.statut, enLigne: p.statut === "actif", prixVente: pv, prixProvisoire, prixACompleter, imageActuelle: p.image_url, descriptionActuelle: !!(p.usage_conseils || "").trim() };
    if (!f) return { ...base, classe: "introuvable" as const, manques: ["référence absente du catalogue fournisseur", "Image à fournir"], aValider: [], fournisseur: null };
    const manques: string[] = []; const aValider: string[] = [];
    const imgs = imagesAccessibles ? f.images.filter(imagesAccessibles) : f.images;
    if (!imgs.length) manques.push("Image à fournir");
    if (pv == null || pv <= 0) manques.push("prix de vente absent");
    if (prixACompleter) manques.push("prix public « à compléter »");
    if (prixProvisoire) manques.push("prix provisoire (achat + 5 €)");
    if ((f.description || "").length < 40) (descriptionRequise ? manques : aValider).push(descriptionRequise ? "description fournisseur absente" : "description à rédiger");
    const ecarts = varianteAVerifier(p.nom || "", f.titre); if (ecarts.length) aValider.push(`variante à vérifier sur la photo (${ecarts.join(", ")})`);
    if (f.stock != null && f.stock <= 0) manques.push("rupture chez le fournisseur");
    if (p.statut !== "actif") aValider.push("fiche inactive dans Bellaïa");
    if (f.prix != null && pv != null && Math.abs(f.prix - pv) > 0.011) aValider.push(`prix Bellaïa différent de l'export (${f.prix.toFixed(2)} €)`);
    const t = `${f.titre} ${p.nom || ""}`;
    if (RX_POPPERS.test(t)) aValider.push("poppers : réglementation spécifique");
    else if (RX_INGERE.test(t)) aValider.push("produit ingéré : allégations et étiquetage à vérifier");
    else if (RX_CONTACT.test(t)) aValider.push("cosmétique ou produit de contact : composition et mentions à vérifier");
    return { ...base, classe: manques.length ? "incomplet" as const : aValider.length ? "attente" as const : "pret" as const, manques, aValider,
      fournisseur: { titre: f.titre, marque: f.marque, collection: f.collection, stock: f.stock, prix: f.prix, ean: f.ean, images: imgs, description: f.description, correspondance: corr } };
  });
}
