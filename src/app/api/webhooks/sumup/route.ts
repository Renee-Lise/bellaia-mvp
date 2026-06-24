import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { sbServer, confirmerPaiement } from "@/lib/paiements";

// ═══════════════════════════════════════════════════════════
// SUMUP WEBHOOK — Bellaïa Hub
// POST /api/webhooks/sumup
// Gère : CHECKOUT_STATUS_CHANGED
// Vérification HMAC via SUMUP_WEBHOOK_SECRET si configuré
// ═══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const SB      = sbServer();
  const now     = new Date().toISOString();
  const today   = now.split("T")[0];

  // ── Vérification signature HMAC (si SUMUP_WEBHOOK_SECRET configuré)
  const webhookSecret = process.env.SUMUP_WEBHOOK_SECRET;
  if (webhookSecret) {
    const sigHeader = req.headers.get("x-payload-signature") || req.headers.get("sumup-signature") || "";
    try {
      const expected = createHmac("sha256", webhookSecret)
        .update(rawBody).digest("hex");
      const ok = timingSafeEqual(
        Buffer.from(sigHeader.replace("sha256=", ""), "hex"),
        Buffer.from(expected, "hex")
      );
      if (!ok) {
        console.error("[sumup/webhook] Signature HMAC invalide.");
        return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
      }
    } catch {
      console.warn("[sumup/webhook] Erreur vérification signature — permissif.");
    }
  }

  // ── Parser le body
  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }

  const eventType   = event.event_type || "CHECKOUT_STATUS_CHANGED";
  const checkout    = event.payload || event;
  const checkout_id = checkout.id || checkout.checkout_reference || "";
  const reference   = checkout.checkout_reference || checkout_id;
  const statut_pp   = checkout.status || "";

  console.log(`[sumup/webhook] ${eventType} — ${reference} — statut: ${statut_pp}`);

  // ── Log
  await SB.from("webhook_logs").insert({
    provider:   "SumUp",
    event_type: eventType,
    event_id:   checkout_id,
    payload:    event,
    statut:     "recu",
    recu_le:    now,
  }).catch(() => {});

  // ── Idempotence
  const { data: deja } = await SB.from("webhook_logs")
    .select("statut").eq("event_id", checkout_id).eq("statut", "traite").single();
  if (deja) return NextResponse.json({ ok: true, statut: "deja_traite" });

  // ── Traiter selon statut SumUp
  try {
    if (statut_pp === "PAID" || statut_pp === "CAPTURED" || statut_pp === "COMPLETED") {
      const montant    = parseFloat(checkout.amount || checkout.total_amount || "0");
      const devise     = checkout.currency || "EUR";

      // Récupérer le paiement Supabase
      const { data: pmt } = await SB.from("payments")
        .select("id,client_id,client_email,facture_id,univers,commande_id,notes")
        .or(`provider_ref.eq.${checkout_id},reference.eq.${reference}`)
        .single();

      const univers = pmt?.univers || checkout.return_url?.match(/BS-([A-Z]+)-/)?.[1] || "GENERAL";

      await confirmerPaiement({
        provider:      "SumUp",
        provider_ref:  checkout_id,
        montant,
        devise,
        mode_paiement: "SumUp",
        reference,
        commande_id:   pmt?.commande_id || null,
        client_id:     pmt?.client_id   || null,
        client_email:  pmt?.client_email || checkout.customer?.email || null,
        facture_id:    pmt?.facture_id   || null,
        univers,
        description:   pmt?.notes || checkout.description || `SumUp ${reference}`,
        metadata:      { event_type: eventType, checkout_id, status: statut_pp },
      });

    } else if (statut_pp === "FAILED" || statut_pp === "DECLINED" || statut_pp === "CANCELLED") {
      await SB.from("payments")
        .update({ statut: "echoue", notes_echec: `SumUp ${statut_pp}`, updated_at: now })
        .or(`provider_ref.eq.${checkout_id},reference.eq.${reference}`);
    } else {
      console.log(`[sumup/webhook] Statut ignoré : ${statut_pp}`);
    }

    await SB.from("webhook_logs").update({ statut: "traite", traite_le: now }).eq("event_id", checkout_id);
    return NextResponse.json({ ok: true, statut: statut_pp });

  } catch (err: any) {
    console.error("[sumup/webhook] Erreur:", err.message);
    await SB.from("webhook_logs").update({ statut: "erreur", erreur: err.message }).eq("event_id", checkout_id);
    return NextResponse.json({ error: "Erreur traitement.", detail: err.message }, { status: 500 });
  }
}
