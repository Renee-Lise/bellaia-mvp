"use client";
// ═══════════════════════════════════════════════════════════
// Version de l'application, changement de version et diagnostic (anomalie P0 du 24/11/2026).
//
// Cause constatée : une page restée ouverte sur l'iPhone (ancienne version) réclamait le fichier
// JavaScript de Secret Agenda de SA version ; après une nouvelle mise en ligne, ce fichier n'existe
// plus à la même adresse (404) → « Loading chunk … failed » → l'ancien code rechargeait la page en
// silence → retour à l'accueil.
//
// Désormais : AUCUN rechargement silencieux.
//  • l'écran demandé est mémorisé en continu (rubrique + onglet BSH) et restauré après rechargement ;
//  • l'erreur de chargement affiche un message explicite (« Mettre à jour et rouvrir cet écran ») ;
//  • une nouvelle version publiée est détectée au retour dans l'application (/api/version) ;
//  • chaque incident est noté dans un journal local consultable, et transmis sans donnée
//    personnelle (type, module, version, écran) à /api/diagnostic.
// ═══════════════════════════════════════════════════════════

/** Version compilée (7 premiers caractères du commit sur Vercel ; « locale » en développement). */
export const VERSION_APP: string = process.env.NEXT_PUBLIC_VERSION_APP || "locale";
export const VERSION_DATE: string = process.env.NEXT_PUBLIC_VERSION_DATE || "";

const RE_VERSION = /Loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i;
export function estErreurVersion(e: unknown): boolean {
  const msg = String((e as any)?.message || e || "") + " " + String((e as any)?.name || "");
  return RE_VERSION.test(msg);
}

// ── Mémorisation de l'écran ouvert ───────────────────────────
// localStorage (et non sessionStorage) : l'application installée sur l'écran d'accueil vide
// sessionStorage à la fermeture ; la position doit survivre à « fermer puis rouvrir ».
// Valeurs : identifiants d'écran uniquement (jamais de contenu ni de donnée personnelle).
const CLE_NAV = "bellaia-nav";
const DUREE_NAV_MS = 12 * 3600e3;

type EtatNav = Record<string, { v: string; t: number }>;
function lireTout(): EtatNav { try { return JSON.parse(localStorage.getItem(CLE_NAV) || "{}") || {}; } catch { return {}; } }

/** Mémorise un écran (ex. portee « f:fondatrice » → « bsh », « bsh-sec » → « agenda »). */
export function memoriserEcran(portee: string, valeur: string) {
  try { const t = lireTout(); t[portee] = { v: valeur, t: Date.now() }; localStorage.setItem(CLE_NAV, JSON.stringify(t)); } catch {}
}
/** Écran mémorisé il y a moins de 12 h, sinon null. */
export function ecranMemorise(portee: string): string | null {
  const e = lireTout()[portee];
  return e && typeof e.v === "string" && Date.now() - e.t < DUREE_NAV_MS ? e.v : null;
}

// ── Journal de diagnostic ────────────────────────────────────
export type Incident = { quand: string; type: string; module?: string; detail?: string; version: string; ecran?: string };
const CLE_JOURNAL = "bellaia-diagnostic";
const MAX_JOURNAL = 40;

/** Retire tout ce qui pourrait ressembler à une donnée personnelle d'un texte technique. */
export function nettoyer(texte: string): string {
  return String(texte || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[courriel]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[jeton]")
    .replace(/\+?\d[\d .-]{7,}\d/g, "[numéro]")
    .replace(/[?#].*$/gm, "")
    .slice(0, 300);
}

export function journal(): Incident[] { try { return JSON.parse(localStorage.getItem(CLE_JOURNAL) || "[]") || []; } catch { return []; } }

export function journaliser(type: string, infos: { module?: string; detail?: string } = {}) {
  const inc: Incident = { quand: new Date().toISOString(), type, module: infos.module, detail: infos.detail ? nettoyer(infos.detail) : undefined, version: VERSION_APP, ecran: ecranMemorise("dernier") || undefined };
  try { const l = journal(); l.push(inc); localStorage.setItem(CLE_JOURNAL, JSON.stringify(l.slice(-MAX_JOURNAL))); } catch {}
  try {
    const corps = JSON.stringify({ ...inc, appareil: resumeAppareil() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/diagnostic", new Blob([corps], { type: "application/json" }));
    else fetch("/api/diagnostic", { method: "POST", body: corps, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {}
  return inc;
}

/** « iPhone iOS 18.7 · application installée » — sans identifiant d'appareil. */
export function resumeAppareil(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent || "";
  const ios = ua.match(/OS (\d+)_(\d+)/);
  const appareil = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "autre";
  const installee = (navigator as any).standalone === true || (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches === true);
  return `${appareil}${ios ? ` iOS ${ios[1]}.${ios[2]}` : ""} · ${installee ? "application installée" : "navigateur"}`;
}

// ── Signalement d'une version obsolète à l'interface ─────────
export const EVT_VERSION = "bellaia-version-obsolete";
export type DetailVersion = { module?: string; cause: "chargement" | "nouvelle_version"; serveur?: string };

/** À appeler quand un module chargé à la demande échoue. Ne recharge JAMAIS la page.
 *  alerteGlobale = false quand l'écran affiche lui-même son message (évite un double message). */
export function signalerEchecModule(e: unknown, module?: string, alerteGlobale = true): boolean {
  const version = estErreurVersion(e);
  journaliser(version ? "module_version_obsolete" : "module_erreur", { module, detail: String((e as any)?.message || e || "") });
  if (version && alerteGlobale && typeof window !== "undefined") window.dispatchEvent(new CustomEvent<DetailVersion>(EVT_VERSION, { detail: { module, cause: "chargement" } }));
  return version;
}

/** Version actuellement servie (null si inconnue : réseau, développement). */
export async function versionServeur(): Promise<string | null> {
  try {
    const r = await fetch("/api/version", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.version === "string" ? j.version : null;
  } catch { return null; }
}

/** Recharge après accord explicite ; l'écran courant est déjà mémorisé. */
export function mettreAJour() {
  journaliser("mise_a_jour_acceptee");
  try { window.location.reload(); } catch {}
}
