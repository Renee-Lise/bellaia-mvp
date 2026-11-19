// ═══════════════════════════════════════════════════════════
// Pièces d'EXEMPLE pour prévisualiser les packs : lignes tirées des
// catalogues réels de chaque univers (prix réels ; « tarif à définir »
// quand le catalogue n'a pas de prix). Client : « Client — aperçu »,
// jamais une personne réelle ni une identité inventée.
// ═══════════════════════════════════════════════════════════
import type { Ligne } from "./piecesTypes";

export const TYPES_PACK: [string, string][] = [["devis", "Devis"], ["facture", "Facture"], ["bon_commande", "Bon de commande"], ["fiche_vente", "Fiche de vente"], ["bon_livraison", "Bon de livraison"]];
const plus = (j: number) => { const d = new Date(); d.setDate(d.getDate() + j); return d.toISOString().slice(0, 10); };

export function pieceExemple(type: string, lignes: Ligne[], univers: string): any {
  return {
    type, _modele: true, numero: null, date_document: plus(0), date_echeance: type === "facture" ? plus(30) : null,
    objet: type === "devis" ? "Proposition — exemple de mise en page" : null,
    destinataire: { nom: "Client — aperçu", societe: "", adresse: "Adresse du client", code_postal: "", ville: "" },
    champs: type === "devis" ? { validite: plus(30), acompte_pct: 30 } : type === "bon_livraison" ? { date_livraison: "À convenir", adresse_livraison: "Adresse de livraison du client" } : type === "bon_commande" ? { date_livraison: "À convenir" } : type === "fiche_vente" ? { date_prestation: "Sur commande" } : {},
    lignes, remise_pct: 0, acompte: 0, univers,
  };
}

/** Lignes d'exemple à partir des lignes catalogue {designation, pu, unite?}. */
export function lignesDepuisCatalogue(items: { d: string; pu: number | null; u?: string | null }[], qtes = [2, 1, 3, 1, 2, 1]): Ligne[] {
  return items.slice(0, 6).map((it, i) => ({ designation: it.d, detail: it.pu == null ? "Tarif à définir (catalogue sans prix)" : undefined, qte: qtes[i] || 1, unite: it.u || "pièce", pu: Number(it.pu) || 0 }));
}
