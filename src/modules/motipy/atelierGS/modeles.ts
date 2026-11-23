// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi — Atelier GS : modèles paramétrables de fiches A4
// Chaque générateur produit, à partir des MÊMES données :
//   • la fiche élève (scène en millimètres sur A4 portrait),
//   • le corrigé (ou null si « corrigé non nécessaire »),
//   • des vérifications automatiques (lettres répétées, quantités, suites…).
// Aucun accès réseau ni base ici : fonctions pures, testables (tests/unit/t_atelier_gs.js).
// ═══════════════════════════════════════════════════════════
import { texteEnTraits, largeurTexte, disponible } from "./fonteTrait";

export const A4 = { l: 210, h: 297, marge: 12 };
export type Prim =
  | { k: "trait"; d: string; x: number; y: number; e: number; pointille?: boolean; gris?: boolean; ep?: number }
  | { k: "chemin"; d: string; pointille?: boolean; gris?: boolean; ep?: number; rempli?: "noir" | "gris" }
  | { k: "cercle"; cx: number; cy: number; r: number; pointille?: boolean; rempli?: "noir" | "gris"; ep?: number; gris?: boolean }
  | { k: "rect"; x: number; y: number; w: number; h: number; ry?: number; pointille?: boolean; ep?: number; gris?: boolean }
  | { k: "texte"; x: number; y: number; t: string; taille: number; police: "script" | "titre"; ancre?: "start" | "middle" | "end"; gris?: boolean; gras?: boolean };
export type Page = { prims: Prim[] };

export type Modele = "graphisme" | "suites" | "lettres" | "mots" | "denombrement" | "numeration";
export type Commun = { modele: Modele; titre: string; consigne: string; difficulte: 1 | 2 | 3; niveau: "GS"; prenom?: string; avecDate: boolean; avecLogo: boolean; graine: number };
export type Params = Commun & Record<string, any>;
export type Resultat = { eleve: Page; corrige: Page | null; verifications: string[]; erreurs: string[] };

export const MODELES: { id: Modele; nom: string; competence: string; domaine: string }[] = [
  { id: "graphisme", nom: "Graphisme en pointillés", competence: "Repasser sur des motifs ou un dessin en pointillés", domaine: "Graphisme" },
  { id: "suites", nom: "Suites de formes", competence: "Prolonger une suite logique", domaine: "Logique" },
  { id: "lettres", nom: "Capitales et minuscules", competence: "Associer capitales et minuscules script, reconnaître une lettre", domaine: "Langage écrit" },
  { id: "mots", nom: "Prénom et mots", competence: "Repasser, recopier, retrouver ou remettre en ordre les lettres d'un mot", domaine: "Écriture" },
  { id: "denombrement", nom: "Dénombrement (dés)", competence: "Associer une constellation à une quantité", domaine: "Quantités" },
  { id: "numeration", nom: "Bande numérique et chiffres", competence: "Compléter une bande numérique, écrire les chiffres", domaine: "Numération" },
];

// ── Hasard reproductible (même graine = même fiche ; « nouvelle variante » = nouvelle graine)
export function hasard(graine: number) { let a = graine >>> 0 || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function melanger<T>(xs: T[], r: () => number): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** Mélange sans point fixe (aucun élément ne reste à sa place) quand c'est possible. */
export function derangement<T>(xs: T[], r: () => number): T[] {
  if (xs.length < 2) return [...xs];
  for (let essai = 0; essai < 200; essai++) { const m = melanger(xs, r); if (m.every((v, i) => v !== xs[i])) return m; }
  return [...xs.slice(1), xs[0]];
}

// ── Mise en page commune : en-tête, titre, consigne, pied
const POINT = { pointille: true, ep: 0.7 };
function entete(p: Params, corrige: boolean): { prims: Prim[]; yDebut: number } {
  const m = A4.marge; const prims: Prim[] = [];
  prims.push({ k: "texte", x: m, y: m + 6, t: "Prénom :", taille: 4.6, police: "script" });
  if (p.prenom && p.prenom.trim()) prims.push({ k: "texte", x: m + 22, y: m + 6, t: p.prenom.trim(), taille: 5, police: "script", gras: true });
  else prims.push({ k: "chemin", d: `M${m + 22} ${m + 7} L${m + 92} ${m + 7}`, ep: 0.3, gris: true });
  if (p.avecDate) { prims.push({ k: "texte", x: m + 100, y: m + 6, t: "Date :", taille: 4.6, police: "script" }); prims.push({ k: "chemin", d: `M${m + 116} ${m + 7} L${m + 150} ${m + 7}`, ep: 0.3, gris: true }); }
  if (p.avecLogo) prims.push({ k: "texte", x: A4.l - m, y: m + 6, t: "Mo Ti-Péyi · GS", taille: 4.2, police: "titre", ancre: "end", gras: true });
  prims.push({ k: "texte", x: A4.l / 2, y: m + 20, t: p.titre || "", taille: 7.5, police: "titre", ancre: "middle", gras: true });
  const lignes = decouper(p.consigne || "", 62);
  lignes.forEach((l, i) => prims.push({ k: "texte", x: m, y: m + 31 + i * 6.5, t: (i === 0 ? "✎ " : "") + l, taille: 5, police: "script" }));
  if (corrige) prims.push({ k: "rect", x: A4.l - m - 44, y: m + 12, w: 44, h: 11, ry: 2, ep: 0.5 }, { k: "texte", x: A4.l - m - 22, y: m + 19.5, t: "CORRIGÉ", taille: 5, police: "titre", ancre: "middle", gras: true });
  prims.push({ k: "texte", x: A4.l / 2, y: A4.h - 7, t: "Mo Ti-Péyi · Grande Section · fiche originale Bellaïa", taille: 3, police: "script", ancre: "middle", gris: true });
  return { prims, yDebut: m + 31 + lignes.length * 6.5 + 4 };
}
function decouper(t: string, n: number): string[] { const mots = t.split(/\s+/).filter(Boolean); const l: string[] = []; let c = ""; for (const w of mots) { if ((c + " " + w).trim().length > n) { l.push(c); c = w; } else c = (c + " " + w).trim(); } if (c) l.push(c); return l.slice(0, 3); }
const traits = (texte: string, x: number, yBase: number, h: number, opts: { pointille?: boolean; gris?: boolean; ep?: number } = {}): Prim[] =>
  texteEnTraits(texte, x, yBase, h).traits.map(t => ({ k: "trait", d: t.d, x: t.x, y: t.y, e: t.echelle, ...opts }));

// ── Formes (suites logiques) : chemin centré en (cx, cy), taille s
export const FORMES: Record<string, string> = { rond: "rond", carre: "carré", triangle: "triangle", etoile: "étoile", coeur: "cœur", losange: "losange" };
export function forme(nom: string, cx: number, cy: number, s: number, opts: { gris?: boolean; pointille?: boolean } = {}): Prim {
  const r = s / 2; const ep = 0.9;
  if (nom === "rond") return { k: "cercle", cx, cy, r: r * 0.92, ep, ...opts };
  let d = "";
  if (nom === "carre") d = `M${cx - r * 0.85} ${cy - r * 0.85} h${r * 1.7} v${r * 1.7} h${-r * 1.7} Z`;
  if (nom === "triangle") d = `M${cx} ${cy - r} L${cx + r} ${cy + r * 0.8} L${cx - r} ${cy + r * 0.8} Z`;
  if (nom === "losange") d = `M${cx} ${cy - r} L${cx + r * 0.75} ${cy} L${cx} ${cy + r} L${cx - r * 0.75} ${cy} Z`;
  if (nom === "etoile") { const pts: string[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`); } d = "M" + pts.join(" L") + " Z"; }
  if (nom === "coeur") d = `M${cx} ${cy + r * 0.9} C${cx - r * 1.3} ${cy} ${cx - r * 0.9} ${cy - r * 1.1} ${cx} ${cy - r * 0.35} C${cx + r * 0.9} ${cy - r * 1.1} ${cx + r * 1.3} ${cy} ${cx} ${cy + r * 0.9} Z`;
  return { k: "chemin", d, ep, ...opts };
}

// ── Pictogrammes originaux, uniquement pour des mots dont la correspondance a été vérifiée visuellement
export const PICTOS: Record<string, (x: number, y: number, s: number) => Prim[]> = {
  SOLEIL: (x, y, s) => { const c = s / 2, r = s * 0.22; const p: Prim[] = [{ k: "cercle", cx: x + c, cy: y + c, r, ep: 0.6 }]; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.push({ k: "chemin", d: `M${x + c + Math.cos(a) * r * 1.35} ${y + c + Math.sin(a) * r * 1.35} L${x + c + Math.cos(a) * r * 2} ${y + c + Math.sin(a) * r * 2}`, ep: 0.6 }); } return p; },
  LUNE: (x, y, s) => [{ k: "chemin", d: `M${x + s * 0.6} ${y + s * 0.12} A${s * 0.38} ${s * 0.38} 0 1 0 ${x + s * 0.6} ${y + s * 0.88} A${s * 0.3} ${s * 0.3} 0 1 1 ${x + s * 0.6} ${y + s * 0.12} Z`, ep: 0.6 }],
  MAISON: (x, y, s) => [{ k: "chemin", d: `M${x + s * 0.2} ${y + s * 0.45} L${x + s * 0.5} ${y + s * 0.15} L${x + s * 0.8} ${y + s * 0.45} Z`, ep: 0.6 }, { k: "rect", x: x + s * 0.25, y: y + s * 0.45, w: s * 0.5, h: s * 0.4, ep: 0.6 }, { k: "rect", x: x + s * 0.44, y: y + s * 0.62, w: s * 0.12, h: s * 0.23, ep: 0.6 }],
  POISSON: (x, y, s) => [{ k: "chemin", d: `M${x + s * 0.12} ${y + s * 0.5} C${x + s * 0.3} ${y + s * 0.25} ${x + s * 0.6} ${y + s * 0.25} ${x + s * 0.72} ${y + s * 0.5} C${x + s * 0.6} ${y + s * 0.75} ${x + s * 0.3} ${y + s * 0.75} ${x + s * 0.12} ${y + s * 0.5} Z`, ep: 0.6 }, { k: "chemin", d: `M${x + s * 0.72} ${y + s * 0.5} L${x + s * 0.9} ${y + s * 0.36} L${x + s * 0.9} ${y + s * 0.64} Z`, ep: 0.6 }, { k: "cercle", cx: x + s * 0.27, cy: y + s * 0.46, r: s * 0.03, rempli: "noir" }],
  ARBRE: (x, y, s) => [{ k: "rect", x: x + s * 0.45, y: y + s * 0.55, w: s * 0.1, h: s * 0.35, ep: 0.6 }, { k: "cercle", cx: x + s * 0.5, cy: y + s * 0.36, r: s * 0.24, ep: 0.6 }],
  PIROGUE: (x, y, s) => [{ k: "chemin", d: `M${x + s * 0.02} ${y + s * 0.5} Q${x + s * 0.5} ${y + s * 0.86} ${x + s * 0.98} ${y + s * 0.5} Q${x + s * 0.5} ${y + s * 0.64} ${x + s * 0.02} ${y + s * 0.5} Z`, ep: 0.7 }, { k: "chemin", d: `M${x + s * 0.66} ${y + s * 0.12} L${x + s * 0.5} ${y + s * 0.7}`, ep: 0.7 }, { k: "chemin", d: `M${x + s * 0.5} ${y + s * 0.7} C${x + s * 0.43} ${y + s * 0.78} ${x + s * 0.45} ${y + s * 0.9} ${x + s * 0.47} ${y + s * 0.92} C${x + s * 0.53} ${y + s * 0.88} ${x + s * 0.56} ${y + s * 0.8} ${x + s * 0.5} ${y + s * 0.7} Z`, ep: 0.7 }, { k: "chemin", d: `M${x + s * 0.1} ${y + s * 0.95} Q${x + s * 0.2} ${y + s * 0.9} ${x + s * 0.3} ${y + s * 0.95} T${x + s * 0.5} ${y + s * 0.95} T${x + s * 0.7} ${y + s * 0.95} T${x + s * 0.9} ${y + s * 0.95}`, ep: 0.5 }],
};

// ═══ 1. Graphisme ═══════════════════════════════════════════
export const MOTIFS: Record<string, string> = { zigzag: "zigzags", vagues: "vagues", ponts: "ponts", coupes: "coupes", creneaux: "créneaux", boucles: "boucles", spirales: "spirales" };
function motif(nom: string, x: number, y: number, w: number, h: number): string {
  switch (nom) {
    case "zigzag": return `M${x} ${y + h} L${x + w / 2} ${y} L${x + w} ${y + h}`;
    case "vagues": return `M${x} ${y + h / 2} C${x + w * 0.25} ${y - h * 0.15} ${x + w * 0.25} ${y - h * 0.15} ${x + w / 2} ${y + h / 2} C${x + w * 0.75} ${y + h * 1.15} ${x + w * 0.75} ${y + h * 1.15} ${x + w} ${y + h / 2}`;
    case "ponts": return `M${x} ${y + h} A${w / 2} ${h} 0 0 1 ${x + w} ${y + h}`;
    case "coupes": return `M${x} ${y} A${w / 2} ${h} 0 0 0 ${x + w} ${y}`;
    case "creneaux": return `M${x} ${y + h} L${x} ${y} L${x + w / 2} ${y} L${x + w / 2} ${y + h} L${x + w} ${y + h}`;
    case "boucles": return `M${x} ${y + h} C${x + w * 0.9} ${y + h} ${x + w * 1.05} ${y} ${x + w * 0.55} ${y} C${x + w * 0.1} ${y} ${x + w * 0.2} ${y + h} ${x + w} ${y + h}`;
    case "spirales": { const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) / 2; const pts: string[] = []; for (let i = 0; i <= 90; i++) { const t = (i / 90) * Math.PI * 5; const r = (R * i) / 90; pts.push(`${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`); } return "M" + pts.join(" L"); }
    default: return "";
  }
}
export function graphisme(p: Params): Resultat {
  const { prims, yDebut } = entete(p, false); const err: string[] = [];
  const taille = p.taille === "grande" ? 24 : 18; const rep = Math.max(4, Math.min(14, Number(p.repetitions) || 8));
  if (p.dessin) {
    // Dessin original à repasser : pirogue sur l'eau et soleil (correspondance vérifiée visuellement)
    const ox = A4.marge + 18, oy = yDebut + 20;
    const d = [`M${ox + 120} ${oy + 30} m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0`];
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; d.push(`M${ox + 120 + Math.cos(a) * 24} ${oy + 30 + Math.sin(a) * 24} L${ox + 120 + Math.cos(a) * 34} ${oy + 30 + Math.sin(a) * 34}`); }
    d.push(`M${ox} ${oy + 120} Q${ox + 75} ${oy + 165} ${ox + 150} ${oy + 120} Z`, `M${ox + 95} ${oy + 80} L${ox + 70} ${oy + 158}`, `M${ox + 68} ${oy + 158} l6 10 l-10 3 Z`);
    for (let i = 0; i < 4; i++) d.push(motif("vagues", ox - 6 + i * 42, oy + 175, 42, 10));
    d.forEach(x => prims.push({ k: "chemin", d: x, ...POINT }));
    return { eleve: { prims }, corrige: null, verifications: ["Dessin original : pirogue, pagaie, soleil et vagues. Corrigé non nécessaire."], erreurs: err };
  }
  const motifs: string[] = (p.motifs || []).filter((m: string) => MOTIFS[m]);
  if (!motifs.length) err.push("Choisissez au moins un motif.");
  const largeur = A4.l - 2 * A4.marge; const pas = largeur / rep; const nbL = Math.max(1, motifs.length); const hauteurLigne = Math.min(Math.max(taille + 12, (A4.h - yDebut - 22) / nbL), taille * 2.4);
  motifs.slice(0, Math.floor((A4.h - yDebut - 18) / hauteurLigne)).forEach((m, i) => {
    const y = yDebut + 6 + i * hauteurLigne;
    for (let j = 0; j < rep; j++) {
      const w = m === "spirales" ? Math.min(pas * 0.85, taille) : pas; const x = A4.marge + j * pas + (pas - w) / 2;
      prims.push({ k: "chemin", d: motif(m, x, y, w, taille), ...(j === 0 ? { ep: 0.8 } : POINT) });
    }
    prims.push({ k: "cercle", cx: A4.marge + (m === "coupes" ? 0 : 0), cy: m === "coupes" ? y : m === "vagues" ? y + taille / 2 : y + taille, r: 1.2, rempli: "noir" });
  });
  return { eleve: { prims }, corrige: null, verifications: [`${motifs.length} ligne(s) de motifs, ${rep} répétitions, premier motif plein (modèle), point de départ marqué. Corrigé non nécessaire.`], erreurs: err };
}

// ═══ 2. Suites logiques ═════════════════════════════════════
export const STRUCTURES: Record<string, number[]> = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1] };
export function suites(p: Params): Resultat {
  const { prims, yDebut } = entete(p, false); const cor = entete(p, true); const r = hasard(p.graine); const err: string[] = []; const verif: string[] = [];
  const formes: string[] = (p.formes || []).filter((f: string) => FORMES[f]);
  const structs: string[] = (p.structures || ["AB"]).filter((s: string) => STRUCTURES[s]);
  const lignes = Math.max(1, Math.min(5, Number(p.lignes) || 4)); const aCompleter = Math.max(1, Math.min(4, Number(p.aCompleter) || 3));
  if (formes.length < 2) err.push("Choisissez au moins deux formes.");
  const periodeMax = Math.max(...structs.map(st => STRUCTURES[st].length)); const nbCases = Math.max(Number(p.visibles) || 0, periodeMax * 2) + aCompleter;
  const gap = 3; const cell = Math.max(13, Math.min(19, (A4.l - 2 * A4.marge + gap) / nbCases - gap)); const pasLigne = Math.min(cell * 2.6, (A4.h - yDebut - 22) / lignes);
  for (let i = 0; i < lignes && !err.length; i++) {
    const st = structs[i % structs.length]; const motifIdx = STRUCTURES[st]; const nbF = Math.max(...motifIdx) + 1;
    if (formes.length < nbF) { err.push(`La structure ${st} demande ${nbF} formes différentes.`); break; }
    const choix = melanger(formes, r).slice(0, nbF); const periode = motifIdx.length;
    const visibles = Math.max(Number(p.visibles) || 0, periode * 2);  // au moins deux motifs complets
    const total = Math.min(visibles + aCompleter, Math.floor((A4.l - 2 * A4.marge + gap) / (cell + gap)));
    const vis = Math.min(visibles, total - 1);
    const y = yDebut + 8 + i * pasLigne;
    const suite = Array.from({ length: total }, (_, k) => choix[motifIdx[k % periode]]);
    for (let k = 0; k < total; k++) {
      const cx = A4.marge + k * (cell + gap) + cell / 2, cy = y + cell / 2;
      if (k < vis) { prims.push(forme(suite[k], cx, cy, cell * 0.8)); cor.prims.push(forme(suite[k], cx, cy, cell * 0.8)); }
      else { const box: Prim = { k: "rect", x: cx - cell / 2, y, w: cell, h: cell, ry: 2.5, ...POINT, ep: 0.4 }; prims.push(box); cor.prims.push(box, forme(suite[k], cx, cy, cell * 0.8, { gris: true })); }
    }
    verif.push(`Ligne ${i + 1} : structure ${st} (${choix.map(c => FORMES[c]).join(", ")}) — ${vis} formes visibles = ${(vis / periode).toFixed(1).replace(".0", "")} motifs (minimum 2), ${total - vis} à compléter : ${suite.slice(vis).map(c => FORMES[c]).join(", ")}.`);
  }
  return { eleve: { prims }, corrige: err.length ? null : { prims: cor.prims }, verifications: verif, erreurs: err };
}

// ═══ 3. Lettres : capitales ↔ script, ou retrouver une lettre ═
const SCRIPT = (l: string) => l.toLowerCase();
export function lettres(p: Params): Resultat {
  const { prims, yDebut } = entete(p, false); const cor = entete(p, true); const r = hasard(p.graine); const err: string[] = []; const verif: string[] = [];
  const liste = Array.from(new Set(String(p.lettres || "AEIOUY").toUpperCase().replace(/[^A-Z]/g, "").split(""))).slice(0, 8);
  if (p.mode === "entourer") {
    const cible = String(p.cible || liste[0] || "A").toUpperCase().slice(0, 1); const nb = p.difficulte === 1 ? 5 : p.difficulte === 2 ? 6 : 7;
    const proches: Record<string, string> = { E: "FBL", F: "EPT", B: "PRD", P: "BRF", O: "QCD", C: "GOQ", M: "NW", N: "MZH", I: "LJT", U: "VJO", A: "HVK", V: "UYW", Y: "VXT" };
    const distracteurs = (p.difficulte === 3 ? (proches[cible] || "") + "KXZHT" : "BKSTRMHZD").replace(new RegExp(cible, "g"), "").split("");
    const cols = 6, rangs = 5, n = cols * rangs; const cases = Array.from({ length: n }, (_, i) => (i < nb ? cible : distracteurs[Math.floor(r() * distracteurs.length)]));
    const grille = melanger(cases, r); const pasX = (A4.l - 2 * A4.marge) / cols, pasY = 30;
    grille.forEach((l, i) => {
      const cx = A4.marge + (i % cols) * pasX + pasX / 2, yb = yDebut + 26 + Math.floor(i / cols) * pasY; const h = 16; const w = largeurTexte(l, h);
      const t = traits(l, cx - w / 2, yb, h, { ep: 0.9 }); prims.push(...t); cor.prims.push(...t);
      if (l === cible) cor.prims.push({ k: "cercle", cx, cy: yb - h / 2, r: 11, ep: 0.6, gris: true });
    });
    const compte = grille.filter(l => l === cible).length;
    verif.push(`Lettre à retrouver : ${cible} — présente ${compte} fois dans la grille (attendu ${nb}) ; ${n - compte} autres lettres.`);
    if (compte !== nb) err.push("Nombre d'occurrences incorrect.");
    return { eleve: { prims }, corrige: { prims: cor.prims }, verifications: verif, erreurs: err };
  }
  if (liste.length < 3) err.push("Indiquez au moins trois lettres.");
  const droite = derangement(liste, r); const pasY = Math.min(32, (A4.h - yDebut - 30) / Math.max(1, liste.length)); const xG = A4.marge + 18, xD = A4.l - A4.marge - 30;
  liste.forEach((l, i) => {
    const yb = yDebut + 26 + i * pasY, h = 15;
    const t = traits(l, xG, yb, h, { ep: 1 }); prims.push(...t); cor.prims.push(...t);
    const s: Prim = { k: "texte", x: xD + 8, y: yb, t: SCRIPT(droite[i]), taille: 22, police: "script", ancre: "middle" }; prims.push(s); cor.prims.push(s);
    for (const pt of [{ cx: xG + largeurTexte(l, h) + 10, cy: yb - h / 2 }, { cx: xD - 8, cy: yb - h / 2 }]) { const c: Prim = { k: "cercle", ...pt, r: 1.6, rempli: "noir" }; prims.push(c); cor.prims.push(c); }
  });
  liste.forEach((l, i) => { const j = droite.indexOf(l); const y1 = yDebut + 26 + i * pasY - 7.5, y2 = yDebut + 26 + j * pasY - 7.5; cor.prims.push({ k: "chemin", d: `M${xG + largeurTexte(l, 15) + 10} ${y1} L${xD - 8} ${y2}`, ep: 0.6, gris: true }); });
  verif.push(`Capitales : ${liste.join(" ")} — minuscules script dans un ordre mélangé (${droite.map(SCRIPT).join(" ")}) ; aucune lettre n'est face à sa correspondance.`);
  return { eleve: { prims }, corrige: { prims: cor.prims }, verifications: verif, erreurs: err };
}

// ═══ 4. Prénom et mots ══════════════════════════════════════
export function compterLettres(mot: string): Record<string, number> { const c: Record<string, number> = {}; for (const l of mot.toUpperCase().replace(/[^A-ZÀ-Ü]/g, "")) c[l] = (c[l] || 0) + 1; return c; }
export function mots(p: Params): Resultat {
  const { prims, yDebut } = entete(p, false); const cor = entete(p, true); const r = hasard(p.graine); const err: string[] = []; const verif: string[] = [];
  const liste = String(p.mots || "").split(/[\n,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 8);
  if (!liste.length) err.push("Saisissez au moins un mot.");
  const maxMots = p.mode === "repasser" || p.mode === "retrouver" ? 3 : 5; if (liste.length > maxMots) err.push(`${maxMots} mots maximum par page pour ce type d'exercice (une activité lisible par page A4).`);
  for (const m of liste) { if (m.length > 10) err.push(`« ${m} » : 10 lettres maximum.`); if ([...m].some(c => !disponible(c))) err.push(`« ${m} » contient un caractère non disponible en tracé.`); }
  let mode = p.mode as string; const script = p.ecriture === "script";
  if (mode === "repasser" && script) { verif.push("Repasser : proposé en capitales uniquement (tracés script à repasser non vérifiés)."); }
  if (err.length) return { eleve: { prims }, corrige: null, verifications: verif, erreurs: err };
  const hauteurBloc = (A4.h - yDebut - 18) / liste.length; const h = Math.min(16, hauteurBloc / 4);
  liste.forEach((m, i) => {
    const y0 = yDebut + 6 + i * hauteurBloc; const picto = PICTOS[m] as ((x: number, y: number, s: number) => Prim[]) | undefined; const x0 = A4.marge + (picto ? 40 : 0);
    if (picto) { const pp = picto(A4.marge, y0, 34); prims.push(...pp); cor.prims.push(...pp); }
    const modele = (x: number, yb: number, opts: any = {}): Prim[] => script ? [{ k: "texte", x, y: yb, t: m.toLowerCase(), taille: h * 1.55, police: "script", ...opts }] : traits(m, x, yb, h, opts);
    const lettresMot = [...m].filter(c => c !== " " && c !== "-" && c !== "'");
    if (mode === "repasser") {
      const a = traits(m, x0, y0 + h + 4, h, { ep: 0.9 }), b = traits(m, x0, y0 + 2 * h + 14, h, POINT), c = traits(m, x0, y0 + 3 * h + 24, h, POINT);
      prims.push(...a, ...b, ...c); cor.prims.push(...a, ...b, ...c);
      verif.push(`« ${m} » : modèle plein puis 2 lignes en pointillés (${lettresMot.length} lettres).`);
    } else if (mode === "recopier") {
      const a = modele(x0, y0 + h + 4); prims.push(...a); cor.prims.push(...a);
      const bw = Math.min(16, (A4.l - A4.marge - x0) / lettresMot.length - 2);
      lettresMot.forEach((l, k) => { const bx = x0 + k * (bw + 2), by = y0 + h + 10; const box: Prim = { k: "rect", x: bx, y: by, w: bw, h: bw * 1.15, ry: 1.5, ep: 0.4 }; prims.push(box); cor.prims.push(box, ...(script ? [{ k: "texte", x: bx + bw / 2, y: by + bw * 0.85, t: l.toLowerCase(), taille: bw * 0.9, police: "script", ancre: "middle", gris: true } as Prim] : traits(l, bx + bw / 2 - largeurTexte(l, bw * 0.6) / 2, by + bw * 0.88, bw * 0.6, { gris: true }))); });
      verif.push(`« ${m} » : ${lettresMot.length} cases, une par lettre (lettres répétées comprises).`);
    } else if (mode === "retrouver") {
      const a = modele(x0, y0 + h + 4); prims.push(...a); cor.prims.push(...a);
      const besoin = compterLettres(m); const distr = melanger("BCDFGHJKLMPQRSTVWXZ".split("").filter(c => !besoin[c]), r).slice(0, p.difficulte === 1 ? 3 : p.difficulte === 2 ? 5 : 7);
      const nuage = melanger([...lettresMot, ...distr], r); const nbCol = Math.min(nuage.length, 9); const pasX = (A4.l - A4.marge - x0) / nbCol; const hl = Math.min(11, h * 0.8);
      const reste = { ...besoin };
      nuage.forEach((l, k) => {
        const cx = x0 + (k % nbCol) * pasX + pasX / 2, yb = y0 + h + 22 + hl + Math.floor(k / nbCol) * (hl + 12) + (k % 2 ? 2 : 0);
        const t = traits(l, cx - largeurTexte(l, hl) / 2, yb, hl, { ep: 0.8 }); prims.push(...t); cor.prims.push(...t);
        if (reste[l] > 0) { reste[l]--; cor.prims.push({ k: "cercle", cx, cy: yb - hl / 2, r: hl * 0.85, ep: 0.5, gris: true }); }
      });
      const detail = Object.entries(besoin).map(([l, n]) => `${l}×${n}`).join(", ");
      verif.push(`« ${m} » : ${lettresMot.length} lettres à entourer (${detail}) parmi ${nuage.length} ; ${distr.length} lettres pièges absentes du mot.`);
      if (Object.values(reste).some(v => v !== 0)) err.push(`« ${m} » : correspondance des lettres incomplète.`);
    } else {
      let ordre = melanger(lettresMot, r); if (lettresMot.length > 1 && new Set(lettresMot).size > 1) { let n = 0; while (ordre.join("") === lettresMot.join("") && n++ < 20) ordre = melanger(lettresMot, r); }
      const bw = Math.min(16, (A4.l - A4.marge - x0) / lettresMot.length - 2);
      ordre.forEach((l, k) => { const bx = x0 + k * (bw + 2); const t = traits(l, bx + bw / 2 - largeurTexte(l, bw * 0.6) / 2, y0 + h + 4, bw * 0.6, { ep: 0.8 }); prims.push(...t); cor.prims.push(...t); });
      lettresMot.forEach((l, k) => { const bx = x0 + k * (bw + 2), by = y0 + h + 12; const box: Prim = { k: "rect", x: bx, y: by, w: bw, h: bw * 1.15, ry: 1.5, ep: 0.4 }; prims.push(box); cor.prims.push(box, ...traits(l, bx + bw / 2 - largeurTexte(l, bw * 0.6) / 2, by + bw * 0.88, bw * 0.6, { gris: true })); });
      verif.push(`« ${m} » : lettres mélangées ${ordre.join(" ")} → ${lettresMot.join("")} (${lettresMot.length} cases).`);
    }
    if (!picto && i === 0 && liste.some(w => !PICTOS[w])) verif.push("Pictogramme affiché seulement pour les mots vérifiés : " + Object.keys(PICTOS).join(", ") + ".");
  });
  const corrigeUtile = mode !== "repasser";
  return { eleve: { prims }, corrige: corrigeUtile ? { prims: cor.prims } : null, verifications: verif, erreurs: err };
}

// ═══ 5. Dénombrement (constellations de dé) ════════════════
export const CONSTELLATIONS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]], 2: [[0.25, 0.75], [0.75, 0.25]], 3: [[0.25, 0.75], [0.5, 0.5], [0.75, 0.25]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.25, 0.5], [0.25, 0.8], [0.75, 0.2], [0.75, 0.5], [0.75, 0.8]],
};
export function denombrement(p: Params): Resultat {
  const { prims, yDebut } = entete(p, false); const cor = entete(p, true); const r = hasard(p.graine); const err: string[] = []; const verif: string[] = [];
  let qs: number[] = (Array.isArray(p.quantites) ? p.quantites : String(p.quantites || "").split(/[,; ]+/)).map(Number).filter(n => n >= 1 && n <= 6);
  if (!qs.length) qs = p.difficulte === 1 ? [1, 2, 3] : p.difficulte === 2 ? [2, 4, 1, 5, 3] : melanger([1, 2, 3, 4, 5, 6], r).slice(0, 5);
  qs = qs.slice(0, 6); const ronds = Math.max(Math.max(...qs), Math.min(6, Number(p.ronds) || 5)); const de = 26, pasY = Math.min(38, (A4.h - yDebut - 20) / qs.length);
  qs.forEach((q, i) => {
    const y = yDebut + 6 + i * pasY; const box: Prim = { k: "rect", x: A4.marge, y, w: de, h: de, ry: 4, ep: 0.8 }; prims.push(box); cor.prims.push(box);
    const pts = CONSTELLATIONS[q]; pts.forEach(([u, v]) => { const c: Prim = { k: "cercle", cx: A4.marge + u * de, cy: y + v * de, r: 2.4, rempli: "noir" }; prims.push(c); cor.prims.push(c); });
    if (pts.length !== q) err.push(`Constellation incorrecte pour ${q}.`);
    const pas = (A4.l - 2 * A4.marge - de - 10) / ronds; const rr = Math.min(pas * 0.42, 11);
    for (let k = 0; k < ronds; k++) { const cx = A4.marge + de + 10 + k * pas + pas / 2; prims.push({ k: "cercle", cx, cy: y + de / 2, r: rr, ep: 0.8 }); cor.prims.push({ k: "cercle", cx, cy: y + de / 2, r: rr, ep: 0.8, ...(k < q ? { rempli: "gris" as const } : {}) }); }
    verif.push(`Ligne ${i + 1} : dé à ${pts.length} point(s) = ${q} rond(s) à colorier sur ${ronds}.`);
  });
  return { eleve: { prims }, corrige: { prims: cor.prims }, verifications: verif, erreurs: err };
}

// ═══ 6. Bande numérique / chiffres à repasser ═══════════════
export function numeration(p: Params): Resultat {
  const { prims, yDebut } = entete(p, false); const cor = entete(p, true); const r = hasard(p.graine); const err: string[] = []; const verif: string[] = [];
  const fin = Number(p.fin) === 10 ? 10 : 5;
  if (p.mode === "repasser") {
    const chiffres = Array.from({ length: fin }, (_, i) => String(i + 1)); const pasY = Math.min(26, (A4.h - yDebut - 18) / chiffres.length); const h = Math.min(15, pasY * 0.62);
    chiffres.forEach((c, i) => {
      const yb = yDebut + 6 + i * pasY + h; const w = largeurTexte(c, h) + h * 0.7; const n = Math.floor((A4.l - 2 * A4.marge) / w);
      prims.push({ k: "chemin", d: `M${A4.marge} ${yb + 1.5} L${A4.l - A4.marge} ${yb + 1.5}`, ep: 0.25, gris: true });
      for (let k = 0; k < n; k++) prims.push(...traits(c, A4.marge + k * w, yb, h, k === 0 ? { ep: 0.9 } : POINT));
    });
    verif.push(`Chiffres de 1 à ${fin} : un modèle plein puis des pointillés sur chaque ligne. Corrigé non nécessaire.`);
    return { eleve: { prims }, corrige: null, verifications: verif, erreurs: err };
  }
  const lignes = Math.max(1, Math.min(6, Number(p.lignes) || 5)); const trous = Math.max(1, Math.min(fin - 1, Number(p.trous) || (fin === 5 ? 2 : 4)));
  const pas = (A4.l - 2 * A4.marge) / fin; const h = fin === 5 ? 18 : 11; const pasY = Math.min(36, (A4.h - yDebut - 18) / lignes);
  const vus = new Set<string>();
  for (let i = 0; i < lignes; i++) {
    let pos: number[] = []; for (let essai = 0; essai < 30; essai++) { pos = melanger(Array.from({ length: fin }, (_, k) => k).filter(k => p.difficulte !== 1 || k > 0), r).slice(0, trous).sort((a, b) => a - b); if (!vus.has(pos.join())) break; }
    vus.add(pos.join()); const y = yDebut + 8 + i * pasY;
    const cadre: Prim = { k: "rect", x: A4.marge - 2, y: y - 4, w: A4.l - 2 * A4.marge + 4, h: h + 14, ry: 5, pointille: true, ep: 0.35, gris: true }; prims.push(cadre); cor.prims.push(cadre);
    for (let k = 0; k < fin; k++) {
      const n = String(k + 1); const cx = A4.marge + k * pas + pas / 2, yb = y + h + 2;
      if (pos.includes(k)) { const c: Prim = { k: "cercle", cx, cy: yb - h / 2, r: Math.min(pas * 0.4, h * 0.75), ep: 0.6 }; prims.push(c); cor.prims.push(c, ...traits(n, cx - largeurTexte(n, h * 0.8) / 2, yb - h * 0.1, h * 0.8, { gris: true })); }
      else { const t = traits(n, cx - largeurTexte(n, h) / 2, yb, h, { ep: 0.9 }); prims.push(...t); cor.prims.push(...t); }
    }
    verif.push(`Bande ${i + 1} : nombres manquants ${pos.map(k => k + 1).join(", ")} (${fin - pos.length} visibles).`);
  }
  return { eleve: { prims }, corrige: { prims: cor.prims }, verifications: verif, erreurs: err };
}

export const GENERATEURS: Record<Modele, (p: Params) => Resultat> = { graphisme, suites, lettres, mots, denombrement, numeration };
export function generer(p: Params): Resultat { const g = GENERATEURS[p.modele]; return g ? g(p) : { eleve: { prims: [] }, corrige: null, verifications: [], erreurs: ["Modèle inconnu."] }; }

/** Paramètres par défaut (fiche de démonstration originale) pour chaque modèle. */
export function parDefaut(m: Modele, graine = 20261123): Params {
  const c: Commun = { modele: m, titre: "", consigne: "", difficulte: 2, niveau: "GS", avecDate: true, avecLogo: true, graine };
  switch (m) {
    case "graphisme": return { ...c, titre: "Les vagues du fleuve", consigne: "Repasse sur les pointillés, de gauche à droite.", motifs: ["vagues", "ponts", "zigzag", "boucles", "creneaux"], repetitions: 8, taille: "grande", dessin: false };
    case "suites": return { ...c, titre: "Je continue la suite", consigne: "Regarde bien et dessine les formes qui manquent.", formes: ["rond", "carre", "triangle", "etoile"], structures: ["AB", "AAB", "ABB", "ABC"], lignes: 4, visibles: 6, aCompleter: 3 };
    case "lettres": return { ...c, titre: "Les voyelles", consigne: "Relie chaque capitale à la même lettre en script.", mode: "relier", lettres: "AEIOUY", cible: "A" };
    case "mots": return { ...c, titre: "Les lettres des mots", consigne: "Entoure les lettres qu'il faut pour écrire le mot.", mots: "BANANE, ANANAS, PIROGUE", mode: "retrouver", ecriture: "capitales" };
    case "denombrement": return { ...c, titre: "Autant que le dé", consigne: "Colorie autant de ronds que de points sur le dé.", quantites: [3, 1, 5, 2, 4], ronds: 5 };
    case "numeration": return { ...c, titre: "La bande des nombres", consigne: "Écris les nombres qui manquent dans les ronds.", mode: "bande", fin: 5, lignes: 5, trous: 2 };
  }
}
