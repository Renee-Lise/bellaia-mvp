// ═══════════════════════════════════════════════════════════
// Bella'Event — patrons ORIGINAUX paramétriques (24/11/2026), en millimètres.
// Formes géométriques génériques dessinées pour Bellaïa (aucune reprise d'un modèle acheté) :
// sac cadeau, boîte cube à rabats, étiquette cadeau, étiquette rectangulaire, étiquette de tube
// (+ couvercle), habillage de canette, fanion de banderole.
// Chaque patron contient : COUPE (contour fermé), PLIS, zone de COLLAGE, zones de décor nommées
// (IMAGE, PRENOM, AGE, TITRE) placées sur les faces visibles, dans la zone de sécurité.
// Un essai d'assemblage reste indispensable avant toute production.
// ═══════════════════════════════════════════════════════════
import type { Calque, ContenuPapeterie, Trait } from "./eventsAtelierLib";
import type { PatronGenere } from "./patronsBoites";

const M = 6;                                  // marge autour du patron
const r1 = (n: number) => Math.round(n * 10) / 10;
let n = 0; const id = (p: string) => `${p}_o${++n}`;
type P = [number, number];

function texte(zone: string, contenu: string, x: number, y: number, w: number, h: number, taille: number, couleur = "#2d2424", police = "Georgia"): Calque {
  return { id: id(zone.toLowerCase()), type: "texte", zone, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rotation: 0, texte: { contenu, taille: r1(taille), couleur, police, gras: true, italique: false, align: "center", ajuster: true } };
}
/** Décor d'une face (image + prénom + âge), en retrait de `s` mm (zone de sécurité). */
function decor(x: number, y: number, w: number, h: number, s = 4): Calque[] {
  const W = w - 2 * s, H = h - 2 * s; if (W <= 0 || H <= 0) return [];
  return [
    { id: id("image"), type: "image", zone: "IMAGE", x: r1(x + s + W * 0.15), y: r1(y + s), w: r1(W * 0.7), h: r1(H * 0.45), rotation: 0, image: { url: "", ajustement: "contain" } },
    texte("PRENOM", "Prénom", x + s, y + s + H * 0.5, W, H * 0.24, Math.min(W, H) * 0.18),
    texte("AGE", "X ans", x + s, y + s + H * 0.76, W, H * 0.16, Math.min(W, H) * 0.11, "#c9a84c", "Inter"),
  ];
}
const fondCouleur = (x: number, y: number, w: number, h: number, couleur = "#fdf6f0"): Calque => ({ id: id("fond"), type: "forme", zone: "FOND_COULEUR", x: r1(x), y: r1(y), w: r1(w), h: r1(h), rotation: 0, forme: { forme: "rect", remplissage: couleur, contour: "", epaisseur: 0 } });
const pli = (a: P, b: P): Trait => ({ type: "pli", points: [a, b] });
const cercle = (cx: number, cy: number, r: number, k = 36): P[] => Array.from({ length: k }, (_, i) => [r1(cx + r * Math.cos((2 * Math.PI * i) / k)), r1(cy + r * Math.sin((2 * Math.PI * i) / k))] as P);
const arrondi = (x: number, y: number, w: number, h: number, r: number): P[] => {
  r = Math.min(r, w / 2, h / 2); const out: P[] = []; const coin = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= 6; i++) { const a = a0 + (Math.PI / 2) * (i / 6); out.push([r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a))]); } };
  coin(x + w - r, y + r, -Math.PI / 2); coin(x + w - r, y + h - r, 0); coin(x + r, y + h - r, Math.PI / 2); coin(x + r, y + r, Math.PI); return out;
};
const contenu = (calques: Calque[], traits: Trait[], pliage: { orientation: "h" | "v"; position_mm: number }[] = [], parametres: any = {}): ContenuPapeterie =>
  ({ fond: "#ffffff", remplissage: false, calques, reperes: { zone_sure_mm: 3, fond_perdu_mm: 0, pliage, traits }, parametres } as ContenuPapeterie);
const patron = (nom: string, type: string, L: number, H: number, c: ContenuPapeterie): PatronGenere => ({ nom, type_support: type, largeur_mm: r1(L), hauteur_mm: r1(H), contenu: c });

/** Sac cadeau : face W, soufflet D, hauteur H, revers haut T, fond B (≈ 0,6·D), patte de colle g. */
export function patronSacCadeau(p: { largeur: number; soufflet: number; hauteur: number; revers?: number; colle?: number }): PatronGenere {
  const W = p.largeur, D = p.soufflet, H = p.hauteur, T = p.revers ?? 30, g = p.colle ?? 12, B = r1(D * 0.6 + 5);
  const x0 = M, y0 = M, xs = [x0, x0 + W, x0 + W + D, x0 + 2 * W + D, x0 + 2 * W + 2 * D];
  const yH = y0 + T, yB = yH + H, yF = yB + B;
  const coupe: P[] = [[x0, y0], [xs[4], y0], [xs[4] + g, y0 + 6], [xs[4] + g, yF - 6], [xs[4], yF], [x0, yF]];
  const traits: Trait[] = [{ type: "coupe", points: coupe, ferme: true },
    ...xs.slice(1).map(x => pli([x, y0], [x, yF])), pli([x0, yH], [xs[4], yH]), pli([x0, yB], [xs[4], yB]),
    pli([xs[1] + D / 2, yH], [xs[1] + D / 2, yB]), pli([xs[3] + D / 2, yH], [xs[3] + D / 2, yB]),   // plis centraux des soufflets
    pli([xs[1], yB], [xs[1] + D / 2, yB + D / 2]), pli([xs[2], yB], [xs[1] + D / 2, yB + D / 2]), pli([xs[3], yB], [xs[3] + D / 2, yB + D / 2]), pli([xs[4], yB], [xs[3] + D / 2, yB + D / 2]),
    { type: "collage", points: [[xs[4], y0], [xs[4] + g, y0 + 6], [xs[4] + g, yF - 6], [xs[4], yF]], ferme: true }];
  const calques = [fondCouleur(x0, y0, 2 * W + 2 * D, T + H + B), ...decor(xs[0], yH, W, H), ...decor(xs[2], yH, W, H)];
  return patron(`Sac cadeau ${W}×${D}×${H} mm`, "sac_cadeau", xs[4] + g + M, yF + M, contenu(calques, traits, [], { ...p, original: true }));
}

/** Boîte cube (côté c) en croix : couvercle et fond à languette, rabats anti-poussière, patte de colle. */
export function patronBoiteCube(p: { cote: number; colle?: number }): PatronGenere {
  const c = p.cote, g = p.colle ?? 12, t = r1(c * 0.3), d = r1(c * 0.4), ins = Math.min(c * 0.18, d), i2 = Math.min(6, c * 0.1);
  const x0 = M, yT = M, yA = yT + t, yB = yA + c, yC = yB + c, yD = yC + c, yE = yD + t, xg = x0 + 4 * c;
  const X = [x0, x0 + c, x0 + 2 * c, x0 + 3 * c];
  const coupe: P[] = [
    [X[0], yB], [X[0] + ins, yB - d], [X[1] - ins, yB - d], [X[1], yB],
    [X[1], yA], [X[1] + i2, yT], [X[2] - i2, yT], [X[2], yA], [X[2], yB],
    [X[2] + ins, yB - d], [X[3] - ins, yB - d], [X[3], yB], [xg, yB],
    [xg + g, yB + g * 0.6], [xg + g, yC - g * 0.6], [xg, yC], [X[3], yC],
    [X[3] - ins, yC + d], [X[2] + ins, yC + d], [X[2], yC],
    [X[2], yD], [X[2] - i2, yE], [X[1] + i2, yE], [X[1], yD], [X[1], yC],
    [X[1] - ins, yC + d], [X[0] + ins, yC + d], [X[0], yC]].map(([x, y]) => [r1(x), r1(y)] as P);
  const traits: Trait[] = [{ type: "coupe", points: coupe, ferme: true },
    ...[X[1], X[2], X[3], xg].map(x => pli([x, yB], [x, yC])), pli([X[0], yB], [xg, yB]), pli([X[0], yC], [xg, yC]),
    pli([X[1], yA], [X[2], yA]), pli([X[1], yD], [X[2], yD]),
    { type: "collage", points: [[xg, yB], [xg + g, yB + g * 0.6], [xg + g, yC - g * 0.6], [xg, yC]], ferme: true }];
  const calques = [fondCouleur(X[0], yB, 4 * c, c), fondCouleur(X[1], yA, c, c), ...decor(X[1], yB, c, c), ...decor(X[3], yB, c, c), texte("TITRE", "Merci !", X[1] + 4, yA + c * 0.35, c - 8, c * 0.3, c * 0.14)];
  return patron(`Boîte cube ${c} mm`, "boite_cube", xg + g + M, yE + M, contenu(calques, traits, [], { ...p, original: true }));
}

/** Étiquette cadeau : coins supérieurs coupés et trou de passage (Ø 5 mm). */
export function patronEtiquetteCadeau(p: { largeur: number; hauteur: number }): PatronGenere {
  const W = p.largeur, H = p.hauteur, k = r1(Math.min(W, H) * 0.22), x0 = M, y0 = M;
  const coupe: P[] = [[x0 + k, y0], [x0 + W - k, y0], [x0 + W, y0 + k], [x0 + W, y0 + H], [x0, y0 + H], [x0, y0 + k]];
  const traits: Trait[] = [{ type: "coupe", points: coupe, ferme: true }, { type: "coupe", points: cercle(x0 + W / 2, y0 + k * 0.75, 2.5), ferme: true }];
  const calques = [fondCouleur(x0, y0, W, H), ...decor(x0, y0 + k * 1.3, W, H - k * 1.3)];
  return patron(`Étiquette cadeau ${W}×${H} mm`, "etiquette_cadeau", W + 2 * M, H + 2 * M, contenu(calques, traits, [], { ...p, original: true }));
}

/** Étiquette rectangulaire à coins arrondis (bocaux, sachets, bouteilles). */
export function patronEtiquette(p: { largeur: number; hauteur: number; rayon?: number }): PatronGenere {
  const W = p.largeur, H = p.hauteur, x0 = M, y0 = M;
  const traits: Trait[] = [{ type: "coupe", points: arrondi(x0, y0, W, H, p.rayon ?? 4), ferme: true }];
  const calques = [fondCouleur(x0, y0, W, H), texte("TITRE", "Titre", x0 + 3, y0 + H * 0.12, W - 6, H * 0.3, Math.min(W, H) * 0.2), texte("PRENOM", "Prénom", x0 + 3, y0 + H * 0.48, W - 6, H * 0.25, Math.min(W, H) * 0.16), texte("AGE", "X ans", x0 + 3, y0 + H * 0.74, W - 6, H * 0.16, Math.min(W, H) * 0.1, "#c9a84c", "Inter")];
  return patron(`Étiquette ${W}×${H} mm`, "etiquette", W + 2 * M, H + 2 * M, contenu(calques, traits, [], { ...p, original: true }));
}

/** Habillage de tube cylindrique (chips, bonbons) : périmètre π·d + recouvrement, + couvercle rond facultatif. */
export function patronTube(p: { diametre: number; hauteur: number; recouvrement?: number; couvercle?: boolean }): PatronGenere {
  const d = p.diametre, H = p.hauteur, o = p.recouvrement ?? 8, W = r1(Math.PI * d + o), x0 = M, y0 = M;
  const traits: Trait[] = [{ type: "coupe", points: [[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]], ferme: true },
    { type: "collage", points: [[x0 + W - o, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0 + W - o, y0 + H]], ferme: true }];
  const face = (W - o) / 2;
  const calques = [fondCouleur(x0, y0, W, H), ...decor(x0 + face / 2, y0, face, H)];
  let Ht = H + 2 * M;
  if (p.couvercle) { const r = d / 2 + 2; const cy = y0 + H + 8 + r; traits.push({ type: "coupe", points: cercle(x0 + r, cy, r, 48), ferme: true }); calques.push(texte("PRENOM", "Prénom", x0 + r * 0.3, cy - r * 0.3, r * 1.4, r * 0.6, r * 0.28)); Ht = H + 8 + 2 * r + 2 * M; }
  return patron(`Tube Ø${d}×${H} mm`, "etiquette_tube", W + 2 * M, Ht, contenu(calques, traits, [], { ...p, perimetre_mm: r1(Math.PI * d), original: true }));
}

/** Habillage de canette 33 cl (Ø 66 mm par défaut). */
export const patronCanette = (p: { diametre?: number; hauteur?: number } = {}) => { const g = patronTube({ diametre: p.diametre ?? 66, hauteur: p.hauteur ?? 90, recouvrement: 6 }); return { ...g, nom: `Habillage canette Ø${p.diametre ?? 66} mm`, type_support: "canette" }; };

/** Fanion de banderole : triangle + languette repliée pour passer le cordon. */
export function patronFanion(p: { largeur: number; hauteur: number; languette?: number }): PatronGenere {
  const W = p.largeur, H = p.hauteur, t = p.languette ?? 15, x0 = M, y0 = M, yL = y0 + t;
  const traits: Trait[] = [{ type: "coupe", points: [[x0, y0], [x0 + W, y0], [x0 + W, yL], [x0 + W / 2, yL + H], [x0, yL]], ferme: true }, pli([x0, yL], [x0 + W, yL])];
  const calques = [fondCouleur(x0, yL, W, H * 0.55), texte("PRENOM", "A", x0 + W * 0.2, yL + H * 0.12, W * 0.6, H * 0.4, Math.min(W, H) * 0.35)];
  return patron(`Fanion ${W}×${H} mm`, "fanion", W + 2 * M, t + H + 2 * M, contenu(calques, traits, [{ orientation: "h", position_mm: yL }], { ...p, original: true }));
}

export const PATRONS_ORIGINAUX = [
  { id: "sac", libelle: "👜 Sac cadeau", champs: [["largeur", "Largeur face", 100], ["soufflet", "Soufflet", 60], ["hauteur", "Hauteur", 140]], creer: (v: any) => patronSacCadeau(v) },
  { id: "cube", libelle: "🎁 Boîte cube", champs: [["cote", "Côté", 70]], creer: (v: any) => patronBoiteCube(v) },
  { id: "tag", libelle: "🏷️ Étiquette cadeau", champs: [["largeur", "Largeur", 50], ["hauteur", "Hauteur", 80]], creer: (v: any) => patronEtiquetteCadeau(v) },
  { id: "etiquette", libelle: "🔖 Étiquette", champs: [["largeur", "Largeur", 70], ["hauteur", "Hauteur", 45]], creer: (v: any) => patronEtiquette(v) },
  { id: "tube", libelle: "🥫 Tube (chips) + couvercle", champs: [["diametre", "Diamètre", 75], ["hauteur", "Hauteur", 230]], creer: (v: any) => patronTube({ ...v, couvercle: true }) },
  { id: "canette", libelle: "🥤 Canette 33 cl", champs: [["diametre", "Diamètre", 66], ["hauteur", "Hauteur", 90]], creer: (v: any) => patronCanette(v) },
  { id: "fanion", libelle: "🚩 Fanion de banderole", champs: [["largeur", "Largeur", 140], ["hauteur", "Hauteur", 180]], creer: (v: any) => patronFanion(v) },
] as const;
