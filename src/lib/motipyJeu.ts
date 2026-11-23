// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi — moteur du jeu pédagogique de cartes (programmation débranchée, PS → CP).
// Code pur, sans dépendance, testé par tests/unit/t_motipy_jeu.js.
// Familles du cahier des charges : déplacements, actions, nature (cases du plateau), conditions,
// boucles, débogage, événements, récompenses.
// • PS / MS / GS : cartes FLÈCHES absolues (↑ ↓ ← →), programmes courts.
// • CP : cartes RELATIVES (avancer, tourner), boucles « répéter » et condition « si obstacle ».
// • Débogage : un programme contient UNE carte fausse ; l'enfant la trouve et la remplace.
// Les textes et défis sont des BROUILLONS : à relire par la fondatrice avant toute diffusion aux familles.
// ═══════════════════════════════════════════════════════════

export type Niveau = "PS" | "MS" | "GS" | "CP";
export type Dir = "N" | "E" | "S" | "O";
export type Pos = { x: number; y: number };
export type Carte =
  | { t: "fleche"; d: Dir }                       // Déplacements (maternelle)
  | { t: "avancer" } | { t: "gauche" } | { t: "droite" }   // Déplacements (CP)
  | { t: "ramasser" }                             // Actions
  | { t: "repeter"; n: number; corps: Carte[] }   // Boucles
  | { t: "si_obstacle"; alors: Carte[]; sinon: Carte[] }; // Conditions
export type Defi = {
  id: string; niveau: Niveau; titre: string; consigne: string;
  taille: { l: number; h: number }; depart: Pos; dir: Dir; arrivee: Pos;
  obstacles?: Pos[]; fruits?: Pos[];
  cartes: Carte["t"][];           // cartes disponibles
  maxCartes: number;              // longueur maximale du programme (cartes posées)
  debogage?: Carte[];             // programme à réparer (une seule carte fausse)
};
export type Etat = { pos: Pos; dir: Dir; fruits: string[]; pas: number };
export type Resultat = { statut: "reussi" | "pas_arrive" | "obstacle" | "hors_plateau" | "fruits_manquants" | "trop_long"; trace: Etat[]; message: string };

const VECT: Record<Dir, Pos> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, O: { x: -1, y: 0 } };
const GAUCHE: Record<Dir, Dir> = { N: "O", O: "S", S: "E", E: "N" };
const DROITE: Record<Dir, Dir> = { N: "E", E: "S", S: "O", O: "N" };
const cle = (p: Pos) => `${p.x},${p.y}`;
export const MAX_PAS = 200;

/** Nombre de cartes posées (une boucle compte 1 + son contenu, comme sur la table). */
export function compterCartes(p: Carte[]): number {
  return p.reduce((n, c) => n + 1 + (c.t === "repeter" ? compterCartes(c.corps) : c.t === "si_obstacle" ? compterCartes(c.alors) + compterCartes(c.sinon) : 0), 0);
}

export function executer(defi: Defi, programme: Carte[]): Resultat {
  const obst = new Set((defi.obstacles || []).map(cle));
  const fruitsDefi = new Set((defi.fruits || []).map(cle));
  let e: Etat = { pos: { ...defi.depart }, dir: defi.dir, fruits: [], pas: 0 };
  const trace: Etat[] = [{ ...e, pos: { ...e.pos }, fruits: [...e.fruits] }];
  const fin = (statut: Resultat["statut"], message: string): Resultat => ({ statut, trace, message });
  if (compterCartes(programme) > defi.maxCartes) return fin("trop_long", `Programme trop long : ${defi.maxCartes} cartes au maximum.`);
  const devant = (): Pos => ({ x: e.pos.x + VECT[e.dir].x, y: e.pos.y + VECT[e.dir].y });
  const bloque = (p: Pos) => obst.has(cle(p)) || p.x < 0 || p.y < 0 || p.x >= defi.taille.l || p.y >= defi.taille.h;
  let erreur: Resultat | null = null;
  const bouger = (d: Dir) => {
    const v = VECT[d]; const n = { x: e.pos.x + v.x, y: e.pos.y + v.y };
    if (n.x < 0 || n.y < 0 || n.x >= defi.taille.l || n.y >= defi.taille.h) { erreur = fin("hors_plateau", "Ti-Colibri sort du plateau."); return; }
    if (obst.has(cle(n))) { erreur = fin("obstacle", "Ti-Colibri se cogne contre un obstacle."); return; }
    e = { ...e, pos: n, dir: d, pas: e.pas + 1 };
    trace.push({ ...e, pos: { ...e.pos }, fruits: [...e.fruits] });
  };
  const jouer = (liste: Carte[]) => {
    for (const c of liste) {
      if (erreur) return;
      if (e.pas > MAX_PAS) { erreur = fin("trop_long", "Le programme ne s'arrête pas."); return; }
      switch (c.t) {
        case "fleche": bouger(c.d); break;
        case "avancer": bouger(e.dir); break;
        case "gauche": e = { ...e, dir: GAUCHE[e.dir], pas: e.pas + 1 }; trace.push({ ...e, pos: { ...e.pos }, fruits: [...e.fruits] }); break;
        case "droite": e = { ...e, dir: DROITE[e.dir], pas: e.pas + 1 }; trace.push({ ...e, pos: { ...e.pos }, fruits: [...e.fruits] }); break;
        case "ramasser": {
          const k = cle(e.pos);
          if (fruitsDefi.has(k) && !e.fruits.includes(k)) e = { ...e, fruits: [...e.fruits, k] };
          e = { ...e, pas: e.pas + 1 }; trace.push({ ...e, pos: { ...e.pos }, fruits: [...e.fruits] }); break;
        }
        case "repeter": for (let i = 0; i < Math.max(0, Math.min(c.n, 10)); i++) jouer(c.corps); break;
        case "si_obstacle": jouer(bloque(devant()) ? c.alors : c.sinon); break;
      }
    }
  };
  jouer(programme);
  if (erreur) return erreur;
  if (e.pos.x !== defi.arrivee.x || e.pos.y !== defi.arrivee.y) return fin("pas_arrive", "Ti-Colibri n'est pas encore arrivé au carbet.");
  if (fruitsDefi.size && e.fruits.length < fruitsDefi.size) return fin("fruits_manquants", `Il manque ${fruitsDefi.size - e.fruits.length} fruit(s) à ramasser.`);
  return fin("reussi", "Bravo ! Ti-Colibri est arrivé.");
}

/** Recherche d'une solution la plus courte (vérifie que chaque défi est faisable). Cartes simples seulement. */
export function solutionMinimale(defi: Defi): Carte[] | null {
  const simples: Carte[] = [];
  for (const t of defi.cartes) {
    if (t === "fleche") (["N", "E", "S", "O"] as Dir[]).forEach(d => simples.push({ t: "fleche", d }));
    else if (t === "avancer" || t === "gauche" || t === "droite" || t === "ramasser") simples.push({ t } as Carte);
  }
  const fruits = (defi.fruits || []).map(cle);
  type Noeud = { pos: Pos; dir: Dir; f: string[]; prog: Carte[] };
  const vus = new Set<string>(); const file: Noeud[] = [{ pos: defi.depart, dir: defi.dir, f: [], prog: [] }];
  const obst = new Set((defi.obstacles || []).map(cle));
  while (file.length) {
    const n = file.shift()!;
    if (n.pos.x === defi.arrivee.x && n.pos.y === defi.arrivee.y && n.f.length === fruits.length) return n.prog;
    if (n.prog.length >= 24) continue;
    for (const c of simples) {
      let pos = n.pos, dir = n.dir, f = n.f;
      if (c.t === "fleche" || c.t === "avancer") { const d = c.t === "fleche" ? c.d : dir; const p = { x: pos.x + VECT[d].x, y: pos.y + VECT[d].y };
        if (p.x < 0 || p.y < 0 || p.x >= defi.taille.l || p.y >= defi.taille.h || obst.has(cle(p))) continue; pos = p; dir = d; }
      else if (c.t === "gauche") dir = GAUCHE[dir]; else if (c.t === "droite") dir = DROITE[dir];
      else if (c.t === "ramasser") { const k = cle(pos); if (!fruits.includes(k) || f.includes(k)) continue; f = [...f, k].sort(); }
      const k = `${cle(pos)}|${dir}|${f.join(";")}`; if (vus.has(k)) continue; vus.add(k);
      file.push({ pos, dir, f, prog: [...n.prog, c] });
    }
  }
  return null;
}

/** Débogage : indique la première carte à partir de laquelle le programme échoue (aide pour l'adulte). */
export function premiereCarteFautive(defi: Defi, programme: Carte[]): number | null {
  if (executer(defi, programme).statut === "reussi") return null;
  for (let i = 0; i < programme.length; i++) {
    const r = executer({ ...defi, arrivee: { x: -1, y: -1 }, fruits: [] }, programme.slice(0, i + 1));
    if (r.statut === "obstacle" || r.statut === "hors_plateau") return i;
  }
  return programme.length - 1;
}

const F = (d: Dir): Carte => ({ t: "fleche", d });
/** Défis BROUILLONS (3 par niveau), à relire avant diffusion. Thème : nature guyanaise (fleuve, carbet, fruits). */
export const DEFIS: Defi[] = [
  { id: "ps-1", niveau: "PS", titre: "Le chemin du carbet", consigne: "Aide Ti-Colibri à rejoindre le carbet.", taille: { l: 4, h: 1 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 3, y: 0 }, cartes: ["fleche"], maxCartes: 4 },
  { id: "ps-2", niveau: "PS", titre: "Vers la pirogue", consigne: "Descends jusqu'à la pirogue.", taille: { l: 1, h: 4 }, depart: { x: 0, y: 0 }, dir: "S", arrivee: { x: 0, y: 3 }, cartes: ["fleche"], maxCartes: 4 },
  { id: "ps-3", niveau: "PS", titre: "Le coin du jardin", consigne: "Avance puis descends.", taille: { l: 3, h: 3 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 2, y: 2 }, cartes: ["fleche"], maxCartes: 5 },
  { id: "ms-1", niveau: "MS", titre: "Le tronc tombé", consigne: "Contourne le tronc pour rejoindre le carbet.", taille: { l: 4, h: 3 }, depart: { x: 0, y: 1 }, dir: "E", arrivee: { x: 3, y: 1 }, obstacles: [{ x: 1, y: 1 }, { x: 2, y: 1 }], cartes: ["fleche"], maxCartes: 6 },
  { id: "ms-2", niveau: "MS", titre: "La mangue", consigne: "Ramasse la mangue puis rentre au carbet.", taille: { l: 4, h: 4 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 3, y: 3 }, fruits: [{ x: 2, y: 0 }], cartes: ["fleche", "ramasser"], maxCartes: 8 },
  { id: "ms-3", niveau: "MS", titre: "Le caïman dort", consigne: "Passe loin du caïman.", taille: { l: 4, h: 4 }, depart: { x: 0, y: 3 }, dir: "N", arrivee: { x: 3, y: 0 }, obstacles: [{ x: 1, y: 2 }, { x: 2, y: 1 }], cartes: ["fleche"], maxCartes: 6 },
  { id: "gs-1", niveau: "GS", titre: "Deux fruits", consigne: "Ramasse le maracudja et la goyave.", taille: { l: 5, h: 4 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 4, y: 3 }, fruits: [{ x: 3, y: 0 }, { x: 1, y: 3 }], obstacles: [{ x: 2, y: 2 }], cartes: ["fleche", "ramasser"], maxCartes: 14 },
  { id: "gs-2", niveau: "GS", titre: "La crique", consigne: "Trouve le passage sur les roches.", taille: { l: 5, h: 5 }, depart: { x: 0, y: 4 }, dir: "N", arrivee: { x: 4, y: 0 }, obstacles: [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 3, y: 0 }, { x: 2, y: 2 }, { x: 3, y: 2 }], cartes: ["fleche"], maxCartes: 10 },
  { id: "gs-3", niveau: "GS", titre: "Le programme cassé", consigne: "Une carte est fausse : trouve-la et remplace-la.", taille: { l: 4, h: 3 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 3, y: 2 }, obstacles: [{ x: 2, y: 0 }], cartes: ["fleche"], maxCartes: 6, debogage: [F("E"), F("E"), F("E"), F("S"), F("E")] },
  { id: "cp-1", niveau: "CP", titre: "Avancer et tourner", consigne: "Ti-Colibri regarde vers la droite. Utilise avancer et tourner.", taille: { l: 4, h: 4 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 3, y: 3 }, cartes: ["avancer", "gauche", "droite"], maxCartes: 8 },
  { id: "cp-2", niveau: "CP", titre: "La grande boucle", consigne: "Répète pour faire le tour de la mare.", taille: { l: 5, h: 5 }, depart: { x: 0, y: 4 }, dir: "N", arrivee: { x: 4, y: 4 }, obstacles: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }], cartes: ["avancer", "gauche", "droite", "repeter"], maxCartes: 9 },
  { id: "cp-3", niveau: "CP", titre: "Si un obstacle…", consigne: "Avance tout droit ; s'il y a un obstacle, tourne.", taille: { l: 5, h: 3 }, depart: { x: 0, y: 0 }, dir: "E", arrivee: { x: 4, y: 2 }, cartes: ["avancer", "gauche", "droite", "repeter", "si_obstacle"], maxCartes: 8 },
];

export const LIBELLES: Record<string, string> = { fleche: "Flèche", avancer: "Avancer", gauche: "Tourner à gauche", droite: "Tourner à droite", ramasser: "Ramasser", repeter: "Répéter", si_obstacle: "Si obstacle" };
