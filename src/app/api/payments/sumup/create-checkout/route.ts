import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════════════════════
// SUMUP CREATE-CHECKOUT — Bellaïa Hub
// Supporte deux modes selon variables disponibles :
//   MODE A — SUMUP_ACCESS_TOKEN (token statique, simple)
//   MODE B — SUMUP_CLIENT_ID + SUMUP_CLIENT_SECRET (OAuth Client Credentials)
// ══════════════════════════════════════════════════════════

const SUMUP_CODE    = process.env.SUMUP_MERCHANT_CODE  || "MEYH9QZU";
const SUMUP_API_URL = process.env.SUMUP_API_URL        || "https://api.sumup.com";
const UNIVERS_OK    = ["BSH","EVENTS","ODYSSEE","FOOD","STRUCTURE","VILO","MTP","GENERAL"];

// ── Obtenir un Bearer token SumUp
// Priorité : SUMUP_ACCESS_TOKEN statique > OAuth Client Credentials
async function getSumupToken(): Promise<string | null> {
  // MODE A — token statique configuré directement
  if (process.env.SUMUP_ACCESS_TOKEN) {
    return process.env.SUMUP_ACCESS_TOKEN;
  }

  // MODE B — OAuth Client Credentials
  const clientId     = process.env.SUMUP_CLIENT_ID;
  const clientSecret = process.env.SUMUP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[sumup] Aucune variable d'authentification : ni SUMUP_ACCESS_TOKEN ni SUMUP_CLIENT_ID+SUMUP_CLIENT_SECRET");
    return null;
  }

  try {
    const r = await fetch(`${SUMUP_API_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("[sumup] OAuth token error:", r.status, txt.slice(0, 200));
      return null;
    }

    const data = await r.json();
    return data.access_token || null;
  } catch (err: any) {
    console.error("[sumup] OAuth fetch error:", err.message);
    return null;
  }
}

// ── URLs de retour
function getUrls(ref: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return {
    success:  process.env.SUMUP_SUCCESS_URL  || `${base}/paiement/retour?ref=${ref}&statut=succes`,
    cancel:   process.env.SUMUP_CANCEL_URL   || `${base}/paiement/retour?ref=${ref}&statut=annule`,
    callback: process.env.SUMUP_CALLBACK_URL || `${base}/api/payments/sumup/webhook`,
  };
}

export async function POST(req: NextRequest) {
  // Supabase — import dynamique, jamais au niveau module
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Obtenir token SumUp
  const token = await getSumupToken();
  if (!token) {
    return NextResponse.json({
      error: "SumUp non configuré.",
      detail: "Configurer SUMUP_ACCESS_TOKEN (token statique) OU SUMUP_CLIENT_ID + SUMUP_CLIENT_SECRET dans Vercel → Settings → Environment Variables.",
      code: "SUMUP_NOT_CONFIGURED",
    }, { status: 503 });
  }

  if (!SUMUP_CODE) {
    return NextResponse.json({ error: "SUMUP_MERCHANT_CODE manquant.", code: "SUMUP_NO_MERCHANT" }, { status: 503 });
  }

  // 2. Body
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const { montant, description, commande_id, client_id, univers, client_email } = body;

  // 3. Validations serveur (jamais faire confiance au client)
  const m = parseFloat(montant);
  if (isNaN(m) || m <= 0)   return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  if (m > 10000)             return NextResponse.json({ error: "Montant max dépassé (10 000€)." }, { status: 400 });
  if (!description?.trim())  return NextResponse.json({ error: "Description manquante." }, { status: 400 });

  const univers_valide = UNIVERS_OK.includes(univers?.toUpperCase()) ? univers.toUpperCase() : "GENERAL";
  const checkout_ref   = `BS-${univers_valide}-${Date.now()}`;
  const urls           = getUrls(checkout_ref);

  // 4. Créer le checkout SumUp
  let sumup_data: any;
  try {
    const payload: any = {
      checkout_reference: checkout_ref,
      amount:             parseFloat(m.toFixed(2)),
      currency:           "EUR",
      merchant_code:      SUMUP_CODE,
      description:        `Bella'Studio – ${description}`,
      return_url:         urls.success,
    };
    if (client_email) payload.customer_email = client_email;

    const r = await fetch(`${SUMUP_API_URL}/v0.1/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    if (!r.ok) {
      let err: any = {};
      try { err = JSON.parse(text); } catch {}
      console.error("[sumup/create] API error:", r.status, text.slice(0, 300));
      return NextResponse.json({
        error:  `Erreur SumUp (${r.status}): ${err.message || err.error_code || text.slice(0, 120)}`,
        code:   "SUMUP_API_ERROR",
        hint:   r.status === 401 ? "Token invalide ou expiré. Vérifier SUMUP_ACCESS_TOKEN ou renouveler les credentials OAuth." : undefined,
      }, { status: r.status >= 500 ? 502 : 400 });
    }

    sumup_data = JSON.parse(text);
  } catch (err: any) {
    console.error("[sumup/create] Network error:", err.message);
    return NextResponse.json({ error: "Impossible de contacter SumUp.", code: "NETWORK_ERROR" }, { status: 503 });
  }

  // 5. URL checkout hosted
  const hosted_url: string =
    sumup_data?.hosted_checkout_url ||
    sumup_data?.links?.find?.((l: any) => l.rel === "hosted-checkout")?.href ||
    `https://checkout.sumup.com/pay/${sumup_data?.id}`;

  // 6. Enregistrer paiement Supabase (statut: en_attente)
  const insert_pmt: any = {
    montant:       m,
    mode_paiement: "SumUp",
    type_paiement: "paiement",
    statut:        "en_attente",
    reference:     checkout_ref,
    provider:      "SumUp",
    provider_ref:  sumup_data?.id || "",
    lien_paiement: hosted_url,
    univers:       univers_valide,
    notes:         `SumUp Hosted – ${description}`,
    date_paiement: new Date().toISOString().split("T")[0],
  };
  if (client_id)   insert_pmt.client_id  = client_id;
  if (commande_id) insert_pmt.commande_id = commande_id;

  const { data: pmt, error: pmt_err } = await SB
    .from("payments")
    .insert(insert_pmt)
    .select("id")
    .single();

  if (pmt_err) console.error("[sumup/create] Supabase insert:", pmt_err.message);

  // 7. Mettre à jour la commande Events si applicable
  if (commande_id) {
    await SB.from("events_commandes")
      .update({ lien_sumup: hosted_url, updated_at: new Date().toISOString() })
      .eq("id", commande_id);
  }

  return NextResponse.json({
    url:         hosted_url,
    checkout_id: sumup_data?.id,
    reference:   checkout_ref,
    paiement_id: pmt?.id || null,
    montant:     m,
    devise:      "EUR",
    cancel_url:  urls.cancel,
  });
}
