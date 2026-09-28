// src/app/api/bsh-members/emails/route.ts
//
// L'admin BSH Members (BSHMembersAdmin) a besoin de l'e-mail de chaque
// demandeuse/membre pour les distinguer (plusieurs comptes peuvent
// partager le même prénom/nom). `profiles` n'a pas de colonne email
// (elle vit sur auth.users, jamais exposée via PostgREST) — cette
// route résout les ids en e-mails côté serveur, avec la clé
// service-role, après avoir vérifié que l'appelant est bien
// fondatrice/assistante. Jamais accessible au client final.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    if (!SB_URL || !SB_KEY || !SB_SRV) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 });
    }

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== "string")) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const sbAuth = createClient(SB_URL, SB_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await sbAuth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const sbAdmin = createClient(SB_URL, SB_SRV);

    // Vérifie le rôle côté service-role, jamais depuis une donnée
    // envoyée par le client (même logique que whatsapp-link).
    const { data: profile, error: profErr } = await sbAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profErr || !profile || !["fondatrice", "assistante"].includes(profile.role)) {
      return NextResponse.json({ error: "Accès réservé à l'administration" }, { status: 403 });
    }

    const emails: Record<string, string> = {};
    await Promise.all(
      ids.slice(0, 100).map(async (id: string) => {
        const { data } = await sbAdmin.auth.admin.getUserById(id);
        if (data?.user?.email) emails[id] = data.user.email;
      })
    );

    return NextResponse.json({ emails });
  } catch (e: any) {
    console.error("[bsh-members/emails]", e.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
