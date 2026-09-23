// src/app/api/bsh-members/whatsapp-link/route.ts
//
// Cahier des charges BSH Members §10.1 : le lien WhatsApp Members ne
// doit jamais transiter par une variable NEXT_PUBLIC_* (il finirait
// dans le bundle client). Cette route vérifie le statut membre côté
// serveur, avec la clé service-role, avant de renvoyer le lien — et
// seulement dans ce cas.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const STATUTS_AUTORISES = ["member", "founding_member"];

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    if (!SB_URL || !SB_KEY) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 });
    }

    const sbAuth = createClient(SB_URL, SB_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await sbAuth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // Clé service-role : lecture du statut réel, indépendante des
    // policies RLS (jamais influençable par le client).
    const sbAdmin = createClient(SB_URL, SB_SRV || SB_KEY);
    const { data: profile, error: profErr } = await sbAdmin
      .from("profiles")
      .select("membership_status")
      .eq("id", user.id)
      .single();

    if (profErr || !profile || !STATUTS_AUTORISES.includes(profile.membership_status)) {
      return NextResponse.json({ error: "Accès réservé aux membres BSH Members" }, { status: 403 });
    }

    const lien = process.env.BSH_MEMBERS_WA_LINK;
    if (!lien) {
      return NextResponse.json({ error: "Lien communauté non configuré" }, { status: 500 });
    }

    return NextResponse.json({ link: lien });
  } catch (e: any) {
    console.error("[bsh-members/whatsapp-link]", e.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
