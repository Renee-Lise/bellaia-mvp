// ═══════════════════════════════════════════════════════════
// Identité visuelle — logo principal Bellaïa, remplaçable par la
// fondatrice sans modification de code (migration 0076).
// src/modules/identite/identiteApi.ts
//
// Bucket storage "bellaia-branding" (public en lecture) + table
// bellaia_identite_visuelle (historique des versions, une seule
// ligne actif=true à la fois). Écriture réservée à is_fondatrice()
// par RLS — ce module ne fait qu'appeler les routes REST, jamais de
// confiance aveugle dans le fait qu'un bouton soit caché côté UI.
// ═══════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BUCKET = "bellaia-branding";

async function getToken(): Promise<string> {
  if (typeof window === "undefined") return SB_KEY;
  return localStorage.getItem("bellaia_token") || SB_KEY;
}

export interface VersionLogo {
  id: string;
  type: string;
  storagePath: string;
  url: string;
  actif: boolean;
  createdAt: string;
}

const mapVersion = (r: any): VersionLogo => ({
  id: r.id, type: r.type, storagePath: r.storage_path, url: r.url,
  actif: !!r.actif, createdAt: r.created_at,
});

// ── Lecture publique du logo actif (utilisée aussi côté connexion,
//    non authentifiée — policy bellaia_identite_lecture_active) ──
export async function getLogoActif(): Promise<VersionLogo | null> {
  if (!SB_URL) return null;
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/bellaia_identite_visuelle?type=eq.logo_principal&actif=eq.true&select=*&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) && d[0] ? mapVersion(d[0]) : null;
  } catch { return null; }
}

// ── Historique complet (fondatrice uniquement — RLS) ──
export async function getHistoriqueLogos(): Promise<VersionLogo[]> {
  if (!SB_URL) return [];
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/bellaia_identite_visuelle?type=eq.logo_principal&select=*&order=created_at.desc`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${await getToken()}` } }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d.map(mapVersion) : [];
  } catch { return []; }
}

// ── Import d'une nouvelle version — crée une ligne actif=false
//    (candidate), à confirmer explicitement ensuite ──
const FORMATS_OK = ["image/png", "image/jpeg", "image/webp"];
const TAILLE_MAX = 8 * 1024 * 1024; // 8 Mo

export async function importerLogo(file: File): Promise<{ ok: boolean; version?: VersionLogo; error?: string }> {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  if (!FORMATS_OK.includes(file.type)) return { ok: false, error: "Format non accepté — utilisez un PNG, JPEG ou WebP." };
  if (file.size > TAILLE_MAX) return { ok: false, error: "Fichier trop volumineux (8 Mo maximum)." };

  const token = await getToken();
  const ext = file.name.split(".").pop() || "png";
  const path = `logo-principal/${Date.now()}.${ext}`;

  try {
    const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": file.type },
      body: file,
    });
    if (!up.ok) {
      const d = await up.json().catch(() => null);
      return { ok: false, error: d?.message || `Échec de l'import (${up.status}).` };
    }
    const url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    const ins = await fetch(`${SB_URL}/rest/v1/bellaia_identite_visuelle`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ type: "logo_principal", storage_path: path, url, actif: false }),
    });
    const d = await ins.json().catch(() => null);
    if (!ins.ok) return { ok: false, error: d?.message || "Import stocké mais l'enregistrement a échoué." };
    return { ok: true, version: mapVersion(Array.isArray(d) ? d[0] : d) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erreur réseau pendant l'import." };
  }
}

// ── Confirmer/restaurer une version : l'active, désactive les autres ──
export async function activerVersionLogo(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  const token = await getToken();
  try {
    await fetch(`${SB_URL}/rest/v1/bellaia_identite_visuelle?type=eq.logo_principal&actif=eq.true`, {
      method: "PATCH",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ actif: false }),
    });
    const r = await fetch(`${SB_URL}/rest/v1/bellaia_identite_visuelle?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ actif: true }),
    });
    if (!r.ok) return { ok: false, error: `Échec de l'activation (${r.status}).` };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "Erreur réseau." }; }
}

// ── Annuler un import non confirmé (jamais la version active) ──
export async function annulerVersionLogo(version: VersionLogo): Promise<{ ok: boolean; error?: string }> {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  if (version.actif) return { ok: false, error: "Impossible d'annuler la version actuellement active — activez-en une autre d'abord." };
  const token = await getToken();
  try {
    await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${version.storagePath}`, {
      method: "DELETE",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
    const r = await fetch(`${SB_URL}/rest/v1/bellaia_identite_visuelle?id=eq.${version.id}`, {
      method: "DELETE",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
    return { ok: r.ok };
  } catch (e: any) { return { ok: false, error: e?.message || "Erreur réseau." }; }
}
