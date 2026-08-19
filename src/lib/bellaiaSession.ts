// ═══════════════════════════════════════════════════════════
// BELLAÏA — Module de session partagé
// src/lib/bellaiaSession.ts
// Utilisé par tous les modules pour obtenir un token valide
// ═══════════════════════════════════════════════════════════

const LS_TOKEN   = "bellaia_token";
const LS_REFRESH = "bellaia_refresh";
const LS_EXPIRY  = "bellaia_expiry";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Retourne un access_token valide.
 * Stratégie :
 * 1. Lire le token depuis localStorage (stocké par BellaiaApp à la connexion)
 * 2. Si expiré → refreshSession avec le refresh_token
 * 3. Si absent → SESSION_ABSENTE
 */
export async function getBellaiaToken(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("SESSION_ABSENTE — environnement serveur");
  }

  const token   = localStorage.getItem(LS_TOKEN);
  const refresh = localStorage.getItem(LS_REFRESH);
  const expiry  = localStorage.getItem(LS_EXPIRY);

  if (!token) {
    throw new Error("SESSION_ABSENTE — reconnectez-vous");
  }

  // Vérifier expiration (60s de marge)
  const now = Math.floor(Date.now() / 1000);
  const exp = expiry ? parseInt(expiry) : 0;
  const expiresIn60s = exp > 0 && exp - now < 60;

  if (expiresIn60s && refresh) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(SB_URL, SB_KEY);
      const { data, error } = await sb.auth.refreshSession({ refresh_token: refresh });
      if (error || !data.session) {
        throw new Error("SESSION_EXPIREE — reconnectez-vous");
      }
      // Sauvegarder les nouveaux tokens
      localStorage.setItem(LS_TOKEN,   data.session.access_token);
      localStorage.setItem(LS_REFRESH, data.session.refresh_token);
      if (data.session.expires_at) {
        localStorage.setItem(LS_EXPIRY, String(data.session.expires_at));
      }
      return data.session.access_token;
    } catch {
      throw new Error("SESSION_EXPIREE — reconnectez-vous");
    }
  }

  return token;
}

/**
 * Retourne un client Supabase authentifié avec le token actuel.
 */
export async function getBellaiaClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const token = await getBellaiaToken();
  return createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Helper fetch vers Supabase REST avec token injecté.
 */
export async function sbApiFetch(
  path: string,
  opts: RequestInit = {}
): Promise<any> {
  const token = await getBellaiaToken();
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey:          SB_KEY,
      Authorization:   `Bearer ${token}`,
      "Content-Type":  "application/json",
      Prefer:          "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401) throw new Error("SESSION_EXPIREE — reconnectez-vous");
    if (res.status === 403) throw new Error("ACCES_REFUSE — droits insuffisants");
    throw new Error(err.message || `Erreur Supabase ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
