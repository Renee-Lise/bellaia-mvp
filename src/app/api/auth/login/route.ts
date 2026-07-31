import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  // ── Client Supabase avec anon key (pour signInWithPassword) ────
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── ÉTAPE 1 : Authentification ─────────────────────────────────
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authError || !authData.user) {
    // Log détaillé côté serveur (visible dans Vercel Functions logs)
    console.error("[login] ÉTAPE 1 ÉCHEC — signInWithPassword:", {
      message: authError?.message,
      status:  authError?.status,
      code:    authError?.code,
    });
    return NextResponse.json({
      step:    "auth",
      error:   authError?.message ?? "Authentification échouée",
      code:    authError?.code,
    }, { status: 401 });
  }

  console.log("[login] ÉTAPE 1 OK — user.id:", authData.user.id, "| session:", !!authData.session);

  // ── ÉTAPE 2 : Récupération du profil ───────────────────────────
  // IMPORTANT : utiliser un client avec le SERVICE_ROLE_KEY pour
  // contourner le RLS côté serveur — ou passer le token de l'utilisateur.
  // On utilise le token de session de l'utilisateur pour respecter le RLS.
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session!.access_token}`,
        },
      },
    }
  );

  const { data: profile, error: profileError } = await supabaseUser
    .from("profiles")
    .select("id, email, nom, prenom, role, tel, statut")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    console.error("[login] ÉTAPE 2 ÉCHEC — profiles:", {
      message: profileError?.message,
      code:    profileError?.code,
      details: profileError?.details,
      userId:  authData.user.id,
    });

    // Tentative de fallback avec service role si disponible
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: profileAdmin, error: adminError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, nom, prenom, role, tel, statut")
        .eq("id", authData.user.id)
        .single();

      if (!adminError && profileAdmin) {
        console.log("[login] ÉTAPE 2 OK (admin fallback) — role:", profileAdmin.role);
        return buildResponse(authData, profileAdmin);
      }
      console.error("[login] ÉTAPE 2 ÉCHEC (admin) —", adminError?.message);
    }

    return NextResponse.json({
      step:    "profile",
      error:   profileError?.message ?? "Profil introuvable",
      code:    profileError?.code,
      userId:  authData.user.id,
    }, { status: 403 });
  }

  console.log("[login] ÉTAPE 2 OK — role:", profile.role, "| statut:", profile.statut);

  return buildResponse(authData, profile);
}

function buildResponse(authData: any, profile: any) {
  return NextResponse.json({
    user: {
      id:     profile.id,
      email:  profile.email ?? authData.user.email,
      nom:    profile.nom,
      prenom: profile.prenom,
      role:   profile.role,
      tel:    profile.tel,
    },
    session: {
      access_token:  authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      expires_at:    authData.session?.expires_at,
    },
  });
}
