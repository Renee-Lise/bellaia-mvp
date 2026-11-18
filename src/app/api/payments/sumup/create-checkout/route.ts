import { NextRequest, NextResponse } from "next/server";
import { SUMUP_MERCHANT_CODE as SUMUP_CODE, SUMUP_API_URL, getSumupToken, getSumupUrls as getUrls } from "@/lib/sumup";

// ══════════════════════════════════════════════════════════
// SUMUP CREATE-CHECKOUT — Bellaïa Hub
// SÉCURITÉ (18/11) : le MONTANT n'est JAMAIS celui envoyé par le
// navigateur. Il est recalculé ici, en centimes, depuis la base :
//   • source "panier"   : articles BSH / Odyssée (id + quantité) →
//                         prix_vente lus dans stocks (produits actifs)
//   • source "commande" : commande bellaia_commandes de la personne
//                         connectée (total / acompte / solde), refusée
//                         si son total n'a pas été vérifié par l'équipe
//   • source "billet"   : billet BSH → prix enregistré du billet
//   • source "lien"     : montant libre RÉSERVÉ à la fondatrice (ou
//                         permission paiements.creer_lien), pour créer
//                         un lien de paiement
// Devise forcée en EUR. Toute tentative refusée est journalisée.
// Authentification/URLs partagées : src/lib/sumup.ts
// ══════════════════════════════════════════════════════════

const UNIVERS_OK = ["BSH","EVENTS","ODYSSEE","FOOD","STRUCTURE","VILO","MTP","GENERAL"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CENTIMES = 1_000_000; // 10 000 €

type Calcul = { centimes: number; description: string; univers: string; commande_ref?: string; commande_id?: string; detail: any };

async function identifier(SB: any, req: NextRequest): Promise<{ id: string | null; staff: boolean; email: string | null }> {
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton || jeton === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { id: null, staff: false, email: null };
  try {
    const { data } = await SB.auth.getUser(jeton);
    const u = data?.user; if (!u) return { id: null, staff: false, email: null };
    const { data: prof } = await SB.from("profiles").select("role").eq("id", u.id).single();
    let staff = prof?.role === "fondatrice";
    if (!staff) {
      const { data: perms } = await SB.from("bellaia_permissions").select("permission,expire_le").eq("user_id", u.id).in("permission", ["paiements.creer_lien", "acces_complet"]);
      staff = (perms || []).some((p: any) => !p.expire_le || new Date(p.expire_le) > new Date());
    }
    return { id: u.id, staff, email: u.email || null };
  } catch { return { id: null, staff: false, email: null }; }
}

async function journaliser(SB: any, action: string, details: any) {
  try { await SB.from("bellaia_journal").insert({ action, cible: "sumup.create-checkout", details }); } catch {}
}

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Paiement indisponible : configuration serveur incomplète.", code: "SERVEUR_NON_CONFIGURE" }, { status: 503 });
  }
  const SB = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const qui = await identifier(SB, req);
  const source = String(body?.source || (qui.staff && body?.montant != null ? "lien" : "")).toLowerCase();
  let calc: Calcul | null = null;
  const refus = async (status: number, error: string, code: string) => {
    await journaliser(SB, "paiement.refuse", { code, source, utilisateur: qui.id, envoye: { montant: body?.montant, items: body?.items, reference: body?.reference } });
    return NextResponse.json({ error, code }, { status });
  };

  // ── 1. Montant calculé côté serveur ────────────────────
  if (source === "panier") {
    const univers = String(body?.univers || "").toUpperCase();
    if (!["BSH", "ODYSSEE"].includes(univers)) return refus(400, "Boutique inconnue.", "UNIVERS_INVALIDE");
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length || items.length > 30) return refus(400, "Panier vide ou trop grand.", "PANIER_INVALIDE");
    const quantites = new Map<string, number>();
    for (const it of items) {
      const id = String(it?.id || ""); const q = Number(it?.qte ?? it?.qty);
      if (!UUID.test(id) || !Number.isInteger(q) || q < 1 || q > 20) return refus(400, "Article ou quantité invalide.", "ARTICLE_INVALIDE");
      quantites.set(id, (quantites.get(id) || 0) + q);
    }
    const { data: produits, error } = await SB.from("stocks").select("id,nom,prix_vente,univers,statut").in("id", Array.from(quantites.keys()));
    if (error) return refus(503, "Catalogue indisponible.", "CATALOGUE_INDISPONIBLE");
    let centimes = 0; const lignes: any[] = [];
    for (const [id, q] of quantites) {
      const p = (produits || []).find((x: any) => x.id === id);
      const pu = Math.round(Number(p?.prix_vente) * 100);
      if (!p || p.univers !== univers || p.statut !== "actif" || !Number.isFinite(pu) || pu <= 0) return refus(409, "Un article n'est plus disponible ou n'a pas de prix.", "ARTICLE_INDISPONIBLE");
      centimes += pu * q; lignes.push({ id, nom: p.nom, qte: q, pu_centimes: pu });
    }
    // Code de réduction : vérifié et compté par la base (jamais un montant du navigateur).
    let remise = 0; let codeOk: string | null = null;
    if (typeof body?.code_reduction === "string" && body.code_reduction.trim()) {
      const { data: red, error: errRed } = await SB.rpc("reduction_consommer", { p_code: body.code_reduction.trim().slice(0, 40), p_univers: univers, p_montant_centimes: centimes, p_client: qui.id, p_commande_ref: null });
      if (errRed) return refus(503, "Réduction indisponible pour le moment.", "REDUCTION_INDISPONIBLE");
      if (!red?.valide) return refus(409, red?.message || "Code de réduction invalide.", "REDUCTION_INVALIDE");
      remise = Number(red.remise_centimes) || 0; codeOk = red.code || null;
    }
    calc = { centimes: centimes - remise, univers, description: (lignes.map(l => `${l.nom} ×${l.qte}`).join(", ") + (codeOk ? ` · code ${codeOk}` : "")).slice(0, 200), detail: { lignes, remise_centimes: remise, code: codeOk } };
  } else if (source === "commande") {
    const reference = String(body?.reference || "").trim();
    const option = String(body?.option || "total");
    if (!/^[A-Z0-9-]{3,40}$/i.test(reference) || !["total", "acompte", "solde"].includes(option)) return refus(400, "Commande ou option invalide.", "COMMANDE_INVALIDE");
    if (!qui.id) return refus(401, "Connectez-vous pour régler votre commande.", "NON_CONNECTE");
    const { data: cmd } = await SB.from("bellaia_commandes").select("*").eq("reference", reference).maybeSingle();
    if (!cmd || (!qui.staff && cmd.created_by !== qui.id)) return refus(404, "Commande introuvable.", "COMMANDE_INTROUVABLE");
    if (cmd.total_verifie === false) return refus(409, "Le montant de cette commande doit d'abord être confirmé par Bella'Studio.", "TOTAL_A_VERIFIER");
    if (["ANNULE", "ANNULEE", "LIVRE", "PAYE"].includes(String(cmd.statut || "").toUpperCase())) return refus(409, "Cette commande ne peut plus être réglée.", "COMMANDE_CLOSE");
    const total = Math.round(Number(cmd.total) * 100), acompte = Math.round(Number(cmd.acompte) * 100);
    const solde = Math.round(Number(cmd.solde ?? (Number(cmd.total) - (cmd.acompte_paye ? Number(cmd.acompte) : 0))) * 100);
    if (option === "acompte" && (cmd.acompte_paye || !(acompte > 0))) return refus(409, "Aucun acompte à régler.", "ACOMPTE_INDISPONIBLE");
    const centimes = option === "total" ? (cmd.acompte_paye ? solde : total) : option === "acompte" ? acompte : solde;
    calc = { centimes, univers: UNIVERS_OK.includes(String(cmd.bu)) ? String(cmd.bu) : "GENERAL", commande_ref: reference, commande_id: cmd.id,
      description: `${option === "acompte" ? "Acompte" : option === "solde" ? "Solde" : "Règlement"} commande ${reference}`, detail: { option } };
  } else if (source === "billet") {
    const id = String(body?.billet_id || "");
    if (!UUID.test(id)) return refus(400, "Billet invalide.", "BILLET_INVALIDE");
    const { data: b } = await SB.from("bsh_billets").select("id,prix,statut_paiement").eq("id", id).maybeSingle();
    if (!b || !["en_attente"].includes(b.statut_paiement)) return refus(404, "Billet introuvable ou déjà réglé.", "BILLET_INDISPONIBLE");
    calc = { centimes: Math.round(Number(b.prix) * 100), univers: "BSH", commande_id: b.id, description: "Billet Bella'Secret Home", detail: { billet: b.id } };
  } else if (source === "lien") {
    if (!qui.staff) return refus(403, "Le montant est calculé par le serveur : utilisez le panier ou la commande.", "MONTANT_CLIENT_REFUSE");
    const centimes = Math.round(Number(body?.montant) * 100);
    const description = String(body?.description || "").trim().slice(0, 200);
    if (!description) return refus(400, "Description manquante.", "DESCRIPTION_MANQUANTE");
    calc = { centimes, univers: UNIVERS_OK.includes(String(body?.univers || "").toUpperCase()) ? String(body.univers).toUpperCase() : "GENERAL", description, detail: { lien_cree_par: qui.id } };
  } else {
    return refus(400, "Le montant est calculé par le serveur : précisez le panier ou la commande.", "SOURCE_MANQUANTE");
  }
  if (!Number.isInteger(calc.centimes) || calc.centimes <= 0) return refus(400, "Montant invalide.", "MONTANT_INVALIDE");
  if (calc.centimes > MAX_CENTIMES) return refus(400, "Montant max dépassé (10 000 €).", "MONTANT_MAX");
  const montant = calc.centimes / 100;

  // ── 2. Anti double paiement : un lien encore valide pour la même
  //       commande et le même montant est réutilisé.
  if (calc.commande_ref || calc.commande_id) {
    const depuis = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existant } = await SB.from("payments").select("id,reference,lien_paiement,provider_ref,montant")
      .eq("provider", "SumUp").eq("statut", "en_attente").eq("commande_id", calc.commande_id || null).gte("created_at", depuis)
      .order("created_at", { ascending: false }).limit(1);
    const e = existant?.[0];
    if (e && Math.round(Number(e.montant) * 100) === calc.centimes && e.lien_paiement) {
      return NextResponse.json({ url: e.lien_paiement, checkout_id: e.provider_ref, reference: e.reference, paiement_id: e.id, montant, devise: "EUR", reutilise: true });
    }
  }

  // ── 3. SumUp ───────────────────────────────────────────
  const token = await getSumupToken();
  if (!token) return NextResponse.json({ error: "SumUp non configuré.", code: "SUMUP_NOT_CONFIGURED" }, { status: 503 });
  if (!SUMUP_CODE) return NextResponse.json({ error: "SUMUP_MERCHANT_CODE manquant.", code: "SUMUP_NO_MERCHANT" }, { status: 503 });

  const checkout_ref = `BS-${calc.univers}-${Date.now()}`;
  const urls = getUrls(checkout_ref);
  let sumup_data: any;
  try {
    const payload: any = {
      checkout_reference: checkout_ref, amount: montant, currency: "EUR", merchant_code: SUMUP_CODE,
      description: `Bella'Studio – ${calc.description}`, return_url: urls.success,
    };
    const email = qui.email || (typeof body?.client_email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.client_email) ? body.client_email : null);
    if (email) payload.customer_email = email;
    const r = await fetch(`${SUMUP_API_URL}/v0.1/checkouts`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const text = await r.text();
    if (!r.ok) {
      console.error("[sumup/create] API error:", r.status, text.slice(0, 300));
      return NextResponse.json({ error: `Erreur SumUp (${r.status}).`, code: "SUMUP_API_ERROR" }, { status: r.status >= 500 ? 502 : 400 });
    }
    sumup_data = JSON.parse(text);
  } catch (err: any) {
    console.error("[sumup/create] Network error:", err.message);
    return NextResponse.json({ error: "Impossible de contacter SumUp.", code: "NETWORK_ERROR" }, { status: 503 });
  }
  const hosted_url: string = sumup_data?.hosted_checkout_url || sumup_data?.links?.find?.((l: any) => l.rel === "hosted-checkout")?.href || `https://checkout.sumup.com/pay/${sumup_data?.id}`;

  // ── 4. Paiement « en attente » : le montant ATTENDU est celui du
  //       serveur ; le webhook compare avec le montant réellement payé.
  const insert_pmt: any = {
    montant, mode_paiement: "SumUp", type_paiement: "paiement", statut: "en_attente", reference: checkout_ref,
    provider: "SumUp", provider_ref: sumup_data?.id || "", lien_paiement: hosted_url, univers: calc.univers,
    notes: `SumUp – ${calc.description}${calc.commande_ref ? ` (${calc.commande_ref})` : ""}`,
    date_paiement: new Date().toISOString().split("T")[0],
  };
  if (calc.commande_id) insert_pmt.commande_id = calc.commande_id;
  const { data: pmt, error: pmt_err } = await SB.from("payments").insert(insert_pmt).select("id").single();
  if (pmt_err) console.error("[sumup/create] Supabase insert:", pmt_err.message);

  return NextResponse.json({ url: hosted_url, checkout_id: sumup_data?.id, reference: checkout_ref, paiement_id: pmt?.id || null, montant, devise: "EUR", cancel_url: urls.cancel });
}
