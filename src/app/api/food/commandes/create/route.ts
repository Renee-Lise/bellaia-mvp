import { NextRequest, NextResponse } from "next/server";
import { envoyerPushFondatrice } from "@/lib/pushSend";

// ══════════════════════════════════════════════════════════
// CRÉATION DE COMMANDE — Bella'Food (ClientFood)
// src/app/api/food/commandes/create/route.ts
//
// Avant cette route, ClientFood écrivait directement dans
// bellaia_commandes depuis le navigateur avec les prix du panier
// tels quels (qté × prix côté client, jamais revérifiés). Un relevé
// externe a signalé le risque : un panier trafiqué ou un bug client
// pouvait enregistrer n'importe quel montant. Cette route reprend le
// même principe que la billetterie BSH Experiences (migration 0075,
// route create-checkout) : le client n'envoie que des identifiants
// et des quantités, jamais un prix — chaque ligne est reprix­ée ici
// depuis catalogue_produits/catalogue_variantes au moment de la
// commande, et toute ligne dont le produit n'est plus en vente
// (statut≠actif, invisible, indisponible) ou sans prix valide fait
// échouer toute la commande plutôt que de l'accepter partiellement.
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

  const { lignes, clientNom, clientTel, dateLivraison, notes, clientId } = body;

  if (!Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ error: "Panier vide." }, { status: 400 });
  }
  if (!clientNom?.trim()) {
    return NextResponse.json({ error: "Nom du client manquant." }, { status: 400 });
  }

  // 1. Reprix­er chaque ligne depuis la base — jamais depuis le client.
  const lignesVerifiees: { libelle: string; qte: number; prixUnitaire: number; total: number }[] = [];

  for (const l of lignes) {
    const idBrut = String(l?.id || "");
    const qte = parseInt(l?.qte, 10);
    if (!idBrut || isNaN(qte) || qte < 1) {
      return NextResponse.json({ error: "Ligne de panier invalide." }, { status: 400 });
    }
    const [produitId, varianteId, baseId] = idBrut.split("::");

    const { data: produit } = await SB
      .from("catalogue_produits")
      .select("id, nom, prix, statut, visible_client, disponible")
      .eq("id", produitId)
      .eq("business_unit", "FOOD")
      .single();

    if (!produit || produit.statut !== "actif" || !produit.visible_client || !produit.disponible) {
      return NextResponse.json({ error: `Produit indisponible : ${produit?.nom || produitId}. Rafraîchissez le catalogue et réessayez.` }, { status: 409 });
    }

    let prixReel: number | null = null;
    let libelle = produit.nom;

    if (varianteId) {
      const { data: variante } = await SB
        .from("catalogue_variantes")
        .select("id, nom, prix, disponible")
        .eq("id", varianteId)
        .eq("produit_id", produitId)
        .single();
      if (!variante || !variante.disponible || variante.prix == null) {
        return NextResponse.json({ error: `Option indisponible pour : ${produit.nom}. Rafraîchissez le catalogue et réessayez.` }, { status: 409 });
      }
      prixReel = parseFloat(variante.prix);
      // Base "Frites maison" (manioc/patate douce/plantain/pomme de
      // terre) — purement informative, ne change jamais le prix de
      // la variante (garniture) déjà vérifiée ci-dessus.
      const BASES: Record<string, string> = { manioc: "Manioc", patate_douce: "Patate douce", plantain: "Plantain", pomme_terre: "Pomme de terre" };
      const baseLabel = baseId ? BASES[baseId] : null;
      libelle = `${produit.nom}${baseLabel ? ` (${baseLabel})` : ""} — ${variante.nom}`;
    } else {
      if (produit.prix == null) {
        return NextResponse.json({ error: `${produit.nom} n'a pas de prix défini et ne peut pas être commandé en ligne.` }, { status: 409 });
      }
      prixReel = parseFloat(produit.prix);
    }

    lignesVerifiees.push({ libelle, qte, prixUnitaire: prixReel, total: parseFloat((prixReel * qte).toFixed(2)) });
  }

  const total = parseFloat(lignesVerifiees.reduce((s, l) => s + l.total, 0).toFixed(2));

  // 2. Référence — même RPC que le reste de l'app (ref_compteurs).
  let reference = `FOOD-${Date.now()}`;
  try {
    const r = await SB.rpc("prochaine_reference", { p_prefixe: "FOOD" });
    if (r.data && typeof r.data === "string") reference = r.data;
  } catch {}

  // 3. Enregistrement (bellaia_commandes, migration 0069) — statut
  // BROUILLON comme avant, la fondatrice fait avancer le statut.
  const { data: cmd, error } = await SB
    .from("bellaia_commandes")
    .insert({
      bu: "FOOD",
      reference,
      client_nom: clientNom.trim(),
      client_tel: clientTel || null,
      statut: "BROUILLON",
      total,
      acompte: Math.round(total * 0.3),
      date_commande: new Date().toISOString().split("T")[0],
      date_livraison: dateLivraison || null,
      lignes: JSON.stringify(lignesVerifiees),
      notes: notes || null,
      created_by: clientId || null,
    })
    .select("id, reference, total")
    .single();

  if (error || !cmd) {
    return NextResponse.json({ error: "La commande n'a pas pu être enregistrée." }, { status: 500 });
  }

  // 4. Notification interne — visible immédiatement dans l'en-tête
  // fondatrice (badge 🔔), pas seulement dans l'onglet Notifications.
  // Même table/forme que creerNotification() côté admin (ex. "Nouvelle
  // demande Events"), non bloquant : une commande déjà enregistrée ne
  // doit jamais être perdue si cette notification échoue.
  try {
    let notifRef = `NOTIF-${Date.now()}`;
    const rRef = await SB.rpc("prochaine_reference", { p_prefixe: "NOTIF" });
    if (rRef.data && typeof rRef.data === "string") notifRef = rRef.data;
    await SB.from("notifications").insert({
      reference: notifRef,
      pole: "FOOD",
      type_notification: "nouvelle_commande",
      titre: `Nouvelle commande Food — ${cmd.reference}`,
      message: `Client : ${clientNom.trim()}${clientTel ? " · " + clientTel : ""}\nTotal : ${cmd.total.toFixed(2)}€\n${lignesVerifiees.map(l => l.libelle + " ×" + l.qte).join(", ")}`,
      canal: "interne",
      statut: "a_envoyer",
      client_tel: clientTel || null,
      source_table: "bellaia_commandes",
      source_id: cmd.id,
    });
  } catch {}

  // 5. Push — best-effort, ne bloque jamais la réponse.
  envoyerPushFondatrice({
    titre: `Nouvelle commande Food — ${cmd.reference}`,
    message: `${clientNom.trim()} · ${cmd.total.toFixed(2)}€`,
    url: "/",
    tag: "nouvelle_commande_food",
  }).catch(() => {});

  return NextResponse.json({ ok: true, commandeId: cmd.id, reference: cmd.reference, total: cmd.total, lignes: lignesVerifiees });
}
