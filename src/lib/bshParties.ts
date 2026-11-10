// src/lib/bshParties.ts
//
// Fonctions partagées par les routes API /api/bsh/parties/* — vraies
// parties multijoueurs BSH Secret Games / Secret Duo (migration 0082).
// Toutes les routes passent par la clé service_role (jamais exposée au
// client) car bsh_parties_participants et bsh_parties_tirages n'ont
// aucune policy RLS pour anon/authenticated : seul le serveur, après
// avoir vérifié le code de partie et/ou l'identifiant de
// participant·e, peut y lire ou écrire.
import { createClient } from "@supabase/supabase-js";

export function getSbService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I — moins d'erreurs de saisie

export function genererCodePartie(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}
