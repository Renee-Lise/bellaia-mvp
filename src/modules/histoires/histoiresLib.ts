// ═══════════════════════════════════════════════════════════
// Histoires du soir — accès aux données (Mo Ti-Péyi, espace jeunesse)
// Le dépôt est public : AUCUN texte ni média n'est dans le code. Tout
// vient de Supabase (tables protégées + fonctions de lecture publique,
// migration 0107). Les familles ne reçoivent que les tomes publiés.
// Progression : uniquement dans le navigateur (aucune donnée d'enfant).
// ═══════════════════════════════════════════════════════════
import { SB_URL, SB_KEY, jeton, sbRpc, sbSelect } from "../events/eventsAtelierLib";

export const BUCKET_HISTOIRES = "histoires-medias";
export type EtatMedia = "absent" | "brouillon" | "revision" | "publie";
export type Repere = { scene: string; debut_s: number };
export type SceneLecture = { identifiant: string; ordre: number; texte: string; titre?: string; mise_en_scene?: string | null; id?: string };
export type MediasLecture = {
  couverture?: { url: string; alt: string } | null;
  audio?: { url: string; reperes: Repere[] } | null;
  video?: { url: string; affiche: string; vtt: string } | null;
};
export type TomeLecture = { identifiant: string; collection: string; collection_titre: string; titre: string; numero: number; scenes: SceneLecture[]; medias: MediasLecture };

/** URL signée (bucket privé). Le serveur refuse tout fichier non publié aux familles. */
export async function urlSignee(chemin: string, duree = 6 * 3600): Promise<string | null> {
  if (!chemin) return null;
  try {
    const t = await jeton();
    const r = await fetch(`${SB_URL}/storage/v1/object/sign/${BUCKET_HISTOIRES}/${chemin.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: duree }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const s = j.signedURL || j.signedUrl;
    return s ? `${SB_URL}/storage/v1${s.startsWith("/") ? s : "/" + s}` : null;
  } catch { return null; }
}

export async function catalogueFamilles(): Promise<any[]> {
  const d = await sbRpc<any[]>("histoires_catalogue", {});
  return Array.isArray(d) ? d : [];
}

/** Tome publié pour une famille (null si inexistant ou non publié — rien n'est révélé). */
export async function lectureFamille(entree: any): Promise<TomeLecture | null> {
  const d = await sbRpc<any>("histoire_lecture", { p_collection: entree.collection, p_identifiant: entree.identifiant });
  if (!d) return null;
  const [couv, audio, video, affiche, vtt] = await Promise.all([
    entree.couverture ? urlSignee(entree.couverture.chemin) : null,
    entree.audio ? urlSignee(entree.audio.chemin) : null,
    entree.video ? urlSignee(entree.video.chemin) : null,
    entree.video ? urlSignee(entree.video.affiche) : null,
    entree.video ? urlSignee(entree.video.vtt) : null,
  ]);
  return {
    identifiant: d.identifiant, collection: entree.collection, collection_titre: d.collection_titre, titre: d.titre, numero: d.numero, scenes: d.scenes || [],
    medias: {
      couverture: couv ? { url: couv, alt: entree.couverture.alt } : null,
      audio: audio ? { url: audio, reperes: entree.audio.reperes || [] } : null,
      video: video && affiche && vtt ? { url: video, affiche, vtt } : null,
    },
  };
}

/** Aperçu fondatrice : tous les états, y compris les médias en brouillon. */
export async function lectureFondatrice(t: any): Promise<TomeLecture> {
  const scenes = await sbSelect<SceneLecture>("histoires_scenes", `select=id,identifiant,ordre,titre,mise_en_scene,texte&tome_id=eq.${t.id}&order=ordre.asc`);
  const [couv, audio, video, affiche, vtt] = await Promise.all([t.couverture_chemin, t.audio_chemin, t.video_chemin, t.video_affiche_chemin, t.video_vtt_chemin].map(c => (c ? urlSignee(c, 3600) : Promise.resolve(null))));
  return {
    identifiant: t.identifiant, collection: t.collection, collection_titre: t.collection_titre, titre: t.titre, numero: t.numero, scenes,
    medias: {
      couverture: couv ? { url: couv, alt: t.couverture_alt || "" } : null,
      audio: audio ? { url: audio, reperes: t.audio_reperes || [] } : null,
      video: video && affiche && vtt ? { url: video, affiche, vtt } : null,
    },
  };
}

// ── Progression locale par tome et par mode ─────────────────
const cle = (t: { collection: string; identifiant: string }, mode: string) => `bellaia.histoires.${t.collection}.${t.identifiant}.${mode}`;
export function lireProgression(t: { collection: string; identifiant: string }, mode: "lire" | "ecouter" | "regarder"): number {
  try { const v = Number(localStorage.getItem(cle(t, mode))); return Number.isFinite(v) && v > 0 ? v : 0; } catch { return 0; }
}
export function ecrireProgression(t: { collection: string; identifiant: string }, mode: "lire" | "ecouter" | "regarder", v: number) {
  try { if (v > 0) localStorage.setItem(cle(t, mode), String(Math.round(v * 10) / 10)); else localStorage.removeItem(cle(t, mode)); } catch {}
}
