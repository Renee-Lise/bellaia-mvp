import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Calcule l'âge à partir d'une date ISO "AAAA-MM-JJ"
function calcAge(dateNaissance: string): number | null {
  const n = new Date(dateNaissance);
  if (isNaN(n.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - n.getFullYear();
  const m = now.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < n.getDate())) age--;
  return age;
}

export async function POST(req: NextRequest) {
  const { email, password, prenom, nom, telephone, date_naissance } = await req.json();

  // Validation
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }
  if (!date_naissance) {
    return NextResponse.json({ error: "Date de naissance requise." }, { status: 400 });
  }
  const age = calcAge(date_naissance);
  if (age === null) {
    return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
  }
  if (age < 0 || age > 120) {
    return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Création du compte (Supabase envoie l'email de confirmation automatiquement)
  const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      data: {
        prenom: prenom ?? "",
        nom: nom ?? "",
        telephone: telephone ?? "",
        date_naissance: date_naissance,
      },
    },
  });

  if (authError) {
    const msg = authError.message?.includes("already")
      ? "Un compte existe déjà avec cet email."
      : "Impossible de créer le compte. Réessayez.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (!authData.user) {
    return NextResponse.json({ error: "Création du compte échouée." }, { status: 400 });
  }

  // 2. Créer le profil lié (rôle cliente par défaut)
  // Si une session existe (email non requis), on l'utilise pour respecter les RLS
  const token = authData.session?.access_token;
  const supabaseUser = token
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
    : supabaseAnon;

  const majeur = age >= 18;

  await supabaseUser.from("profiles").insert({
    id:             authData.user.id,
    prenom:         prenom    ?? "",
    nom:            nom       ?? "",
    telephone:      telephone ?? "",
    date_naissance: date_naissance,
    role:           "cliente",
    statut:         "actif",
    age_verifi:     majeur,
  });

  // 3. Réponse
  // Si Supabase exige la confirmation email, il n'y a pas de session ici.
  const besoinConfirmation = !authData.session;

  return NextResponse.json({
    ok: true,
    besoinConfirmation,
    user: {
      id:             authData.user.id,
      email:          authData.user.email ?? "",
      prenom:         prenom ?? "",
      nom:            nom ?? "",
      telephone:      telephone ?? "",
      date_naissance: date_naissance,
      role:           "cliente",
      statut:         "actif",
      age_verifi:     majeur,
    },
    session: authData.session
      ? { access_token: authData.session.access_token, refresh_token: authData.session.refresh_token }
      : null,
  });
}
