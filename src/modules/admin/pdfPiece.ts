// ═══════════════════════════════════════════════════════════
// Administratif — mise en page A4 et PDF vectoriel (sans librairie)
// Une seule mise en page, deux sorties identiques :
//   • PDF à texte réel (sélectionnable, léger) : Helvetica + WinAnsi
//   • aperçu à l'écran sur <canvas> (mêmes instructions de dessin)
// ═══════════════════════════════════════════════════════════
import { defPiece, calculerTotaux, totalLigne, euros, dateFr, MENTION_TVA_DEFAUT, PENALITES_DEFAUT, type Ligne } from "./piecesTypes";

const W = 595.28, H = 841.89, M = 40;
type Op =
  | { t: "texte"; x: number; y: number; s: string; taille: number; gras: boolean; couleur: string }
  | { t: "rect"; x: number; y: number; w: number; h: number; fond?: string; trait?: string; ep?: number }
  | { t: "ligne"; x1: number; y1: number; x2: number; y2: number; couleur: string; ep: number }
  | { t: "image"; x: number; y: number; w: number; h: number; img: { jpeg: Uint8Array; source: HTMLCanvasElement; lp: number; hp: number } };

let ctxMesure: CanvasRenderingContext2D | null = null;
function mesurer(s: string, taille: number, gras: boolean) {
  if (!ctxMesure) ctxMesure = document.createElement("canvas").getContext("2d");
  ctxMesure!.font = `${gras ? "bold " : ""}${taille}px Helvetica, Arial, "Liberation Sans", sans-serif`;
  return ctxMesure!.measureText(s).width;
}
const rgb = (hex: string) => { const h = (hex || "#000").replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3)).join(" "); };

class Mise {
  pages: Op[][] = [[]];
  y = M;
  get ops() { return this.pages[this.pages.length - 1]; }
  nouvellePage() { this.pages.push([]); this.y = M; }
  texte(x: number, y: number, s: string, taille = 9, o: { gras?: boolean; couleur?: string; align?: "g" | "d" | "c" } = {}) {
    const larg = mesurer(s, taille, !!o.gras);
    const xx = o.align === "d" ? x - larg : o.align === "c" ? x - larg / 2 : x;
    this.ops.push({ t: "texte", x: xx, y, s, taille, gras: !!o.gras, couleur: o.couleur || "#222222" });
  }
  rect(x: number, y: number, w: number, h: number, o: { fond?: string; trait?: string; ep?: number } = {}) { this.ops.push({ t: "rect", x, y, w, h, ...o }); }
  ligne(x1: number, y1: number, x2: number, y2: number, couleur = "#cccccc", ep = 0.6) { this.ops.push({ t: "ligne", x1, y1, x2, y2, couleur, ep }); }
  /** Découpe un texte en lignes tenant dans la largeur (respecte les retours à la ligne). */
  couper(s: string, largeur: number, taille: number, gras = false): string[] {
    const out: string[] = [];
    for (const para of String(s || "").split("\n")) {
      const mots = para.split(/\s+/).filter(Boolean); let l = "";
      if (!mots.length) { out.push(""); continue; }
      for (const m of mots) {
        const essai = l ? l + " " + m : m;
        if (mesurer(essai, taille, gras) <= largeur) l = essai;
        else { if (l) out.push(l); l = m; while (mesurer(l, taille, gras) > largeur && l.length > 1) { let k = l.length - 1; while (k > 1 && mesurer(l.slice(0, k), taille, gras) > largeur) k--; out.push(l.slice(0, k)); l = l.slice(k); } }
      }
      out.push(l);
    }
    return out;
  }
  paragraphe(x: number, largeur: number, s: string, taille = 9, o: { gras?: boolean; couleur?: string; interligne?: number } = {}) {
    const lh = taille * (o.interligne || 1.35);
    for (const l of this.couper(s, largeur, taille, o.gras)) { this.place(lh); this.texte(x, this.y + taille, l, taille, o); this.y += lh; }
  }
  /** Saut de page si la hauteur demandée ne tient pas. */
  place(h: number) { if (this.y + h > H - 60) this.nouvellePage(); }
}

async function chargerLogo(url?: string | null) {
  if (!url) return null;
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const c = document.createElement("canvas"); const k = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const b64 = c.toDataURL("image/jpeg", 0.9).split(",")[1]; const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return { jpeg: u, source: c, lp: c.width, hp: c.height };
  } catch { return null; }
}

// ── Mise en page d'une pièce ─────────────────────────────────
export async function composerPiece(p: any, em: any) {
  const d = defPiece(p.type); const m = new Mise(); const col = em?.couleur || "#6B1A2B"; const gris = "#666666";
  const c = p.champs || {}; const dest = p.destinataire || {};
  // En-tête : logo + émetteur
  const logo = await chargerLogo(em?.logo_url);
  let xEm = M;
  if (logo) { const h = 54, w = Math.min(120, (logo.lp / logo.hp) * h); m.ops.push({ t: "image", x: M, y: M, w, h, img: logo }); xEm = M + w + 10; }
  const nomEm = em?.nom_commercial || em?.raison_sociale || "Mon entreprise";
  m.texte(xEm, M + 13, nomEm, 13, { gras: true, couleur: col });
  const lignesEm = [em?.raison_sociale && em.raison_sociale !== nomEm ? em.raison_sociale + (em?.forme_juridique ? " · " + em.forme_juridique : "") : em?.forme_juridique, em?.adresse, [em?.code_postal, em?.ville].filter(Boolean).join(" "), em?.telephone ? "Tél. " + em.telephone : "", em?.email, em?.siret ? "SIRET " + em.siret : ""].filter(Boolean) as string[];
  lignesEm.forEach((l, i) => m.texte(xEm, M + 27 + i * 11, l, 8.5, { couleur: gris }));
  // Titre et numéro (à droite)
  if (d.titre) {
    m.texte(W - M, M + 16, d.titre, 18, { gras: true, couleur: col, align: "d" });
    m.texte(W - M, M + 32, p.numero ? `N° ${p.numero}` : "BROUILLON — non numéroté", 9.5, { gras: true, align: "d", couleur: p.numero ? "#222222" : "#b45309" });
    let yy = M + 45;
    m.texte(W - M, yy, `Date : ${dateFr(p.date_document)}`, 9, { align: "d" }); yy += 12;
    if (p.date_echeance && ["facture", "facture_acompte"].includes(p.type)) { m.texte(W - M, yy, `Échéance : ${dateFr(p.date_echeance)}`, 9, { align: "d" }); yy += 12; }
    if (c.validite && p.type === "devis") { m.texte(W - M, yy, `Valable jusqu'au : ${dateFr(c.validite)}`, 9, { align: "d" }); yy += 12; }
  }
  m.y = Math.max(M + 30 + lignesEm.length * 11, M + 70) + 14;
  // Destinataire
  const titreDest = p.type === "bordereau_expedition" ? "Destinataire (livrer à)" : p.type === "bon_achat" ? "" : "Destinataire";
  if (titreDest && (dest.nom || dest.societe || dest.adresse)) {
    const lignesD = [dest.societe, dest.adresse, [dest.code_postal, dest.ville].filter(Boolean).join(" "), dest.telephone ? "Tél. " + dest.telephone : "", dest.email].filter(Boolean) as string[];
    const hBox = 30 + lignesD.length * 11; const xB = W - M - 240;
    m.rect(xB, m.y, 240, hBox, { trait: "#dddddd", ep: 0.8 });
    m.texte(xB + 10, m.y + 13, titreDest.toUpperCase(), 7.5, { gras: true, couleur: gris });
    m.texte(xB + 10, m.y + 26, dest.nom || dest.societe || "", 10.5, { gras: true });
    lignesD.forEach((l, i) => m.texte(xB + 10, m.y + 38 + i * 11, l, 8.5));
    m.y += hBox + 14;
  }

  if (p.type === "courrier") {
    if (c.lieu || p.date_document) { m.texte(W - M, m.y + 10, `${c.lieu ? c.lieu + ", le " : "Le "}${new Date(p.date_document + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, 9.5, { align: "d" }); m.y += 26; }
    if (p.objet) { m.texte(M, m.y + 10, "Objet : " + p.objet, 10, { gras: true }); m.y += 24; }
    if (c.civilite) { m.paragraphe(M, W - 2 * M, c.civilite, 10.5); m.y += 6; }
    m.paragraphe(M, W - 2 * M, c.corps || "", 10.5, { interligne: 1.45 }); m.y += 10;
    if (c.formule) { m.paragraphe(M, W - 2 * M, c.formule, 10.5, { interligne: 1.45 }); m.y += 18; }
    if (c.signataire) { m.place(40); m.texte(W - M - 160, m.y + 10, c.signataire, 10.5, { gras: true }); m.y += 50; }
    if (c.pj) { m.paragraphe(M, W - 2 * M, "Pièce(s) jointe(s) : " + c.pj, 9, { couleur: gris }); }
    return m;
  }

  if (p.objet) { m.place(20); m.texte(M, m.y + 10, "Objet : " + p.objet, 10, { gras: true }); m.y += 22; }

  // Champs propres au document
  const champsAff = d.champs.filter(f => !["validite", "corps", "formule", "civilite", "signataire", "lieu", "pj"].includes(f.cle) && c[f.cle] !== undefined && String(c[f.cle]).trim() !== "" && !(p.type === "bon_achat"));
  if (champsAff.length && p.type !== "recu") {
    for (const f of champsAff) {
      const val = f.type === "date" ? dateFr(c[f.cle]) : String(c[f.cle]);
      const lignes = m.couper(val, W - 2 * M - 170, 9);
      m.place(lignes.length * 12 + 2);
      m.texte(M, m.y + 9, f.libelle, 8.5, { gras: true, couleur: gris });
      lignes.forEach((l, i) => m.texte(M + 170, m.y + 9 + i * 12, l, 9));
      m.y += lignes.length * 12 + 2;
    }
    m.y += 8;
  }

  if (p.type === "bon_achat") {
    m.place(230);
    const y0 = m.y, h = 210;
    m.rect(M, y0, W - 2 * M, h, { fond: col }); m.rect(M + 8, y0 + 8, W - 2 * M - 16, h - 16, { trait: "#ffffff", ep: 1 });
    m.texte(W / 2, y0 + 48, "BON D'ACHAT", 22, { gras: true, couleur: "#ffffff", align: "c" });
    m.texte(W / 2, y0 + 100, euros(Number(c.valeur) || 0), 40, { gras: true, couleur: "#ffffff", align: "c" });
    const infos = [c.beneficiaire && "Pour : " + c.beneficiaire, c.offert_par && "Offert par : " + c.offert_par, c.utilisable && "Utilisable pour : " + c.utilisable, c.valable_jusqu && "Valable jusqu'au " + dateFr(c.valable_jusqu), (c.code || p.numero) && "Code : " + (c.code || p.numero)].filter(Boolean) as string[];
    infos.forEach((l, i) => m.texte(W / 2, y0 + 130 + i * 14, l, 10.5, { couleur: "#ffffff", align: "c" }));
    m.y = y0 + h + 16;
  }

  if (p.type === "recu") {
    m.place(120);
    const montant = Number(c.montant) || p.total_ttc || 0;
    m.paragraphe(M, W - 2 * M, `Je soussigné(e), ${nomEm}, reconnais avoir reçu de ${dest.nom || dest.societe || "…"} la somme de ${euros(montant)}${c.mode_paiement ? " par " + c.mode_paiement : ""}${c.pour ? ", en règlement de " + c.pour : ""}.`, 11, { interligne: 1.5 });
    m.y += 30; m.texte(W - M - 200, m.y, "Fait le " + dateFr(p.date_document) + (em?.ville ? " à " + em.ville : ""), 9.5); m.y += 16; m.texte(W - M - 200, m.y, "Signature :", 9.5, { couleur: gris }); m.y += 60;
  }

  // Tableau des lignes
  const lignes: Ligne[] = p.lignes || [];
  if (d.lignes && lignes.length) {
    const prix = d.prix;
    const cols = prix ? [{ l: "Désignation", w: 0 }, { l: "Qté", w: 40, d: true }, { l: "Unité", w: 70 }, { l: "P.U.", w: 62, d: true }, { l: "Remise", w: 40, d: true }, { l: "Total", w: 70, d: true }]
      : [{ l: p.type === "bordereau_envoi" ? "Document / pièce" : "Désignation", w: 0 }, { l: "Qté", w: 50, d: true }, { l: "Unité", w: 90 }, ...(p.type === "bon_livraison" ? [{ l: "Livré", w: 50 }] : [])];
    const fixe = cols.reduce((s, x) => s + x.w, 0); cols[0].w = W - 2 * M - fixe;
    const aRemise = prix && lignes.some(l => Number(l.remise_pct));
    if (prix && !aRemise) { cols[0].w += cols[4].w; cols[4].w = 0; }
    const entete = () => {
      m.place(22); m.rect(M, m.y, W - 2 * M, 18, { fond: "#f3eee6" });
      let x = M; cols.forEach(cc => { if (!cc.w) return; m.texte(cc.d ? x + cc.w - 5 : x + 5, m.y + 12, cc.l, 8, { gras: true, align: cc.d ? "d" : "g" }); x += cc.w; }); m.y += 18;
    };
    entete();
    lignes.forEach(l => {
      const des = m.couper(l.designation || "", cols[0].w - 10, 9); const det = l.detail ? m.couper(l.detail, cols[0].w - 10, 7.5) : [];
      const h = Math.max(16, des.length * 11 + det.length * 9.5 + 6);
      if (m.y + h > H - 60) { m.nouvellePage(); entete(); }
      let x = M; des.forEach((t, i) => m.texte(x + 5, m.y + 11 + i * 11, t, 9)); det.forEach((t, i) => m.texte(x + 5, m.y + 11 + des.length * 11 + i * 9.5, t, 7.5, { couleur: gris }));
      x += cols[0].w;
      const vals = prix ? [String(l.qte), l.unite || "", euros(l.pu), aRemise ? (Number(l.remise_pct) ? l.remise_pct + " %" : "") : "", euros(totalLigne(l))] : [String(l.qte), l.unite || "", ...(p.type === "bon_livraison" ? ["☐"] : [])];
      cols.slice(1).forEach((cc, i) => { if (!cc.w) return; m.texte(cc.d ? x + cc.w - 5 : x + 5, m.y + 11, (vals[i] || "").replace("☐", "[  ]"), 9, { align: cc.d ? "d" : "g" }); x += cc.w; });
      m.y += h; m.ligne(M, m.y, W - M, m.y, "#e5e5e5", 0.5);
    });
    m.y += 8;
    if (prix) {
      const t = calculerTotaux(lignes, p.remise_pct);
      const lignesT: [string, string, boolean][] = [];
      const brut = calculerTotaux(lignes, 0);
      if (p.remise_pct) { lignesT.push(["Sous-total", euros(brut.ht), false], [`Remise ${p.remise_pct} %`, "− " + euros(brut.ht - t.ht), false]); }
      if (t.tva) lignesT.push(["Total HT", euros(t.ht), false], ["TVA", euros(t.tva), false], ["Total TTC", euros(t.ttc), true]);
      else lignesT.push([p.type === "avoir" ? "Montant de l'avoir" : "Total", euros(t.ttc), true]);
      if (p.acompte && p.type !== "facture_acompte") lignesT.push(["Acompte versé", "− " + euros(p.acompte), false], ["Reste à payer", euros(t.ttc - p.acompte), true]);
      if (p.type === "devis" && c.acompte_pct) lignesT.push([`Acompte à la commande (${c.acompte_pct} %)`, euros(t.ttc * Number(c.acompte_pct) / 100), false]);
      m.place(lignesT.length * 16 + 6);
      lignesT.forEach(([l, v, g]) => { if (g) m.rect(W - M - 230, m.y, 230, 16, { fond: "#f3eee6" }); m.texte(W - M - 225, m.y + 11, l, 9, { gras: g }); m.texte(W - M - 5, m.y + 11, v, g ? 10 : 9, { gras: g, align: "d" }); m.y += 16; });
      m.y += 10;
    }
  }

  // Signatures
  const signatures: string[] = p.type === "devis" ? ["Bon pour accord — date et signature du client"] : ["bon_livraison", "bon_transport"].includes(p.type) ? ["Signature de l'expéditeur", "Reçu en bon état — date et signature"] : p.type === "bon_commande" ? ["Signature du client"] : [];
  if (signatures.length) {
    m.place(80); const w = (W - 2 * M - 20) / signatures.length;
    signatures.forEach((s, i) => { const x = M + i * (w + 20); m.rect(x, m.y, w, 64, { trait: "#cccccc", ep: 0.6 }); m.texte(x + 6, m.y + 12, s, 7.5, { couleur: gris }); });
    m.y += 76;
  }

  // Conditions, mentions légales
  const pieds: string[] = [];
  if (p.conditions) pieds.push(p.conditions);
  if (d.prix && !calculerTotaux(lignes, p.remise_pct).tva) pieds.push(em?.mention_tva || MENTION_TVA_DEFAUT);
  if (["facture", "facture_acompte"].includes(p.type)) pieds.push(em?.penalites || PENALITES_DEFAUT);
  if (["facture", "facture_acompte", "devis"].includes(p.type) && em?.iban) pieds.push(`Règlement par virement : IBAN ${em.iban}${em.bic ? " · BIC " + em.bic : ""}`);
  if (p.mentions) pieds.push(p.mentions);
  if (pieds.length) { m.y += 4; pieds.forEach(t => { m.paragraphe(M, W - 2 * M, t, 7.8, { couleur: gris }); m.y += 4; }); }
  return m;
}

function piedDePage(m: Mise, em: any) {
  const legal = [em?.raison_sociale || em?.nom_commercial, em?.forme_juridique, em?.siret ? "SIRET " + em.siret : "", em?.rcs_rm, [em?.adresse, em?.code_postal, em?.ville].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  m.pages.forEach((ops, i) => {
    ops.push({ t: "ligne", x1: M, y1: H - 38, x2: W - M, y2: H - 38, couleur: "#dddddd", ep: 0.5 });
    if (legal) ops.push({ t: "texte", x: W / 2 - mesurer(legal, 7, false) / 2, y: H - 26, s: legal, taille: 7, gras: false, couleur: "#888888" });
    const pg = `Page ${i + 1}/${m.pages.length}`; ops.push({ t: "texte", x: W - M - mesurer(pg, 7, false), y: H - 14, s: pg, taille: 7, gras: false, couleur: "#888888" });
  });
}

// ── Sortie PDF ──────────────────────────────────────────────
const SPECIAUX: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "Œ": 0x8c, "œ": 0x9c, "Š": 0x8a, "š": 0x9a, "Ÿ": 0x9f, "Ž": 0x8e, "ž": 0x9e, " ": 0x20, " ": 0x20, "−": 0x2d, "☐": 0x5b };
function chainePdf(s: string) {
  let o = "(";
  for (const ch of s) {
    let c = SPECIAUX[ch] ?? ch.charCodeAt(0);
    if (c > 255) c = 0x3f;
    if (c === 0x28 || c === 0x29 || c === 0x5c) o += "\\" + String.fromCharCode(c);
    else if (c < 32 || c > 126) o += "\\" + c.toString(8).padStart(3, "0");
    else o += String.fromCharCode(c);
  }
  return o + ")";
}

function versPdf(m: Mise): Blob {
  const objets: (string | Uint8Array)[][] = []; // chaque objet = morceaux
  const ajouter = (parts: (string | Uint8Array)[]) => { objets.push(parts); return objets.length; };
  const fonte = ajouter(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]);
  const fonteG = ajouter(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]);
  const images = new Map<any, { n: number; nom: string }>();
  const pagesIds: number[] = [];
  const idPages = ajouter([""]); // rempli à la fin
  m.pages.forEach(ops => {
    let flux = "";
    for (const o of ops) {
      if (o.t === "texte") flux += `BT /${o.gras ? "F2" : "F1"} ${o.taille} Tf ${rgb(o.couleur)} rg ${o.x.toFixed(2)} ${(H - o.y).toFixed(2)} Td ${chainePdf(o.s)} Tj ET\n`;
      else if (o.t === "rect") { if (o.fond) flux += `${rgb(o.fond)} rg ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} ${o.w.toFixed(2)} ${o.h.toFixed(2)} re f\n`; if (o.trait) flux += `${rgb(o.trait)} RG ${o.ep || 0.6} w ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} ${o.w.toFixed(2)} ${o.h.toFixed(2)} re S\n`; }
      else if (o.t === "ligne") flux += `${rgb(o.couleur)} RG ${o.ep} w ${o.x1.toFixed(2)} ${(H - o.y1).toFixed(2)} m ${o.x2.toFixed(2)} ${(H - o.y2).toFixed(2)} l S\n`;
      else if (o.t === "image") {
        if (!images.has(o.img)) { const n = ajouter([`<< /Type /XObject /Subtype /Image /Width ${o.img.lp} /Height ${o.img.hp} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${o.img.jpeg.length} >>\nstream\n`, o.img.jpeg, "\nendstream"]); images.set(o.img, { n, nom: "Im" + images.size }); }
        flux += `q ${o.w.toFixed(2)} 0 0 ${o.h.toFixed(2)} ${o.x.toFixed(2)} ${(H - o.y - o.h).toFixed(2)} cm /${images.get(o.img)!.nom} Do Q\n`;
      }
    }
    const octets = new Uint8Array([...flux].map(ch => ch.charCodeAt(0) & 255));
    const contenu = ajouter([`<< /Length ${octets.length} >>\nstream\n`, octets, "\nendstream"]);
    const xobj = [...images.values()].map(i => `/${i.nom} ${i.n} 0 R`).join(" ");
    pagesIds.push(ajouter([`<< /Type /Page /Parent ${idPages} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${contenu} 0 R /Resources << /Font << /F1 ${fonte} 0 R /F2 ${fonteG} 0 R >>${xobj ? ` /XObject << ${xobj} >>` : ""} >> >>`]));
  });
  objets[idPages - 1] = [`<< /Type /Pages /Kids [${pagesIds.map(i => i + " 0 R").join(" ")}] /Count ${pagesIds.length} >>`];
  const catalogue = ajouter([`<< /Type /Catalog /Pages ${idPages} 0 R >>`]);
  const morceaux: (string | Uint8Array)[] = ["%PDF-1.4\n%âãÏÓ\n"];
  const enc = (s: string) => new Uint8Array([...s].map(ch => ch.charCodeAt(0) & 255));
  let pos = 0; const offsets: number[] = [];
  const pousser = (x: string | Uint8Array) => { const u = typeof x === "string" ? enc(x) : x; morceaux.push(u); pos += u.length; };
  morceaux.length = 0; pousser("%PDF-1.4\n%âãÏÓ\n");
  objets.forEach((parts, i) => { offsets.push(pos); pousser(`${i + 1} 0 obj\n`); parts.forEach(pousser); pousser("\nendobj\n"); });
  const xref = pos;
  pousser(`xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(morceaux as BlobPart[], { type: "application/pdf" });
}

// ── Sortie aperçu (canvas) ──────────────────────────────────
export function dessinerPage(m: Mise, i: number, cv: HTMLCanvasElement, largeurPx: number) {
  const k = largeurPx / W, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(largeurPx * dpr); cv.height = Math.round(H * k * dpr); cv.style.width = largeurPx + "px"; cv.style.height = H * k + "px";
  const x = cv.getContext("2d")!; x.setTransform(k * dpr, 0, 0, k * dpr, 0, 0); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  for (const o of m.pages[i] || []) {
    if (o.t === "texte") { x.font = `${o.gras ? "bold " : ""}${o.taille}px Helvetica, Arial, "Liberation Sans", sans-serif`; x.fillStyle = o.couleur; x.fillText(o.s, o.x, o.y); }
    else if (o.t === "rect") { if (o.fond) { x.fillStyle = o.fond; x.fillRect(o.x, o.y, o.w, o.h); } if (o.trait) { x.strokeStyle = o.trait; x.lineWidth = o.ep || 0.6; x.strokeRect(o.x, o.y, o.w, o.h); } }
    else if (o.t === "ligne") { x.strokeStyle = o.couleur; x.lineWidth = o.ep; x.beginPath(); x.moveTo(o.x1, o.y1); x.lineTo(o.x2, o.y2); x.stroke(); }
    else if (o.t === "image") x.drawImage(o.img.source, o.x, o.y, o.w, o.h);
  }
}

export async function miseEnPage(p: any, em: any) { const m = await composerPiece(p, em); piedDePage(m, em); return m; }
export async function pdfPiece(p: any, em: any): Promise<Blob> { return versPdf(await miseEnPage(p, em)); }
export type MiseEnPage = Awaited<ReturnType<typeof miseEnPage>>;
