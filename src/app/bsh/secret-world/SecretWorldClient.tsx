"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret World — PHASE 1, MAQUETTE JOUEUR SEUL.
// Monde isométrique en Canvas 2D natif (aucune bibliothèque) : Grand Hall et Red Room,
// avatar personnalisable, marche vers un point touché, joystick, clavier, collisions,
// portes, carte du monde, gestes (s'asseoir, danser, saluer).
// AUCUNE présence réelle : personne d'autre n'est affiché comme connecté. Le seul autre
// personnage est un PNJ, étiqueté comme tel. La présence multijoueur (phase 2) passera par
// Supabase Realtime sur les canaux autorisés par la migration 0144 (non appliquée).
// L'avatar et la position sont gardés sur cet appareil et restaurés après une mise à jour.
// ═══════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import {
  APPARENCE_DEFAUT, CHOIX_AVATAR, SALLES, SALLES_PREVUES, TUILE, avancer, chemin, deplacer, joystickVersGrille, normaliserApparence, obstacleEn, porteEn, siegeProche, surPiste, versCase, versEcran,
  type Apparence, type Case, type Geste, type ObjetInteractif, type Pnj, type Salle,
} from "@/modules/bshMonde/monde";
import { MASQUES_SIGNATURE, apparenceAutorisee } from "@/modules/bshClub/nominations";

const CLE = "bsh-monde";
type Sauvegarde = { apparence: Apparence; tenues: { nom: string; apparence: Apparence }[]; salle: string; x: number; y: number };
const bouton = (principal = false): React.CSSProperties => ({ minHeight: 44, padding: "8px 12px", borderRadius: 10, border: `1px solid ${principal ? C.gold : C.border}`, background: principal ? "rgba(198,161,91,0.2)" : "rgba(11,7,9,0.75)", color: principal ? C.goldL : C.cream, fontFamily: BODY, fontSize: 13.5, fontWeight: 600, cursor: "pointer" });

function estFondatrice(): boolean { try { return JSON.parse(localStorage.getItem("bellaia_user") || "null")?.role === "fondatrice"; } catch { return false; } }
function lire(): Sauvegarde | null { try { return JSON.parse(localStorage.getItem(CLE) || "null"); } catch { return null; } }
function ecrire(s: Sauvegarde) { try { localStorage.setItem(CLE, JSON.stringify(s)); } catch {} }

// ── Dessin ───────────────────────────────────────────────────
function losange(ctx: CanvasRenderingContext2D, cx: number, cy: number, l: number, h: number) { ctx.beginPath(); ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + l / 2, cy); ctx.lineTo(cx, cy + h / 2); ctx.lineTo(cx - l / 2, cy); ctx.closePath(); }

function dessinerBoite(ctx: CanvasRenderingContext2D, s: Salle, o: { x: number; y: number }, z: number, ox: number, oy: number, l: number, h: number, haut: number, couleur: string) {
  const p = (x: number, y: number, e = 0) => { const v = versEcran(x, y, o, z); return { x: v.x, y: v.y - e * 40 * z }; };
  const H = haut;
  const a = p(ox, oy, H), b = p(ox + l, oy, H), c = p(ox + l, oy + h, H), d = p(ox, oy + h, H);
  const b0 = p(ox + l, oy), c0 = p(ox + l, oy + h), d0 = p(ox, oy + h);
  ctx.fillStyle = ombre(couleur, -0.25); ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c0.x, c0.y); ctx.lineTo(d0.x, d0.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ombre(couleur, -0.4); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c0.x, c0.y); ctx.lineTo(b0.x, b0.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = couleur; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(198,161,91,0.35)"; ctx.lineWidth = 1; ctx.stroke();
  void s;
}

function ombre(hex: string, k: number): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); if (!m) return hex;
  const f = (v: string) => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * (1 + k))));
  return `rgb(${f(m[1])},${f(m[2])},${f(m[3])})`;
}

const MASQUE_COULEURS: Record<string, [string, string]> = { masque_bal_simple: ["#2b2b2b", "#c9a84c"], masque_black_secret: ["#0d0d0d", "#3a3a3a"], masque_red_mystery: ["#5a0f1c", "#8b1a2b"], masque_golden_secret: ["#0d0d0d", "#e0b65a"] };

function dessinerAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, a: Apparence, geste: Geste, t: number, nom?: string, etiquette?: string) {
  const k = z * 1.15;
  const largeur = ({ fine: 9, moyenne: 11, ronde: 14, athletique: 12 } as Record<string, number>)[a.morphologie] || 11;
  const bob = geste === "marche" ? Math.abs(Math.sin(t * 10)) * 2 : geste === "danse" ? Math.sin(t * 6) * 2.5 : 0;
  const assis = geste === "assis" ? 8 : 0;
  const balance = geste === "danse" ? Math.sin(t * 6) * 3 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(balance, -bob + assis);
  // jambes et chaussures
  ctx.fillStyle = a.bas; ctx.fillRect(-largeur / 2 + 1, -22, largeur / 2 - 1, assis ? 12 : 20); ctx.fillRect(1, -22, largeur / 2 - 1, assis ? 12 : 20);
  ctx.fillStyle = a.chaussures; ctx.fillRect(-largeur / 2, -3 - (assis ? 8 : 0), largeur / 2, 3); ctx.fillRect(0, -3 - (assis ? 8 : 0), largeur / 2, 3);
  // buste
  ctx.fillStyle = a.haut; ctx.beginPath(); ctx.moveTo(-largeur / 2 - 1, -24); ctx.lineTo(largeur / 2 + 1, -24); ctx.lineTo(largeur / 2 - 1, -44); ctx.lineTo(-largeur / 2 + 1, -44); ctx.closePath(); ctx.fill();
  // bras
  ctx.strokeStyle = a.carnation; ctx.lineWidth = 3; ctx.lineCap = "round";
  const brasG = geste === "danse" ? -Math.PI / 2 + Math.sin(t * 6) * 0.6 : Math.PI / 2 + 0.15;
  const brasD = geste === "salut" ? -Math.PI / 2 - 0.3 + Math.sin(t * 12) * 0.35 : geste === "danse" ? -Math.PI / 2 - Math.sin(t * 6) * 0.6 : Math.PI / 2 - 0.15;
  for (const [sx, ang] of [[-largeur / 2 - 1, brasG], [largeur / 2 + 1, brasD]] as [number, number][]) { ctx.beginPath(); ctx.moveTo(sx, -42); ctx.lineTo(sx + Math.sign(sx) * Math.abs(Math.cos(ang)) * 10, -42 + Math.sin(ang) * 14); ctx.stroke(); }
  // bijoux
  if (a.bijoux !== "aucun") { ctx.fillStyle = a.bijoux === "perles" ? "#f4efe6" : a.bijoux === "or" ? "#e0b65a" : "#d9f1ff"; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 2.2, -44 + Math.abs(i) * 0.6, 1, 0, Math.PI * 2); ctx.fill(); } }
  // tête
  const ry = a.visage === "rond" ? 7 : a.visage === "carre" ? 7.5 : 8;
  ctx.fillStyle = a.carnation; ctx.beginPath(); if (a.visage === "carre") { ctx.rect(-6.5, -59, 13, 14); } else if (a.visage === "coeur") { ctx.moveTo(-7, -56); ctx.quadraticCurveTo(-7, -61, 0, -61); ctx.quadraticCurveTo(7, -61, 7, -56); ctx.quadraticCurveTo(5, -47, 0, -45); ctx.quadraticCurveTo(-5, -47, -7, -56); } else { ctx.ellipse(0, -53, 7, ry, 0, 0, Math.PI * 2); } ctx.fill();
  // cheveux
  ctx.fillStyle = a.cheveux;
  switch (a.coiffure) {
    case "courts": ctx.beginPath(); ctx.ellipse(0, -58, 7.5, 4.5, 0, Math.PI, 0); ctx.fill(); break;
    case "longs": ctx.beginPath(); ctx.ellipse(0, -58, 8, 5, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-8, -58, 3, 16); ctx.fillRect(5, -58, 3, 16); break;
    case "boucles": for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 2.4, -60 + Math.abs(i) * 0.8, 2.8, 0, Math.PI * 2); ctx.fill(); } break;
    case "chignon": ctx.beginPath(); ctx.ellipse(0, -58, 7.5, 4.5, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(0, -64, 3.5, 0, Math.PI * 2); ctx.fill(); break;
    case "tresses": ctx.beginPath(); ctx.ellipse(0, -58, 7.5, 4.5, 0, Math.PI, 0); ctx.fill(); for (const sx of [-7, 6]) for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(sx + 0.5, -54 + j * 4, 1.6, 0, Math.PI * 2); ctx.fill(); } break;
    case "afro": ctx.beginPath(); ctx.arc(0, -59, 10, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); break;
  }
  // visage : yeux, expression, maquillage
  ctx.fillStyle = "#1a1110";
  if (a.expression === "clin") { ctx.fillRect(-4, -54, 2.4, 0.9); ctx.beginPath(); ctx.arc(3, -54, 1, 0, Math.PI * 2); ctx.fill(); }
  else if (a.expression === "mystere") { ctx.fillRect(-4.2, -54, 2.6, 0.9); ctx.fillRect(1.8, -54, 2.6, 0.9); }
  else { ctx.beginPath(); ctx.arc(-3, -54, 1, 0, Math.PI * 2); ctx.arc(3, -54, 1, 0, Math.PI * 2); ctx.fill(); }
  if (a.maquillage === "smoky") { ctx.fillStyle = "rgba(40,20,40,0.55)"; ctx.fillRect(-5, -56, 4, 1.5); ctx.fillRect(1, -56, 4, 1.5); }
  ctx.strokeStyle = a.maquillage === "rouge" ? "#a3122a" : a.maquillage === "aucun" ? "rgba(60,30,30,0.7)" : "#8a3a3a"; ctx.lineWidth = a.maquillage === "rouge" ? 1.6 : 1;
  ctx.beginPath(); if (a.expression === "rire") ctx.arc(0, -49.5, 2.2, 0, Math.PI); else if (a.expression === "mystere") { ctx.moveTo(-2, -49); ctx.lineTo(2, -49.5); } else ctx.arc(0, -50.5, 2, 0.2, Math.PI - 0.2); ctx.stroke();
  // masque (accessoire graphique réel : dessiné sur le visage, sans masquer le nom ni le badge)
  if (a.masque && a.masque !== "aucun") {
    const [fond, liseré] = MASQUE_COULEURS[a.masque] || ["#2b2b2b", "#c9a84c"];
    ctx.fillStyle = fond; ctx.beginPath(); ctx.moveTo(-8, -56); ctx.quadraticCurveTo(-4, -59.5, 0, -56.5); ctx.quadraticCurveTo(4, -59.5, 8, -56); ctx.quadraticCurveTo(6, -51.5, 0, -53.5); ctx.quadraticCurveTo(-6, -51.5, -8, -56); ctx.fill();
    ctx.strokeStyle = liseré; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = a.carnation; ctx.beginPath(); ctx.ellipse(-3.2, -55.3, 1.6, 1, 0, 0, Math.PI * 2); ctx.ellipse(3.2, -55.3, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = liseré; for (let i = -6; i <= 6; i += 3) { ctx.beginPath(); ctx.arc(i, -57.8 + Math.abs(i) * 0.25, 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  // accessoire
  if (a.accessoire === "chapeau") { ctx.fillStyle = "#6b4a2a"; ctx.beginPath(); ctx.ellipse(0, -61, 12, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-5.5, -69, 11, 8); }
  if (a.accessoire === "rose") { ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(7, -60, 2.6, 0, Math.PI * 2); ctx.fill(); }
  if (a.accessoire === "eventail") { ctx.fillStyle = "rgba(196,139,159,0.9)"; ctx.beginPath(); ctx.moveTo(largeur / 2 + 3, -38); ctx.arc(largeur / 2 + 3, -38, 9, -Math.PI * 0.9, -Math.PI * 0.4); ctx.closePath(); ctx.fill(); }
  if (a.accessoire === "noeud") { ctx.fillStyle = "#c9a84c"; ctx.beginPath(); ctx.moveTo(-4, -46); ctx.lineTo(0, -44.5); ctx.lineTo(-4, -43); ctx.moveTo(4, -46); ctx.lineTo(0, -44.5); ctx.lineTo(4, -43); ctx.fill(); }
  ctx.restore();
  if (nom) {
    ctx.save(); ctx.font = `600 ${Math.max(10, 11 * z)}px ${BODY}`; ctx.textAlign = "center";
    const texte = etiquette ? `${nom} · ${etiquette}` : nom; const w = ctx.measureText(texte).width + 10; const ty = y - (78 - assis) * k - bob * k;
    ctx.fillStyle = "rgba(11,7,9,0.8)"; ctx.fillRect(x - w / 2, ty - 11, w, 15); ctx.fillStyle = etiquette ? "#e3b9bd" : C.goldL; ctx.fillText(texte, x, ty); ctx.restore();
  }
}

type Etat = { salle: string; x: number; y: number; chemin: Case[]; geste: Geste; gesteFin: number; transition: number };

export default function SecretWorldClient() {
  const toile = useRef<HTMLCanvasElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const etat = useRef<Etat>({ salle: "grand_hall", x: 4.5, y: 6.5, chemin: [], geste: "aucun", gesteFin: 0, transition: 0 });
  const touches = useRef<Set<string>>(new Set());
  const joy = useRef<{ actif: boolean; x: number; y: number; ox: number; oy: number }>({ actif: false, x: 0, y: 0, ox: 0, oy: 0 });
  const [apparence, setApparence] = useState<Apparence>({ ...APPARENCE_DEFAUT, pseudo: "Invité·e" });
  const apparenceRef = useRef(apparence); apparenceRef.current = apparence;
  const [tenues, setTenues] = useState<Sauvegarde["tenues"]>([]);
  const [salleId, setSalleId] = useState("grand_hall");
  const [panneau, setPanneau] = useState<"" | "avatar" | "carte">("");
  const [info, setInfo] = useState<{ titre: string; texte: string; lien?: string; pnj?: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [fondatrice, setFondatrice] = useState(false);
  const [pret, setPret] = useState(false);
  const [joyAffiche, setJoyAffiche] = useState({ x: 0, y: 0 });

  // Restauration (après fermeture, mise à jour ou actualisation)
  useEffect(() => {
    const f = estFondatrice(); setFondatrice(f);
    const s = lire(); const masques = f ? MASQUES_SIGNATURE.map(m => m.id) : [];
    if (s) {
      const ap = normaliserApparence(s.apparence, masques); setApparence(ap);
      setTenues((s.tenues || []).slice(0, 6).map(t => ({ nom: String(t.nom).slice(0, 24), apparence: normaliserApparence(t.apparence, masques) })));
      const sal = SALLES[s.salle] ? s.salle : "grand_hall"; const sl = SALLES[sal];
      const ok = typeof s.x === "number" && typeof s.y === "number" && !obstacleEn(sl, s.x, s.y) && s.x >= 0 && s.y >= 0 && s.x < sl.largeur && s.y < sl.hauteur;
      etat.current = { ...etat.current, salle: sal, x: ok ? s.x : sl.depart.x + 0.5, y: ok ? s.y : sl.depart.y + 0.5 };
      setSalleId(sal);
    } else setPanneau("avatar");
    setPret(true);
  }, []);
  const sauver = useCallback((ap = apparenceRef.current, tn = tenues) => { const e = etat.current; ecrire({ apparence: ap, tenues: tn, salle: e.salle, x: e.x, y: e.y }); }, [tenues]);
  useEffect(() => { if (pret) sauver(apparence, tenues); }, [apparence, tenues, pret, sauver]);

  const changerSalle = useCallback((vers: string, arrivee: Case) => {
    const dest = SALLES[vers];
    if (!dest) { const p = SALLES_PREVUES.find(x => x.id === vers); setMessage(`${p?.nom || vers} : salle à venir (phase ${p?.phase ?? "?"}). Elle n’est pas encore ouverte.`); return false; }
    etat.current = { ...etat.current, salle: vers, x: arrivee.x + 0.5, y: arrivee.y + 0.5, chemin: [], geste: "aucun", transition: 1 };
    setSalleId(vers); setMessage(`Vous entrez dans ${dest.nom}.`); sauver(); return true;
  }, [sauver]);

  // Boucle d'animation (ralentie à l'arrêt pour économiser la batterie ; stoppée quand la page est masquée)
  useEffect(() => {
    const cv = toile.current; if (!cv || !pret) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    let raf = 0, dernier = performance.now(), dernierDessin = 0, visible = !document.hidden, porteQuittee = true, bougeait = false;
    const taille = () => { const r = cadre.current!.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dernierDessin = 0; };
    taille(); const ro = new ResizeObserver(taille); ro.observe(cadre.current!);
    const vis = () => { visible = !document.hidden; if (visible) { dernier = performance.now(); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis);
    const vue = () => { const s = SALLES[etat.current.salle]; const W = cv.clientWidth, H = cv.clientHeight; const z = Math.max(0.45, Math.min(1.4, W / ((s.largeur + s.hauteur) * (TUILE.l / 2) + 20), (H - 90) / ((s.largeur + s.hauteur) * (TUILE.h / 2) + 60))); return { s, z, o: { x: W / 2 - (s.largeur - s.hauteur) * (TUILE.l / 4) * z, y: (H - (s.largeur + s.hauteur) * (TUILE.h / 2) * z) / 2 + 50 * z } }; };
    (cv as HTMLCanvasElement & { __vue?: typeof vue }).__vue = vue;
    function tick(now: number) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - dernier) / 1000); dernier = now;
      const e = etat.current; const s = SALLES[e.salle];
      let bouge = false;
      // clavier / joystick : déplacement continu
      let dx = 0, dy = 0; const k = touches.current;
      if (k.has("ArrowUp") || k.has("z") || k.has("w")) { dx -= 1; dy -= 1; }
      if (k.has("ArrowDown") || k.has("s")) { dx += 1; dy += 1; }
      if (k.has("ArrowLeft") || k.has("q") || k.has("a")) { dx -= 1; dy += 1; }
      if (k.has("ArrowRight") || k.has("d")) { dx += 1; dy -= 1; }
      if (joy.current.actif) { const j = joystickVersGrille(joy.current.x, joy.current.y); dx = j.dx; dy = j.dy; }
      if (dx || dy) { const m = Math.hypot(dx, dy) || 1; const v = 3.2 * dt; const p = deplacer(s, e, (dx / m) * v * Math.min(1, Math.hypot(dx, dy)), (dy / m) * v * Math.min(1, Math.hypot(dx, dy))); e.x = p.x; e.y = p.y; e.chemin = []; bouge = true; if (e.geste === "assis" || e.geste === "danse") e.geste = "aucun"; }
      else if (e.chemin.length) { const r = avancer(e, e.chemin[0], 3.2, dt); e.x = r.x; e.y = r.y; if (r.atteint) e.chemin.shift(); bouge = true; }
      if (bouge) {
        const p = porteEn(s, e.x, e.y);
        if (p && porteQuittee) { porteQuittee = false; if (!changerSalle(p.vers, p.arrivee)) { e.chemin = []; } }
        else if (!p) porteQuittee = true;
      }
      const geste: Geste = bouge ? "marche" : e.geste !== "aucun" && (e.gesteFin === 0 || now < e.gesteFin) ? e.geste : "aucun";
      if (e.geste === "salut" && e.gesteFin && now >= e.gesteFin) e.geste = "aucun";
      if (e.transition > 0) e.transition = Math.max(0, e.transition - dt * 2.5);
      const anime = bouge || geste !== "aucun" || e.transition > 0 || !!s.piste;
      if (anime || now - dernierDessin > 500) { dessiner(ctx!, now / 1000, geste); dernierDessin = now; }
      // Position enregistrée pendant la marche (chaque seconde) et dès l'arrêt : reprise exacte après une coupure.
      if ((bouge && Math.floor(now / 1000) !== Math.floor((now - dt * 1000) / 1000)) || (!bouge && bougeait)) sauver();
      bougeait = bouge;
      raf = requestAnimationFrame(tick);
    }
    function dessiner(c: CanvasRenderingContext2D, t: number, geste: Geste) {
      const { s, z, o } = vue(); const W = cv!.clientWidth, H = cv!.clientHeight; const e = etat.current;
      const fond = c.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, Math.max(W, H)); fond.addColorStop(0, "#2a0d18"); fond.addColorStop(1, "#0b0709"); c.fillStyle = fond; c.fillRect(0, 0, W, H);
      // murs du fond
      const hm = 70 * z; const p00 = versEcran(0, 0, o, z), pL = versEcran(0, s.hauteur, o, z), pR = versEcran(s.largeur, 0, o, z);
      c.fillStyle = ombre(s.mur, -0.1); c.beginPath(); c.moveTo(p00.x, p00.y); c.lineTo(pL.x, pL.y); c.lineTo(pL.x, pL.y - hm); c.lineTo(p00.x, p00.y - hm); c.closePath(); c.fill();
      c.fillStyle = ombre(s.mur, -0.3); c.beginPath(); c.moveTo(p00.x, p00.y); c.lineTo(pR.x, pR.y); c.lineTo(pR.x, pR.y - hm); c.lineTo(p00.x, p00.y - hm); c.closePath(); c.fill();
      c.strokeStyle = "rgba(198,161,91,0.45)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(pL.x, pL.y - hm); c.lineTo(p00.x, p00.y - hm); c.lineTo(pR.x, pR.y - hm); c.stroke();
      // sol
      for (let x = 0; x < s.largeur; x++) for (let y = 0; y < s.hauteur; y++) {
        const p = versEcran(x + 0.5, y + 0.5, o, z); losange(c, p.x, p.y, TUILE.l * z, TUILE.h * z);
        const piste = surPiste(s, x, y);
        c.fillStyle = piste ? `hsla(${(345 + Math.sin(t * 2 + x + y) * 15).toFixed(0)}, 70%, ${(26 + Math.sin(t * 3 + x * 2 + y) * 8).toFixed(0)}%, 1)` : s.sol[(x + y) % 2]; c.fill();
        c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 1; c.stroke();
      }
      // halo de lumière tamisée
      const halo = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.6); halo.addColorStop(0, s.lumiere); halo.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = halo; c.fillRect(0, 0, W, H);
      // portes
      for (const p of s.portes) { const v = versEcran(p.x + 0.5, p.y + 0.5, o, z); losange(c, v.x, v.y, TUILE.l * z, TUILE.h * z); c.fillStyle = SALLES[p.vers] ? "rgba(198,161,91,0.35)" : "rgba(196,139,159,0.18)"; c.fill(); c.font = `600 ${Math.max(9, 10 * z)}px ${BODY}`; c.textAlign = "center"; c.fillStyle = SALLES[p.vers] ? C.goldL : "#c48b9f"; c.fillText(`🚪 ${p.libelle}${SALLES[p.vers] ? "" : " (à venir)"}`, v.x, v.y - 8 * z); }
      // éléments triés par profondeur
      type El = { p: number; d: () => void };
      const els: El[] = [];
      for (const ob of s.obstacles) els.push({ p: ob.x + ob.l + ob.y + ob.h - 1, d: () => dessinerBoite(c, s, o, z, ob.x, ob.y, ob.l, ob.h, ob.hauteur ?? 0.8, ob.couleur) });
      for (const se of s.sieges) els.push({ p: se.x + se.y + 0.5, d: () => { dessinerBoite(c, s, o, z, se.x + 0.15, se.y + 0.15, 0.7, 0.7, 0.35, "#6b0f1a"); } });
      for (const obj of s.objets) els.push({ p: obj.x + obj.y + 0.6, d: () => { const v = versEcran(obj.x + 0.5, obj.y + 0.5, o, z); dessinerBoite(c, s, o, z, obj.x + 0.2, obj.y + 0.2, 0.6, 0.6, 0.5, obj.type === "tableau" ? "#2b1a12" : "#14402a"); c.font = `${Math.max(14, 18 * z)}px ${BODY}`; c.textAlign = "center"; c.fillText(obj.type === "table_cartes" ? "🃏" : obj.type === "tableau" ? "🏆" : "🎭", v.x, v.y - 26 * z - Math.sin(t * 2) * 2); } });
      for (const n of s.pnj) els.push({ p: n.x + n.y + 1, d: () => { const v = versEcran(n.x + 0.5, n.y + 0.5, o, z); dessinerAvatar(c, v.x, v.y, z, { ...APPARENCE_DEFAUT, coiffure: "chignon", haut: "#0d0d0d", bijoux: "or", masque: "masque_bal_simple", accessoire: "rose", maquillage: "rouge", pseudo: n.nom }, "aucun", t, n.nom, "PNJ"); } });
      els.push({ p: e.x + e.y, d: () => { const v = versEcran(e.x, e.y, o, z); dessinerAvatar(c, v.x, v.y, z, apparenceRef.current, geste, t, apparenceRef.current.pseudo || "Vous", "vous"); } });
      els.sort((a, b) => a.p - b.p).forEach(x => x.d());
      // destination
      if (e.chemin.length) { const f = e.chemin[e.chemin.length - 1]; const v = versEcran(f.x + 0.5, f.y + 0.5, o, z); losange(c, v.x, v.y, TUILE.l * z * 0.6, TUILE.h * z * 0.6); c.strokeStyle = C.goldL; c.lineWidth = 2; c.stroke(); }
      c.font = `500 ${DISPLAY.includes("Cormorant") ? 20 : 18}px ${DISPLAY}`; c.textAlign = "left"; c.fillStyle = C.goldL; c.fillText(s.nom, 14, 28);
      if (e.transition > 0) { c.fillStyle = `rgba(11,7,9,${e.transition})`; c.fillRect(0, 0, W, H); }
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [pret, changerSalle, sauver]);

  // Clavier
  useEffect(() => {
    const bas = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest("input,select,textarea")) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "z", "q", "s", "d", "w", "a"].includes(k)) { touches.current.add(k); e.preventDefault(); } };
    const haut = (e: KeyboardEvent) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; touches.current.delete(k); };
    window.addEventListener("keydown", bas); window.addEventListener("keyup", haut);
    return () => { window.removeEventListener("keydown", bas); window.removeEventListener("keyup", haut); };
  }, []);

  // Toucher / clic sur le monde
  const surToucher = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = toile.current as (HTMLCanvasElement & { __vue?: () => { s: Salle; z: number; o: { x: number; y: number } } }) | null; if (!cv?.__vue) return;
    const r = cv.getBoundingClientRect(); const { s, z, o } = cv.__vue(); const px = ev.clientX - r.left, py = ev.clientY - r.top;
    const cible = versCase(px, py + 20 * z, o, z); const cx = Math.floor(cible.x), cy = Math.floor(cible.y);
    const pnj: Pnj | undefined = s.pnj.find(n => Math.abs(n.x - cx) <= 0 && Math.abs(n.y - cy) <= 0) || s.pnj.find(n => Math.hypot(n.x + 0.5 - cible.x, n.y + 0.5 - cible.y) < 1.1);
    if (pnj) { setInfo({ titre: `${pnj.nom} — PNJ`, texte: `Personnage non joueur (ce n’est pas une personne connectée). « ${pnj.phrase} »`, pnj: true }); return; }
    const obj: ObjetInteractif | undefined = s.objets.find(b => Math.hypot(b.x + 0.5 - cible.x, b.y + 0.5 - cible.y) < 0.9);
    if (obj) { setInfo({ titre: obj.libelle, texte: obj.type === "table_cartes" ? "Les jeux existants de BSH Secret Games s’ouvrent depuis cette table (ils ne sont pas recréés dans le monde)." : "Accès à THE RED ROOM et aux Red Room Awards (mode local en attendant le multijoueur).", lien: obj.lien }); return; }
    const e = etat.current; const ch = chemin(s, { x: Math.floor(e.x), y: Math.floor(e.y) }, { x: cx, y: cy });
    if (ch.length) { e.chemin = ch; if (e.geste === "assis" || e.geste === "danse") e.geste = "aucun"; setMessage(""); }
    else if (!(cx >= 0 && cy >= 0 && cx < s.largeur && cy < s.hauteur)) setMessage("Hors de la salle.");
    else if (obstacleEn(s, cx, cy)) setMessage(`${obstacleEn(s, cx, cy)!.nom} : passage impossible.`);
  };

  const geste = (g: Geste) => {
    const e = etat.current; const s = SALLES[e.salle];
    if (g === "assis") { const sg = siegeProche(s, e.x, e.y); if (!sg) { setMessage("Approchez-vous d’un fauteuil pour vous asseoir."); return; } e.x = sg.x + 0.5; e.y = sg.y + 0.5; e.chemin = []; e.geste = "assis"; e.gesteFin = 0; }
    else if (g === "danse") { e.geste = "danse"; e.gesteFin = 0; e.chemin = []; setMessage(surPiste(s, e.x, e.y) ? "Vous dansez sur la piste." : "Vous dansez."); return; }
    else if (g === "salut") { e.geste = "salut"; e.gesteFin = performance.now() + 2000; }
    setMessage("");
  };

  const masquesPermis = fondatrice ? MASQUES_SIGNATURE.map(m => m.id) : [];
  const majApparence = (k: keyof Apparence, v: string) => {
    const ap = normaliserApparence({ ...apparence, [k]: v }, masquesPermis);
    const err = apparenceAutorisee({ masque: ap.masque === "aucun" ? null : ap.masque }, fondatrice);
    if (err.length) { setMessage(err[0]); return; }
    setApparence(ap);
  };

  const salle = SALLES[salleId];
  return (
    <main style={{ height: "calc(100dvh - 61px)", minHeight: 520, background: C.night, color: C.cream, fontFamily: BODY, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "calc(10px + env(safe-area-inset-top,0px)) 14px 8px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, color: C.goldL, lineHeight: 1 }}>BSH Secret World</div>
          <div data-testid="statut-monde" style={{ fontSize: 11.5, color: "#e3b9bd" }}>Maquette — joueur seul · aucune présence réelle</div>
        </div>
        <button data-testid="ouvrir-avatar" style={bouton(panneau === "avatar")} onClick={() => setPanneau(panneau === "avatar" ? "" : "avatar")}>Mon avatar</button>
        <button data-testid="ouvrir-carte" style={bouton(panneau === "carte")} onClick={() => setPanneau(panneau === "carte" ? "" : "carte")}>Carte</button>
      </div>
      <div ref={cadre} style={{ position: "relative", flex: 1, minHeight: 360, touchAction: "none" }}>
        <canvas data-testid="monde" ref={toile} onPointerDown={surToucher} aria-label={`Salle ${salle?.nom}. Touchez un point pour vous y rendre.`} role="img" style={{ display: "block", width: "100%", height: "100%" }} />
        <div data-salle={salleId} data-testid="salle-actuelle" style={{ position: "absolute", top: 40, left: 14, fontSize: 11.5, color: C.muted, maxWidth: "60%" }}>{salle?.accroche}</div>
        <div data-testid="presence" style={{ position: "absolute", top: 8, right: 10, fontSize: 11, color: C.muted, background: "rgba(11,7,9,0.7)", padding: "4px 8px", borderRadius: 8, maxWidth: 190, textAlign: "right" }}>Joueurs connectés : présence réelle non activée (phase 2)</div>
        {/* Joystick virtuel (téléphone) */}
        <div data-testid="joystick" aria-label="Joystick" role="application"
          onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); joy.current = { actif: true, ox: r.left + r.width / 2, oy: r.top + r.height / 2, x: 0, y: 0 }; }}
          onPointerMove={e => { if (!joy.current.actif) return; const dx = (e.clientX - joy.current.ox) / 45, dy = (e.clientY - joy.current.oy) / 45; const n = Math.hypot(dx, dy); const k = n > 1 ? 1 / n : 1; joy.current.x = dx * k; joy.current.y = dy * k; setJoyAffiche({ x: dx * k * 30, y: dy * k * 30 }); }}
          onPointerUp={() => { joy.current.actif = false; joy.current.x = 0; joy.current.y = 0; setJoyAffiche({ x: 0, y: 0 }); }}
          onPointerCancel={() => { joy.current.actif = false; setJoyAffiche({ x: 0, y: 0 }); }}
          style={{ position: "absolute", left: 16, bottom: "calc(16px + env(safe-area-inset-bottom,0px))", width: 96, height: 96, borderRadius: "50%", background: "rgba(198,161,91,0.12)", border: `1px solid ${C.border}`, touchAction: "none" }}>
          <div style={{ position: "absolute", left: 48 - 20 + joyAffiche.x, top: 48 - 20 + joyAffiche.y, width: 40, height: 40, borderRadius: "50%", background: "rgba(198,161,91,0.45)" }} />
        </div>
        <div style={{ position: "absolute", right: 12, bottom: "calc(16px + env(safe-area-inset-bottom,0px))", display: "flex", flexDirection: "column", gap: 6 }}>
          <button data-testid="geste-assis" style={bouton()} onClick={() => geste("assis")}>🪑 S’asseoir</button>
          <button data-testid="geste-danse" style={bouton()} onClick={() => geste("danse")}>💃 Danser</button>
          <button data-testid="geste-salut" style={bouton()} onClick={() => geste("salut")}>👋 Saluer</button>
        </div>
        {message && <div data-testid="message-monde" role="status" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 64, background: "rgba(11,7,9,0.85)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", fontSize: 12.5, maxWidth: "86%", textAlign: "center" }}>{message}</div>}
        {info && (
          <div data-testid="fiche-info" role="dialog" style={{ position: "absolute", left: 12, right: 12, top: 90, maxWidth: 420, margin: "0 auto", background: "#17101a", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 700, color: C.goldL, marginBottom: 6 }}>{info.titre}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{info.texte}</div>
            {info.pnj && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Le menu des joueurs (profil, saluer, converser, amitié, danser, inviter, bloquer, signaler) s’active avec la présence réelle : chaque invitation devra être acceptée par la personne concernée.</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {info.lien && <Link href={info.lien} style={{ ...bouton(true), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Ouvrir</Link>}
              <button style={bouton()} onClick={() => setInfo(null)}>Fermer</button>
            </div>
          </div>
        )}
      </div>

      {panneau === "carte" && (
        <div data-testid="carte-monde" style={{ padding: 14, borderTop: `1px solid ${C.border}`, background: "#120b10" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Carte du monde</div>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.values(SALLES).map(s => <button key={s.id} data-testid={`aller-${s.id}`} style={{ ...bouton(s.id === salleId), textAlign: "left" }} onClick={() => { changerSalle(s.id, s.depart); setPanneau(""); }}>{s.nom}{s.id === salleId ? " · vous êtes ici" : ""}</button>)}
            {SALLES_PREVUES.map(s => <div key={s.id} style={{ fontSize: 12.5, color: C.muted, padding: "4px 2px" }}>{s.nom} — à venir (phase {s.phase})</div>)}
          </div>
        </div>
      )}

      {panneau === "avatar" && (
        <div data-testid="editeur-avatar" style={{ padding: 14, borderTop: `1px solid ${C.border}`, background: "#120b10", maxHeight: "55dvh", overflowY: "auto" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Atelier d’avatar</div>
          <label style={{ fontSize: 12, color: C.muted }}>Pseudonyme<input data-testid="avatar-pseudo" value={apparence.pseudo} maxLength={24} onChange={e => setApparence(normaliserApparence({ ...apparence, pseudo: e.target.value }, masquesPermis))} style={{ width: "100%", boxSizing: "border-box", minHeight: 44, fontSize: 16, background: "rgba(255,255,255,0.06)", color: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", marginTop: 4 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginTop: 8 }}>
            {(Object.keys(CHOIX_AVATAR) as (keyof typeof CHOIX_AVATAR)[]).map(k => (
              <label key={k} style={{ fontSize: 12, color: C.muted, textTransform: "capitalize" }}>{k}
                <select data-testid={`avatar-${k}`} value={apparence[k]} onChange={e => majApparence(k, e.target.value)} style={{ width: "100%", minHeight: 44, fontSize: 16, background: "#1d1218", color: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, marginTop: 4 }}>
                  {(CHOIX_AVATAR[k] as readonly (readonly [string, string])[]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  {k === "masque" && fondatrice && MASQUES_SIGNATURE.map(m => <option key={m.id} value={m.id}>{m.nom} (signature)</option>)}
                </select>
              </label>
            ))}
          </div>
          {fondatrice && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Masques signature Black Secret, Red Mystery et Golden Secret : réservés à votre compte. Le masque ne change ni votre badge ni vos permissions. L’exclusivité est aussi contrôlée par le serveur une fois la mise à jour de la base appliquée.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button data-testid="enregistrer-tenue" style={bouton()} onClick={() => { const nom = prompt("Nom de la tenue ?", `Tenue ${tenues.length + 1}`); if (nom) setTenues([...tenues.filter(t => t.nom !== nom), { nom: nom.slice(0, 24), apparence }].slice(-6)); }}>Enregistrer cette tenue</button>
            {tenues.map(t => <button key={t.nom} style={bouton()} onClick={() => setApparence(normaliserApparence(t.apparence, masquesPermis))}>{t.nom}</button>)}
            <button data-testid="fermer-avatar" style={bouton(true)} onClick={() => setPanneau("")}>Entrer dans le monde</button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Enregistré sur cet appareil (le profil en base viendra avec la phase 2). Ressources graphiques originales, dessinées par Bellaïa.</div>
        </div>
      )}
      <div style={{ padding: "8px 14px calc(10px + env(safe-area-inset-bottom,0px))", fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap", color: C.muted }}>
        <span>Toucher : marcher · Joystick ou flèches / ZQSD : se déplacer</span>
        <Link href="/bsh/private-club" style={{ color: C.gold }}>BSH Private Club</Link>
        <Link href="/bsh/secret-games" style={{ color: C.gold }}>Secret Games</Link>
      </div>
    </main>
  );
}
