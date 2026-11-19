// ═══════════════════════════════════════════════════════════
// Studio de papeterie administrative — packs par univers.
// Une collection graphique homogène par univers (bandeau, logo officiel
// en haut à droite, palette, titres en serif ou sans-serif, cadre,
// ornements, tableau stylé, pied de page) appliquée aux VRAIES pièces
// Bellaïa (mêmes calculs, même numérotation, mêmes mentions) et sortie en
// PDF vectoriel (texte réel) + aperçu écran identique.
// • Mentions légales : celles de l'entreprise qui vend réellement
//   (émetteur « Général » : BellaStudio) — jamais de SIRET par marque.
// • Vil'Dor Pâtisse : organisation indépendante, MODE SIMULATION
//   (filigrane, aucune information légale tant qu'elle n'est pas validée).
// • Fiche de vente : décorative, « ne vaut pas facture ».
// ═══════════════════════════════════════════════════════════
import { Mise, chargerLogo, versPdf, mesurer } from "./pdfPiece";
import { defPiece, calculerTotaux, totalLigne, euros, dateFr, MENTION_TVA_DEFAUT, PENALITES_DEFAUT, type Ligne } from "./piecesTypes";

const W = 595.28, H = 841.89, M = 40;
export type Ornement = "filets" | "losanges" | "pois" | "feuilles";
export type ThemePack = {
  code: string; nom: string; slogan: string; logo: string | null; monogramme?: string;
  principale: string; secondaire: string; accent: string; fond: string; texteBandeau: string;
  serif: boolean; ornement: Ornement; cadreDouble: boolean; simulation?: boolean;
};

// Identités validées par la fondatrice (consigne du 19/11).
export const THEMES_PACKS: ThemePack[] = [
  { code: "STUDIO", nom: "Bella'Studio", slogan: "Création · Édition · Accompagnement", logo: "/branding/bella-studio.jpg", principale: "#1b1f3b", secondaire: "#5b2a4a", accent: "#c6a15b", fond: "#f7eef0", texteBandeau: "#f4e3e6", serif: true, ornement: "losanges", cadreDouble: true },
  { code: "BSH", nom: "Bella'Secret Home", slogan: "Boudoir · Soirées privées · Bien-être intime", logo: "/branding/bella-secret-home.jpg", principale: "#0b0709", secondaire: "#6b1a2b", accent: "#c6a15b", fond: "#f6ecec", texteBandeau: "#e9cfcf", serif: true, ornement: "filets", cadreDouble: true },
  { code: "FOOD", nom: "Bella'Food", slogan: "Cuisine créole maison · Traiteur · Pâtisserie", logo: "/branding/bellafood-logo.png", principale: "#5a6b2f", secondaire: "#3e4a1f", accent: "#c6a15b", fond: "#f6efdf", texteBandeau: "#f6efdf", serif: false, ornement: "feuilles", cadreDouble: false },
  { code: "EVENTS", nom: "Bella'Even's", slogan: "Décoration · Papeterie · Événements sur mesure", logo: "/branding/bella-evenes.jpg", principale: "#7a4a5c", secondaire: "#8a9a7b", accent: "#c6a15b", fond: "#fbf3f0", texteBandeau: "#fbe9ee", serif: true, ornement: "pois", cadreDouble: true },
  { code: "ODYSSEE", nom: "Bella'Odyssée", slogan: "Beauté · Soins · Mise en valeur", logo: "/branding/bella-odyssee-logo.png", principale: "#5b1e4a", secondaire: "#c46a8e", accent: "#c6a15b", fond: "#fbf0f4", texteBandeau: "#f7d7e3", serif: true, ornement: "losanges", cadreDouble: true },
  { code: "VILO", nom: "Vilo'Assistance", slogan: "Assistance administrative · Accompagnement des démarches", logo: "/branding/vilo-assistance-logo.png", principale: "#14213d", secondaire: "#2b3d63", accent: "#c6a15b", fond: "#f3f5f9", texteBandeau: "#ffffff", serif: false, ornement: "filets", cadreDouble: false },
  { code: "VILDOR", nom: "Vil'Dor Pâtisse", slogan: "Pâtisserie artisanale", logo: null, monogramme: "VD", principale: "#4a2c1d", secondaire: "#8b5e3c", accent: "#c6a15b", fond: "#f7efe1", texteBandeau: "#f7efe1", serif: true, ornement: "pois", cadreDouble: true, simulation: true },
];
/** Univers du référentiel sans pack dédié : thème généré à partir de sa couleur (pack prêt à personnaliser). */
export function themeDe(code: string, unite?: { nom?: string; couleur?: string } | null): ThemePack {
  const t = THEMES_PACKS.find(x => x.code === code);
  if (t) return t;
  return { code, nom: unite?.nom || code, slogan: "", logo: null, monogramme: (unite?.nom || code).replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 2).toUpperCase(), principale: unite?.couleur || "#1b1f3b", secondaire: "#444444", accent: "#c6a15b", fond: "#f6f4f0", texteBandeau: "#ffffff", serif: true, ornement: "filets", cadreDouble: false };
}

function ornementLigne(m: Mise, x: number, y: number, larg: number, th: ThemePack) {
  if (th.ornement === "filets") { m.ligne(x, y, x + larg, y, th.accent, 1.4); m.ligne(x, y + 3, x + larg, y + 3, th.accent, 0.4); return; }
  m.ligne(x, y, x + larg, y, th.accent, 0.8);
  const pas = th.ornement === "pois" ? 9 : 14; const t = th.ornement === "feuilles" ? 4 : 3;
  for (let k = 0; x + k * pas <= x + larg; k++) m.rect(x + k * pas - t / 2, y - t / 2, t, t, { fond: k % 2 && th.ornement === "losanges" ? th.secondaire : th.accent });
}

export async function composerPack(p: any, em: any, th: ThemePack) {
  const d = defPiece(p.type); const m = new Mise(); const gris = "#5f5f5f"; const c = p.champs || {}; const dest = p.destinataire || {};
  // ── Bandeau d'en-tête
  const bandH = 96;
  m.rect(0, 0, W, bandH, { fond: th.principale });
  m.rect(0, bandH, W, 3, { fond: th.accent });
  m.texte(M, 44, th.nom, 24, { gras: true, couleur: th.texteBandeau, serif: th.serif });
  if (th.slogan) m.texte(M, 62, th.slogan, 8.5, { couleur: th.accent });
  ornementLigne(m, M, 74, 160, th);
  // Logo officiel en haut à droite (cadre clair pour le contraste)
  const box = 78, bx = W - M - box, by = 9;
  m.rect(bx - 2, by - 2, box + 4, box + 4, { fond: th.accent });
  m.rect(bx, by, box, box, { fond: "#ffffff" });
  const logo = th.logo ? await chargerLogo(th.logo) : null;
  if (logo) {
    const k = Math.min((box - 8) / logo.lp, (box - 8) / logo.hp); const w = logo.lp * k, h = logo.hp * k;
    m.ops.push({ t: "image", x: bx + (box - w) / 2, y: by + (box - h) / 2, w, h, img: logo });
  } else {
    m.rect(bx + 10, by + 10, box - 20, box - 20, { trait: th.principale, ep: 1.2 });
    m.rect(bx + 14, by + 14, box - 28, box - 28, { trait: th.accent, ep: 0.6 });
    m.texte(bx + box / 2, by + box / 2 + 9, th.monogramme || "", 24, { gras: true, couleur: th.principale, serif: true, align: "c" });
  }
  m.texte(bx - 10, bandH - 10, p._modele ? "MODÈLE EN BROUILLON — à valider" : "", 7, { couleur: th.accent, align: "d" });

  // ── Titre + références
  let y = bandH + 30;
  m.texte(M, y, d.titre, 21, { gras: true, couleur: th.principale, serif: th.serif });
  ornementLigne(m, M, y + 9, Math.max(110, mesurer(d.titre, 21, true, th.serif)), th);
  let yr = bandH + 22;
  const refs: [string, boolean][] = [[p.numero ? `N° ${p.numero}` : (d.id === "fiche_vente" ? "Document commercial" : "BROUILLON — non numéroté"), true], [`Date : ${dateFr(p.date_document)}`, false]];
  if (p.date_echeance && ["facture", "facture_acompte"].includes(p.type)) refs.push([`Échéance : ${dateFr(p.date_echeance)}`, false]);
  if (c.validite && p.type === "devis") refs.push([`Valable jusqu'au : ${dateFr(c.validite)}`, false]);
  refs.forEach(([t, g]) => { m.texte(W - M, yr, t, g ? 10 : 9, { gras: g, align: "d", couleur: g && !p.numero && d.id !== "fiche_vente" ? "#b45309" : "#222222" }); yr += 13; });
  y = Math.max(y + 24, yr + 6);

  // ── Émetteur (à gauche) et client (encadré, à droite)
  const legal = th.simulation
    ? ["Entreprise indépendante — MODE SIMULATION", "Informations légales en cours de validation"]
    : [[em?.raison_sociale, em?.forme_juridique].filter(Boolean).join(" · "), em?.adresse, [em?.code_postal, em?.ville].filter(Boolean).join(" "), em?.telephone ? "Tél. " + em.telephone : "", em?.email, em?.siret ? "SIRET " + String(em.siret).replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4") : ""].filter(Boolean) as string[];
  m.texte(M, y + 8, "ÉMETTEUR", 7, { gras: true, couleur: th.accent });
  m.texte(M, y + 22, th.nom, 11, { gras: true, couleur: th.principale, serif: th.serif });
  const lignesEm: string[] = []; legal.forEach(l => lignesEm.push(...m.couper(l, 230, 8.5)));
  lignesEm.forEach((l, i) => m.texte(M, y + 35 + i * 11, l, 8.5, { couleur: gris }));
  const lignesD = [dest.societe, dest.adresse, [dest.code_postal, dest.ville].filter(Boolean).join(" "), dest.telephone ? "Tél. " + dest.telephone : "", dest.email].filter(Boolean) as string[];
  const hBox = Math.max(64, 34 + lignesD.length * 11); const xB = W - M - 235;
  m.rect(xB, y, 235, hBox, { fond: th.fond, trait: th.accent, ep: 0.8 });
  m.rect(xB, y, 4, hBox, { fond: th.principale });
  m.texte(xB + 14, y + 14, p.type === "bon_livraison" ? "LIVRER À" : "CLIENT", 7, { gras: true, couleur: th.accent });
  m.texte(xB + 14, y + 28, dest.nom || dest.societe || "—", 10.5, { gras: true, couleur: "#222222" });
  lignesD.forEach((l, i) => m.texte(xB + 14, y + 41 + i * 11, l, 8.5));
  m.y = y + Math.max(hBox, 40 + lignesEm.length * 11) + 16;

  if (p.objet) { m.place(20); m.texte(M, m.y + 10, "Objet : " + p.objet, 10, { gras: true, couleur: th.principale }); m.y += 22; }
  const champsAff = d.champs.filter(f => !["validite"].includes(f.cle) && c[f.cle] !== undefined && String(c[f.cle]).trim() !== "");
  for (const f of champsAff) {
    const val = f.type === "date" ? dateFr(c[f.cle]) : String(c[f.cle]); const lignes = m.couper(val, W - 2 * M - 170, 9);
    m.place(lignes.length * 12 + 2); m.texte(M, m.y + 9, f.libelle, 8.5, { gras: true, couleur: gris });
    lignes.forEach((l, i) => m.texte(M + 170, m.y + 9 + i * 12, l, 9)); m.y += lignes.length * 12 + 2;
  }
  if (champsAff.length) m.y += 8;

  // ── Tableau
  const lignes: Ligne[] = p.lignes || [];
  if (d.lignes && lignes.length) {
    const prix = d.prix;
    const cols = prix ? [{ l: "Désignation", w: 0 }, { l: "Qté", w: 40, d: true }, { l: "Unité", w: 68 }, { l: "P.U.", w: 64, d: true }, { l: "Remise", w: 42, d: true }, { l: "Total", w: 72, d: true }]
      : [{ l: "Désignation", w: 0 }, { l: "Qté", w: 50, d: true }, { l: "Unité", w: 90 }, ...(p.type === "bon_livraison" ? [{ l: "Livré", w: 50 }] : [])];
    const fixe = cols.reduce((s, x) => s + x.w, 0); cols[0].w = W - 2 * M - fixe;
    const aRemise = prix && lignes.some(l => Number(l.remise_pct)); if (prix && !aRemise) { cols[0].w += cols[4].w; cols[4].w = 0; }
    const entete = () => { m.place(24); m.rect(M, m.y, W - 2 * M, 20, { fond: th.principale }); let x = M; cols.forEach(cc => { if (!cc.w) return; m.texte(cc.d ? x + cc.w - 6 : x + 6, m.y + 13.5, cc.l.toUpperCase(), 7.5, { gras: true, couleur: th.texteBandeau, align: cc.d ? "d" : "g" }); x += cc.w; }); m.y += 20; };
    entete();
    lignes.forEach((l, idx) => {
      const des = m.couper(l.designation || "", cols[0].w - 12, 9); const det = l.detail ? m.couper(l.detail, cols[0].w - 12, 7.5) : [];
      const h = Math.max(18, des.length * 11 + det.length * 9.5 + 7);
      if (m.y + h > H - 70) { m.nouvellePage(); m.y = 52; entete(); }
      if (idx % 2) m.rect(M, m.y, W - 2 * M, h, { fond: th.fond });
      let x = M; des.forEach((t, i) => m.texte(x + 6, m.y + 12 + i * 11, t, 9)); det.forEach((t, i) => m.texte(x + 6, m.y + 12 + des.length * 11 + i * 9.5, t, 7.5, { couleur: gris }));
      x += cols[0].w;
      const vals = prix ? [String(l.qte), l.unite || "", euros(l.pu), aRemise ? (Number(l.remise_pct) ? l.remise_pct + " %" : "") : "", euros(totalLigne(l))] : [String(l.qte), l.unite || "", ...(p.type === "bon_livraison" ? ["[   ]"] : [])];
      cols.slice(1).forEach((cc, i) => { if (!cc.w) return; m.texte(cc.d ? x + cc.w - 6 : x + 6, m.y + 12, vals[i] || "", 9, { align: cc.d ? "d" : "g" }); x += cc.w; });
      m.y += h; m.ligne(M, m.y, W - M, m.y, "#e4dccd", 0.5);
    });
    m.ligne(M, m.y, W - M, m.y, th.accent, 1); m.y += 10;
    if (prix) {
      const t = calculerTotaux(lignes, p.remise_pct); const brut = calculerTotaux(lignes, 0);
      const lt: [string, string, boolean][] = [];
      if (p.remise_pct) lt.push(["Sous-total", euros(brut.ht), false], [`Remise ${p.remise_pct} %`, "− " + euros(brut.ht - t.ht), false]);
      if (t.tva) lt.push(["Total HT", euros(t.ht), false], ["TVA", euros(t.tva), false], ["TOTAL TTC", euros(t.ttc), true]);
      else lt.push([p.type === "avoir" ? "MONTANT DE L'AVOIR" : "TOTAL", euros(t.ttc), true]);
      if (p.acompte && p.type !== "facture_acompte") lt.push(["Acompte versé", "− " + euros(p.acompte), false], ["RESTE À PAYER", euros(t.ttc - p.acompte), true]);
      if (p.type === "devis" && c.acompte_pct) lt.push([`Acompte à la commande (${c.acompte_pct} %)`, euros(t.ttc * Number(c.acompte_pct) / 100), false]);
      m.place(lt.length * 18 + 8);
      const xT = W - M - 240; m.rect(xT, m.y, 240, lt.length * 18, { trait: th.accent, ep: 0.8 });
      lt.forEach(([l, v, g]) => { if (g) m.rect(xT, m.y, 240, 18, { fond: th.principale }); m.texte(xT + 8, m.y + 12.5, l, 9, { gras: g, couleur: g ? th.texteBandeau : "#222222" }); m.texte(W - M - 8, m.y + 12.5, v, g ? 10.5 : 9, { gras: g, align: "d", couleur: g ? th.texteBandeau : "#222222" }); m.y += 18; });
      m.y += 14;
    }
  }
  // ── Signatures
  const sig: string[] = p.type === "devis" ? ["Bon pour accord — date et signature du client"] : p.type === "bon_livraison" ? ["Signature du livreur", "Reçu en bon état — date et signature du client"] : p.type === "bon_commande" ? ["Signature du client"] : [];
  if (sig.length) { m.place(80); const w = (W - 2 * M - 20 * (sig.length - 1)) / sig.length; sig.forEach((s, i) => { const x = M + i * (w + 20); m.rect(x, m.y, w, 62, { trait: th.accent, ep: 0.6 }); m.texte(x + 6, m.y + 12, s, 7.5, { couleur: gris }); }); m.y += 74; }
  // ── Conditions et mentions
  const pieds: string[] = [];
  if (p.conditions || d.conditions) pieds.push(p.conditions || d.conditions!);
  if (d.prix && !calculerTotaux(lignes, p.remise_pct).tva && !th.simulation) pieds.push(em?.mention_tva || MENTION_TVA_DEFAUT);
  if (["facture", "facture_acompte"].includes(p.type) && !th.simulation) pieds.push(em?.penalites || PENALITES_DEFAUT);
  if (p.mentions) pieds.push(p.mentions);
  if (th.simulation) pieds.push("SIMULATION — document sans valeur commerciale ni fiscale tant que les autorisations et formalités de l'entreprise ne sont pas finalisées.");
  if (pieds.length) { m.place(20); ornementLigne(m, M, m.y + 4, W - 2 * M, th); m.y += 12; pieds.forEach(t => { m.paragraphe(M, W - 2 * M, t, 7.6, { couleur: gris }); m.y += 3; }); }
  return m;
}

/** Cadre, ornements, pied de page et filigrane sur toutes les pages. */
function decorer(m: Mise, em: any, th: ThemePack) {
  const legal = th.simulation ? `${th.nom} — mode simulation` : [th.nom + (em?.raison_sociale ? ` — ${em.raison_sociale}` : ""), em?.forme_juridique, em?.siret ? "SIRET " + em.siret : "", [em?.code_postal, em?.ville].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  m.pages.forEach((ops, i) => {
    if (th.simulation) ops.unshift({ t: "texte", x: W / 2 - mesurer("SIMULATION", 70, true) / 2, y: H / 2 + 20, s: "SIMULATION", taille: 70, gras: true, couleur: "#f1e8da" });
    ops.push({ t: "rect", x: 12, y: 12, w: W - 24, h: H - 24, trait: th.accent, ep: 0.8 });
    if (th.cadreDouble) ops.push({ t: "rect", x: 16, y: 16, w: W - 32, h: H - 32, trait: th.accent, ep: 0.3 });
    for (const [cx, cy] of [[12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12]]) ops.push({ t: "rect", x: cx - 3.5, y: cy - 3.5, w: 7, h: 7, fond: th.accent });
    if (i > 0) ops.push({ t: "rect", x: 0, y: 0, w: W, h: 8, fond: th.principale });
    ops.push({ t: "rect", x: 0, y: H - 34, w: W, h: 34, fond: th.principale });
    ops.push({ t: "rect", x: 0, y: H - 36, w: W, h: 2, fond: th.accent });
    const tl = legal.length > 120 ? legal.slice(0, 117) + "…" : legal;
    ops.push({ t: "texte", x: W / 2 - mesurer(tl, 7, false) / 2, y: H - 19, s: tl, taille: 7, gras: false, couleur: th.texteBandeau });
    const pg = `${i + 1}/${m.pages.length}`; ops.push({ t: "texte", x: W - M - mesurer(pg, 7, false), y: H - 8, s: pg, taille: 7, gras: false, couleur: th.accent });
  });
}

export async function miseEnPagePack(p: any, em: any, th: ThemePack) { const m = await composerPack(p, em, th); decorer(m, em, th); return m; }
export async function pdfPack(p: any, em: any, th: ThemePack): Promise<Blob> { return versPdf(await miseEnPagePack(p, em, th)); }
