// ═══════════════════════════════════════════════════════════
// BSH Secret Stories — accès aux données (migration 0129).
// • Tant que la migration n'est pas appliquée, le studio fonctionne en
//   SIMULATION (rien n'est enregistré, mention visible à l'écran).
// • Clientes : uniquement via les fonctions ss_* (contrôles en base :
//   adulte vérifiée, achats confirmés, abonnement actif, format détenu).
// • Fichiers : bucket privé, URL signée de 10 minutes.
// • Le dépôt est public : aucun texte d'ouvrage n'est dans le code.
// ═══════════════════════════════════════════════════════════
import { SB_URL, SB_KEY, jeton, sbSelect, sbInsert, sbUpdate, sbRpc } from "../events/eventsAtelierLib";

export const BUCKET_SS = "secret-stories-prive";
export const IA_AUTORISEE = false;          // aucune dépense IA tant que la fondatrice ne l'a pas activée

export type Oeuvre = { id: string; titre: string; sous_titre?: string | null; type: string; origine: string; parametres: any; synopsis?: string | null; avertissements: string[]; statut: string; prive: boolean; collection_id?: string | null; nb_mots?: number | null; updated_at?: string };
export type Chapitre = { id: string; oeuvre_id: string; ordre: number; titre: string | null; texte: string; statut: string; version: number; narration?: any; updated_at?: string };

let dispo: boolean | null = null;
export async function ssDisponible(): Promise<boolean> {
  if (dispo !== null) return dispo;
  try { await sbSelect("ss_oeuvres", "select=id&limit=1"); dispo = true; } catch { dispo = false; }
  return dispo;
}

// ── Studio ─────────────────────────────────────────────────
export const studio = {
  autorise: () => sbRpc<boolean>("ss_studio", {}).then(x => x === true).catch(() => false),
  oeuvres: () => sbSelect<Oeuvre>("ss_oeuvres", "select=*&order=updated_at.desc"),
  creerOeuvre: (o: Partial<Oeuvre>) => sbInsert<Oeuvre>("ss_oeuvres", o).then(r => r[0]),
  majOeuvre: (id: string, p: Partial<Oeuvre>) => sbUpdate<Oeuvre>("ss_oeuvres", id, p).then(r => r[0]),
  chapitres: (oeuvre: string) => sbSelect<Chapitre>("ss_chapitres", `oeuvre_id=eq.${oeuvre}&select=*&order=ordre.asc`),
  creerChapitre: (c: Partial<Chapitre>) => sbInsert<Chapitre>("ss_chapitres", c).then(r => r[0]),
  majChapitre: (id: string, p: Partial<Chapitre>) => sbUpdate<Chapitre>("ss_chapitres", id, p).then(r => r[0]),
  versions: (chapitre: string) => sbSelect<any>("ss_chapitres_versions", `chapitre_id=eq.${chapitre}&select=id,version,source,created_at&order=version.desc`),
  liste: (table: string, oeuvre: string) => sbSelect<any>(table, `oeuvre_id=eq.${oeuvre}&select=*&order=created_at.asc`),
  ajouter: (table: string, ligne: any) => sbInsert<any>(table, ligne).then(r => r[0]),
  demanderGeneration: (g: any) => sbInsert<any>("ss_generations", { ...g, statut: "en_attente" }).then(r => r[0]),
  generations: () => sbSelect<any>("ss_generations", "select=*&order=created_at.desc&limit=50"),
};

// ── Bibliothèque cliente ───────────────────────────────────
export const lecture = {
  estAdulte: () => sbRpc<boolean>("ss_est_adulte", {}).then(x => x === true).catch(() => false),
  catalogue: () => sbRpc<any[]>("ss_catalogue", {}).then(d => Array.isArray(d) ? d : []).catch(() => []),
  extrait: (id: string) => sbRpc<any>("ss_extrait", { p_extrait: id }).catch(() => null),
  chapitre: (oeuvre: string, ordre: number) => sbRpc<any>("ss_lire_chapitre", { p_oeuvre: oeuvre, p_ordre: ordre }).catch(() => null),
  fichiers: (oeuvre: string) => sbRpc<any[]>("ss_mes_fichiers", { p_oeuvre: oeuvre }).then(d => Array.isArray(d) ? d : []).catch(() => []),
  maBibliotheque: () => sbRpc<any[]>("ss_ma_bibliotheque", {}).then(d => Array.isArray(d) ? d : []).catch(() => []),
};

/** URL signée courte (10 min) ; le serveur refuse si la personne ne détient pas le droit. */
export async function urlSigneeSS(chemin: string, duree = 600): Promise<string | null> {
  if (!chemin) return null;
  try {
    const t = await jeton();
    const r = await fetch(`${SB_URL}/storage/v1/object/sign/${BUCKET_SS}/${chemin.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: duree }),
    });
    if (!r.ok) return null;
    const j = await r.json(); const s = j.signedURL || j.signedUrl;
    return s ? `${SB_URL}/storage/v1${s.startsWith("/") ? s : "/" + s}` : null;
  } catch { return null; }
}

// ── Progression de lecture (privée) ────────────────────────
// Enregistrée en base pour la cliente seule (ss_lecture) ; à défaut, sur l'appareil.
export async function lireProgressionSS(oeuvre: string, format: "ebook" | "audio") {
  try { const r = await sbSelect<any>("ss_lecture", `oeuvre_id=eq.${oeuvre}&format=eq.${format}&select=*`); if (r[0]) return r[0]; } catch {}
  try { return JSON.parse(localStorage.getItem(`ss_lecture_${oeuvre}_${format}`) || "null"); } catch { return null; }
}
export async function ecrireProgressionSS(oeuvre: string, format: "ebook" | "audio", etat: any) {
  try { localStorage.setItem(`ss_lecture_${oeuvre}_${format}`, JSON.stringify(etat)); } catch {}
  try { await sbInsert("ss_lecture", { oeuvre_id: oeuvre, format, ...etat, updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal"); } catch {}
}

// ── Estimations de coûts (tarifs publics relevés le 19/11/2026, à revérifier) ──
// Texte : Claude Sonnet 5.5 2 $ / 10 $ par million de jetons ; Opus 5.5 4 $ / 20 $.
// Voix : ElevenLabs API 0,08 $ / 1 000 caractères (multilingue) ou 0,04 $ (Flash/Turbo).
export const TARIFS = {
  sonnet: { entree: 2, sortie: 10, nom: "Claude Sonnet 5.5" },
  opus: { entree: 4, sortie: 20, nom: "Claude Opus 5.5" },
  voix: { multilingue: 0.08, flash: 0.04 },
  usdEur: 0.92, // conversion indicative
};
const JETONS_PAR_MOT = 1.35; // français, estimation
export function coutTexte(motsSortie: number, motsContexte: number, modele: "sonnet" | "opus" = "sonnet") {
  const t = TARIFS[modele]; const usd = (motsContexte * JETONS_PAR_MOT * t.entree + motsSortie * JETONS_PAR_MOT * t.sortie) / 1e6;
  return { usd, eur: usd * TARIFS.usdEur };
}
export function coutVoix(caracteres: number, modele: "multilingue" | "flash" = "multilingue") {
  const usd = caracteres / 1000 * TARIFS.voix[modele]; return { usd, eur: usd * TARIFS.usdEur };
}
export const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
export const motsDe = (t: string) => (t.trim().match(/\S+/g) || []).length;
