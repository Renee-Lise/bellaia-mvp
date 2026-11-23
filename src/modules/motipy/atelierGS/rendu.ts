// ═══════════════════════════════════════════════════════════
// Mo Ti-Péyi — Atelier GS : rendu d'une scène A4 (mm)
// • pageEnSvg : aperçu (écran) — chaîne SVG, aucune dépendance.
// • dessinerPage : export (canvas) — même scène, mêmes coordonnées.
// • exporterPdf : A4 portrait via canvasVersPdf (bibliothèque PDF interne de Bellaïa).
// Minuscules script : police Andika (a et g « d'école », conçue pour l'apprentissage
// de la lecture). Si elle n'est pas chargée, l'export est refusé plutôt que de
// basculer sur une police inadaptée.
// ═══════════════════════════════════════════════════════════
import { A4, type Page, type Prim } from "./modeles";

export const POLICE_SCRIPT = "Andika";
export const LIEN_POLICE_SCRIPT = "https://fonts.googleapis.com/css2?family=Andika:wght@400;700&display=swap";
const DASH = [1.6, 1.4];
const couleur = (p: { gris?: boolean }) => (p.gris ? "#8a8a8a" : "#111");
const echap = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function pageEnSvg(page: Page, largeurPx?: number): string {
  const el = page.prims.map(p => {
    const trait = (ep: number, pointille?: boolean, s = 1) => `fill="none" stroke="${couleur(p as any)}" stroke-width="${(ep / s).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"${pointille ? ` stroke-dasharray="${(DASH[0] / s).toFixed(3)} ${(DASH[1] / s).toFixed(3)}"` : ""}`;
    switch (p.k) {
      case "trait": return `<path d="${p.d}" transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.e.toFixed(4)})" ${trait(p.ep ?? 0.8, p.pointille, p.e)}/>`;
      case "chemin": return `<path d="${p.d}" ${p.rempli ? `fill="${p.rempli === "gris" ? "#bdbdbd" : "#111"}" stroke="${couleur(p)}" stroke-width="${p.ep ?? 0.6}"` : trait(p.ep ?? 0.6, p.pointille)}/>`;
      case "cercle": return `<circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${p.r.toFixed(2)}" ${p.rempli ? `fill="${p.rempli === "gris" ? "#bdbdbd" : "#111"}" stroke="${couleur(p)}" stroke-width="${p.ep ?? 0.3}"` : trait(p.ep ?? 0.6, p.pointille)}/>`;
      case "rect": return `<rect x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" width="${p.w.toFixed(2)}" height="${p.h.toFixed(2)}" rx="${p.ry ?? 0}" ${trait(p.ep ?? 0.5, p.pointille)}/>`;
      case "texte": return `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" font-family="${POLICE_SCRIPT}, sans-serif" font-size="${p.taille}" font-weight="${p.gras ? 700 : 400}" text-anchor="${p.ancre || "start"}" fill="${couleur(p)}">${echap(p.t)}</text>`;
    }
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A4.l} ${A4.h}"${largeurPx ? ` width="${largeurPx}" height="${(largeurPx * A4.h) / A4.l}"` : ""} style="background:#fff">${el}</svg>`;
}

export async function chargerPoliceScript(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (!document.querySelector(`link[data-police="andika"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = LIEN_POLICE_SCRIPT; l.setAttribute("data-police", "andika"); document.head.appendChild(l); }
  try { await Promise.race([Promise.all([document.fonts.load(`20px "${POLICE_SCRIPT}"`), document.fonts.load(`700 20px "${POLICE_SCRIPT}"`)]), new Promise(r => setTimeout(r, 6000))]); } catch { /* vérifié ci-dessous */ }
  return document.fonts.check(`20px "${POLICE_SCRIPT}"`);
}

export function dessinerPage(ctx: CanvasRenderingContext2D, page: Page, pxParMm: number) {
  ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, A4.l * pxParMm, A4.h * pxParMm); ctx.scale(pxParMm, pxParMm);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const p of page.prims as Prim[]) {
    ctx.save(); ctx.strokeStyle = couleur(p as any); ctx.fillStyle = couleur(p as any);
    const tracer = (chemin: Path2D, ep: number, pointille?: boolean, s = 1) => { ctx.lineWidth = ep / s; ctx.setLineDash(pointille ? DASH.map(v => v / s) : []); ctx.stroke(chemin); };
    switch (p.k) {
      case "trait": ctx.translate(p.x, p.y); ctx.scale(p.e, p.e); tracer(new Path2D(p.d), p.ep ?? 0.8, p.pointille, p.e); break;
      case "chemin": { const c = new Path2D(p.d); if (p.rempli) { ctx.fillStyle = p.rempli === "gris" ? "#bdbdbd" : "#111"; ctx.fill(c); ctx.lineWidth = p.ep ?? 0.6; ctx.stroke(c); } else tracer(c, p.ep ?? 0.6, p.pointille); break; }
      case "cercle": { const c = new Path2D(); c.arc(p.cx, p.cy, p.r, 0, Math.PI * 2); if (p.rempli) { ctx.fillStyle = p.rempli === "gris" ? "#bdbdbd" : "#111"; ctx.fill(c); ctx.lineWidth = p.ep ?? 0.3; ctx.stroke(c); } else tracer(c, p.ep ?? 0.6, p.pointille); break; }
      case "rect": { const c = new Path2D(); const r = Math.min(p.ry ?? 0, p.w / 2, p.h / 2); if ((c as any).roundRect) (c as any).roundRect(p.x, p.y, p.w, p.h, r); else c.rect(p.x, p.y, p.w, p.h); tracer(c, p.ep ?? 0.5, p.pointille); break; }
      case "texte": ctx.font = `${p.gras ? 700 : 400} ${p.taille}px "${POLICE_SCRIPT}", sans-serif`; ctx.textAlign = (p.ancre === "middle" ? "center" : p.ancre === "end" ? "right" : "left"); ctx.textBaseline = "alphabetic"; ctx.fillText(p.t, p.x, p.y); break;
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Construit le PDF A4 (une page par scène) ; pxParMm 8 ≈ 200 ppp, compatible avec la mémoire d'un iPhone. */
export async function pdfDePages(pages: Page[], pxParMm = 8): Promise<Blob> {
  if (!(await chargerPoliceScript())) throw new Error("La police script (Andika) n'a pas pu être chargée : export interrompu pour ne pas imprimer une autre forme de lettres. Vérifiez la connexion puis réessayez.");
  const { canvasVersPdf } = await import("../../events/eventsAtelierLib");
  const canvases = pages.map(pg => { const c = document.createElement("canvas"); c.width = Math.round(A4.l * pxParMm); c.height = Math.round(A4.h * pxParMm); dessinerPage(c.getContext("2d")!, pg, pxParMm); return { canvas: c, largeurMm: A4.l, hauteurMm: A4.h }; });
  return canvasVersPdf(canvases);
}
