import { NextRequest, NextResponse } from "next/server";
import { sbServer, getRetourUrls } from "@/lib/paiements";

// ═══════════════════════════════════════════════════════════
// PAYPAL CREATE-ORDER — Bellaïa Hub
// POST /api/payments/paypal/create-order
// Crée un ordre PayPal et retourne l'approve_url
// Secrets : PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET (jamais côté client)
// ═══════════════════════════════════════════════════════════

const UNIVERS_OK = ["BSH","EVENTS","ODYSSEE","FOOD","STRUCTURE","VILO","MTP","GENERAL"];

// ── Base URL PayPal selon l'environnement
function paypalBase(): string {
  const env = process.env.PAYPAL_ENV || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

// ── Obtenir un access token PayPal (OAuth 2 Client Credentials)
// PAYPAL_CLIENT_SECRET reste 100% serveur — jamais exposé au client
async function getPaypalToken(): Promise<string | null> {
  // Choix sandbox/live selon PAYPAL_ENV
  const env  = process.env.PAYPAL_ENV || "sandbox";
  const id   = env === "live"
    ? process.env.PAYPAL_CLIENT_ID
    : (process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
  const sec  = env === "live"
    ? process.env.PAYPAL_CLIENT_SECRET
    : (process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET);

  if (!id || !sec) {
    console.error("[paypal] Variables manquantes : PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET");
    return null;
  }

  try {
    const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
      method:  "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${id}:${sec}`).toString("base64")}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("[paypal] Token error:", r.status, txt.slice(0, 200));
      return null;
    }
    const d = await r.json();
    return d.access_token || null;
  } catch (err: any) {
    console.error("[paypal] Token fetch error:", err.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Body
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const { montant, description, univers, commande_id, client_id, client_email } = body;

  // ── 2. Validations serveur
  const m = parseFloat(montant);
  if (isNaN(m) || m <= 0)  return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  if (m > 50000)            return NextResponse.json({ error: "Montant max dépassé." }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description manquante." }, { status: 400 });

  const pole = UNIVERS_OK.includes(univers?.toUpperCase()) ? univers.toUpperCase() : "GENERAL";
  const ref  = `BS-PP-${pole}-${Date.now()}`;

  // ── 3. Obtenir token PayPal
  const token = await getPaypalToken();
  if (!token) {
    return NextResponse.json({
      error:  "PayPal non configuré.",
      detail: "Configurer PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET dans Vercel → Settings → Environment Variables.",
      code:   "PAYPAL_NOT_CONFIGURED",
    }, { status: 503 });
  }

  // ── 4. Créer l'ordre PayPal (Orders API v2)
  const urls = getRetourUrls(ref, "paypal");
  let order: any;
  try {
    const r = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method:  "POST",
      headers: {
        "Authorization":   `Bearer ${token}`,
        "Content-Type":    "application/json",
        "PayPal-Request-Id": ref,          // idempotence
        "Prefer":          "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: ref,
          description:  `Bella'Studio – ${description}`,
          amount: {
            currency_code: "EUR",
            value:         m.toFixed(2),
          },
          custom_id: JSON.stringify({
            ref, pole, commande_id: commande_id || null,
            client_id: client_id || null,
          }),
        }],
        application_context: {
          brand_name:          "Bella'Studio",
          locale:              "fr-FR",
          landing_page:        "BILLING",
          shipping_preference: "NO_SHIPPING",
          user_action:         "PAY_NOW",
          return_url: urls.retour,
          cancel_url: urls.cancel,
        },
        ...(client_email ? { payer: { email_address: client_email } } : {}),
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      let err: any = {};
      try { err = JSON.parse(txt); } catch {}
      console.error("[paypal/create-order] API error:", r.status, txt.slice(0, 300));
      return NextResponse.json({
        error: `Erreur PayPal (${r.status}): ${err.message || err.name || txt.slice(0, 120)}`,
        code:  "PAYPAL_API_ERROR",
        hint:  r.status === 401 ? "Vérifier PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET et PAYPAL_ENV (sandbox|live)." : undefined,
      }, { status: r.status >= 500 ? 502 : 400 });
    }
    order = await r.json();
  } catch (err: any) {
    console.error("[paypal/create-order] Network error:", err.message);
    return NextResponse.json({ error: "Impossible de contacter PayPal.", code: "NETWORK_ERROR" }, { status: 503 });
  }

  // ── 5. URL d'approbation client
  const approve_url: string =
    order?.links?.find((l: any) => l.rel === "approve")?.href ||
    order?.links?.find((l: any) => l.rel === "payer-action")?.href || "";

  if (!approve_url) {
    console.error("[paypal/create-order] approve_url manquante:", JSON.stringify(order).slice(0,300));
    return NextResponse.json({ error: "PayPal n'a pas retourné d'URL d'approbation.", code: "NO_APPROVE_URL" }, { status: 502 });
  }

  // ── 6. Pré-enregistrement Supabase (statut en_attente)
  const SB = sbServer();
  const { data: pmt } = await SB.from("payments").insert({
    provider:      "PayPal",
    provider_ref:  order.id,
    reference:     ref,
    montant:       m,
    devise:        "EUR",
    mode_paiement: "PayPal",
    statut:        "en_attente",
    univers:       pole,
    client_id:     client_id    || null,
    client_email:  client_email || null,
    commande_id:   commande_id  || null,
    lien_paiement: approve_url,
    notes:         description,
    date_paiement: new Date().toISOString().split("T")[0],
    source_auto:   true,
  }).select("id").single();

  return NextResponse.json({
    url:        approve_url,
    order_id:   order.id,
    reference:  ref,
    paiement_id: pmt?.id || null,
    montant:    m,
    devise:     "EUR",
    env:        process.env.PAYPAL_ENV || "sandbox",
    cancel_url: urls.cancel,
  });
}
