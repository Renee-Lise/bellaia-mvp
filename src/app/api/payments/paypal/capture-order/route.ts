import { NextRequest, NextResponse } from "next/server";
import { sbServer, confirmerPaiement } from "@/lib/paiements";

// ═══════════════════════════════════════════════════════════
// PAYPAL CAPTURE-ORDER — Bellaïa Hub
// POST /api/payments/paypal/capture-order
// Appelé au retour du client depuis PayPal (return_url)
// ou directement depuis le frontend après approbation
// ═══════════════════════════════════════════════════════════

function paypalBase(): string {
  return (process.env.PAYPAL_ENV || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPaypalToken(): Promise<string | null> {
  const env = process.env.PAYPAL_ENV || "sandbox";
  const id  = env === "live" ? process.env.PAYPAL_CLIENT_ID : (process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
  const sec = env === "live" ? process.env.PAYPAL_CLIENT_SECRET : (process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET);
  if (!id || !sec) return null;
  try {
    const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
      method: "POST",
      headers: { "Authorization": `Basic ${Buffer.from(`${id}:${sec}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!r.ok) return null;
    return (await r.json()).access_token || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const { order_id, reference } = body;
  if (!order_id) return NextResponse.json({ error: "order_id manquant." }, { status: 400 });

  // ── 1. Token PayPal
  const token = await getPaypalToken();
  if (!token) return NextResponse.json({ error: "PayPal non configuré.", code: "PAYPAL_NOT_CONFIGURED" }, { status: 503 });

  // ── 2. Vérifier l'état de l'ordre avant capture
  let orderDetails: any;
  try {
    const r = await fetch(`${paypalBase()}/v2/checkout/orders/${order_id}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: `PayPal order check failed: ${r.status}`, detail: txt.slice(0,200) }, { status: 400 });
    }
    orderDetails = await r.json();
  } catch (err: any) {
    return NextResponse.json({ error: "Impossible de vérifier l'ordre PayPal.", detail: err.message }, { status: 503 });
  }

  // Si déjà capturé — éviter double capture
  if (orderDetails.status === "COMPLETED") {
    return NextResponse.json({ ok: true, statut: "deja_capture", order_id, reference });
  }

  if (orderDetails.status !== "APPROVED") {
    return NextResponse.json({ error: `Ordre PayPal non approuvé (statut: ${orderDetails.status})`, code: "ORDER_NOT_APPROVED" }, { status: 400 });
  }

  // ── 3. Capturer le paiement
  let capture: any;
  try {
    const r = await fetch(`${paypalBase()}/v2/checkout/orders/${order_id}/capture`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
      },
      body: JSON.stringify({}),
    });

    if (!r.ok) {
      const txt = await r.text();
      let err: any = {};
      try { err = JSON.parse(txt); } catch {}
      console.error("[paypal/capture] Capture error:", r.status, txt.slice(0, 300));
      return NextResponse.json({
        error: `Capture PayPal échouée (${r.status}): ${err.message || err.name || txt.slice(0, 120)}`,
        code:  "CAPTURE_FAILED",
      }, { status: r.status >= 500 ? 502 : 400 });
    }
    capture = await r.json();
  } catch (err: any) {
    return NextResponse.json({ error: "Erreur réseau PayPal capture.", detail: err.message }, { status: 503 });
  }

  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ error: `Capture non complète (statut: ${capture.status})`, code: "CAPTURE_INCOMPLETE" }, { status: 400 });
  }

  // ── 4. Extraire les données de la capture
  const pu          = capture.purchase_units?.[0];
  const cap_unit    = pu?.payments?.captures?.[0];
  const montant     = parseFloat(cap_unit?.amount?.value || pu?.amount?.value || "0");
  const devise      = cap_unit?.amount?.currency_code || "EUR";
  const capture_id  = cap_unit?.id || "";

  // Récupérer notre référence depuis custom_id ou reference param
  let ref = reference || "";
  let pole = "GENERAL";
  let commande_id: string | null = null;
  let client_id: string | null   = null;
  try {
    const custom = JSON.parse(pu?.custom_id || "{}");
    ref         = custom.ref        || ref;
    pole        = custom.pole       || pole;
    commande_id = custom.commande_id || null;
    client_id   = custom.client_id  || null;
  } catch {}

  // ── 5. Récupérer infos paiement Supabase
  const SB = sbServer();
  const { data: pmt } = await SB.from("payments")
    .select("id,client_id,client_email,facture_id,univers,commande_id,notes")
    .eq("provider_ref", order_id)
    .single();

  const client_email = capture.payer?.email_address || pmt?.client_email || null;
  const client_nom   = [capture.payer?.name?.given_name, capture.payer?.name?.surname].filter(Boolean).join(" ") || null;
  const univers_final = pmt?.univers || pole;
  const desc          = pmt?.notes   || `PayPal ${ref}`;
  const fact_id       = pmt?.facture_id || null;
  const cmd_id        = pmt?.commande_id || commande_id;
  const cl_id         = pmt?.client_id  || client_id;

  // ── 6. Alimenter toute la chaîne (pré-comptabilité, CRM, factures…)
  await confirmerPaiement({
    provider:      "PayPal",
    provider_ref:  capture_id || order_id,
    montant,
    devise,
    mode_paiement: "PayPal",
    reference:     ref,
    commande_id:   cmd_id,
    client_id:     cl_id,
    client_email,
    client_nom,
    facture_id:    fact_id,
    univers:       univers_final,
    description:   desc,
    metadata: { order_id, capture_id, capture_status: capture.status },
  });

  return NextResponse.json({
    ok:         true,
    statut:     "capture_ok",
    order_id,
    capture_id,
    reference:  ref,
    montant,
    devise,
    paiement_id: pmt?.id || null,
    message:    "Paiement PayPal capturé et enregistré. Pré-comptabilité alimentée automatiquement.",
  });
}
