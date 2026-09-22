"use client";
// ═══════════════════════════════════════════════════════════
// Session cliente pour "Mon espace BSH" — src/app/bsh/espace/useBshEspace.ts
//
// Les nouvelles pages /bsh/espace/* sont de vraies routes Next.js,
// séparées de l'arbre React de la SPA existante (BellaiaApp.tsx) : on
// n'a donc pas accès à son `user` en mémoire, seulement au token
// stocké dans localStorage (bellaia_token/bellaia_refresh/bellaia_expiry),
// seul mécanisme de session existant, partagé par les deux points
// d'entrée (BSH direct et app Bellaïa).
//
// getBellaiaToken() (src/lib/bellaiaSession.ts) gère déjà la lecture
// et le rafraîchissement du token. On l'utilise ensuite avec
// auth.getUser() pour retrouver l'identité (id, email) sans avoir à la
// faire transiter par une prop, puis on lit profiles.membership_status
// avec ce même token — RLS restreint déjà chaque cliente à sa propre
// ligne.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBellaiaToken } from "@/lib/bellaiaSession";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface EspaceProfil {
  id: string;
  email: string | null;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  membership_status: string | null;
}

export type EspaceEtat =
  | { statut: "chargement" }
  | { statut: "deconnectee" }
  | { statut: "erreur"; message: string }
  | { statut: "connectee"; token: string; profil: EspaceProfil };

export function useBshEspace(): EspaceEtat {
  const [etat, setEtat] = useState<EspaceEtat>({ statut: "chargement" });

  useEffect(() => {
    let actif = true;

    (async () => {
      let token: string;
      try {
        token = await getBellaiaToken();
      } catch {
        if (actif) setEtat({ statut: "deconnectee" });
        return;
      }

      try {
        const sb = createClient(SB_URL, SB_KEY);
        const { data: userData, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userData.user) {
          if (actif) setEtat({ statut: "deconnectee" });
          return;
        }

        const h = { Authorization: `Bearer ${token}`, apikey: SB_KEY };
        const r = await fetch(
          `${SB_URL}/rest/v1/profiles?id=eq.${userData.user.id}&select=id,prenom,nom,telephone,membership_status`,
          { headers: h, cache: "no-store" }
        );
        const rows = r.ok ? await r.json() : [];
        const p = rows[0] || {};

        if (actif) {
          setEtat({
            statut: "connectee",
            token,
            profil: {
              id: userData.user.id,
              email: userData.user.email ?? null,
              prenom: p.prenom ?? null,
              nom: p.nom ?? null,
              telephone: p.telephone ?? null,
              membership_status: p.membership_status ?? "customer",
            },
          });
        }
      } catch (e: unknown) {
        if (actif) {
          setEtat({
            statut: "erreur",
            message: e instanceof Error ? e.message : "Erreur de chargement",
          });
        }
      }
    })();

    return () => {
      actif = false;
    };
  }, []);

  return etat;
}

// Fetch REST authentifié réutilisable par les sous-pages (favoris,
// panier, réservations...) : même token, même apikey, jamais de
// filtre user_id à répéter au niveau de l'appelant.
export async function espaceFetch(token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}
