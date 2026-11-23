// ═══════════════════════════════════════════════════════════
// Disponibilité des produits — règle unique pour tous les univers (Lot A, sans migration).
// Distingue : stock physique, réservé, disponible à la vente, stock fournisseur,
// sur commande (délai confirmé), rupture, retiré du catalogue fournisseur.
// Principe de sécurité : un produit n'est commandable que si du stock est disponible
// OU s'il est « sur commande » avec un délai confirmé par écrit. Dans le doute : non commandable.
// ═══════════════════════════════════════════════════════════
export type EtatDisponibilite =
  | "en_stock"            // stock disponible > 0
  | "sur_commande"        // stock disponible 0, fournisseur > 0 (ou réassort annoncé) et délai confirmé
  | "a_confirmer"         // stock disponible 0, fournisseur > 0 mais délai non confirmé → non commandable
  | "rupture"             // stock disponible 0 et fournisseur 0
  | "retire_fournisseur"  // absent du catalogue fournisseur et plus de stock
  | "fin_de_serie";       // absent du catalogue fournisseur mais stock restant → vente jusqu'à épuisement

export type EntreeDisponibilite = {
  stockPhysique: number | null;      // compté / en base
  stockReserve?: number | null;      // paniers validés, commandes non livrées
  stockFournisseur?: number | null;  // dernier relevé du fichier fournisseur (null = inconnu)
  presentChezFournisseur: boolean;   // la référence figure-t-elle dans le catalogue fournisseur ?
  delaiConfirmeJours?: number | null;// délai écrit du fournisseur (null = non confirmé)
};

export type Disponibilite = { etat: EtatDisponibilite; disponible: number; commandable: boolean; quantiteMaxCommande: number; libelle: string };

const entier = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

export function disponibilite(e: EntreeDisponibilite): Disponibilite {
  const disponible = Math.max(0, entier(e.stockPhysique) - entier(e.stockReserve));
  const delai = typeof e.delaiConfirmeJours === "number" && e.delaiConfirmeJours > 0 ? Math.ceil(e.delaiConfirmeJours) : null;
  if (!e.presentChezFournisseur) {
    return disponible > 0
      ? { etat: "fin_de_serie", disponible, commandable: true, quantiteMaxCommande: disponible, libelle: `Dernières pièces (${disponible})` }
      : { etat: "retire_fournisseur", disponible: 0, commandable: false, quantiteMaxCommande: 0, libelle: "Retiré du catalogue" };
  }
  if (disponible > 0) return { etat: "en_stock", disponible, commandable: true, quantiteMaxCommande: disponible, libelle: "En stock" };
  const fournisseur = e.stockFournisseur == null ? null : entier(e.stockFournisseur);
  if (fournisseur === 0) return { etat: "rupture", disponible: 0, commandable: false, quantiteMaxCommande: 0, libelle: "Temporairement indisponible" };
  if (delai != null) return { etat: "sur_commande", disponible: 0, commandable: true, quantiteMaxCommande: fournisseur ?? 1, libelle: `Sur commande — ${delai} jour${delai > 1 ? "s" : ""}` };
  return { etat: "a_confirmer", disponible: 0, commandable: false, quantiteMaxCommande: 0, libelle: "Disponibilité à confirmer" };
}

/** Une commande est-elle acceptable pour cette quantité ? (à appeler côté serveur avant d'enregistrer) */
export function quantiteAcceptable(d: Disponibilite, quantite: number): boolean {
  return Number.isInteger(quantite) && quantite >= 1 && d.commandable && quantite <= d.quantiteMaxCommande;
}
