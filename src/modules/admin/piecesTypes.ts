// ═══════════════════════════════════════════════════════════
// Administratif — définition des documents (pièces) et calculs
// Table : bellaia_pieces (migration 0108). Aucune dépendance externe.
// ═══════════════════════════════════════════════════════════

export type TypePiece =
  | "devis" | "facture" | "facture_acompte" | "avoir" | "bon_commande" | "bon_achat" | "bon_livraison"
  | "bon_transport" | "bon_envoi" | "bordereau_envoi" | "bordereau_expedition" | "recu" | "courrier";

export type Ligne = { designation: string; detail?: string; qte: number; unite: string; pu: number; remise_pct?: number; tva_pct?: number };
export type Champ = { cle: string; libelle: string; type?: "texte" | "date" | "nombre" | "zone"; aide?: string };

export type DefPiece = {
  id: TypePiece; libelle: string; titre: string; ico: string; famille: "vente" | "logistique" | "courrier";
  prix: boolean;            // lignes avec prix et totaux
  lignes: boolean;          // tableau de lignes
  numeroAuto: "creation" | "validation";
  champs: Champ[];
  conversions: TypePiece[];
  conditions?: string;
};

export const UNITES = ["pièce", "assortiment de 10", "assortiment de 15", "assortiment de 20", "assortiment de 30", "assortiment de 40", "assortiment de 50", "litre (L)", "centilitre (cl)", "part", "lot", "kg", "g", "heure", "jour", "forfait", "prestation", "colis", "carton"];

export const PIECES: DefPiece[] = [
  { id: "devis", libelle: "Devis", titre: "DEVIS", ico: "📄", famille: "vente", prix: true, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "validite", libelle: "Valable jusqu'au", type: "date" }, { cle: "acompte_pct", libelle: "Acompte demandé (%)", type: "nombre" }, { cle: "date_prestation", libelle: "Date de la prestation / livraison", type: "texte" }],
    conversions: ["facture_acompte", "facture", "bon_commande"],
    conditions: "Devis gratuit. Bon pour accord : date, signature et mention « Bon pour accord ». Au-delà de la date de validité, les prix peuvent être révisés." },
  { id: "facture", libelle: "Facture", titre: "FACTURE", ico: "🧾", famille: "vente", prix: true, lignes: true, numeroAuto: "validation",
    champs: [{ cle: "date_prestation", libelle: "Date de la vente / prestation", type: "texte" }, { cle: "mode_paiement", libelle: "Mode de paiement", type: "texte" }, { cle: "ref_devis", libelle: "Référence devis / commande", type: "texte" }],
    conversions: ["bon_livraison", "recu", "avoir"] },
  { id: "facture_acompte", libelle: "Facture d'acompte", titre: "FACTURE D'ACOMPTE", ico: "💶", famille: "vente", prix: true, lignes: true, numeroAuto: "validation",
    champs: [{ cle: "ref_devis", libelle: "Référence du devis accepté", type: "texte" }, { cle: "mode_paiement", libelle: "Mode de paiement", type: "texte" }],
    conversions: ["facture", "recu"] },
  { id: "avoir", libelle: "Avoir", titre: "AVOIR", ico: "↩️", famille: "vente", prix: true, lignes: true, numeroAuto: "validation",
    champs: [{ cle: "ref_facture", libelle: "Facture concernée", type: "texte" }, { cle: "motif", libelle: "Motif de l'avoir", type: "zone" }], conversions: [] },
  { id: "bon_commande", libelle: "Bon de commande", titre: "BON DE COMMANDE", ico: "📦", famille: "vente", prix: true, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "date_livraison", libelle: "Livraison / retrait souhaité", type: "texte" }, { cle: "adresse_livraison", libelle: "Adresse de livraison", type: "zone" }, { cle: "ref_devis", libelle: "Référence devis", type: "texte" }],
    conversions: ["facture_acompte", "facture", "bon_livraison"] },
  { id: "bon_achat", libelle: "Bon d'achat / carte cadeau", titre: "BON D'ACHAT", ico: "🎁", famille: "vente", prix: false, lignes: false, numeroAuto: "creation",
    champs: [{ cle: "valeur", libelle: "Valeur (€)", type: "nombre" }, { cle: "beneficiaire", libelle: "Bénéficiaire", type: "texte" }, { cle: "offert_par", libelle: "Offert par", type: "texte" }, { cle: "valable_jusqu", libelle: "Valable jusqu'au", type: "date" }, { cle: "utilisable", libelle: "Utilisable pour", type: "texte", aide: "ex. toute prestation Bella'Odyssée" }, { cle: "code", libelle: "Code", type: "texte" }],
    conversions: [], conditions: "Non remboursable, non échangeable contre des espèces. Utilisable en une ou plusieurs fois dans la limite de sa validité." },
  { id: "bon_livraison", libelle: "Bon de livraison", titre: "BON DE LIVRAISON", ico: "🚚", famille: "logistique", prix: false, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "date_livraison", libelle: "Date de livraison", type: "texte" }, { cle: "adresse_livraison", libelle: "Adresse de livraison", type: "zone" }, { cle: "ref_commande", libelle: "Référence commande / facture", type: "texte" }, { cle: "receptionnaire", libelle: "Réceptionné par", type: "texte" }],
    conversions: ["facture"] },
  { id: "bon_transport", libelle: "Bon de transport", titre: "BON DE TRANSPORT", ico: "🚛", famille: "logistique", prix: false, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "transporteur", libelle: "Transporteur / chauffeur", type: "texte" }, { cle: "vehicule", libelle: "Véhicule / immatriculation", type: "texte" }, { cle: "lieu_enlevement", libelle: "Lieu d'enlèvement", type: "zone" }, { cle: "date_enlevement", libelle: "Date d'enlèvement", type: "texte" }, { cle: "lieu_livraison", libelle: "Lieu de livraison", type: "zone" }, { cle: "nb_colis", libelle: "Nombre de colis", type: "nombre" }, { cle: "poids", libelle: "Poids total (kg)", type: "nombre" }, { cle: "precautions", libelle: "Précautions (fragile, froid…)", type: "texte" }],
    conversions: [] },
  { id: "bon_envoi", libelle: "Bon d'envoi", titre: "BON D'ENVOI", ico: "📮", famille: "logistique", prix: false, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "mode_envoi", libelle: "Mode d'envoi (La Poste, Colissimo…)", type: "texte" }, { cle: "suivi", libelle: "Numéro de suivi", type: "texte" }, { cle: "date_envoi", libelle: "Date d'envoi", type: "texte" }, { cle: "nb_colis", libelle: "Nombre de colis", type: "nombre" }, { cle: "poids", libelle: "Poids (kg)", type: "nombre" }],
    conversions: [] },
  { id: "bordereau_envoi", libelle: "Bordereau d'envoi (pièces jointes)", titre: "BORDEREAU D'ENVOI", ico: "🗂", famille: "courrier", prix: false, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "observations", libelle: "Observations", type: "zone" }], conversions: [] },
  { id: "bordereau_expedition", libelle: "Bordereau d'expédition", titre: "BORDEREAU D'EXPÉDITION", ico: "🏷", famille: "logistique", prix: false, lignes: true, numeroAuto: "creation",
    champs: [{ cle: "transporteur", libelle: "Transporteur", type: "texte" }, { cle: "suivi", libelle: "Numéro de suivi", type: "texte" }, { cle: "date_expedition", libelle: "Date d'expédition", type: "texte" }, { cle: "nb_colis", libelle: "Nombre de colis", type: "nombre" }, { cle: "poids", libelle: "Poids total (kg)", type: "nombre" }, { cle: "valeur_declaree", libelle: "Valeur déclarée (€)", type: "nombre" }, { cle: "instructions", libelle: "Instructions (fragile, haut/bas…)", type: "texte" }],
    conversions: [] },
  { id: "recu", libelle: "Reçu de paiement", titre: "REÇU", ico: "✅", famille: "vente", prix: false, lignes: false, numeroAuto: "creation",
    champs: [{ cle: "montant", libelle: "Montant reçu (€)", type: "nombre" }, { cle: "mode_paiement", libelle: "Mode de paiement", type: "texte" }, { cle: "pour", libelle: "En règlement de", type: "texte", aide: "ex. facture FAC-2026-0003" }],
    conversions: [] },
  { id: "courrier", libelle: "Courrier / lettre", titre: "", ico: "✉️", famille: "courrier", prix: false, lignes: false, numeroAuto: "creation",
    champs: [{ cle: "lieu", libelle: "Lieu (ex. Cayenne)", type: "texte" }, { cle: "civilite", libelle: "Formule d'appel (ex. Madame, Monsieur,)", type: "texte" }, { cle: "corps", libelle: "Texte du courrier", type: "zone" }, { cle: "formule", libelle: "Formule de politesse", type: "zone" }, { cle: "signataire", libelle: "Signataire", type: "texte" }, { cle: "pj", libelle: "Pièces jointes", type: "texte" }],
    conversions: [] },
];
export const defPiece = (t: string) => PIECES.find(p => p.id === t) || PIECES[0];

export const STATUTS: Record<string, [string, string]> = {
  brouillon: ["Brouillon", "#c9a96e"], valide: ["Validé", "#22c55e"], envoye: ["Envoyé", "#60a5fa"], accepte: ["Accepté", "#4ade80"],
  refuse: ["Refusé", "#f87171"], paye: ["Payé", "#22c55e"], annule: ["Annulé", "rgba(255,255,255,0.4)"],
};

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export function totalLigne(l: Ligne) { return r2((Number(l.qte) || 0) * (Number(l.pu) || 0) * (1 - (Number(l.remise_pct) || 0) / 100)); }
export function calculerTotaux(lignes: Ligne[], remisePct = 0) {
  let ht = 0, tva = 0;
  for (const l of lignes) { const t = totalLigne(l) * (1 - (remisePct || 0) / 100); ht += t; tva += t * (Number(l.tva_pct) || 0) / 100; }
  ht = r2(ht); tva = r2(tva);
  return { ht, tva, ttc: r2(ht + tva) };
}
export const euros = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
export const dateFr = (d?: string | null) => { if (!d) return ""; const [y, m, j] = d.slice(0, 10).split("-"); return y && m && j ? `${j}/${m}/${y}` : d; };

/** Lignes stockées sous plusieurs formes selon les modules (texte JSON, clés libelle/qte/prixUnitaire…). */
export function normaliserLignes(brut: any): Ligne[] {
  let l = brut;
  for (let i = 0; i < 2 && typeof l === "string"; i++) { try { l = JSON.parse(l); } catch { return []; } }
  if (!Array.isArray(l)) return [];
  return l.map((x: any) => ({
    designation: String(x.designation ?? x.libelle ?? x.nom ?? x.produit ?? ""), detail: x.detail ?? x.commentaire ?? undefined,
    qte: Number(x.qte ?? x.quantite ?? x.qty ?? 1) || 1, unite: String(x.unite || "pièce"),
    pu: Number(x.pu ?? x.prix_unitaire ?? x.prixUnitaire ?? x.prix ?? 0) || 0,
    remise_pct: x.remise_type === "pct" ? Number(x.remise) || 0 : Number(x.remise_pct) || 0, tva_pct: Number(x.tva ?? x.tva_pct ?? 0) || 0,
  }));
}

export const MENTION_TVA_DEFAUT = "TVA non applicable, art. 294-1° du CGI (Guyane)";
export const PENALITES_DEFAUT = "Paiement à réception. En cas de retard : pénalités au taux de 3 fois le taux d'intérêt légal ; pour un client professionnel, indemnité forfaitaire de recouvrement de 40 €. Pas d'escompte pour paiement anticipé.";
