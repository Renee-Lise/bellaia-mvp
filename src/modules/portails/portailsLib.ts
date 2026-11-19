// Outils communs aux portails (assistante, cliente, partenaires).
import { jeton, SB_KEY } from "../events/eventsAtelierLib";

/** Identifiant de la personne connectée (lu dans son jeton de session), ou null hors session. */
export async function monIdentifiant(): Promise<string | null> {
  try {
    const t = await jeton(); if (!t || t === SB_KEY) return null;
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p?.role === "authenticated" && typeof p.sub === "string" ? p.sub : null;
  } catch { return null; }
}

/** Favoris enregistrés sur cet appareil par les vitrines (clé bellaia_favoris_<univers>). */
export function favorisLocaux(): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || ""; if (k.startsWith("bellaia_favoris_")) { const v = JSON.parse(localStorage.getItem(k) || "[]"); if (Array.isArray(v) && v.length) r[k.slice(16)] = v; } } } catch {}
  return r;
}
