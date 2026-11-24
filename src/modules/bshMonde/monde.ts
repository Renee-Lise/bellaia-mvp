// ═══════════════════════════════════════════════════════════
// BSH Secret World — moteur du monde (phase 1, sans dépendance) : salles extensibles,
// projection isométrique, collisions, recherche de chemin, déplacement continu
// (joystick, clavier), portes entre salles, apparence des avatars.
// Le rendu se fait en Canvas 2D natif (aucune bibliothèque ajoutée). Ressources
// graphiques 100 % originales, dessinées par le code.
// Une salle se décrit par des données : ajouter une salle ne demande pas de toucher au moteur.
// ═══════════════════════════════════════════════════════════

export type Case = { x: number; y: number };
export type Obstacle = { x: number; y: number; l: number; h: number; type: "meuble" | "bar" | "scene" | "plante" | "piscine" | "comptoir"; nom: string; couleur: string; hauteur?: number };
export type Porte = { x: number; y: number; vers: string; arrivee: Case; libelle: string };
export type ObjetInteractif = { x: number; y: number; type: "table_cartes" | "tableau" | "porte_mysterieuse" | "roue" | "coffre" | "scene_impro"; libelle: string; lien?: string };
export type Pnj = { id: string; nom: string; x: number; y: number; phrase: string };

export type Salle = {
  id: string;
  nom: string;
  accroche: string;
  largeur: number;
  hauteur: number;
  sol: [string, string];
  mur: string;
  lumiere: string;
  obstacles: Obstacle[];
  sieges: Case[];
  piste?: { x: number; y: number; l: number; h: number };
  portes: Porte[];
  objets: ObjetInteractif[];
  pnj: Pnj[];
  depart: Case;
  acces: "membres" | "autorises" | "personnelle";
  disponible: boolean;
};

export const SALLES: Record<string, Salle> = {
  grand_hall: {
    id: "grand_hall", nom: "BSH Grand Hall", accroche: "Accueil, informations et rencontres",
    largeur: 12, hauteur: 12, sol: ["#2a1620", "#33192a"], mur: "#3d0b1b", lumiere: "rgba(198,161,91,0.10)",
    obstacles: [
      { x: 5, y: 5, l: 2, h: 2, type: "comptoir", nom: "Accueil", couleur: "#5a0f1c", hauteur: 0.8 },
      { x: 1, y: 9, l: 1, h: 1, type: "plante", nom: "Rosier noir", couleur: "#2f4a2a", hauteur: 1.1 },
      { x: 10, y: 1, l: 1, h: 1, type: "plante", nom: "Rosier noir", couleur: "#2f4a2a", hauteur: 1.1 },
    ],
    sieges: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 9, y: 9 }, { x: 9, y: 10 }],
    portes: [
      { x: 11, y: 5, vers: "the_red_room", arrivee: { x: 1, y: 5 }, libelle: "The Red Room" },
      { x: 6, y: 0, vers: "secret_games_arena", arrivee: { x: 5, y: 9 }, libelle: "Secret Games Arena" },
      { x: 0, y: 6, vers: "cabaret_rouge", arrivee: { x: 8, y: 5 }, libelle: "Cabaret Rouge" },
      { x: 6, y: 11, vers: "golden_room", arrivee: { x: 5, y: 1 }, libelle: "Golden Room" },
    ],
    objets: [
      { x: 3, y: 8, type: "table_cartes", libelle: "Table de cartes — BSH Secret Games", lien: "/bsh/secret-games" },
      { x: 8, y: 3, type: "tableau", libelle: "Tableau des classements — Red Room Awards", lien: "/bsh/private-club" },
    ],
    pnj: [{ id: "mc", nom: "Maîtresse de cérémonie", x: 7, y: 7, phrase: "Bienvenue au Grand Hall. La Red Room vous attend à l’est." }],
    depart: { x: 4, y: 6 }, acces: "membres", disponible: true,
  },
  the_red_room: {
    id: "the_red_room", nom: "The Red Room", accroche: "Club privé : piste de danse, fauteuils et confidences fictives",
    largeur: 10, hauteur: 10, sol: ["#3a0a14", "#45101b"], mur: "#5a0f1c", lumiere: "rgba(217,73,97,0.12)",
    obstacles: [
      { x: 7, y: 1, l: 2, h: 1, type: "bar", nom: "Bar de velours", couleur: "#2b1a12", hauteur: 0.9 },
      { x: 1, y: 1, l: 2, h: 1, type: "scene", nom: "Petite scène", couleur: "#6b0f1a", hauteur: 0.3 },
      { x: 8, y: 8, l: 1, h: 1, type: "plante", nom: "Roses rouges", couleur: "#7a1424", hauteur: 1 },
    ],
    sieges: [{ x: 1, y: 7 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 6, y: 8 }, { x: 7, y: 8 }],
    piste: { x: 4, y: 3, l: 3, h: 3 },
    portes: [{ x: 0, y: 5, vers: "grand_hall", arrivee: { x: 10, y: 5 }, libelle: "Grand Hall" }],
    objets: [{ x: 5, y: 1, type: "scene_impro", libelle: "Scène des actes — THE RED ROOM", lien: "/bsh/private-club" }],
    pnj: [],
    depart: { x: 1, y: 5 }, acces: "membres", disponible: true,
  },
};

/** Salles prévues (carte du monde) : affichées comme « à venir », jamais comme ouvertes. */
export const SALLES_PREVUES = [
  { id: "secret_games_arena", nom: "Secret Games Arena", phase: 4 },
  { id: "cabaret_rouge", nom: "Cabaret Rouge", phase: 4 },
  { id: "wild_saloon", nom: "Wild Saloon", phase: 4 },
  { id: "rooftop", nom: "BSH Rooftop", phase: 5 },
  { id: "midnight_boutique", nom: "Midnight Boutique", phase: 3 },
  { id: "golden_room", nom: "Golden Room (membres autorisés)", phase: 4 },
  { id: "my_secret_room", nom: "My Secret Room (salon personnel)", phase: 3 },
];

// ── Géométrie isométrique ────────────────────────────────────
export const TUILE = { l: 64, h: 32 };
export function versEcran(x: number, y: number, origine: { x: number; y: number }, z = 1): { x: number; y: number } {
  return { x: origine.x + (x - y) * (TUILE.l / 2) * z, y: origine.y + (x + y) * (TUILE.h / 2) * z };
}
export function versCase(px: number, py: number, origine: { x: number; y: number }, z = 1): { x: number; y: number } {
  const a = (px - origine.x) / ((TUILE.l / 2) * z), b = (py - origine.y) / ((TUILE.h / 2) * z);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// ── Collisions ───────────────────────────────────────────────
export function dansSalle(s: Salle, x: number, y: number): boolean { return x >= 0 && y >= 0 && x < s.largeur && y < s.hauteur; }
export function obstacleEn(s: Salle, x: number, y: number): Obstacle | null {
  const cx = Math.floor(x), cy = Math.floor(y);
  return s.obstacles.find(o => cx >= o.x && cx < o.x + o.l && cy >= o.y && cy < o.y + o.h) || null;
}
export function bloquee(s: Salle, x: number, y: number, autres: Case[] = []): boolean {
  if (!dansSalle(s, x, y) || obstacleEn(s, x, y)) return true;
  const cx = Math.floor(x), cy = Math.floor(y);
  if (s.pnj.some(p => p.x === cx && p.y === cy)) return true;
  return autres.some(a => Math.floor(a.x) === cx && Math.floor(a.y) === cy);
}

/** Recherche de chemin A* (8 directions, sans couper les angles). Renvoie les cases à parcourir, arrivée comprise. */
export function chemin(s: Salle, depart: Case, arrivee: Case, autres: Case[] = []): Case[] {
  const a = { x: Math.floor(depart.x), y: Math.floor(depart.y) }, b = { x: Math.floor(arrivee.x), y: Math.floor(arrivee.y) };
  if (bloquee(s, b.x, b.y, autres) || (a.x === b.x && a.y === b.y)) return [];
  const cle = (c: Case) => c.y * s.largeur + c.x;
  const g = new Map<number, number>([[cle(a), 0]]), parent = new Map<number, number>(), ouverts = new Set<number>([cle(a)]), fermes = new Set<number>();
  const h = (c: Case) => Math.max(Math.abs(c.x - b.x), Math.abs(c.y - b.y));
  const f = new Map<number, number>([[cle(a), h(a)]]);
  const depuis = (k: number): Case => ({ x: k % s.largeur, y: Math.floor(k / s.largeur) });
  let garde = 0;
  while (ouverts.size && garde++ < 5000) {
    let k = -1, meilleur = Infinity;
    for (const o of ouverts) { const v = f.get(o)!; if (v < meilleur) { meilleur = v; k = o; } }
    const c = depuis(k);
    if (c.x === b.x && c.y === b.y) {
      const res: Case[] = []; let cur: number | undefined = k;
      while (cur !== undefined && cur !== cle(a)) { res.unshift(depuis(cur)); cur = parent.get(cur); }
      return res;
    }
    ouverts.delete(k); fermes.add(k);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const n = { x: c.x + dx, y: c.y + dy }; const kn = cle(n);
      if (bloquee(s, n.x, n.y, autres) || fermes.has(kn)) continue;
      if (dx && dy && (bloquee(s, c.x + dx, c.y, autres) || bloquee(s, c.x, c.y + dy, autres))) continue;
      const cout = g.get(k)! + (dx && dy ? 1.414 : 1);
      if (cout < (g.get(kn) ?? Infinity)) { g.set(kn, cout); f.set(kn, cout + h(n)); parent.set(kn, k); ouverts.add(kn); }
    }
  }
  return [];
}

/** Déplacement continu (joystick, clavier) avec glissement le long des obstacles. dx, dy en cases. */
export function deplacer(s: Salle, pos: { x: number; y: number }, dx: number, dy: number, rayon = 0.3): { x: number; y: number } {
  const libre = (x: number, y: number) => ![[-rayon, -rayon], [rayon, -rayon], [-rayon, rayon], [rayon, rayon]].some(([ox, oy]) => bloquee(s, x + ox, y + oy));
  let { x, y } = pos;
  if (libre(x + dx, y)) x += dx;
  if (libre(x, y + dy)) y += dy;
  return { x, y };
}

/** Avance vers la case cible ; renvoie la nouvelle position et si la case est atteinte. */
export function avancer(pos: { x: number; y: number }, cible: Case, vitesse: number, dt: number): { x: number; y: number; atteint: boolean } {
  const tx = cible.x + 0.5, ty = cible.y + 0.5; const ex = tx - pos.x, ey = ty - pos.y; const d = Math.hypot(ex, ey); const pas = vitesse * dt;
  if (d <= pas || d < 1e-6) return { x: tx, y: ty, atteint: true };
  return { x: pos.x + (ex / d) * pas, y: pos.y + (ey / d) * pas, atteint: false };
}

/** Joystick écran (en pixels, vers le haut = négatif) → direction dans la grille isométrique. */
export function joystickVersGrille(jx: number, jy: number): { dx: number; dy: number } {
  const n = Math.hypot(jx, jy); if (n < 0.15) return { dx: 0, dy: 0 };
  const ux = jx / n, uy = jy / n, force = Math.min(1, n);
  // écran → grille : x_grille = (ux + 2·uy)/2, y_grille = (2·uy − ux)/2 (inverse de la projection 2:1)
  const gx = (ux + 2 * uy) / 2, gy = (2 * uy - ux) / 2; const m = Math.hypot(gx, gy) || 1;
  return { dx: (gx / m) * force, dy: (gy / m) * force };
}

export function porteEn(s: Salle, x: number, y: number): Porte | null {
  const cx = Math.floor(x), cy = Math.floor(y);
  return s.portes.find(p => p.x === cx && p.y === cy) || null;
}
export function siegeProche(s: Salle, x: number, y: number, distance = 1.3): Case | null {
  let best: Case | null = null, d = distance;
  for (const c of s.sieges) { const v = Math.hypot(c.x + 0.5 - x, c.y + 0.5 - y); if (v <= d) { d = v; best = c; } }
  return best;
}
export function surPiste(s: Salle, x: number, y: number): boolean {
  const p = s.piste; return !!p && x >= p.x && x < p.x + p.l && y >= p.y && y < p.y + p.h;
}

/** Contrôle de cohérence d'une salle (utile au futur mode construction). */
export function controlerSalle(s: Salle, toutes: Record<string, Salle> = SALLES): string[] {
  const e: string[] = [];
  if (bloquee(s, s.depart.x, s.depart.y)) e.push(`${s.id} : point de départ bloqué.`);
  for (const p of s.portes) {
    if (!dansSalle(s, p.x, p.y)) e.push(`${s.id} : porte hors de la salle.`);
    const d = toutes[p.vers];
    if (d && bloquee(d, p.arrivee.x, p.arrivee.y)) e.push(`${s.id} → ${p.vers} : arrivée bloquée.`);
  }
  for (const c of s.sieges) if (obstacleEn(s, c.x, c.y)) e.push(`${s.id} : siège sur un obstacle.`);
  return e;
}

// ── Apparence des avatars ────────────────────────────────────
export const CHOIX_AVATAR = {
  morphologie: [["fine", "Fine"], ["moyenne", "Moyenne"], ["ronde", "Ronde"], ["athletique", "Athlétique"]],
  carnation: [["#f3d6c6", "Porcelaine"], ["#e0b394", "Sable"], ["#c68b63", "Caramel"], ["#9a6440", "Cannelle"], ["#6e4229", "Cacao"], ["#4a2b1b", "Ébène"]],
  visage: [["ovale", "Ovale"], ["rond", "Rond"], ["coeur", "Cœur"], ["carre", "Carré"]],
  coiffure: [["courts", "Courts"], ["longs", "Longs"], ["boucles", "Boucles"], ["chignon", "Chignon"], ["tresses", "Tresses"], ["afro", "Afro"]],
  cheveux: [["#1a1110", "Noir"], ["#4a2a1a", "Châtain"], ["#8a4b2a", "Cuivré"], ["#d8b26a", "Blond doré"], ["#7a1424", "Bordeaux"], ["#c9c2c0", "Argent"]],
  maquillage: [["naturel", "Naturel"], ["smoky", "Smoky"], ["rouge", "Rouge à lèvres"], ["aucun", "Aucun"]],
  haut: [["#5a0f1c", "Velours rouge"], ["#0d0d0d", "Noir"], ["#c9a84c", "Doré"], ["#c48b9f", "Vieux rose"], ["#f1e7e2", "Ivoire"]],
  bas: [["#0d0d0d", "Noir"], ["#3d0b1b", "Bordeaux"], ["#2b2b3a", "Nuit"], ["#c9a84c", "Doré"]],
  chaussures: [["#0d0d0d", "Escarpins noirs"], ["#5a0f1c", "Bottines rouges"], ["#6b4a2a", "Bottes western"], ["#c9a84c", "Sandales dorées"]],
  bijoux: [["aucun", "Aucun"], ["perles", "Perles"], ["or", "Or"], ["diamant", "Éclats"]],
  accessoire: [["aucun", "Aucun"], ["chapeau", "Chapeau de cowboy"], ["eventail", "Éventail"], ["rose", "Rose noire"], ["noeud", "Nœud papillon"]],
  masque: [["aucun", "Sans masque"], ["masque_bal_simple", "Masque de bal"]],
  expression: [["sourire", "Sourire"], ["mystere", "Mystère"], ["rire", "Rire"], ["clin", "Clin d’œil"]],
} as const;

export type Apparence = { -readonly [K in keyof typeof CHOIX_AVATAR]: string } & { pseudo: string };

export const APPARENCE_DEFAUT: Apparence = {
  pseudo: "", morphologie: "moyenne", carnation: "#c68b63", visage: "ovale", coiffure: "longs", cheveux: "#1a1110", maquillage: "naturel",
  haut: "#5a0f1c", bas: "#0d0d0d", chaussures: "#0d0d0d", bijoux: "or", accessoire: "aucun", masque: "aucun", expression: "sourire",
};

/** Normalise une apparence : toute valeur inconnue revient au défaut (protection contre un enregistrement altéré). */
export function normaliserApparence(a: Partial<Apparence> | null | undefined, masquesAutorises: string[] = []): Apparence {
  const r = { ...APPARENCE_DEFAUT } as Apparence;
  if (!a) return r;
  for (const k of Object.keys(CHOIX_AVATAR) as (keyof typeof CHOIX_AVATAR)[]) {
    const v = a[k]; const permis = (CHOIX_AVATAR[k] as readonly (readonly [string, string])[]).map(x => x[0]);
    if (typeof v === "string" && (permis.includes(v) || (k === "masque" && masquesAutorises.includes(v)))) r[k] = v;
  }
  r.pseudo = String(a.pseudo || "").replace(/[<>]/g, "").trim().slice(0, 24);
  return r;
}

export type Geste = "aucun" | "marche" | "danse" | "salut" | "assis";
