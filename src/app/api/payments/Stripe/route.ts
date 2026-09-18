// src/app/api/payments/stripe/route.ts
// Route Stripe — mode test d'abord
// Aucune donnée carte stockée dans Bellaïa
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Stripe SDK chargé dynamiquement pour éviter les imports côté client
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante dans Vercel → Settings → Environment Variables");
  }
  const Stripe = (await import("stripe")).default;
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Vérifier la session Supabase
async function verifierSession(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) throw new Error("Non authentifié");
  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) throw new Error("Session invalide");
  return { user, token };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // ── Créer une session Checkout Stripe ──────────────────────────
  if (action === "create-checkout") {
    try {
      const { user } = await verifierSession(req);
      const {
        montant_cts,       // montant en centimes (ex: 5000 = 50,00€)
        description,
        commande_id,
        module = "BSH",
        type_paiement = "integral",
        items = [],
        client_nom,
        client_email,
        success_url,
        cancel_url,
      } = body;

      // Validation
      if (!montant_cts || montant_cts < 50) {
        return NextResponse.json({ error: "Montant invalide (minimum 0,50€)" }, { status: 400 });
      }
      if (!success_url || !cancel_url) {
        return NextResponse.json({ error: "URLs de retour obligatoires" }, { status: 400 });
      }

      const stripe = await getStripe();

      // Créer la session Checkout
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: items.length > 0
          ? items.map((item: any) => ({
              price_data: {
                currency:     "eur",
                unit_amount:  Math.round((item.prix || 0) * 100),
                product_data: { name: item.nom || "Article BSH" },
              },
              quantity: item.qty || 1,
            }))
          : [{
              price_data: {
                currency:     "eur",
                unit_amount:  montant_cts,
                product_data: { name: description || "Commande BSH" },
              },
              quantity: 1,
            }],
        customer_email: client_email || user.email || undefined,
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&commande_id=${commande_id || ""}`,
        cancel_url:  `${cancel_url}?commande_id=${commande_id || ""}`,
        metadata: {
          commande_id:   commande_id || "",
          module:        module,
          type_paiement: type_paiement,
          user_id:       user.id,
          client_nom:    client_nom || "",
        },
        payment_intent_data: {
          metadata: {
            commande_id:   commande_id || "",
            module,
            user_id:       user.id,
          },
        },
      });

      // Sauvegarder en base (service role pour bypasser RLS)
      const sbAdmin = createClient(SB_URL, SB_SRV || SB_KEY);
      await sbAdmin.from("stripe_payment_intents").insert({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:   typeof session.payment_intent === "string"
          ? session.payment_intent : null,
        client_id:        user.id,
        client_nom:       client_nom || null,
        client_email:     client_email || user.email || null,
        commande_id,
        module,
        montant_total_cts: montant_cts,
        type_paiement,
        description,
        items_json:       items,
        statut:           "created",
        checkout_url:     session.url,
        success_url,
        cancel_url,
        expire_at:        session.expires_at
          ? new Date(session.expires_at * 1000).toISOString() : null,
        cree_par: user.id,
      });

      return NextResponse.json({ url: session.url, session_id: session.id });

    } catch (e: any) {
      console.error("[stripe/create-checkout]", e.message);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ── Vérifier le statut après retour ────────────────────────────
  if (action === "verify-session") {
    try {
      const { user } = await verifierSession(req);
      const { session_id } = body;
      if (!session_id) return NextResponse.json({ error: "session_id requis" }, { status: 400 });

      const stripe  = await getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id);

      // NE JAMAIS considérer le retour navigateur comme preuve
      // → Toujours vérifier le statut réel via l'API Stripe
      const paye = session.payment_status === "paid";

      if (paye) {
        const sbAdmin = createClient(SB_URL, SB_SRV || SB_KEY);
        await sbAdmin
          .from("stripe_payment_intents")
          .update({
            statut:   "succeeded",
            paye_at:  new Date().toISOString(),
            stripe_payment_intent_id: typeof session.payment_intent === "string"
              ? session.payment_intent : undefined,
          })
          .eq("stripe_checkout_session_id", session_id);

        // Notifier la fondatrice
        await sbAdmin.from("bellaia_notifications").insert({
          user_id: user.id,
          type:    "paiement",
          titre:   "Paiement confirmé par Stripe",
          contenu: `Commande ${session.metadata?.commande_id || ""} — ${(session.amount_total || 0) / 100}€`,
          lu:      false,
        }).catch(() => {});
      }

      return NextResponse.json({
        paye,
        statut:       session.payment_status,
        montant_cts:  session.amount_total,
        commande_id:  session.metadata?.commande_id,
      });

    } catch (e: any) {
      console.error("[stripe/verify-session]", e.message);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

// ── Webhook Stripe → mise à jour automatique des statuts ────────────
export async function PUT(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature") || "";
  const rawBody   = await req.text();

  let event: any;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e: any) {
    console.error("[stripe/webhook] signature invalide:", e.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const sbAdmin = createClient(SB_URL, SB_SRV || SB_KEY);

  // Mapping événement → statut Bellaïa
  const statutMap: Record<string, string> = {
    "checkout.session.completed":          "succeeded",
    "payment_intent.succeeded":            "succeeded",
    "payment_intent.payment_failed":       "failed",
    "payment_intent.canceled":             "canceled",
    "charge.refunded":                     "refunded",
    "checkout.session.expired":            "canceled",
  };

  const nouveauStatut = statutMap[event.type];
  if (nouveauStatut) {
    const obj = event.data.object;
    const sessionId  = obj.id?.startsWith("cs_") ? obj.id : obj.client_reference_id;
    const intentId   = obj.id?.startsWith("pi_") ? obj.id : obj.payment_intent;

    // Trouver l'intention en base
    let query = sbAdmin.from("stripe_payment_intents").select("id, statut");
    if (sessionId?.startsWith("cs_")) {
      query = query.eq("stripe_checkout_session_id", sessionId) as any;
    } else if (intentId?.startsWith("pi_")) {
      query = query.eq("stripe_payment_intent_id", intentId) as any;
    }

    const { data: intents } = await (query as any);
    if (intents?.[0]) {
      const intent = intents[0];
      await sbAdmin
        .from("stripe_payment_intents")
        .update({
          statut:  nouveauStatut,
          paye_at: nouveauStatut === "succeeded" ? new Date().toISOString() : undefined,
          stripe_payment_intent_id: intentId || undefined,
        })
        .eq("id", intent.id);

      // Log historique
      await sbAdmin.from("stripe_payment_history").insert({
        payment_id:     intent.id,
        ancien_statut:  intent.statut,
        nouveau_statut: nouveauStatut,
        stripe_event_id: event.id,
        event_type:     event.type,
        metadata:       { amount: obj.amount_total || obj.amount, currency: obj.currency },
      });
    }
  }

  return NextResponse.json({ received: true });
}
