import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════
// PAYPAL WEBHOOK — /api/payments/paypal/webhook
// Handler autonome — même logique que /api/webhooks/paypal
// URL à configurer dans PayPal Developer Dashboard :
//   https://bellaia-11-azure.vercel.app/api/payments/paypal/webhook
//
// Événements à activer dans PayPal :
//   - PAYMENT.CAPTURE.COMPLETED
//   - PAYMENT.CAPTURE.DENIED
//   - PAYMENT.CAPTURE.REFUNDED
//   - CHECKOUT.ORDER.APPROVED
//   - CHECKOUT.ORDER.COMPLETED
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { confirmerPaiement } from "@/lib/paiements";

function sbServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function paypalBase(): string {
  return (process.env.PAYPAL_ENV || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPaypalToken(): Promise<string | null> {
  const env = process.env.PAYPAL_ENV || "sandbox";
  const id  = env === "live"
    ? process.env.PAYPAL_CLIENT_ID
    : (process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
  const sec = env === "live"
    ? process.env.PAYPAL_CLIENT_SECRET
    : (process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET);
  if (!id || !sec) return null;
  try {
    const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${id}:${sec}`).toString("base64")}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    return r.ok ? (await r.json()).access_token : null;
  } catch { return null; }
}

async function verifierSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("[paypal/webhook] PAYPAL_WEBHOOK_ID absent — signature non vérifiée.");
    return true;
  }
  const token = await getPaypalToken();
  if (!token) return true;
  try {
    const r = await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook_id:       webhookId,
        transmission_id:  req.headers.get("paypal-transmission-id"),
        transmission_time:req.headers.get("paypal-transmission-time"),
        cert_url:         req.headers.get("paypal-cert-url"),
        auth_algo:        req.headers.get("paypal-auth-algo"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        webhook_event:    JSON.parse(rawBody),
      }),
    });
    if (!r.ok) return false;
    return (await r.json()).verification_status === "SUCCESS";
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const SB      = sbServer();
  const now     = new Date().toISOString();
  const today   = now.split("T")[0];

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }

  const eventType = event.event_type || "";
  const eventId   = event.id || "";
  const resource  = event.resource || {};

  console.log(`[paypal/webhook] ${eventType} — ${eventId}`);

  // Log immédiat
  await SB.from("webhook_logs").insert({
    provider: "PayPal", event_type: eventType, event_id: eventId,
    payload: event, statut: "recu", recu_le: now,
  }).catch(() => {});

  // Vérification signature
  if (!(await verifierSignature(req, rawBody))) {
    await SB.from("webhook_logs").update({ statut: "signature_invalide" }).eq("event_id", eventId);
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  // Idempotence
  const { data: existant } = await SB.from("webhook_logs")
    .select("statut").eq("event_id", eventId).eq("statut", "traite").single();
  if (existant) return NextResponse.json({ ok: true, statut: "deja_traite" });

  try {
    switch (eventType) {

      case "PAYMENT.CAPTURE.COMPLETED":
      case "CHECKOUT.ORDER.COMPLETED": {
        const capture_id = resource.id || "";
        const order_id   = resource.supplementary_data?.related_ids?.order_id || resource.id || "";
        const montant    = parseFloat(resource.amount?.value || resource.purchase_units?.[0]?.amount?.value || "0");
        const devise     = resource.amount?.currency_code || "EUR";

        let ref = ""; let pole = "GENERAL";
        let commande_id: string | null = null; let client_id: string | null = null;
        try {
          const custom = JSON.parse(resource.custom_id || resource.purchase_units?.[0]?.custom_id || "{}");
          ref = custom.ref || ""; pole = custom.pole || "GENERAL";
          commande_id = custom.commande_id || null; client_id = custom.client_id || null;
        } catch {}

        const { data: pmt } = await SB.from("payments")
          .select("id,client_id,client_email,facture_id,univers,commande_id,notes")
          .or(`provider_ref.eq.${order_id},reference.eq.${ref}`)
          .single();

        // ── Règle comptable : PayPal = statut auto_valide
        await confirmerPaiement({
          provider:      "PayPal",
          provider_ref:  capture_id || order_id,
          montant,
          devise,
          mode_paiement: "PayPal",
          reference:     ref || pmt?.notes || capture_id,
          commande_id:   pmt?.commande_id || commande_id,
          client_id:     pmt?.client_id   || client_id,
          client_email:  pmt?.client_email || resource.payer?.email_address || null,
          client_nom:    resource.payer
            ? [resource.payer.name?.given_name, resource.payer.name?.surname].filter(Boolean).join(" ")
            : null,
          facture_id:    pmt?.facture_id  || null,
          univers:       pmt?.univers     || pole,
          description:   pmt?.notes       || `PayPal ${ref}`,
          metadata:      { event_type: eventType, event_id: eventId, order_id, source: "webhook" },
        });
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const ref = resource.supplementary_data?.related_ids?.order_id || resource.id || "";
        await SB.from("payments")
          .update({ statut: "echoue", notes_echec: "PayPal CAPTURE.DENIED", updated_at: now })
          .or(`provider_ref.eq.${ref},provider_ref.eq.${resource.id}`);
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        const montant_r = parseFloat(resource.amount?.value || "0");
        await SB.from("payments")
          .update({ statut: "rembourse", notes_echec: `PayPal ${eventType}`, updated_at: now })
          .or(`provider_ref.eq.${resource.id}`);
        // Écriture comptable avoir — auto_valide (paiement en ligne)
        await SB.from("pre_comptabilite").insert({
          date: today, libelle: `Remboursement PayPal – ${resource.id}`,
          type_operation: "remboursement", journal: "avoirs", pole: "GENERAL",
          mode_paiement: "PayPal",
          montant_ht:  parseFloat((montant_r / 1.20).toFixed(2)),
          tva:         parseFloat((montant_r - montant_r / 1.20).toFixed(2)),
          montant_ttc: -montant_r,
          statut: "auto_valide",   // ← règle comptable : PayPal = auto
          categorie_compta: "Remboursements PayPal",
          source: "auto", cree_le: now, valide_le: now,
        });
        break;
      }

      case "CHECKOUT.ORDER.APPROVED":
        await SB.from("payments")
          .update({ statut: "en_attente", updated_at: now })
          .eq("provider_ref", resource.id);
        break;

      default:
        console.log(`[paypal/webhook] Événement ignoré : ${eventType}`);
    }

    await SB.from("webhook_logs").update({ statut: "traite", traite_le: now }).eq("event_id", eventId);
    return NextResponse.json({ ok: true, event_type: eventType });

  } catch (err: any) {
    console.error("[paypal/webhook] Erreur:", err.message);
    await SB.from("webhook_logs").update({ statut: "erreur", erreur: err.message }).eq("event_id", eventId);
    return NextResponse.json({ error: "Erreur traitement.", detail: err.message }, { status: 500 });
  }
}
