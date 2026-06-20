import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Consultation du statut d'un paiement par session_id ou reference
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session_id  = searchParams.get("session_id");
  const reference   = searchParams.get("reference");
  const commande_id = searchParams.get("commande_id");

  if (!session_id && !reference && !commande_id) {
    return NextResponse.json({ error: "Paramètre requis : session_id, reference ou commande_id." }, { status: 400 });
  }

  // Token utilisateur depuis le header Authorization
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  try {
    let query = SB.from("payments").select("id, montant, mode_paiement, statut, reference, date_paiement, notes, commande_id, client_id");

    if (session_id)  query = query.eq("reference", session_id);
    else if (reference)   query = query.eq("reference", reference);
    else if (commande_id) query = query.eq("commande_id", commande_id);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).single();

    if (error || !data) {
      return NextResponse.json({ statut: "introuvable" }, { status: 404 });
    }

    // Si paiement Stripe toujours en attente, vérifier côté Stripe
    if (data.statut === "en_attente" && data.mode_paiement === "Stripe" && session_id) {
      try {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === "paid") {
          await SB.from("payments")
            .update({ statut: "reçu", updated_at: new Date().toISOString() })
            .eq("reference", session_id);
          data.statut = "reçu";
        }
      } catch {}
    }

    return NextResponse.json({
      statut:         data.statut,
      montant:        data.montant,
      mode_paiement:  data.mode_paiement,
      date_paiement:  data.date_paiement,
      reference:      data.reference,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
