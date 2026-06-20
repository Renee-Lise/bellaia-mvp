import { NextRequest, NextResponse } from "next/server";

// Webhook SumUp — mis à jour automatique du statut commande

const STATUT_MAP: Record<string, string> = {
  PAID:      "reçu",
  PENDING:   "en_attente",
  FAILED:    "annulé",
  CANCELLED: "annulé",
  REFUNDED:  "remboursé",
};

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let event: any;
  try { event = await req.json(); }
  catch { return NextResponse.json({ error: "Body invalide." }, { status: 400 }); }

  console.log("[sumup/webhook] Événement reçu:", JSON.stringify(event).slice(0, 300));

  const {
    id:          checkout_id,
    status:      sumup_status,
    amount,
    checkout_reference: ref,
  } = event || {};

  if (!ref && !checkout_id) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const statut_bellaia = STATUT_MAP[sumup_status?.toUpperCase()] || "en_attente";

  // Mettre à jour le paiement Bellaïa
  const { data: pmt } = await SB
    .from("payments")
    .update({
      statut:        statut_bellaia,
      provider_ref:  checkout_id || "",
      updated_at:    new Date().toISOString(),
      ...(statut_bellaia === "reçu" ? { date_paiement: new Date().toISOString().split("T")[0] } : {}),
    })
    .eq("reference", ref || checkout_id)
    .select("commande_id, client_id, montant")
    .single();

  // Si paiement reçu → mettre à jour la commande
  if (statut_bellaia === "reçu" && pmt?.commande_id) {
    const montant_paye = parseFloat(amount || pmt.montant || 0);

    const { data: cmd } = await SB
      .from("events_commandes")
      .select("montant_total, acompte")
      .eq("id", pmt.commande_id)
      .single();

    if (cmd) {
      const nouvel_acompte = (parseFloat(cmd.acompte) || 0) + montant_paye;
      const est_solde      = nouvel_acompte >= (parseFloat(cmd.montant_total) || 0);

      await SB.from("events_commandes").update({
        acompte:    nouvel_acompte,
        statut:     est_solde ? "Réalisé" : "Acompte reçu",
        statut_pmt: est_solde ? "payé" : "acompte_reçu",
        updated_at: new Date().toISOString(),
      }).eq("id", pmt.commande_id);
    }
  }

  return NextResponse.json({ received: true, statut: statut_bellaia });
}
