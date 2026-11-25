// Boutique numérique — outils SERVEUR uniquement (clés jamais exposées au navigateur).
// La boutique reste fermée tant que BOUTIQUE_ACTIVE ≠ "true" ; seules les clés Stripe de TEST sont acceptées
// tant que BOUTIQUE_VENTE_REELLE ≠ "true" (décision réservée à la fondatrice).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleStripeAutorisee } from "@/modules/boutique/regles";

export function boutiqueOuverte(): boolean { return process.env.BOUTIQUE_ACTIVE === "true"; }

export function sbServeur(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && cle ? createClient(url, cle, { auth: { persistSession: false } }) : null;
}

/** Compte connecté à partir du jeton envoyé par l'application (jamais d'identifiant fourni par le navigateur). */
export async function compteConnecte(authorization: string | null): Promise<{ id: string; email: string | null } | null> {
  const jeton = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jeton || !url || !anon) return null;
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser();
  return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? null };
}

export async function stripeServeur() {
  const cle = process.env.STRIPE_BOUTIQUE_SECRET_KEY;
  if (!cleStripeAutorisee(cle, process.env.BOUTIQUE_VENTE_REELLE === "true")) return null;
  const Stripe = (await import("stripe")).default;
  return new Stripe(cle as string, { apiVersion: "2023-10-16" });
}

export function urlApplication(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://bellaia-11-azure.vercel.app").replace(/\/$/, "");
}
