import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("[login] configuration manquante : NEXT_PUBLIC_SUPABASE_URL/ANON_KEY absentes.");
      return NextResponse.json({ error: "Configuration serveur incomplète. Contactez la fondatrice." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // ── ÉTAPE 1 : Authentification Supabase Auth ───────────────────
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user || !authData.session) {
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
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } } }
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
        access_token:  authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    });
  } catch (e: any) {
    // Filet de sécurité : sans ça, toute erreur inattendue (JSON de requête
    // invalide, Supabase injoignable, etc.) fait planter la route et Next.js
    // renvoie une réponse 500 en texte brut — que le client ne peut pas
    // parser en JSON, et qui s'affichait comme une erreur illisible
    // ("Unexpected token 'I', 'Internal s'...") au lieu d'un message clair.
    console.error("[login] erreur inattendue:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur inattendue. Réessayez dans un instant." }, { status: 500 });
  }
}
