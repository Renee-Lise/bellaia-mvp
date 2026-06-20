import { NextRequest, NextResponse } from "next/server";

// ⚠ SumUp access token UNIQUEMENT côté serveur
const SUMUP_TOKEN = process.env.SUMUP_ACCESS_TOKEN;
const SUMUP_CODE  = process.env.SUMUP_MERCHANT_CODE;


export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    if (!SUMUP_TOKEN || !SUMUP_CODE) {
      return NextResponse.json(
        { error: "SumUp non configuré. Ajouter SUMUP_ACCESS_TOKEN et SUMUP_MERCHANT_CODE dans Vercel." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      montant,        // en euros (ex: 50.00)
      description,
      commande_id,
      client_id,
      univers,
      redirect_url,   // URL de retour après paiement
    } = body;

    // Validation stricte côté serveur
    if (!montant || typeof montant !== "number" || montant <= 0 || montant > 10000) {
      return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description manquante." }, { status: 400 });
    }

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bellaia-11-azure.vercel.app";
    const checkout_ref = `BSEV-${Date.now()}`;

    // Créer le Hosted Checkout SumUp
    const r = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUMUP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkout_reference:  checkout_ref,
        amount:              parseFloat(montant.toFixed(2)),
        currency:            "EUR",
        merchant_code:       SUMUP_CODE,
        description:         description,
        return_url:          redirect_url || `${BASE_URL}/paiement/succes`,
      }),
    });

    if (!r.ok) {
      const err = await r.json();
      console.error("[sumup] Erreur API:", err);
      return NextResponse.json(
        { error: "Erreur SumUp: " + (err.message || "Inconnue") },
        { status: r.status }
      );
    }

    const data = await r.json();
    const hosted_url = data.hosted_checkout_url || `https://checkout.sumup.com/pay/${data.id}`;

    // Enregistrer le paiement en attente
    if (commande_id || client_id) {
      await SB.from("payments").insert({
        commande_id:    commande_id || null,
        client_id:      client_id   || null,
        montant:        montant,
        mode_paiement:  "SumUp",
        type_paiement:  "paiement",
        statut:         "en_attente",
        reference:      checkout_ref,
        notes:          `SumUp Checkout — ${description} — ${univers || ""}`,
        date_paiement:  new Date().toISOString().split("T")[0],
      });
    }

    return NextResponse.json({
      url:         hosted_url,
      checkout_id: data.id,
      reference:   checkout_ref,
    });

  } catch (err: any) {
    console.error("[sumup] Erreur:", err.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement SumUp." },
      { status: 500 }
    );
  }
}

// Vérification du statut d'un checkout SumUp
export async function GET(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(req.url);
  const checkout_id = searchParams.get("id");

  if (!checkout_id || !SUMUP_TOKEN) {
    return NextResponse.json({ error: "Paramètre manquant." }, { status: 400 });
  }

  try {
    const r = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkout_id}`, {
      headers: { "Authorization": `Bearer ${SUMUP_TOKEN}` },
    });

    if (!r.ok) {
      return NextResponse.json({ error: "Checkout introuvable." }, { status: 404 });
    }

    const data = await r.json();
    const statut_sumup = data.status; // 'PENDING' | 'PAID' | 'FAILED'

    // Mapper vers statuts Bellaïa
    const statut_bellaia = {
      "PAID":    "reçu",
      "PENDING": "en_attente",
      "FAILED":  "annulé",
    }[statut_sumup] || "en_attente";

    // Mettre à jour le paiement si payé
    if (statut_bellaia === "reçu") {
      await SB.from("payments")
        .update({
          statut:        "reçu",
          updated_at:    new Date().toISOString(),
          date_paiement: new Date().toISOString().split("T")[0],
        })
        .eq("reference", data.checkout_reference);
    }

    return NextResponse.json({
      statut:       statut_bellaia,
      statut_sumup: statut_sumup,
      montant:      data.amount,
      devise:       data.currency,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
