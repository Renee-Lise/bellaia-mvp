// ═══════════════════════════════════════════════════════════
// Bella'Event — Patrons de boîtes paramétriques (millimètres)
// • Boîte popcorn : 4 faces + rabat de collage + fond à 4 rabats
// • Gable box : 4 faces + toit (2 pans à poignée, 2 côtés pliés en V)
//   + rabat de collage + fond à 4 rabats
// Chaque patron contient : le tracé de COUPE (contour fermé), les PLIS,
// la zone de COLLAGE et des zones de décor (fond, prénom, âge, image)
// placées sur les faces visibles — jamais sur un pli ni sur la colle.
// Les dimensions sont des paramètres : elles doivent correspondre à
// la boîte voulue. Un essai d'assemblage reste à faire avant production.
// ═══════════════════════════════════════════════════════════
import type { Calque, ContenuPapeterie, Trait } from "./eventsAtelierLib";

export type ParamsBoite = { largeur: number; profondeur: number; hauteur: number; toit?: number; rabat?: number };
export type PatronGenere = { nom: string; type_support: string; largeur_mm: number; hauteur_mm: number; contenu: ContenuPapeterie };

const M = 6;            // marge autour du patron (zone non imprimable des imprimantes)
const r1 = (n: number) => Math.round(n * 10) / 10;
let n = 0; const id = (p: string) => `${p}_${++n}`;

function texte(zone: string, contenu: string, x: number, y: number, w: number, h: number, taille: number, couleur = "#2d2424", police = "Georgia"): Calque {
  return { id: id(zone.toLowerCase()), type: "texte", zone, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rotation: 0, texte: { contenu, taille: r1(taille), couleur, police, gras: true, italique: false, align: "center" } };
}

/** Décor commun d'une face avant/arrière : image, prénom, âge. */
function decorFace(x: number, y: number, w: number, h: number): Calque[] {
  const m = 4;
  return [
    { id: id("image"), type: "image", zone: "IMAGE", x: r1(x + w * 0.15), y: r1(y + m), w: r1(w * 0.7), h: r1(h * 0.42), rotation: 0, image: { url: "", ajustement: "contain" } },
    texte("PRENOM", "Prénom", x + m, y + h * 0.48, w - 2 * m, h * 0.24, Math.min(w, h) * 0.2),
    texte("AGE", "X ans", x + m, y + h * 0.73, w - 2 * m, h * 0.16, Math.min(w, h) * 0.13, "#c9a84c", "Inter"),
  ];
}

/** Fond à 4 rabats (sous la ligne y0) : rectangles sur les grandes faces, trapèzes sur les côtés. */
function rabatsFond(xs: number[], W: number, D: number, y0: number) {
  const hL = D / 2, hC = Math.min(W, D) / 2 * 0.9;
  const pts: [number, number][] = []; // parcours de droite à gauche
  const faces = [[xs[3], D, "c"], [xs[2], W, "l"], [xs[1], D, "c"], [xs[0], W, "l"]] as const;
  for (const [x, w, t] of faces) {
    const h = t === "l" ? hL : hC, ins = t === "l" ? 1.5 : Math.min(h, w * 0.3);
    pts.push([x + w, y0], [x + w - ins, y0 + h], [x + ins, y0 + h], [x, y0]);
  }
  return { pts, hauteur: Math.max(hL, hC) };
}

export function patronPopcorn(p: ParamsBoite): PatronGenere {
  const W = p.largeur, D = p.profondeur, H = p.hauteur, g = p.rabat ?? 12;
  const x0 = M, y0 = M;
  const xs = [x0, x0 + W, x0 + W + D, x0 + 2 * W + D], xg = x0 + 2 * W + 2 * D;
  const fond = rabatsFond(xs, W, D, y0 + H);
  const coupe: [number, number][] = [[x0, y0], [xg, y0], [xg + g, y0 + 6], [xg + g, y0 + H - 6], [xg, y0 + H], ...fond.pts, [x0, y0]];
  const traits: Trait[] = [
    { type: "coupe", points: coupe, ferme: true },
    ...[xs[1], xs[2], xs[3], xg].map(x => ({ type: "pli" as const, points: [[x, y0], [x, y0 + H]] as [number, number][] })),
    { type: "pli", points: [[x0, y0 + H], [xg, y0 + H]] },
    { type: "collage", points: [[xg, y0], [xg + g, y0 + 6], [xg + g, y0 + H - 6], [xg, y0 + H]], ferme: true },
  ];
  const calques: Calque[] = [
    { id: id("fond"), type: "forme", zone: "FOND_COULEUR", x: x0, y: y0, w: r1(2 * W + 2 * D), h: H, rotation: 0, forme: { forme: "rect", remplissage: "#fdf6f0", contour: "", epaisseur: 0 } },
    ...decorFace(xs[0], y0, W, H), ...decorFace(xs[2], y0, W, H),
    texte("TITRE", "POP\nCORN", xs[1] + 3, y0 + H * 0.3, D - 6, H * 0.4, D * 0.22, "#b5838d"),
    texte("TITRE", "POP\nCORN", xs[3] + 3, y0 + H * 0.3, D - 6, H * 0.4, D * 0.22, "#b5838d"),
  ];
  return {
    nom: `Patron — Boîte popcorn ${W}×${D}×${H} mm`, type_support: "patron_popcorn",
    largeur_mm: r1(xg + g + M), hauteur_mm: r1(y0 + H + fond.hauteur + M),
    contenu: { fond: "#ffffff", calques, reperes: { zone_sure_mm: 3, pliage: [], traits }, parametres: { modele: "popcorn", ...p } } as any,
  };
}

export function patronGable(p: ParamsBoite): PatronGenere {
  const W = p.largeur, D = p.profondeur, H = p.hauteur, T = p.toit ?? Math.round(D * 0.9), g = p.rabat ?? 12;
  const x0 = M, yT = M, y0 = M + T; // y0 = haut du corps
  const xs = [x0, x0 + W, x0 + W + D, x0 + 2 * W + D], xg = x0 + 2 * W + 2 * D;
  const fond = rabatsFond(xs, W, D, y0 + H);
  const ch = Math.min(8, W * 0.12); // chanfrein des pans du toit
  // Contour du toit (de gauche à droite) : pans à poignée sur les grandes faces, côtés droits
  // Les côtés du toit restent attachés aux pans (pli commun) : seul un
  // petit cran sépare leurs bords supérieurs.
  const toit: [number, number][] = [[x0, y0]];
  [[xs[0], W, "pan"], [xs[1], D, "cote"], [xs[2], W, "pan"], [xs[3], D, "cote"]].forEach(([x, w, t]: any) => {
    if (t === "pan") toit.push([x, yT + ch], [x + ch, yT], [x + w - ch, yT], [x + w, yT + ch]);
    else toit.push([x, yT + 2], [x + w, yT + 2]);
  });
  const coupe: [number, number][] = [...toit, [xg, y0], [xg + g, y0 + 6], [xg + g, y0 + H - 6], [xg, y0 + H], ...fond.pts, [x0, y0]];
  const poignee = (x: number): Trait => {
    const cx = x + W / 2, cy = yT + T * 0.32, rx = W * 0.22, ry = Math.min(T * 0.09, 6);
    return { type: "coupe", ferme: true, points: Array.from({ length: 24 }, (_, i) => [r1(cx + rx * Math.cos((i / 24) * 2 * Math.PI)), r1(cy + ry * Math.sin((i / 24) * 2 * Math.PI))] as [number, number]) };
  };
  const plisCote = (x: number): Trait[] => {
    const pointe: [number, number] = [x + D / 2, y0 - Math.min(D / 2, T - 4)];
    return [{ type: "pli", points: [[x, y0], pointe, [x + D, y0]] }, { type: "pli", points: [pointe, [x + D / 2, yT + 2]] }];
  };
  const traits: Trait[] = [
    { type: "coupe", points: coupe, ferme: true },
    poignee(xs[0]), poignee(xs[2]),
    ...[xs[1], xs[2], xs[3], xg].map(x => ({ type: "pli" as const, points: [[x, y0], [x, y0 + H]] as [number, number][] })),
    ...[xs[1], xs[2], xs[3]].map(x => ({ type: "pli" as const, points: [[x, yT + 2], [x, y0]] as [number, number][] })),
    { type: "pli", points: [[x0, y0], [xg, y0]] }, { type: "pli", points: [[x0, y0 + H], [xg, y0 + H]] },
    ...plisCote(xs[1]), ...plisCote(xs[3]),
    { type: "collage", points: [[xg, y0], [xg + g, y0 + 6], [xg + g, y0 + H - 6], [xg, y0 + H]], ferme: true },
  ];
  const calques: Calque[] = [
    { id: id("fond"), type: "forme", zone: "FOND_COULEUR", x: x0, y: yT, w: r1(2 * W + 2 * D), h: r1(T + H), rotation: 0, forme: { forme: "rect", remplissage: "#fdf6f0", contour: "", epaisseur: 0 } },
    ...decorFace(xs[0], y0, W, H), ...decorFace(xs[2], y0, W, H),
  ];
  return {
    nom: `Patron — Gable box ${W}×${D}×${H} mm (toit ${T} mm)`, type_support: "patron_gable",
    largeur_mm: r1(xg + g + M), hauteur_mm: r1(y0 + H + fond.hauteur + M),
    contenu: { fond: "#ffffff", calques, reperes: { zone_sure_mm: 3, pliage: [], traits }, parametres: { modele: "gable", ...p, toit: T } } as any,
  };
}
