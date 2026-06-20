import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis." },
      { status: 400 }
    );
  }

  // Client anon pour l'authentification
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Authentification
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  // 2. Lire le profil avec le token de SESSION de l'utilisateur
  // Cela respecte les RLS : l'utilisateur lit son propre profil
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
    .select("id, prenom, nom, telephone, role, statut, age_verifi")
    .eq("id", authData.user.id)
    .single();

  // Log pour debug Vercel
  console.log("[login] user_id:", authData.user.id);
  console.log("[login] profile:", JSON.stringify(profile));
  console.log("[login] profile_error:", profileError?.message);

  // 3. Si profil absent (ne devrait plus arriver) — créer minimal
  if (!profile) {
    await supabaseUser.from("profiles").insert({
      id:         authData.user.id,
      prenom:     "",
      nom:        "",
      telephone:  "",
      role:       "cliente",
      statut:     "actif",
      age_verifi: false,
    });
  }

  // 4. Retourner les données utilisateur complètes
  return NextResponse.json({
    user: {
      id:         authData.user.id,
      email:      authData.user.email ?? "",
      prenom:     profile?.prenom     ?? "",
      nom:        profile?.nom        ?? "",
      telephone:  profile?.telephone  ?? "",
      role:       profile?.role       ?? "cliente",
      statut:     profile?.statut     ?? "actif",
      age_verifi: profile?.age_verifi ?? false,
    },
    session: {
      access_token:  authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
    },
  });
}
