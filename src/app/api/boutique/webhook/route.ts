// POST /api/boutique/webhook — seule source de vérité du paiement : événement Stripe SIGNÉ.
// Accorde les droits (et crée la facture) une seule fois, même si Stripe renvoie l'événement plusieurs fois.
import { NextRequest, NextResponse } from "next/server";
import { boutiqueOuverte, sbServeur, stripeServeur } from "@/lib/boutiqueServeur";
import { evenementAccordeDroits, evenementRetireDroits } from "@/modules/boutique/regles";

export async function POST(req: NextRequest) {
  if (!boutiqueOuverte()) return NextResponse.json({ error: "Boutique fermée." }, { status: 503 });
  const stripe = await stripeServeur(); const sb = sbServeur(); const secret = process.env.STRIPE_BOUTIQUE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!stripe || !sb || !secret || !signature) return NextResponse.json({ error: "Non configuré." }, { status: 503 });
  let e: any;
  try { e = stripe.webhooks.constructEvent(await req.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Signature invalide." }, { status: 400 }); }

  if (evenementAccordeDroits(e)) {
    const id = e.data.object?.metadata?.paiement_boutique;
    if (!id) return NextResponse.json({ ignore: true });
    // Contrôle croisé : montant encaissé = montant calculé par le serveur à la commande.
    const { data: suivi } = await sb.from("stripe_payment_intents").select("montant_total_cts,stripe_checkout_session_id").eq("id", id).maybeSingle();
    if (!suivi || suivi.montant_total_cts !== e.data.object.amount_total || suivi.stripe_checkout_session_id !== e.data.object.id)
      return NextResponse.json({ error: "Paiement incohérent : aucun droit accordé." }, { status: 409 });
    const { error } = await sb.rpc("boutique_accorder_droits", { p_paiement: id, p_evenement: e.id });
    if (error) return NextResponse.json({ error: "Traitement à reprendre." }, { status: 500 }); // Stripe renverra l'événement
    return NextResponse.json({ recu: true });
  }
  if (evenementRetireDroits(e)) {
    const pi = e.data.object?.payment_intent;
    const intent = pi ? await stripe.paymentIntents.retrieve(String(pi)) : null;
    const id = intent?.metadata?.paiement_boutique;
    if (id) { const { error } = await sb.rpc("boutique_retirer_droits", { p_paiement: id, p_evenement: e.id, p_motif: "Remboursement Stripe" }); if (error) return NextResponse.json({ error: "Traitement à reprendre." }, { status: 500 }); }
    return NextResponse.json({ recu: true });
  }
  if (e.type === "checkout.session.expired") {
    const id = e.data.object?.metadata?.paiement_boutique;
    if (id) await sb.from("stripe_payment_intents").update({ statut: "expire", updated_at: new Date().toISOString() }).eq("id", id).eq("statut", "en_attente");
  }
  return NextResponse.json({ recu: true });
}
