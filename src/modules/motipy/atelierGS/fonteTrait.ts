// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi — police « trait » originale (capitales d'imprimerie et chiffres)
// Chaque caractère est un tracé central (pas un contour) : il peut être
// repassé en pointillés. Boîte : hauteur 100 (capitale), ligne de base y = 100,
// accents au-dessus (y < 0). Dessin fait pour Bellaïa ; vérifié visuellement
// (planche de contrôle) le 23/11/2026.
// La cursive scolaire N'EST PAS fournie : tracés et liaisons non vérifiés.
// ═══════════════════════════════════════════════════════════

export type Glyphe = { d: string; l: number };

const O = (x: number, w: number) => `M${x + w / 2} 0 A${w / 2} 50 0 1 0 ${x + w / 2} 100 A${w / 2} 50 0 1 0 ${x + w / 2} 0`;

const BASE: Record<string, Glyphe> = {
  A: { d: "M0 100 L32 0 L64 100 M12 64 L52 64", l: 64 },
  B: { d: "M0 0 L0 100 M0 0 L32 0 A22 24 0 0 1 32 48 L0 48 M32 48 A26 26 0 0 1 32 100 L0 100", l: 58 },
  C: { d: "M62 16 C52 2 42 0 34 0 C14 0 2 22 2 50 C2 78 14 100 34 100 C42 100 52 98 62 84", l: 64 },
  D: { d: "M0 0 L0 100 L22 100 A40 50 0 0 0 22 0 L0 0", l: 62 },
  E: { d: "M58 0 L0 0 L0 100 L58 100 M0 50 L46 50", l: 58 },
  F: { d: "M58 0 L0 0 L0 100 M0 50 L46 50", l: 58 },
  G: { d: "M62 16 C52 2 42 0 34 0 C14 0 2 22 2 50 C2 78 14 100 34 100 C50 100 64 90 64 66 L64 56 L38 56", l: 66 },
  H: { d: "M0 0 L0 100 M60 0 L60 100 M0 50 L60 50", l: 60 },
  I: { d: "M4 0 L4 100", l: 8 },
  J: { d: "M48 0 L48 72 C48 92 38 100 24 100 C10 100 2 92 0 80", l: 50 },
  K: { d: "M0 0 L0 100 M58 0 L0 60 M20 40 L60 100", l: 60 },
  L: { d: "M0 0 L0 100 L54 100", l: 54 },
  M: { d: "M0 100 L0 0 L36 72 L72 0 L72 100", l: 72 },
  N: { d: "M0 100 L0 0 L60 100 L60 0", l: 60 },
  O: { d: O(0, 68), l: 68 },
  P: { d: "M0 100 L0 0 L32 0 A24 26 0 0 1 32 52 L0 52", l: 56 },
  Q: { d: O(0, 68) + " M40 70 L70 104", l: 70 },
  R: { d: "M0 100 L0 0 L32 0 A24 26 0 0 1 32 52 L0 52 M28 52 L60 100", l: 60 },
  S: { d: "M58 14 C50 2 40 0 30 0 C14 0 4 10 4 26 C4 44 20 48 32 52 C46 56 60 62 60 76 C60 92 48 100 30 100 C16 100 6 94 0 84", l: 62 },
  T: { d: "M0 0 L64 0 M32 0 L32 100", l: 64 },
  U: { d: "M0 0 L0 68 A30 32 0 0 0 60 68 L60 0", l: 60 },
  V: { d: "M0 0 L32 100 L64 0", l: 64 },
  W: { d: "M0 0 L20 100 L42 30 L64 100 L84 0", l: 84 },
  X: { d: "M0 0 L60 100 M60 0 L0 100", l: 60 },
  Y: { d: "M0 0 L32 50 L64 0 M32 50 L32 100", l: 64 },
  Z: { d: "M2 0 L60 0 L0 100 L62 100", l: 62 },
  "0": { d: O(2, 52), l: 56 },
  "1": { d: "M6 24 L34 0 L34 100", l: 40 },
  "2": { d: "M4 22 C8 4 22 0 30 0 C46 0 56 10 56 26 C56 52 22 70 2 100 L60 100", l: 60 },
  "3": { d: "M6 12 C14 2 22 0 30 0 C46 0 54 10 54 24 C54 40 42 48 26 48 C46 48 58 58 58 74 C58 92 46 100 30 100 C18 100 8 96 2 88", l: 60 },
  "4": { d: "M44 100 L44 0 L0 68 L62 68", l: 62 },
  "5": { d: "M56 0 L12 0 L6 44 C14 38 22 36 30 36 C48 36 58 50 58 68 C58 88 46 100 28 100 C16 100 8 96 2 88", l: 60 },
  "6": { d: "M52 8 C46 2 38 0 32 0 C14 0 2 22 2 56 C2 84 12 100 30 100 C46 100 58 88 58 70 C58 52 46 42 30 42 C16 42 6 50 3 62", l: 60 },
  "7": { d: "M0 0 L60 0 L22 100", l: 60 },
  "8": { d: "M30 48 C16 48 6 40 6 24 C6 10 16 0 30 0 C44 0 54 10 54 24 C54 40 44 48 30 48 C14 48 2 58 2 75 C2 91 14 100 30 100 C46 100 58 91 58 75 C58 58 46 48 30 48", l: 60 },
  "9": { d: "M56 38 C52 52 42 58 30 58 C14 58 4 46 4 30 C4 12 16 0 30 0 C46 0 56 12 56 40 C56 76 42 100 24 100 C16 100 10 98 4 92", l: 60 },
};

// Accents (capitales) : tracés au-dessus de la lettre, centrés sur sa largeur
const ACCENTS: Record<string, (c: number) => string> = {
  aigu: c => `M${c - 6} -10 L${c + 8} -24`,
  grave: c => `M${c - 8} -24 L${c + 6} -10`,
  circ: c => `M${c - 12} -10 L${c} -24 L${c + 12} -10`,
  trema: c => `M${c - 10} -20 L${c - 10} -12 M${c + 10} -20 L${c + 10} -12`,
};
const COMPOSEES: Record<string, [string, keyof typeof ACCENTS]> = {
  "É": ["E", "aigu"], "È": ["E", "grave"], "Ê": ["E", "circ"], "Ë": ["E", "trema"],
  "À": ["A", "grave"], "Â": ["A", "circ"], "Î": ["I", "circ"], "Ï": ["I", "trema"],
  "Ô": ["O", "circ"], "Ù": ["U", "grave"], "Û": ["U", "circ"], "Ü": ["U", "trema"],
};

export function glyphe(c: string): Glyphe | null {
  const u = c.toUpperCase();
  if (BASE[u]) return BASE[u];
  if (u === "Ç") return { d: BASE.C.d + " M34 100 L34 108 C44 110 44 120 30 120", l: BASE.C.l };
  const comp = COMPOSEES[u];
  if (comp) { const g = BASE[comp[0]]; return { d: g.d + " " + ACCENTS[comp[1]](g.l / 2), l: g.l }; }
  return null;
}

/** Caractères disponibles en tracé (capitales, accents usuels, chiffres). */
export const disponible = (c: string) => c === " " || c === "-" || c === "'" || !!glyphe(c);

export type TraitPlace = { d: string; x: number; y: number; echelle: number };
/** Place un texte en police trait : hauteur de capitale en mm, retour : tracés + largeur totale (mm). */
export function texteEnTraits(texte: string, x: number, yBase: number, hauteur: number, espacement = 0.32): { traits: TraitPlace[]; largeur: number } {
  const e = hauteur / 100; const traits: TraitPlace[] = []; let cx = x;
  for (const c of texte.toUpperCase()) {
    if (c === " ") { cx += hauteur * 0.55; continue; }
    if (c === "-") { traits.push({ d: "M0 50 L30 50", x: cx, y: yBase - hauteur, echelle: e }); cx += 30 * e + hauteur * espacement; continue; }
    const g = glyphe(c); if (!g) continue;
    traits.push({ d: g.d, x: cx, y: yBase - hauteur, echelle: e });
    cx += g.l * e + hauteur * espacement;
  }
  return { traits, largeur: Math.max(0, cx - x - hauteur * espacement) };
}
export const largeurTexte = (texte: string, hauteur: number, espacement = 0.32) => texteEnTraits(texte, 0, 0, hauteur, espacement).largeur;
