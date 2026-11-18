// ═══════════════════════════════════════════════════════════
// Bella'Event — Composition d'un kit coordonné (« Créer mon kit »)
// Un même univers (couleurs, police, image de fond, personnage) est
// appliqué à chaque support, mais RECOMPOSÉ selon sa forme :
//  • étiquettes / faces : fond, cadre, textes stylés, personnage préservé
//  • banderole : un fanion par lettre (ou par mot), image masquée en
//    triangle, zone de fixation repérée
//  • cake topper / cupcake topper : silhouette (personnage + prénom à
//    contour épais + badge d'âge), double face pour le cupcake
// Les textes ne sont jamais coupés : le moteur de rendu les réduit ou
// les passe à la ligne et l'éditeur signale ce qui devient illisible.
// ═══════════════════════════════════════════════════════════
import type { Calque, ContenuPapeterie } from "./eventsAtelierLib";

export type BriefKit = {
  client: string; prenom?: string; age?: string; date?: string; lieu?: string; rsvp?: string; titre?: string; message?: string; theme?: string;
  couleurs: { fond: string; principale: string; accent: string; texte: string };
  police: string; imageFond?: string | null; personnage?: string | null;
  /** Décor généré quand aucune image de fond n'est fournie (thème sans image) */ motif?: "confettis" | "etoiles" | "vagues" | "pois" | "coeurs" | "triangles" | null;
  banderoleTexte?: string; banderoleMode?: "lettres" | "mots";
};
export type Piece = { nom: string; largeur_mm: number; hauteur_mm: number; contenu: ContenuPapeterie };
type Source = { nom: string; type_support: string | null; largeur_mm: number; hauteur_mm: number; contenu: ContenuPapeterie };

const id = () => Math.random().toString(36).slice(2, 10);
const r1 = (n: number) => Math.round(n * 10) / 10;
const copie = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const nomCourt = (n: string) => n.replace(/^BELLA_EVENS \d+ — /, "");

function texte(zone: string | null, contenu: string, x: number, y: number, w: number, h: number, taille: number, couleur: string, police: string, extra: Partial<NonNullable<Calque["texte"]>> = {}): Calque {
  return { id: id(), type: "texte", zone, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rotation: 0, texte: { contenu, taille: r1(taille), couleur, police, gras: true, italique: false, align: "center", ...extra } };
}

/** Décor généré (sans image) : formes et symboles aux couleurs du thème,
 *  répartis sur les bords pour laisser le centre aux textes. Pseudo-aléatoire
 *  stable (même support = même décor). */
export function motifCalques(L: number, H: number, b: BriefKit, graine = 1): Calque[] {
  if (!b.motif) return [];
  let x = graine * 9301 + 49297; const alea = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const couleurs = [b.couleurs.principale, b.couleurs.accent, b.couleurs.principale + "99", b.couleurs.accent + "aa"];
  const n = Math.max(8, Math.min(42, Math.round((L * H) / 700)));
  const out: Calque[] = [];
  const glyphe = ({ etoiles: "★", coeurs: "♥", vagues: "〰" } as any)[b.motif];
  for (let i = 0, essais = 0; i < n && essais < n * 12; essais++) {
    const t = Math.max(2.5, Math.min(L, H) * (0.05 + alea() * 0.07));
    const px = alea() * (L - t), py = alea() * (H - t);
    const cx = px + t / 2, cy = py + t / 2;
    if (cx > L * 0.15 && cx < L * 0.85 && cy > H * 0.18 && cy < H * 0.86) continue; // centre réservé aux textes
    const c = couleurs[i % couleurs.length]; i++;
    if (glyphe) out.push({ id: id(), type: "texte", zone: "DECOR", x: r1(px), y: r1(py), w: r1(t * 1.4), h: r1(t * 1.4), rotation: Math.round(alea() * 40 - 20), texte: { contenu: glyphe, taille: r1(t), couleur: c, police: "Georgia", gras: false, align: "center", ajuster: false } });
    else out.push({ id: id(), type: "forme", zone: "DECOR", x: r1(px), y: r1(py), w: r1(t), h: r1(b.motif === "confettis" ? t * 0.45 : t), rotation: Math.round(alea() * 360), opacite: 0.9,
      forme: { forme: b.motif === "triangles" ? "triangle" : b.motif === "confettis" ? "rect" : "ellipse", remplissage: c, contour: "", epaisseur: 0, rayon: 0.6 } });
  }
  return out;
}

/** Application de l'univers sur un support existant (étiquettes, faces, cartes…). */
function habiller(src: Source, b: BriefKit): ContenuPapeterie {
  const d = copie(src.contenu);
  const L = Number(src.largeur_mm), H = Number(src.hauteur_mm);
  const val: Record<string, string | undefined> = { PRENOM: b.prenom, AGE: b.age ? `${b.age} ans` : undefined, BADGE: b.age, DATE: b.date, LIEU: b.lieu, RSVP: b.rsvp, TITRE: b.titre, MESSAGE: b.message };
  d.fond = b.couleurs.fond;
  const cadre = d.calques.find(k => k.id === "fond_cadre" && k.type === "forme");
  if (cadre?.forme) {
    cadre.forme.remplissage = b.imageFond ? "#ffffff00" : b.couleurs.fond;
    cadre.forme.contour = b.couleurs.accent; cadre.forme.epaisseur = 0.8;
  }
  d.calques.forEach(k => {
    if (k.type === "texte" && k.texte) {
      if (k.zone && val[k.zone]) k.texte.contenu = val[k.zone]!;
      if (k.zone === "PRENOM") { k.texte.police = b.police; k.texte.couleur = b.couleurs.texte; }
      if (k.zone === "TITRE") { k.texte.police = b.police; k.texte.couleur = b.couleurs.principale; }
      if (k.zone === "AGE") k.texte.couleur = b.couleurs.accent;
      if (["DATE", "LIEU", "RSVP", "MESSAGE"].includes(k.zone || "")) k.texte.couleur = b.couleurs.texte;
      // Texte posé sur une image : contour de la couleur du fond pour rester lisible
      if ((b.imageFond || b.motif) && ["PRENOM", "TITRE", "AGE"].includes(k.zone || "")) { k.texte.contour = b.couleurs.fond; k.texte.contourEpaisseur = r1(Math.max(0.4, k.texte.taille * 0.08)); }
    }
    if (k.type === "forme" && k.id === "badge_rond" && k.forme) k.forme.remplissage = b.couleurs.principale;
    if (k.type === "image" && k.zone === "IMAGE" && b.personnage) k.image = { url: b.personnage, ajustement: "contain" }; // personnage entier, proportions préservées
  });
  if (b.imageFond || b.motif) {
    const masque = cadre?.forme?.forme === "ellipse" ? "ellipse" : "rect";
    // Cartouche clair derrière le bloc de textes : lisibilité des petits
    // textes (date, RSVP, message) sur un fond chargé.
    const textes = d.calques.filter(k => k.type === "texte" && k.zone && k.zone !== "BADGE");
    if (textes.length) {
      const pad = 2.5;
      const x1 = Math.max(4, Math.min(...textes.map(k => k.x)) - pad), y1 = Math.max(4, Math.min(...textes.map(k => k.y)) - pad);
      const x2 = Math.min(L - 4, Math.max(...textes.map(k => k.x + k.w)) + pad), y2 = Math.min(H - 4, Math.max(...textes.map(k => k.y + k.h)) + pad);
      const i = d.calques.findIndex(k => k.type === "texte");
      d.calques.splice(i, 0, { id: id(), type: "forme", zone: "CARTOUCHE", x: r1(x1), y: r1(y1), w: r1(x2 - x1), h: r1(y2 - y1), rotation: 0, opacite: 0.9,
        forme: { forme: masque === "ellipse" ? "ellipse" : "rect", remplissage: b.couleurs.fond, contour: b.couleurs.accent, epaisseur: 0.5, rayon: 4 } });
    }
    if (b.imageFond) d.calques.unshift({ id: id(), type: "image", zone: "FOND", x: 0, y: 0, w: L, h: H, rotation: 0, image: { url: b.imageFond, ajustement: "cover", masque } });
    else { const i = d.calques.findIndex(k => k.zone === "CARTOUCHE"); d.calques.splice(i < 0 ? 1 : i, 0, ...motifCalques(L, H, b, Math.round(L * 7 + H))); }
  }
  return d;
}

/** Banderole : un fanion par lettre (ou par mot). */
function fanions(src: Source, b: BriefKit): Piece[] {
  const L = Number(src.largeur_mm), H = Number(src.hauteur_mm);
  const brut = (b.banderoleTexte || b.prenom || "Joyeux anniversaire").trim();
  const elements = b.banderoleMode === "mots" ? brut.split(/\s+/) : Array.from(brut).map(ch => (ch === " " ? "♥" : ch.toUpperCase()));
  const fixation = 14; // zone haute repliée pour la ficelle
  return elements.map((el, i) => {
    const calques: Calque[] = [];
    if (b.imageFond) calques.push({ id: id(), type: "image", zone: "FOND", x: 0, y: 0, w: L, h: H, rotation: 0, image: { url: b.imageFond, ajustement: "cover", masque: "triangle_bas" } });
    calques.push({ id: id(), type: "forme", zone: null, x: 0, y: 0, w: L, h: H, rotation: 0, forme: { forme: "triangle_bas", remplissage: b.imageFond ? "#ffffff00" : b.couleurs.principale, contour: b.couleurs.accent, epaisseur: 1 } });
    if (!b.imageFond && b.motif) calques.push(...motifCalques(L, H * 0.5, { ...b, couleurs: { ...b.couleurs, principale: b.couleurs.accent, accent: b.couleurs.fond } }, i + 3).filter(k => k.y + k.h / 2 < H * 0.35 && Math.abs(k.x + k.w / 2 - L / 2) < L * (1 - (k.y + k.h) / H) / 2));
    // Texte dans la partie large du triangle, sous la zone de fixation
    const haut = fixation + 4, hZone = H * 0.42;
    const largeurUtile = L * (1 - (haut + hZone / 2) / H) * 0.9;
    calques.push(texte("BANDEROLE", el, (L - largeurUtile) / 2, haut, largeurUtile, hZone, hZone * 0.85, b.couleurs.texte, b.police, { contour: b.couleurs.fond, contourEpaisseur: r1(Math.max(0.8, hZone * 0.05)) }));
    return {
      nom: `Fanion ${String(i + 1).padStart(2, "0")}/${String(elements.length).padStart(2, "0")} « ${el} » — ${b.client}`,
      largeur_mm: L, hauteur_mm: H,
      contenu: { fond: "#ffffff", calques, reperes: { zone_sure_mm: 3, pliage: [{ orientation: "h", position_mm: fixation }] } },
    };
  });
}

/** Topper : silhouette (personnage + prénom à contour + badge âge). */
function topper(L: number, H: number, b: BriefKit, x0 = 0): Calque[] {
  const c: Calque[] = [];
  const marge = 3;
  let y = marge;
  if (b.personnage) { const h = H * 0.42; c.push({ id: id(), type: "image", zone: "IMAGE", x: r1(x0 + L * 0.22), y: r1(y), w: r1(L * 0.56), h: r1(h), rotation: 0, image: { url: b.personnage, ajustement: "contain" } }); y += h; }
  const hNom = (H - y - marge) * (b.age ? 0.55 : 0.9);
  c.push(texte("PRENOM", b.prenom || "Prénom", x0 + marge, y, L - 2 * marge, hNom, hNom * 0.8, b.couleurs.principale, b.police, { contour: "#ffffff", contourEpaisseur: r1(Math.max(1, hNom * 0.09)) }));
  y += hNom;
  if (b.age) {
    const dBadge = Math.min(H - y - marge, L * 0.4);
    c.push({ id: id(), type: "forme", zone: null, x: r1(x0 + (L - dBadge) / 2), y: r1(y), w: r1(dBadge), h: r1(dBadge), rotation: 0, forme: { forme: "ellipse", remplissage: b.couleurs.accent, contour: "#ffffff", epaisseur: r1(Math.max(0.8, dBadge * 0.05)) } });
    c.push(texte("AGE", `${b.age}`, x0 + (L - dBadge) / 2, y + dBadge * 0.12, dBadge, dBadge * 0.62, dBadge * 0.5, "#ffffff", b.police));
    c.push(texte("AGE", "ans", x0 + (L - dBadge) / 2, y + dBadge * 0.66, dBadge, dBadge * 0.22, dBadge * 0.18, "#ffffff", "Inter"));
  }
  return c;
}

export function composerPieces(src: Source, b: BriefKit): Piece[] {
  const L = Number(src.largeur_mm), H = Number(src.hauteur_mm);
  const base = { largeur_mm: L, hauteur_mm: H };
  const nom = `${nomCourt(src.nom)} — ${b.client}`;
  switch (src.type_support) {
    case "banderole": return fanions(src, b);
    case "cake_topper":
      return [{ ...base, nom, contenu: { fond: "#ffffff", calques: topper(L, H, b), reperes: { zone_sure_mm: 3, pliage: [] } } }];
    case "cupcake_topper": {
      // Double face plié au milieu : la même composition sur chaque face
      const demi = L / 2;
      return [{ ...base, nom, contenu: { fond: "#ffffff", calques: [...topper(demi, H, b, 0), ...topper(demi, H, b, demi)], reperes: { zone_sure_mm: 3, pliage: [{ orientation: "v", position_mm: demi }] } } }];
    }
    case "popcorn":
      return [{ ...base, nom: `${nomCourt(src.nom)} (face décorative) — ${b.client}`, contenu: habiller(src, b) }];
    default:
      return [{ ...base, nom, contenu: habiller(src, b) }];
  }
}
