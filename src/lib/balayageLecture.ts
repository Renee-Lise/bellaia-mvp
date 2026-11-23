// Décision du geste de lecture (sens français, de gauche à droite) — fonction pure, testée.
// • glissement de droite vers la gauche → page suivante ; de gauche vers la droite → page précédente ;
// • jamais pendant un zoom (échelle > 1), un geste à plusieurs doigts ou un défilement vertical ;
// • un geste partant du bord gauche est laissé au « retour » de l'application.
export const LECTURE = { distance: 60, derive: 50, bord: 24 };
export type SensPage = "suivante" | "precedente" | null;

export function sensBalayage(g: { departX: number; dx: number; dy: number; echelle?: number; doigts?: number }): SensPage {
  if ((g.doigts ?? 1) !== 1) return null;
  if ((g.echelle ?? 1) > 1.01) return null;
  if (g.departX <= LECTURE.bord) return null;
  if (Math.abs(g.dy) > LECTURE.derive || Math.abs(g.dy) > Math.abs(g.dx)) return null;
  if (g.dx <= -LECTURE.distance) return "suivante";
  if (g.dx >= LECTURE.distance) return "precedente";
  return null;
}
