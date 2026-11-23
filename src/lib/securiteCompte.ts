// ═══════════════════════════════════════════════════════════
// Sécurité du compte : mot de passe, réinitialisation, sessions.
// Appels directs au service d'authentification Supabase (GoTrue), sans dépendance ajoutée.
// Protections :
//  • changement de mot de passe seulement après VÉRIFICATION du mot de passe actuel ;
//  • règles de robustesse (12 caractères, lettres et chiffres, différent de l'e-mail et de l'ancien) ;
//  • limitation locale des essais (5 échecs → attente de 5 minutes), en plus des limites du serveur ;
//  • réinitialisation : message identique que l'adresse existe ou non (pas de divulgation de comptes) ;
//  • déconnexion : la session est RÉVOQUÉE côté serveur (et non seulement effacée de l'appareil).
// Les fonctions de calcul sont pures et testées (tests/unit/t_securite_compte.js).
// ═══════════════════════════════════════════════════════════

export type Verdict = { ok: boolean; erreurs: string[]; force: 0 | 1 | 2 | 3 };

export function evaluerMotDePasse(nouveau: string, ctx: { email?: string; ancien?: string; confirmation?: string } = {}): Verdict {
  const e: string[] = [];
  const m = nouveau || "";
  if (m.length < 12) e.push("12 caractères au minimum.");
  if (!/[a-zA-ZÀ-ÿ]/.test(m) || !/\d/.test(m)) e.push("Au moins une lettre et un chiffre.");
  if (m.length > 128) e.push("128 caractères au maximum.");
  const local = (ctx.email || "").split("@")[0].toLowerCase();
  if (local.length >= 3 && m.toLowerCase().includes(local)) e.push("Ne doit pas contenir votre adresse e-mail.");
  if (ctx.ancien && m === ctx.ancien) e.push("Doit être différent du mot de passe actuel.");
  if (/^(.)\1+$/.test(m) || /^(?:0123456789|azerty|qwerty|motdepasse|password)/i.test(m)) e.push("Trop prévisible.");
  if (ctx.confirmation !== undefined && ctx.confirmation !== m) e.push("La confirmation ne correspond pas.");
  const familles = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(m)).length;
  const force = (m.length >= 16 && familles >= 3 ? 3 : m.length >= 12 && familles >= 2 ? 2 : m.length >= 8 ? 1 : 0) as Verdict["force"];
  return { ok: e.length === 0, erreurs: e, force };
}

/** Limitation locale des essais de mot de passe (complète la limitation du serveur). */
export function limiteur(echecs: number[], maintenant = Date.now(), max = 5, fenetreMs = 5 * 60_000) {
  const recents = echecs.filter(t => maintenant - t < fenetreMs);
  const bloque = recents.length >= max;
  const attenteS = bloque ? Math.ceil((fenetreMs - (maintenant - Math.min(...recents))) / 1000) : 0;
  return { bloque, attenteS, recents };
}

/** Informations lisibles d'un jeton de session (sans vérification de signature : affichage seulement). */
export function lireJeton(jeton: string): { userId?: string; email?: string; debut?: Date; expiration?: Date; sessionId?: string; methode?: string } | null {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))));
    const amr = Array.isArray(p.amr) && p.amr[0] ? (p.amr[0].method as string) : undefined;
    return { userId: p.sub, email: p.email, debut: p.iat ? new Date(p.iat * 1000) : undefined, expiration: p.exp ? new Date(p.exp * 1000) : undefined, sessionId: p.session_id, methode: amr === "password" ? "mot de passe" : amr === "recovery" ? "lien de réinitialisation" : amr };
  } catch { return null; }
}

/** Paramètres d'un lien de réinitialisation reçu par e-mail (#access_token=…&type=recovery). */
export function lienRecuperation(hash: string): { jeton: string; refresh?: string } | null {
  const h = new URLSearchParams((hash || "").replace(/^#/, ""));
  if (h.get("type") !== "recovery" || !h.get("access_token")) return null;
  return { jeton: h.get("access_token")!, refresh: h.get("refresh_token") || undefined };
}

// ── Appels au service d'authentification ──
const URL_SB = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const CLE = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const entetes = (jeton?: string) => ({ apikey: CLE(), "Content-Type": "application/json", ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) });

export async function verifierMotDePasseActuel(email: string, motDePasse: string): Promise<{ ok: boolean; session?: any }> {
  const r = await fetch(`${URL_SB()}/auth/v1/token?grant_type=password`, { method: "POST", headers: entetes(), body: JSON.stringify({ email, password: motDePasse }) });
  if (!r.ok) return { ok: false };
  return { ok: true, session: await r.json().catch(() => null) };
}

export async function changerMotDePasse(jeton: string, nouveau: string): Promise<{ ok: boolean; erreur?: string }> {
  const r = await fetch(`${URL_SB()}/auth/v1/user`, { method: "PUT", headers: entetes(jeton), body: JSON.stringify({ password: nouveau }) });
  if (r.ok) return { ok: true };
  const t = await r.text().catch(() => "");
  return { ok: false, erreur: /same.?password|different from the old/i.test(t) ? "Le nouveau mot de passe doit être différent de l'ancien." : /weak|pwned|leaked/i.test(t) ? "Mot de passe refusé par le serveur (trop faible ou déjà divulgué)." : "Modification impossible pour le moment." };
}

export async function demanderReinitialisation(email: string, retour: string): Promise<void> {
  // Réponse volontairement ignorée : le message affiché est le même que l'adresse existe ou non.
  await fetch(`${URL_SB()}/auth/v1/recover?redirect_to=${encodeURIComponent(retour)}`, { method: "POST", headers: entetes(), body: JSON.stringify({ email: email.trim().toLowerCase() }) }).catch(() => undefined);
}

/** scope : "local" (cet appareil), "others" (les autres appareils), "global" (tous). */
export async function revoquerSessions(jeton: string, scope: "local" | "others" | "global"): Promise<boolean> {
  try { const r = await fetch(`${URL_SB()}/auth/v1/logout?scope=${scope}`, { method: "POST", headers: entetes(jeton) }); return r.ok || r.status === 204 || r.status === 401; }
  catch { return false; }
}

export async function lireUtilisateur(jeton: string): Promise<{ email?: string; derniereConnexion?: string; emailConfirme?: boolean } | null> {
  try { const r = await fetch(`${URL_SB()}/auth/v1/user`, { headers: entetes(jeton) }); if (!r.ok) return null; const u = await r.json(); return { email: u.email, derniereConnexion: u.last_sign_in_at, emailConfirme: !!u.email_confirmed_at }; }
  catch { return null; }
}
