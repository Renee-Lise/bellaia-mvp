import { NextRequest, NextResponse } from "next/server";
import { SUMUP_MERCHANT_CODE as SUMUP_CODE, SUMUP_API_URL, getSumupToken, getSumupUrls as getUrls } from "@/lib/sumup";

// ══════════════════════════════════════════════════════════
// BILLETTERIE BSH EXPERIENCES — création de billet + checkout SumUp
// src/app/api/bsh-experiences/billets/create-checkout/route.ts
//
// Phase 1 de "on commence à gérer billetterie et paiement" —
// réutilise exactement la chaîne de paiement déjà en production
// (SumUp, table payments) plutôt que d'en inventer une nouvelle.
// Authentification/URLs SumUp désormais partagées via src/lib/sumup.ts
// (plus de duplication avec /api/payments/sumup/create-checkout) ;
// cette route-ci a un travail supplémentaire à faire avant d'appeler
// SumUp : vérifier l'événement côté serveur (publié, places
// disponibles) et calculer le montant depuis le prix réel en base —
// jamais depuis une valeur envoyée par le client.
//
// Le billet est créé en statut_paiement='en_attente' et les places
// sont réservées immédiatement (places_restantes décrémenté). Limite
// connue de cette Phase 1, assumée sciemment : si l'acheteuse
// abandonne le paiement SumUp, la place reste réservée (pas
// d'expiration automatique) — à traiter en Phase 2 si ça pose un
// problème réel en usage, pas avant.
// ══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const { evenementId, quantite, acheteurNom, acheteurEmail, acheteurTel, clientId } = body;

  const qte = parseInt(quantite, 10);
  if (!evenementId || isNaN(qte) || qte < 1 || qte > 10) {
    return NextResponse.json({ error: "Demande invalide (événement ou quantité)." }, { status: 400 });
  }
  if (!acheteurNom?.trim()) {
    return NextResponse.json({ error: "Nom de l'acheteuse manquant." }, { status: 400 });
  }

  // 1. Vérifier l'événement côté serveur — jamais faire confiance au
  // prix ou à la disponibilité envoyés par le client.
  const { data: evt, error: evtErr } = await SB
    .from("bsh_evenements")
    .select("id, nom, prix, places_restantes, statut, publie")
    .eq("id", evenementId)
    .single();

  if (evtErr || !evt) {
    return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
  }
  if (!evt.publie || evt.statut !== "actif") {
    return NextResponse.json({ error: "Cet événement n'est plus ouvert à la réservation." }, { status: 409 });
  }
  if ((evt.places_restantes ?? 0) < qte) {
    return NextResponse.json({ error: "Plus assez de places disponibles." }, { status: 409 });
  }

  const prixUnitaire = parseFloat(evt.prix) || 0;
  const montant = parseFloat((prixUnitaire * qte).toFixed(2));
  if (montant <= 0) {
    return NextResponse.json({ error: "Cet événement n'a pas de tarif de billetterie configuré." }, { status: 409 });
  }

  // 2. Réserver les places + créer le billet en attente de paiement.
  const { data: billet, error: billetErr } = await SB
    .from("bsh_billets")
    .insert({
      evenement_id: evenementId,
      acheteur_nom: acheteurNom.trim(),
      client_id: clientId || null,
      acheteur_email: acheteurEmail || null,
      acheteur_tel: acheteurTel || null,
      quantite: qte,
      prix: montant,
      montant_total: montant,
      statut_paiement: "en_attente",
    })
    .select("id")
    .single();

  if (billetErr || !billet) {
    return NextResponse.json({ error: "Impossible de créer la réservation." }, { status: 500 });
  }

  await SB.from("bsh_evenements")
    .update({ places_restantes: (evt.places_restantes ?? 0) - qte })
    .eq("id", evenementId);

  // 3. Checkout SumUp.
  const token = await getSumupToken();
  if (!token) {
    // Rollback : libérer les places et supprimer le billet en attente.
    await SB.from("bsh_evenements").update({ places_restantes: evt.places_restantes }).eq("id", evenementId);
    await SB.from("bsh_billets").delete().eq("id", billet.id);
    return NextResponse.json({ error: "Paiement par carte non configuré. Réessayez plus tard." }, { status: 503 });
  }

  const checkout_ref = `BS-BSHBILLET-${Date.now()}`;
  const urls = getUrls(checkout_ref);

  let sumup_data: any;
  try {
    const payload: any = {
      checkout_reference: checkout_ref,
      amount: montant,
      currency: "EUR",
      merchant_code: SUMUP_CODE,
      description: `Bella'Secret Home – ${evt.nom} × ${qte}`,
      return_url: urls.success,
    };
    if (acheteurEmail) payload.customer_email = acheteurEmail;

    const r = await fetch(`${SUMUP_API_URL}/v0.1/checkouts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    if (!r.ok) {
      await SB.from("bsh_evenements").update({ places_restantes: evt.places_restantes }).eq("id", evenementId);
      await SB.from("bsh_billets").delete().eq("id", billet.id);
      let err: any = {};
      try { err = JSON.parse(text); } catch {}
      return NextResponse.json({ error: `Erreur SumUp : ${err.message || err.error_code || text.slice(0, 120)}` }, { status: 502 });
    }
    sumup_data = JSON.parse(text);
  } catch {
    await SB.from("bsh_evenements").update({ places_restantes: evt.places_restantes }).eq("id", evenementId);
    await SB.from("bsh_billets").delete().eq("id", billet.id);
    return NextResponse.json({ error: "Impossible de contacter SumUp." }, { status: 503 });
  }

  const hosted_url: string =
    sumup_data?.hosted_checkout_url ||
    sumup_data?.links?.find?.((l: any) => l.rel === "hosted-checkout")?.href ||
    `https://checkout.sumup.com/pay/${sumup_data?.id}`;

  // 4. Enregistrer le paiement (table payments préexistante) —
  // commande_id réutilisé ici comme référence générique vers la ligne
  // source du paiement (le billet), lu par le webhook pour mettre à
  // jour bsh_billets en plus de events_commandes.
  await SB.from("payments").insert({
    montant, mode_paiement: "SumUp", type_paiement: "paiement", statut: "en_attente",
    reference: checkout_ref, provider: "SumUp", provider_ref: sumup_data?.id || "",
    lien_paiement: hosted_url, univers: "BSH", commande_id: billet.id,
    client_id: clientId || null, client_email: acheteurEmail || null,
    notes: `Billet BSH Experiences – ${evt.nom} × ${qte}`,
    date_paiement: new Date().toISOString().split("T")[0],
  });

  await SB.from("bsh_billets").update({ payment_reference: checkout_ref }).eq("id", billet.id);

  return NextResponse.json({ url: hosted_url, reference: checkout_ref, billetId: billet.id, montant });
}
