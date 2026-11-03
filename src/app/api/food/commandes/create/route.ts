import { NextRequest, NextResponse } from "next/server";
import { envoyerPushFondatrice } from "@/lib/pushSend";
import {
  MAX_QTE_LIGNE, MAX_LIGNES, BASES_FRITES_VALIDES, BASES_LABELS,
  verifierHorairesEtJour,
} from "@/lib/foodCommandeRegles";

// ══════════════════════════════════════════════════════════
// CRÉATION DE COMMANDE — Bella'Food (ClientFood)
// src/app/api/food/commandes/create/route.ts
//
// Durci suite au relevé de Renée-Lise (7 points, avant tout test de
// commande réelle) — chaque section ci-dessous correspond à l'un
// d'eux :
//   1. Identité du client — jamais depuis le corps de la requête.
//   2. Clé service-role — usage serveur strictement scopé.
//   3. Quantités — bornées, rejet si invalides/excessives.
//   4. Frites maison — base obligatoire et valide.
//   5. Horaires/jours fermés/quotas — migration 0078, no-op tant que
//      non configurés (jamais de règle inventée).
//   6. Disponibilité/prix — déjà en place, reconfirmé ligne par ligne.
//   7. Doublons/double envoi — idempotency_key (migration 0078).
//
// Les règles pures (horaires/jour/quantités/base) vivent dans
// src/lib/foodCommandeRegles.ts, sans dépendance Supabase/Next —
// testées isolément (voir scripts/test-food-commande-regles.mjs),
// cette route les applique contre la base réelle.
// ══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // ── 1. Identité du client — vérifiée depuis le token, jamais
  // acceptée telle quelle depuis le corps de la requête. Une
  // commande peut rester anonyme (pas de session), mais si un
  // identifiant est utilisé, c'est forcément celui, vérifié, du
  // compte connecté.
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  let clientIdVerifie: string | null = null;
  if (token) {
    const sbAuth = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await sbAuth.auth.getUser();
    clientIdVerifie = user?.id || null;
  }

  // ── 2. Clé service-role — usage serveur uniquement, jamais
  // exposée ; limitée aux tables strictement nécessaires à cette
  // route (catalogue en lecture, commandes/notifications en
  // écriture scopée bu='FOOD'), jamais de requête arbitraire
  // construite depuis une entrée du client.
  const SB = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SB_ANON);

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const { lignes, clientNom, clientTel, dateLivraison, notes, idempotencyKey } = body;

  if (!clientNom?.trim()) {
    return NextResponse.json({ error: "Nom du client manquant." }, { status: 400 });
  }

  // ── 7. Doublons/double envoi — une tentative déjà enregistrée
  // avec cette clé renvoie la commande existante au lieu d'en créer
  // une deuxième (double clic, retry réseau après un succès non reçu).
  if (idempotencyKey) {
    const { data: existante } = await SB
      .from("bellaia_commandes")
      .select("id, reference, total, lignes")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existante) {
      return NextResponse.json({
        ok: true, commandeId: existante.id, reference: existante.reference, total: parseFloat(existante.total),
        lignes: typeof existante.lignes === "string" ? JSON.parse(existante.lignes) : existante.lignes,
        dejaEnregistree: true,
      });
    }
  }

  // ── 3. Quantités — bornées pour empêcher une commande excessive
  // ou invalide (qte non entière, nulle/négative, ou un panier
  // anormalement long).
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ error: "Panier vide." }, { status: 400 });
  }
  if (lignes.length > MAX_LIGNES) {
    return NextResponse.json({ error: `Panier trop long (${MAX_LIGNES} lignes maximum).` }, { status: 400 });
  }

  // ── 5. Jours fermés / horaires / quotas — migration 0078. Tant
  // que la fondatrice n'a rien configuré (actif=false, ou aucune
  // ligne), aucune commande n'est bloquée : rien n'est inventé ici.
  const { data: horaires } = await SB.from("food_horaires_config").select("*").eq("actif", true).maybeSingle();
  if (horaires) {
    const erreurHoraires = verifierHorairesEtJour(horaires, dateLivraison);
    if (erreurHoraires) return NextResponse.json({ error: erreurHoraires }, { status: 409 });

    if (horaires.quota_commandes_jour != null && dateLivraison) {
      const { count } = await SB
        .from("bellaia_commandes")
        .select("id", { count: "exact", head: true })
        .eq("bu", "FOOD")
        .eq("date_livraison", dateLivraison)
        .neq("statut", "ANNULE");
      if ((count || 0) >= horaires.quota_commandes_jour) {
        return NextResponse.json({ error: "Le quota de commandes pour cette date de livraison est atteint. Choisissez une autre date." }, { status: 409 });
      }
    }
  }

  // ── 4 & 6. Reprix­age, disponibilité, et cohérence des options
  // (base Frites maison) — depuis la base, jamais depuis le client.
  const lignesVerifiees: { libelle: string; qte: number; prixUnitaire: number; total: number }[] = [];

  for (const l of lignes) {
    const idBrut = String(l?.id || "");
    const qte = parseInt(l?.qte, 10);
    if (!idBrut || !Number.isFinite(qte) || qte < 1 || qte > MAX_QTE_LIGNE) {
      return NextResponse.json({ error: `Quantité invalide (1 à ${MAX_QTE_LIGNE} par produit).` }, { status: 400 });
    }
    const [produitId, varianteId, baseId] = idBrut.split("::");

    if (baseId && !BASES_FRITES_VALIDES.includes(baseId)) {
      return NextResponse.json({ error: "Option de base invalide." }, { status: 400 });
    }

    const { data: produit } = await SB
      .from("catalogue_produits")
      .select("id, nom, prix, statut, visible_client, disponible")
      .eq("id", produitId)
      .eq("business_unit", "FOOD")
      .single();

    if (!produit || produit.statut !== "actif" || !produit.visible_client || !produit.disponible) {
      return NextResponse.json({ error: `Produit indisponible : ${produit?.nom || produitId}. Rafraîchissez le catalogue et réessayez.` }, { status: 409 });
    }

    // "Frites maison" exige une base valide — sans base, la commande
    // serait ambiguë pour la préparation (rejet plutôt que supposer
    // une base par défaut jamais demandée au client).
    if (produit.nom === "Frites maison" && !baseId) {
      return NextResponse.json({ error: "Choisissez une base (manioc, patate douce, plantain ou pomme de terre) pour les Frites maison." }, { status: 400 });
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
      const baseLabel = baseId ? BASES_LABELS[baseId] : null;
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

  // Référence — même RPC que le reste de l'app (ref_compteurs).
  let reference = `FOOD-${Date.now()}`;
  try {
    const r = await SB.rpc("prochaine_reference", { p_prefixe: "FOOD" });
    if (r.data && typeof r.data === "string") reference = r.data;
  } catch {}

  // Enregistrement (bellaia_commandes, migration 0069) — statut
  // BROUILLON comme avant, la fondatrice fait avancer le statut.
  // Un conflit sur idempotency_key (requête en double arrivée en
  // parallèle, entre la vérification ci-dessus et cet insert) est
  // traité comme un succès — on relit la ligne existante plutôt que
  // de renvoyer une erreur au client.
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
      created_by: clientIdVerifie,
      idempotency_key: idempotencyKey || null,
    })
    .select("id, reference, total")
    .single();

  if (error || !cmd) {
    if (idempotencyKey && error?.code === "23505") {
      const { data: existante } = await SB.from("bellaia_commandes").select("id, reference, total, lignes").eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existante) {
        return NextResponse.json({
          ok: true, commandeId: existante.id, reference: existante.reference, total: parseFloat(existante.total),
          lignes: typeof existante.lignes === "string" ? JSON.parse(existante.lignes) : existante.lignes,
          dejaEnregistree: true,
        });
      }
    }
    return NextResponse.json({ error: "La commande n'a pas pu être enregistrée." }, { status: 500 });
  }

  // Notification interne — badge 🔔 en-tête fondatrice, non bloquant.
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

  // Push — best-effort, ne bloque jamais la réponse.
  envoyerPushFondatrice({
    titre: `Nouvelle commande Food — ${cmd.reference}`,
    message: `${clientNom.trim()} · ${cmd.total.toFixed(2)}€`,
    url: "/",
    tag: "nouvelle_commande_food",
  }).catch(() => {});

  return NextResponse.json({ ok: true, commandeId: cmd.id, reference: cmd.reference, total: cmd.total, lignes: lignesVerifiees });
}
