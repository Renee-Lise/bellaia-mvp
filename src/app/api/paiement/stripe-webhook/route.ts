import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  // Import dynamique — évite l'instanciation au niveau module
  const Stripe = (await import("stripe")).default;
  const { createClient } = await import("@supabase/supabase-js");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { commande_id, univers } = session.metadata || {};
      await SB.from("payments")
        .update({ statut: "reçu", reference: session.id, date_paiement: new Date().toISOString().split("T")[0], updated_at: new Date().toISOString() })
        .eq("reference", session.id);
      if (commande_id) {
        const montant_paye = (session.amount_total || 0) / 100;
        const { data: cmd } = await SB.from("events_commandes").select("montant_total,acompte,statut").eq("id", commande_id).single();
        if (cmd) {
          const new_acompte = (parseFloat(cmd.acompte) || 0) + montant_paye;
          const paid = new_acompte >= (parseFloat(cmd.montant_total) || 0);
          await SB.from("events_commandes").update({ acompte: new_acompte, statut: paid ? "Acompte reçu" : cmd.statut, updated_at: new Date().toISOString() }).eq("id", commande_id);
        }
      }
      break;
    }
    case "checkout.session.expired":
    case "payment_intent.payment_failed": {
      const obj = event.data.object;
      await SB.from("payments").update({ statut: "annulé", updated_at: new Date().toISOString() }).eq("reference", obj.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      await SB.from("payments").update({ statut: "remboursé", updated_at: new Date().toISOString() }).eq("reference", charge.payment_intent);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
