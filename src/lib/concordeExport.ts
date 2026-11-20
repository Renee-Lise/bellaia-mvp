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

