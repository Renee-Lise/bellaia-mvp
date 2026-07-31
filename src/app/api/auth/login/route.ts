import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── ÉTAPE 1 : Authentification Supabase Auth ───────────────────
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authError || !authData.user) {
    console.error("[login] auth échec:", authError?.message);
    return NextResponse.json({
      step: "auth",
      error: authError?.message ?? "Authentification échouée",
    }, { status: 401 });
  }

  // ── ÉTAPE 2 : Récupération du profil par UUID ─────────────────
  // La table profiles n'a PAS de colonne email.
  // On utilise authData.user.id (UUID) — jamais l'email.
  const supabaseWithToken = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authData.session!.access_token}` } } }
  );

  const { data: profile, error: profileError } = await supabaseWithToken
    .from("profiles")
    .select("id, prenom, nom, telephone, role, statut, age_verifi")
    .eq("id", authData.user.id)   // ← UUID, jamais email
    .single();

  if (profileError || !profile) {
    console.error("[login] profil échec:", profileError?.message, "| userId:", authData.user.id);
    return NextResponse.json({
      step: "profile",
      error: profileError?.message ?? "Profil introuvable",
      userId: authData.user.id,
    }, { status: 403 });
  }

  console.log("[login] OK — role:", profile.role);

  return NextResponse.json({
    user: {
      id:        profile.id,
      email:     authData.user.email,   // email vient de auth.users, pas de profiles
      prenom:    profile.prenom,
      nom:       profile.nom,
      telephone: profile.telephone,
      role:      profile.role,
      statut:    profile.statut,
    },
    session: {
      access_token:  authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
    },
  });
}
