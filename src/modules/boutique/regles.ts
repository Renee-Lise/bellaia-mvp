// Boutique numérique — règles pures (sans accès réseau), utilisées par les routes serveur et testées seules.
// Principe : le navigateur n'envoie que des IDENTIFIANTS de produits ; prix, disponibilité et droits sont
// toujours relus et calculés côté serveur. Un fichier payant n'est délivré qu'après confirmation du
// paiement par Stripe (webhook signé), jamais sur la seule page de confirmation du navigateur.

export type PublicAge = "tout_public" | "jeunesse" | "adulte";

export interface ProduitNumerique {
  id: string;
  reference: string | null;
  nom: string;
  business_unit: string | null;
  prix: number | null;              // en euros, TTC
  prix_promotion: number | null;
  type_produit: string | null;      // « numerique » attendu
  fichier_chemin: string | null;    // compartiment privé « boutique-fichiers »
  visible_client: boolean | null;
  disponible: boolean | null;
  statut: string | null;            // « publie » requis
  public_age: PublicAge | null;
}

export interface Acheteur { id: string; age_verifie: boolean; }

export type RefusPanier =
  | "panier_vide" | "trop_de_produits" | "identifiant_invalide" | "doublon"
  | "introuvable" | "non_numerique" | "non_publie" | "sans_fichier" | "prix_invalide"
  | "adulte_non_verifie" | "deja_achete";

export interface LignePanier { produit_id: string; reference: string | null; nom: string; prix_cts: number; business_unit: string | null; }

export const MAX_PRODUITS_PAR_COMMANDE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prix effectif en centimes (promotion si elle est inférieure au prix), ou null si invalide. */
export function prixEnCentimes(p: Pick<ProduitNumerique, "prix" | "prix_promotion">): number | null {
  const base = typeof p.prix === "number" && Number.isFinite(p.prix) ? p.prix : null;
  if (base === null || base <= 0) return null;
  const promo = typeof p.prix_promotion === "number" && Number.isFinite(p.prix_promotion) && p.prix_promotion > 0 && p.prix_promotion < base ? p.prix_promotion : null;
  return Math.round((promo ?? base) * 100);
}

/** Un produit peut-il être vendu en ligne maintenant ? */
export function produitVendable(p: ProduitNumerique): RefusPanier | null {
  if (p.type_produit !== "numerique") return "non_numerique";
  if (p.statut !== "publie" || p.visible_client !== true || p.disponible !== true) return "non_publie";
  if (!p.fichier_chemin) return "sans_fichier";
  if (prixEnCentimes(p) === null) return "prix_invalide";
  return null;
}

/**
 * Contrôle complet d'un panier : identifiants reçus du navigateur + produits relus en base + droits déjà acquis.
 * Renvoie les lignes à facturer (prix serveur) ou le premier refus rencontré, avec le produit concerné.
 */
export function validerPanier(
  identifiants: unknown,
  produits: ProduitNumerique[],
  acheteur: Acheteur,
  dejaAchetes: string[] = [],
): { ok: true; lignes: LignePanier[]; total_cts: number } | { ok: false; refus: RefusPanier; produit_id?: string } {
  if (!Array.isArray(identifiants) || identifiants.length === 0) return { ok: false, refus: "panier_vide" };
  if (identifiants.length > MAX_PRODUITS_PAR_COMMANDE) return { ok: false, refus: "trop_de_produits" };
  const vus = new Set<string>();
  const lignes: LignePanier[] = [];
  for (const brut of identifiants) {
    if (typeof brut !== "string" || !UUID.test(brut)) return { ok: false, refus: "identifiant_invalide" };
    const id = brut.toLowerCase();
    if (vus.has(id)) return { ok: false, refus: "doublon", produit_id: id };
    vus.add(id);
    const p = produits.find(x => x.id.toLowerCase() === id);
    if (!p) return { ok: false, refus: "introuvable", produit_id: id };
    const r = produitVendable(p);
    if (r) return { ok: false, refus: r, produit_id: id };
    if (p.public_age === "adulte" && !acheteur.age_verifie) return { ok: false, refus: "adulte_non_verifie", produit_id: id };
    if (dejaAchetes.map(s => s.toLowerCase()).includes(id)) return { ok: false, refus: "deja_achete", produit_id: id };
    lignes.push({ produit_id: p.id, reference: p.reference, nom: p.nom, prix_cts: prixEnCentimes(p) as number, business_unit: p.business_unit });
  }
  return { ok: true, lignes, total_cts: lignes.reduce((s, l) => s + l.prix_cts, 0) };
}

export const MESSAGES_REFUS: Record<RefusPanier, string> = {
  panier_vide: "Votre panier est vide.",
  trop_de_produits: `Une commande est limitée à ${MAX_PRODUITS_PAR_COMMANDE} produits.`,
  identifiant_invalide: "Un produit du panier n'est pas reconnu.",
  doublon: "Un produit apparaît deux fois dans le panier.",
  introuvable: "Un produit du panier n'existe plus.",
  non_numerique: "Ce produit ne se vend pas en téléchargement.",
  non_publie: "Ce produit n'est pas disponible à la vente.",
  sans_fichier: "Ce produit n'est pas encore prêt au téléchargement.",
  prix_invalide: "Le prix de ce produit n'est pas encore validé.",
  adulte_non_verifie: "Ce produit est réservé aux adultes dont l'âge est vérifié.",
  deja_achete: "Vous possédez déjà ce produit : retrouvez-le dans « Mes achats et documents ».",
};

/** Clé Stripe autorisée ? Tant que la vente réelle n'est pas validée, seules les clés de TEST sont acceptées. */
export function cleStripeAutorisee(cle: string | undefined, venteReelleAutorisee: boolean): boolean {
  if (!cle) return false;
  if (cle.startsWith("sk_test_") || cle.startsWith("rk_test_")) return true;
  return venteReelleAutorisee && (cle.startsWith("sk_live_") || cle.startsWith("rk_live_"));
}

/** Un événement Stripe donne-t-il droit au téléchargement ? (paiement effectivement encaissé) */
export function evenementAccordeDroits(e: { type?: string; data?: { object?: { payment_status?: string; mode?: string } } }): boolean {
  return e?.type === "checkout.session.completed" && e.data?.object?.mode === "payment" && e.data?.object?.payment_status === "paid";
}
export function evenementRetireDroits(e: { type?: string; data?: { object?: { refunded?: boolean; amount_refunded?: number; amount?: number } } }): boolean {
  return e?.type === "charge.refunded" && (e.data?.object?.refunded === true || ((e.data?.object?.amount_refunded ?? 0) >= (e.data?.object?.amount ?? Infinity)));
}
