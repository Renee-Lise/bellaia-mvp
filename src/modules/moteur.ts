// ═══════════════════════════════════════════════════════════
// MOTEUR DE PRÉ-COMPTABILITÉ — Catégorisation + Écritures automatiques
// ═══════════════════════════════════════════════════════════

import {
  EcritureCompta, ModesPaiement, TypeJournal, TypeOperation,
  StatutEcriture, isEnLigne, CATEGORIES_PAR_POLE, CATEGORIES_ACHAT
} from "./types";
import { sbInsert, sbUpdate, sbSelect } from "../shared/supabaseHelpers";

// ── Générer un ID unique court
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);

// ── Déterminer le statut selon le mode de paiement
export function determinerStatut(mode: ModesPaiement): StatutEcriture {
  return isEnLigne(mode) ? "auto_valide" : "a_verifier";
}

// ── Déterminer le journal selon le type et le mode
export function determinerJournal(
  type: TypeOperation,
  mode: ModesPaiement
): TypeJournal {
  if (type.startsWith("vente")) {
    return mode === "Especes" ? "caisse" : "ventes";
  }
  if (type.startsWith("achat")) {
    return mode === "Especes" ? "caisse" : "achats";
  }
  if (type === "remboursement" || type === "avoir") return "avoirs";
  return "banque";
}

// ── Construire une écriture de vente automatiquement
export function construireEcritureVente(params: {
  date:         string;
  libelle:      string;
  pole:         string;
  montant_ttc:  number;
  tva_pct?:     number;
  mode_paiement:ModesPaiement;
  client_nom?:  string;
  facture_id?:  string;
  paiement_id?: string;
  commande_id?: string;
  fondatrice_id?:string;
}): EcritureCompta {
  const tva_pct   = params.tva_pct ?? 20;
  const montant_ht = parseFloat((params.montant_ttc / (1 + tva_pct / 100)).toFixed(2));
  const tva        = parseFloat((params.montant_ttc - montant_ht).toFixed(2));

  const type_op: TypeOperation =
    params.pole === "STRUCTURE" || params.pole === "MTP" ? "vente_numerique"
    : params.pole === "ODYSSEE" || params.pole === "EVENTS" || params.pole === "VILO" ? "vente_prestation"
    : "vente_produit";

  const mode = params.mode_paiement;
  const statut = determinerStatut(mode);
  const journal = determinerJournal(type_op, mode);

  return {
    id:               uid(),
    date:             params.date,
    libelle:          params.libelle,
    type_operation:   type_op,
    journal,
    pole:             params.pole,
    mode_paiement:    mode,
    montant_ht,
    tva,
    montant_ttc:      params.montant_ttc,
    statut,
    facture_id:       params.facture_id,
    paiement_id:      params.paiement_id,
    commande_id:      params.commande_id,
    client_nom:       params.client_nom,
    categorie_compta: CATEGORIES_PAR_POLE[params.pole] || "Ventes diverses",
    source:           statut === "auto_valide" ? "auto" : "manuel",
    cree_le:          new Date().toISOString(),
    fondatrice_id:    params.fondatrice_id,
  };
}

// ── Construire une écriture d'achat automatiquement
export function construireEcritureAchat(params: {
  date:          string;
  libelle:       string;
  pole:          string;
  montant_ttc:   number;
  tva_pct?:      number;
  mode_paiement: ModesPaiement;
  fournisseur_nom?:string;
  stock_ids?:    string[];
  fondatrice_id?:string;
}): EcritureCompta {
  const tva_pct    = params.tva_pct ?? 20;
  const montant_ht = parseFloat((params.montant_ttc / (1 + tva_pct / 100)).toFixed(2));
  const tva        = parseFloat((params.montant_ttc - montant_ht).toFixed(2));

  const type_op: TypeOperation =
    params.pole === "FOOD" ? "achat_mp"
    : params.pole === "EVENTS" ? "achat_consommable"
    : "achat_stock";

  const mode   = params.mode_paiement;
  const statut = determinerStatut(mode);
  const journal = determinerJournal(type_op, mode);

  return {
    id:               uid(),
    date:             params.date,
    libelle:          params.libelle,
    type_operation:   type_op,
    journal,
    pole:             params.pole,
    mode_paiement:    mode,
    montant_ht,
    tva,
    montant_ttc:      params.montant_ttc,
    statut,
    fournisseur_nom:  params.fournisseur_nom,
    stock_ids:        params.stock_ids,
    categorie_compta: CATEGORIES_ACHAT[params.pole] || "Charges diverses",
    source:           statut === "auto_valide" ? "auto" : "manuel",
    cree_le:          new Date().toISOString(),
    fondatrice_id:    params.fondatrice_id,
  };
}

// ── Enregistrer une écriture dans Supabase
export async function enregistrerEcriture(e: EcritureCompta): Promise<EcritureCompta | null> {
  try {
    const res = await sbInsert("pre_comptabilite", e as any);
    return res as any;
  } catch (err) {
    console.error("Erreur enregistrement écriture:", err);
    return null;
  }
}

// ── Valider une écriture espèces
export async function validerEcriture(id: string): Promise<void> {
  await sbUpdate("pre_comptabilite", id, {
    statut:    "valide",
    valide_le: new Date().toISOString(),
  } as any);
}

// ── Annuler une écriture
export async function annulerEcriture(id: string): Promise<void> {
  await sbUpdate("pre_comptabilite", id, { statut: "annule" } as any);
}

// ── Charger les écritures par journal et période
export async function chargerEcritures(params: {
  journal?:    string;
  pole?:       string;
  statut?:     string;
  date_debut?: string;
  date_fin?:   string;
  limit?:      number;
}): Promise<EcritureCompta[]> {
  const filters: Record<string, string> = {};
  if (params.journal) filters["journal"] = `eq.${params.journal}`;
  if (params.pole)    filters["pole"]    = `eq.${params.pole}`;
  if (params.statut)  filters["statut"]  = `eq.${params.statut}`;

  try {
    const res = await sbSelect("pre_comptabilite", {
      order:   "date.desc",
      limit:   params.limit || 200,
      filters,
    });
    return (res || []) as EcritureCompta[];
  } catch {
    return [];
  }
}

// ── Calculer les totaux pour le dashboard
export function calculerTotaux(ecritures: EcritureCompta[]): {
  ca_total:       number;
  ca_auto:        number;
  especes_valider:number;
  achats_total:   number;
  benefice_estime:number;
  par_pole:       Record<string, { ca:number; achats:number; benefice:number }>;
} {
  const ventes  = ecritures.filter(e => e.type_operation.startsWith("vente")  && e.statut !== "annule");
  const achats  = ecritures.filter(e => e.type_operation.startsWith("achat")  && e.statut !== "annule");
  const a_verif = ventes.filter(e => e.statut === "a_verifier");

  const ca_total   = ventes.reduce((s, e) => s + e.montant_ttc, 0);
  const ca_auto    = ventes.filter(e => e.statut === "auto_valide" || e.statut === "valide").reduce((s, e) => s + e.montant_ttc, 0);
  const ach_total  = achats.reduce((s, e) => s + e.montant_ttc, 0);

  // Totaux par pôle
  const par_pole: Record<string, { ca:number; achats:number; benefice:number }> = {};
  [...ventes, ...achats].forEach(e => {
    if (!par_pole[e.pole]) par_pole[e.pole] = { ca:0, achats:0, benefice:0 };
    if (e.type_operation.startsWith("vente"))  par_pole[e.pole].ca     += e.montant_ttc;
    if (e.type_operation.startsWith("achat"))  par_pole[e.pole].achats += e.montant_ttc;
  });
  Object.keys(par_pole).forEach(p => {
    par_pole[p].benefice = par_pole[p].ca - par_pole[p].achats;
  });

  return {
    ca_total:        parseFloat(ca_total.toFixed(2)),
    ca_auto:         parseFloat(ca_auto.toFixed(2)),
    especes_valider: a_verif.length,
    achats_total:    parseFloat(ach_total.toFixed(2)),
    benefice_estime: parseFloat((ca_total - ach_total).toFixed(2)),
    par_pole,
  };
}

// ── Export CSV
export function exporterCSV(ecritures: EcritureCompta[]): string {
  const headers = [
    "Date","Libellé","Journal","Pôle","Type opération","Mode paiement",
    "Montant HT","TVA","Montant TTC","Statut","Catégorie","Client/Fournisseur",
    "N° Facture","Source"
  ].join(";");

  const rows = ecritures.map(e => [
    e.date,
    `"${e.libelle.replace(/"/g,'""')}"`,
    e.journal,
    e.pole,
    e.type_operation,
    e.mode_paiement,
    e.montant_ht.toFixed(2),
    e.tva.toFixed(2),
    e.montant_ttc.toFixed(2),
    e.statut,
    `"${e.categorie_compta}"`,
    e.client_nom || e.fournisseur_nom || "",
    e.facture_id?.slice(0,8) || "",
    e.source,
  ].join(";"));

  return [headers, ...rows].join("\n");
}
