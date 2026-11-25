// POST /api/boutique/commander — crée une session de paiement Stripe pour des produits numériques.
// Le navigateur n'envoie que des identifiants ; prix, disponibilité, âge et achats antérieurs sont relus ici.
import { NextRequest, NextResponse } from "next/server";
import { boutiqueOuverte, compteConnecte, sbServeur, stripeServeur, urlApplication } from "@/lib/boutiqueServeur";
import { MESSAGES_REFUS, validerPanier, type ProduitNumerique } from "@/modules/boutique/regles";

export async function POST(req: NextRequest) {
  if (!boutiqueOuverte()) return NextResponse.json({ error: "La boutique n'est pas encore ouverte." }, { status: 503 });
  const compte = await compteConnecte(req.headers.get("authorization"));
  if (!compte) return NextResponse.json({ error: "Connectez-vous pour acheter." }, { status: 401 });
  const sb = sbServeur(); const stripe = await stripeServeur();
  if (!sb || !stripe) return NextResponse.json({ error: "Paiement non configuré." }, { status: 503 });

  let corps: any; try { corps = await req.json(); } catch { return NextResponse.json({ error: "Demande invalide." }, { status: 400 }); }
  const ids: unknown = corps?.produits;
  const liste = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 25) : [];

  const [{ data: produits }, { data: profil }, { data: droits }] = await Promise.all([
    sb.from("catalogue_produits").select("id,reference,nom,business_unit,prix,prix_promotion,type_produit,fichier_chemin,visible_client,disponible,statut,public_age").in("id", liste.length ? liste : ["00000000-0000-0000-0000-000000000000"]),
    sb.from("profiles").select("prenom,nom,age_verifi").eq("id", compte.id).maybeSingle(),
    sb.from("boutique_droits").select("produit_id").eq("user_id", compte.id).is("revoque_le", null),
  ]);
  const v = validerPanier(ids, (produits || []) as ProduitNumerique[], { id: compte.id, age_verifie: profil?.age_verifi === true }, (droits || []).map((d: any) => d.produit_id));
  if ("refus" in v) return NextResponse.json({ error: MESSAGES_REFUS[v.refus], refus: v.refus, produit: v.produit_id ?? null }, { status: 422 });

  const nom = [profil?.prenom, profil?.nom].filter(Boolean).join(" ") || null;
  const { data: suivi, error: e1 } = await sb.from("stripe_payment_intents").insert({
    client_id: compte.id, client_nom: nom, client_email: compte.email, module: "boutique", devise: "eur",
    montant_total_cts: v.total_cts, statut: "en_attente", type_paiement: "comptant",
    description: v.lignes.map(l => l.nom).join(" · ").slice(0, 300),
    items_json: v.lignes.map(l => ({ produit_id: l.produit_id, reference: l.reference, nom: l.nom, prix_cts: l.prix_cts, business_unit: l.business_unit })),
    cree_par: compte.id,
  }).select("id").single();
  if (e1 || !suivi) return NextResponse.json({ error: "Commande non enregistrée." }, { status: 500 });

  const base = urlApplication();
  const session = await stripe.checkout.sessions.create({
    mode: "payment", locale: "fr", customer_email: compte.email || undefined,
    client_reference_id: suivi.id, metadata: { paiement_boutique: suivi.id },
    payment_intent_data: { metadata: { paiement_boutique: suivi.id } },
    line_items: v.lignes.map(l => ({ quantity: 1, price_data: { currency: "eur", unit_amount: l.prix_cts, product_data: { name: l.nom, metadata: { produit_id: l.produit_id } } } })),
    success_url: `${base}/boutique?achat=confirme&commande=${suivi.id}`,
    cancel_url: `${base}/boutique?achat=annule&commande=${suivi.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });
  await sb.from("stripe_payment_intents").update({ stripe_checkout_session_id: session.id, checkout_url: session.url, expire_at: new Date((session.expires_at || 0) * 1000).toISOString() }).eq("id", suivi.id);
  return NextResponse.json({ url: session.url, commande: suivi.id, total_cts: v.total_cts, mode_test: (process.env.STRIPE_BOUTIQUE_SECRET_KEY || "").includes("_test_") });
}
