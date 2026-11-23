"use client";
// ═══════════════════════════════════════════════════════════
// Navigation « retour » cohérente sur iPhone.
// • useRetourNavigateur : quand un écran secondaire s'ouvre, une entrée d'historique est ajoutée ;
//   le retour du navigateur (bouton, geste natif de Safari) ferme alors cet écran au lieu de quitter
//   l'application. Fermer l'écran par son bouton visible retire aussi l'entrée (pas de double retour).
// • installerBalayageRetour : dans l'application installée sur l'écran d'accueil (où Safari n'offre pas
//   de geste natif), un glissement depuis le bord gauche vers la droite déclenche le même retour.
//   Ignoré : plusieurs doigts (zoom), geste vertical, zone défilant horizontalement, champs de saisie.
// Tout geste a son alternative visible (bouton « ‹ Retour » / « ‹ Portail »).
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef } from "react";

const MARQUE = "bellaia";
const estNotreEtat = (cle?: string) => typeof window !== "undefined" && window.history.state?.[MARQUE] && (!cle || window.history.state[MARQUE] === cle);

export function useRetourNavigateur(ouvert: boolean, fermer: () => void, cle: string) {
  const fermerRef = useRef(fermer); fermerRef.current = fermer;
  const monte = useRef(false);
  useEffect(() => {
    if (!ouvert || typeof window === "undefined") return;
    monte.current = true;
    // Une seule entrée par écran (le double montage de développement ne doit pas en empiler deux)
    if (!estNotreEtat(cle)) window.history.pushState({ ...(window.history.state || {}), [MARQUE]: cle }, "");
    let parHistorique = false;
    // Ne se ferme que si l'historique est revenu en deçà de son entrée (écrans imbriqués : seul l'écran du dessus se ferme)
    const surRetour = () => { if (estNotreEtat(cle)) return; parHistorique = true; fermerRef.current(); };
    window.addEventListener("popstate", surRetour);
    return () => {
      window.removeEventListener("popstate", surRetour);
      monte.current = false;
      // Fermé par le bouton de l'écran : on retire l'entrée ajoutée — après vérification qu'il ne s'agit pas
      // d'un simple remontage immédiat du même écran (sinon on fermerait l'écran qu'on vient d'ouvrir).
      if (!parHistorique) setTimeout(() => { if (!monte.current && estNotreEtat(cle)) window.history.back(); }, 0);
    };
  }, [ouvert, cle]);
}

/** Paramètres du geste (exportés pour les tests). */
export const BALAYAGE = { bord: 24, distance: 70, derive: 40 };

function defileHorizontalement(el: Element | null): boolean {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const s = getComputedStyle(e);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && e.scrollWidth > e.clientWidth + 2) return true;
    if (e.matches?.("input, textarea, select, [contenteditable=true], [data-sans-balayage]")) return true;
  }
  return false;
}

export function modeApplicationInstallee(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as any).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/** À appeler une fois (racine de l'application). Renvoie une fonction de désinstallation. */
export function installerBalayageRetour(force = false): () => void {
  if (typeof window === "undefined" || (!force && !modeApplicationInstallee())) return () => {};
  let depart: { x: number; y: number } | null = null; let fait = false;
  const debut = (e: TouchEvent) => {
    fait = false; depart = null;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > BALAYAGE.bord || defileHorizontalement(e.target as Element)) return;
    depart = { x: t.clientX, y: t.clientY };
  };
  const mouvement = (e: TouchEvent) => {
    if (!depart || fait) return;
    if (e.touches.length !== 1) { depart = null; return; }
    const t = e.touches[0]; const dx = t.clientX - depart.x; const dy = Math.abs(t.clientY - depart.y);
    if (dy > BALAYAGE.derive) { depart = null; return; }
    if (dx > BALAYAGE.distance) { fait = true; depart = null; if (estNotreEtat()) window.history.back(); }
  };
  const fin = () => { depart = null; };
  window.addEventListener("touchstart", debut, { passive: true });
  window.addEventListener("touchmove", mouvement, { passive: true });
  window.addEventListener("touchend", fin, { passive: true });
  window.addEventListener("touchcancel", fin, { passive: true });
  return () => { window.removeEventListener("touchstart", debut); window.removeEventListener("touchmove", mouvement); window.removeEventListener("touchend", fin); window.removeEventListener("touchcancel", fin); };
}
