// ═══════════════════════════════════════════════════════════
// LIB PAIEMENTS BELLAÏA — Helpers serveur partagés
// Utilisé par PayPal, SumUp, Webhooks
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

// ── Client Supabase serveur (service role)
export function sbServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type ModePaiement = "PayPal" | "SumUp" | "Especes" | "Virement" | "Lien_paiement";
export type StatutPaiement = "en_attente" | "paye" | "echoue" | "rembourse" | "annule";
export type StatutCompta = "auto_valide" | "a_verifier" | "valide" | "annule";

// ── Enregistrer un paiement confirmé + alimenter toute la chaîne
export async function confirmerPaiement(params: {
  provider:         "PayPal" | "SumUp";
  provider_ref:     string;       // order_id PayPal ou checkout_id SumUp
  montant:          number;
  devise:           string;
  mode_paiement:    ModePaiement;
  reference:        string;       // notre référence interne
  commande_id?:     string;
  client_id?:       string;
  client_email?:    string;
  client_nom?:      string;
  facture_id?:      string;
  univers:          string;
  description:      string;
  metadata?:        Record<string, any>;
}) {
  const SB     = sbServer();
  const now    = new Date().toISOString();
  const today  = now.split("T")[0];
  const statut_compta: StatutCompta = "auto_valide"; // paiement en ligne = toujours auto

  // ── 1. Mettre à jour ou créer le paiement Supabase
  let paiement_id: string | null = null;
  const { data: pmt } = await SB.from("payments")
    .upsert({
      provider:      params.provider,
      provider_ref:  params.provider_ref,
      reference:     params.reference,
      montant:       params.montant,
      devise:        params.devise || "EUR",
      mode_paiement: params.mode_paiement,
      statut:        "paye",
      univers:       params.univers,
      client_id:     params.client_id || null,
      client_email:  params.client_email || null,
      commande_id:   params.commande_id || null,
      facture_id:    params.facture_id  || null,
      date_paiement: today,
      notes:         params.description,
      updated_at:    now,
      source_auto:   true,
    }, { onConflict: "provider_ref" })
    .select("id").single();
  paiement_id = pmt?.id || null;

  // ── 2. Marquer la facture payée
  if (params.facture_id) {
    await SB.from("invoices")
      .update({ statut: "payée", date_paiement: today, updated_at: now })
      .eq("id", params.facture_id);
  } else if (params.reference) {
    // Chercher par référence
    await SB.from("invoices")
      .update({ statut: "payée", date_paiement: today, updated_at: now })
      .or(`reference.eq.${params.reference},notes.ilike.%${params.reference}%`);
  }

  // ── 3. Marquer la commande payée
  if (params.commande_id) {
    await SB.from("events_commandes")
      .update({ statut: "payée", updated_at: now })
      .eq("id", params.commande_id);
  }

  // ── 4. Mettre à jour le client CRM
  if (params.client_id) {
    const { data: cl } = await SB.from("clients").select("total_achats,nb_commandes").eq("id", params.client_id).single();
    await SB.from("clients").update({
      total_achats:    (cl?.total_achats || 0) + params.montant,
      nb_commandes:    (cl?.nb_commandes || 0) + 1,
      derniere_commande: today,
      dernier_paiement:  today,
      updated_at:        now,
    }).eq("id", params.client_id);

    // Activité CRM
    await SB.from("client_activities").insert({
      client_id:   params.client_id,
      type:        "paiement",
      description: `Paiement ${params.provider} confirmé — ${params.montant}€ — ${params.description}`,
      date:        today,
      montant:     params.montant,
      metadata:    { provider: params.provider, reference: params.reference, provider_ref: params.provider_ref },
    });
  }

  // ── 5. Pré-comptabilité — écriture auto_valide
  const montant_ht  = parseFloat((params.montant / 1.20).toFixed(2));
  const tva         = parseFloat((params.montant - montant_ht).toFixed(2));
  const categorie   = CATEGORIES_POLE[params.univers] || "Ventes diverses";

  await SB.from("pre_comptabilite").insert({
    date:             today,
    libelle:          `${params.provider} – ${params.description}`,
    type_operation:   "vente_produit",
    journal:          "ventes",
    pole:             params.univers,
    mode_paiement:    params.mode_paiement,
    montant_ht,
    tva,
    montant_ttc:      params.montant,
    statut:           statut_compta,
    facture_id:       params.facture_id   || null,
    paiement_id:      paiement_id         || null,
    client_nom:       params.client_nom   || params.client_email || null,
    categorie_compta: categorie,
    source:           "auto",
    cree_le:          now,
    valide_le:        now,  // auto_valide = validé immédiatement
  });

  // Journal des paiements (entrée banque)
  await SB.from("pre_comptabilite").insert({
    date:             today,
    libelle:          `Encaissement ${params.provider} – ${params.reference}`,
    type_operation:   "vente_produit",
    journal:          "banque",
    pole:             params.univers,
    mode_paiement:    params.mode_paiement,
    montant_ht:       params.montant,
    tva:              0,
    montant_ttc:      params.montant,
    statut:           statut_compta,
    paiement_id:      paiement_id || null,
    categorie_compta: `Encaissement ${params.provider}`,
    source:           "auto",
    cree_le:          now,
    valide_le:        now,
  });

  // ── 6. Log webhook pour audit
  await SB.from("webhook_logs").insert({
    provider:    params.provider,
    event_type:  "PAYMENT.CONFIRMED",
    event_id:    params.provider_ref,
    payload:     params.metadata || {},
    statut:      "traite",
    traite_le:   now,
  }).catch(() => {}); // table optionnelle

  return { ok: true, paiement_id };
}

// ── Catégories comptables par pôle
const CATEGORIES_POLE: Record<string, string> = {
  BSH:       "Ventes marchandises — Lingerie",
  ODYSSEE:   "Ventes prestations beauté",
  EVENTS:    "Ventes prestations événementielles",
  FOOD:      "Ventes traiteur",
  STRUCTURE: "Ventes produits numériques",
  VILO:      "Ventes prestations administratives",
  MTP:       "Ventes éditions jeunesse",
  GENERAL:   "Ventes diverses",
};

// ── URLs de retour communes
export function getRetourUrls(reference: string, provider: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return {
    success:  `${base}/paiement/succes?ref=${reference}&provider=${provider}`,
    cancel:   `${base}/paiement/annule?ref=${reference}&provider=${provider}`,
    retour:   `${base}/paiement/retour?ref=${reference}&provider=${provider}`,
  };
}
