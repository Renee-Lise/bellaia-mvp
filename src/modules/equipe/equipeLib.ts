// ═══════════════════════════════════════════════════════════
// Boîte à outils Équipe / Partenaires (migration 0112)
// • Fichiers PRIVÉS (bucket equipe-prive) : dépôt + liens temporaires,
//   jamais d'URL publique.
// • Montants manipulés en CENTIMES (entiers), affichés en euros.
// ═══════════════════════════════════════════════════════════
import type React from "react";
import { SB_URL, SB_KEY, jeton, sbRpc } from "../events/eventsAtelierLib";

export const BUCKET_PRIVE = "equipe-prive";

export async function sha256(f: Blob): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function nomFichierSur(nom: string) {
  const p = nom.lastIndexOf(".");
  const base = (p > 0 ? nom.slice(0, p) : nom).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "fichier";
  const ext = p > 0 ? nom.slice(p + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) : "bin";
  return `${base}.${ext}`;
}

/** Dépose un fichier dans l'espace privé (le chemin conditionne les droits). */
export async function deposerPrive(chemin: string, f: Blob, type?: string) {
  const t = await jeton();
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET_PRIVE}/${chemin.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": type || (f as any).type || "application/octet-stream", "x-upsert": "false" }, body: f,
  });
  if (!r.ok) { const x = await r.text().catch(() => ""); throw new Error(/exists|Duplicate/i.test(x) ? "Ce fichier existe déjà." : x || `Dépôt impossible (${r.status})`); }
  return chemin;
}

/** Lien temporaire (1 h par défaut) vers un fichier privé. */
export async function lienPrive(chemin: string, duree = 3600): Promise<string | null> {
  if (!chemin) return null;
  try {
    const t = await jeton();
    const r = await fetch(`${SB_URL}/storage/v1/object/sign/${BUCKET_PRIVE}/${chemin.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: duree }),
    });
    if (!r.ok) return null;
    const j = await r.json(); const s = j.signedURL || j.signedUrl;
    return s ? `${SB_URL}/storage/v1${s.startsWith("/") ? s : "/" + s}` : null;
  } catch { return null; }
}

export async function ouvrirPrive(chemin: string) {
  const u = await lienPrive(chemin);
  if (u) window.open(u, "_blank", "noopener"); else alert("Lien indisponible (droits ou fichier manquant).");
}

export type Acces = { fondatrice: boolean; roles: { role: string; organisation_id: string | null; organisation: string | null; statut_organisation: string | null }[]; permissions: string[]; hote_bsh: boolean };
export async function mesAcces(): Promise<Acces> {
  try { return await sbRpc<Acces>("mes_acces", {}); }
  catch { return { fondatrice: false, roles: [], permissions: [], hote_bsh: false }; }
}
export const aPerm = (a: Acces | null, p: string, u = "*") => !!a && (a.fondatrice || a.permissions.some(x => x === `${p}:*` || x === `${p}:${u}` || x.startsWith("acces_complet:")));

export const euros = (c?: number | null) => c == null ? "—" : (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
/** « 55 » ou « 55,50 » → 5550 ; vide → null ; invalide → NaN */
export function versCentimes(v: string): number | null {
  const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
export const enEuros = (c?: number | null) => c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", "");

export const ALLERGENES: [string, string][] = [
  ["gluten", "Céréales contenant du gluten"], ["crustaces", "Crustacés"], ["oeufs", "Œufs"], ["poissons", "Poissons"],
  ["arachides", "Arachides"], ["soja", "Soja"], ["lait", "Lait"], ["fruits_a_coque", "Fruits à coque"], ["celeri", "Céleri"],
  ["moutarde", "Moutarde"], ["sesame", "Graines de sésame"], ["sulfites", "Anhydride sulfureux et sulfites"], ["lupin", "Lupin"], ["mollusques", "Mollusques"],
];
export const STATUTS_ALLERGENE: [string, string, string][] = [
  ["inconnu", "Information inconnue", "#fb923c"], ["present", "Présence confirmée", "#f87171"],
  ["traces", "Contamination croisée possible", "#facc15"], ["absent", "Absence documentée", "#4ade80"],
];

export const SA = "system-ui, -apple-system, sans-serif";
export const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", bleu: "#60a5fa", violet: "#c084fc" };
export const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };
export const btn = (fort = false, c = C.or): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box", minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none" });
export const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 };
export const carte: React.CSSProperties = { background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 14 };
export const heure = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
