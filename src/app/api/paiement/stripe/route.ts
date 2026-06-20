import { NextRequest, NextResponse } from "next/server";

// ⚠ Clé secrète UNIQUEMENT côté serveur — jamais exposée au client


export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const body = await req.json();
    const {
      montant,        // en centimes (ex: 5000 = 50€)
      description,    // description de la commande
      commande_id,    // UUID de la commande Supabase
      client_id,      // UUID du client
      univers,        // 'BSH' | 'EVENTS' | 'STRUCTURE' | 'ODYSSEE' | 'FOOD'
      client_email,   // email du client pour Stripe
      success_url,    // URL de retour succès (ex: https://bellaia.vercel.app/paiement/succes)
      cancel_url,     // URL de retour annulation
    } = body;

    // Validation stricte côté serveur
    if (!montant || typeof montant !== "number" || montant <= 0) {
      return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    }
    if (montant > 1000000) { // max 10 000€
      return NextResponse.json({ error: "Montant trop élevé." }, { status: 400 });
    }
    if (!description || !univers) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bellaia-11-azure.vercel.app";

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "fr",
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: Math.round(montant), // montant en centimes
          product_data: {
            name: description,
            description: `Bella'Studio — Pôle ${univers}`,
          },
        },
        quantity: 1,
      }],
      customer_email: client_email || undefined,
      metadata: {
        commande_id:  commande_id  || "",
        client_id:    client_id    || "",
        univers:      univers,
        source:       "bellaia",
      },
      success_url: success_url || `${BASE_URL}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancel_url  || `${BASE_URL}/paiement/annule`,
    });

    // Enregistrer le paiement en statut "en_attente" dans Supabase
    if (commande_id || client_id) {
      await SB.from("payments").insert({
        commande_id:    commande_id  || null,
        client_id:      client_id    || null,
        montant:        montant / 100, // reconvertir en euros
        mode_paiement:  "Stripe",
        type_paiement:  "paiement",
        statut:         "en_attente",
        reference:      session.id,
        notes:          `Stripe Checkout — ${description} — ${univers}`,
        date_paiement:  new Date().toISOString().split("T")[0],
      });
    }

    return NextResponse.json({
      url:        session.url,
      session_id: session.id,
    });

  } catch (err: any) {
    console.error("[stripe] Erreur création session:", err.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement." },
      { status: 500 }
    );
  }
}
