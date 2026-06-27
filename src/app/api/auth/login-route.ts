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
    .select("id, prenom, nom, telephone, date_naissance, role, statut, age_verifi")
    .eq("id", authData.user.id)
    .single();

  // Log pour debug Vercel
  console.log("[login] user_id:", authData.user.id);
  console.log("[login] profile:", JSON.stringify(profile));
  console.log("[login] profile_error:", profileError?.message);

  // 3. Récupérer les métadonnées du compte (où signup a stocké les infos)
  const meta = authData.user.user_metadata || {};
  const calcAge = (d: string) => {
    const n = new Date(d); if (isNaN(n.getTime())) return null;
    const now = new Date(); let a = now.getFullYear() - n.getFullYear();
    const m = now.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < n.getDate())) a--;
    return a;
  };

  let profilFinal = profile;

  // 3a. Profil absent → le créer avec les métadonnées
  if (!profile) {
    const dn = meta.date_naissance ?? null;
    const age = dn ? calcAge(dn) : null;
    const nouveau = {
      id:             authData.user.id,
      prenom:         meta.prenom    ?? "",
      nom:            meta.nom       ?? "",
      telephone:      meta.telephone ?? "",
      date_naissance: dn,
      role:           "cliente",
      statut:         "actif",
      age_verifi:     age !== null ? age >= 18 : false,
    };
    await supabaseUser.from("profiles").insert(nouveau);
    profilFinal = nouveau as typeof profile;
  }
  // 3b. Profil existant mais SANS date → la compléter depuis les métadonnées
  else if (!profile.date_naissance && meta.date_naissance) {
    const age = calcAge(meta.date_naissance);
    await supabaseUser.from("profiles").update({
      date_naissance: meta.date_naissance,
      prenom:    profile.prenom    || meta.prenom    || "",
      nom:       profile.nom       || meta.nom       || "",
      telephone: profile.telephone || meta.telephone || "",
      age_verifi: age !== null ? age >= 18 : false,
    }).eq("id", authData.user.id);
    profilFinal = { ...profile, date_naissance: meta.date_naissance };
  }

  // 4. Retourner les données utilisateur complètes
  return NextResponse.json({
    user: {
      id:         authData.user.id,
      email:      authData.user.email ?? "",
      prenom:     profilFinal?.prenom     ?? "",
      nom:        profilFinal?.nom        ?? "",
      telephone:  profilFinal?.telephone  ?? "",
      role:       profilFinal?.role       ?? "cliente",
      statut:     profilFinal?.statut     ?? "actif",
      date_naissance: profilFinal?.date_naissance ?? null,
      age_verifi: profilFinal?.age_verifi ?? false,
    },
    session: {
      access_token:  authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
    },
  });
}
