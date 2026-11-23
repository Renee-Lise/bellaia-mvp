import { NextRequest, NextResponse } from "next/server";
import { getSumupToken, SUMUP_API_URL } from "@/lib/sumup";
import { sbServer, confirmerPaiement } from "@/lib/paiements";

// ═══════════════════════════════════════════════════════════
// SUMUP WEBHOOK — Bellaïa Hub
// POST /api/webhooks/sumup
// Gère : CHECKOUT_STATUS_CHANGED
// Statut, montant et référence relus chez SumUp (jamais pris du message)
// ═══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const SB      = sbServer();
  const now     = new Date().toISOString();
  const today   = now.split("T")[0];

  // ── SÉCURITÉ : le contenu reçu n'est JAMAIS cru sur parole (cette adresse est
  // publique). On n'en garde que l'identifiant du checkout, puis on relit le
  // statut, le montant et la référence directement chez SumUp.
  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }

  const eventType   = String(event?.event_type || "CHECKOUT_STATUS_CHANGED").slice(0, 60);
  const recu        = event?.payload || event || {};
  const checkout_id = String(recu.id || recu.checkout_id || "").trim();
  if (!/^[A-Za-z0-9-]{6,80}$/.test(checkout_id)) return NextResponse.json({ received: true, skipped: true });

  const token = await getSumupToken();
  if (!token) return NextResponse.json({ error: "SumUp non configuré : vérification impossible." }, { status: 503 });
  let checkout: any = null;
  try {
    const r = await fetch(`${SUMUP_API_URL}/v0.1/checkouts/${encodeURIComponent(checkout_id)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) checkout = await r.json();
  } catch {}
  if (!checkout) return NextResponse.json({ error: "Checkout introuvable chez SumUp." }, { status: 404 });

  const reference = String(checkout.checkout_reference || checkout_id).replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 80);
  const statut_pp = String(checkout.status || "").toUpperCase();

  console.log(`[sumup/webhook] ${eventType} — ${reference} — statut: ${statut_pp}`);

  // ── Log
  try { await SB.from("webhook_logs").insert({
    provider:   "SumUp",
    event_type: eventType,
    event_id:   checkout_id,
    payload:    { recu: event, verifie: { id: checkout.id, status: checkout.status, amount: checkout.amount, checkout_reference: checkout.checkout_reference } },
    statut:     "recu",
    recu_le:    now,
  }); } catch {}

  // ── Idempotence
  const { data: deja } = await SB.from("webhook_logs")
    .select("statut").eq("event_id", checkout_id).eq("statut", "traite").maybeSingle();
  if (deja) return NextResponse.json({ ok: true, statut: "deja_traite" });
  // Seconde garde, sur une table qui existe : la table webhook_logs est absente de la base de production,
  // la garde ci-dessus ne protège donc rien aujourd'hui. Un paiement déjà « payé » n'est jamais retraité
  // (évite reçus et écritures en double si SumUp renvoie l'événement).
  const { data: dejaPaye } = await SB.from("payments").select("id").eq("provider_ref", checkout_id).eq("statut", "paye").limit(1);
  if (dejaPaye && dejaPaye.length) return NextResponse.json({ ok: true, statut: "deja_traite" });

  // ── Traiter selon statut SumUp
  try {
    if (statut_pp === "PAID" || statut_pp === "CAPTURED" || statut_pp === "COMPLETED") {
      const montant    = Number(checkout.amount) || 0;
      const devise     = checkout.currency || "EUR";

      // Montant payé (SumUp) = montant attendu (serveur) ? Sinon : anomalie.
      const { data: attendu } = await SB.from("payments").select("montant").eq("reference", reference).maybeSingle();
      if (!attendu || Math.round(montant * 100) !== Math.round(Number(attendu.montant) * 100) || String(devise).toUpperCase() !== "EUR") {
        try { await SB.from("bellaia_journal").insert({ action: "paiement.anomalie", cible: reference, details: { paye: montant, devise, attendu: attendu?.montant ?? null } }); } catch {}
        await SB.from("webhook_logs").update({ statut: "anomalie", traite_le: now }).eq("event_id", checkout_id);
        return NextResponse.json({ ok: true, anomalie: true }, { status: 202 });
      }

      // Récupérer le paiement Supabase
      const { data: pmt } = await SB.from("payments")
        .select("id,client_id,client_email,facture_id,univers,commande_id,notes")
        .or(`provider_ref.eq.${checkout_id},reference.eq.${reference}`)
        .single();

      const univers = pmt?.univers || reference.match(/BS-([A-Z]+)-/)?.[1] || "GENERAL";

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
