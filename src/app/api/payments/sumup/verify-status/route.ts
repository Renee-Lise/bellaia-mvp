import { NextRequest, NextResponse } from "next/server";

const SUMUP_TOKEN = process.env.SUMUP_ACCESS_TOKEN;

const STATUT_MAP: Record<string, string> = {
  PAID: "reçu", PENDING: "en_attente",
  FAILED: "annulé", CANCELLED: "annulé",
  EXPIRED: "annulé", REFUNDED: "remboursé",
};

export async function GET(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(req.url);
  const ref         = searchParams.get("ref");
  const checkout_id = searchParams.get("checkout_id");

  if (!ref && !checkout_id) {
    return NextResponse.json({ error: "Paramètre requis : ref ou checkout_id." }, { status: 400 });
  }

  // 1. Récupérer le paiement Supabase
  const query = ref
    ? SB.from("payments").select("*").eq("reference", ref)
    : SB.from("payments").select("*").eq("provider_ref", checkout_id);

  const { data: pmts } = await query.order("created_at", { ascending: false }).limit(1);
  const pmt = pmts?.[0] || null;

  // 2. Vérifier côté SumUp si token disponible
  let statut_sumup = "PENDING";
  let montant      = pmt?.montant || 0;

  const id_to_check = pmt?.provider_ref || checkout_id;

  if (SUMUP_TOKEN && id_to_check) {
    try {
      const r = await fetch(`https://api.sumup.com/v0.1/checkouts/${id_to_check}`, {
        headers: { "Authorization": `Bearer ${SUMUP_TOKEN}` },
      });
      if (r.ok) {
        const d = await r.json();
        statut_sumup = d.status?.toUpperCase() || "PENDING";
        montant      = d.amount || montant;
      }
    } catch {}
  } else if (pmt) {
    // Pas de token → retourner l'état Supabase
    return NextResponse.json({
      statut:  pmt.statut,
      montant: pmt.montant,
      source:  "supabase",
    });
  }

  const statut_bellaia = STATUT_MAP[statut_sumup] || "en_attente";

  // 3. Mettre à jour Supabase si changement
  if (pmt && pmt.statut !== statut_bellaia) {
    await SB.from("payments")
      .update({
        statut:     statut_bellaia,
        updated_at: new Date().toISOString(),
        ...(statut_bellaia === "reçu" ? { date_paiement: new Date().toISOString().split("T")[0] } : {}),
      })
      .eq("id", pmt.id);

    // Mettre à jour la commande si paiement reçu
    if (statut_bellaia === "reçu" && pmt.commande_id) {
      const { data: cmd } = await SB.from("events_commandes")
        .select("montant_total, acompte")
        .eq("id", pmt.commande_id)
        .single();

      if (cmd) {
        const nouvel_acompte = (parseFloat(cmd.acompte) || 0) + parseFloat(montant);
        const est_solde      = nouvel_acompte >= (parseFloat(cmd.montant_total) || 0);
        await SB.from("events_commandes").update({
          acompte:    nouvel_acompte,
          statut:     est_solde ? "Réalisé" : "Acompte reçu",
          statut_pmt: est_solde ? "payé" : "acompte_reçu",
          updated_at: new Date().toISOString(),
        }).eq("id", pmt.commande_id);
      }
    }
  }

  return NextResponse.json({
    statut:       statut_bellaia,
    statut_sumup: statut_sumup,
    montant,
    devise:       "EUR",
    reference:    ref || pmt?.reference,
    mis_a_jour:   pmt?.statut !== statut_bellaia,
  });
}
