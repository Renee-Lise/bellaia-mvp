// ═══════════════════════════════════════════════════════════
// coreApi.ts — API Supabase transverse Bellaïa LOT V
// Catalogue, stock global, workflow commercial unifié
// src/modules/core/coreApi.ts
// ═══════════════════════════════════════════════════════════
import type {
  BusinessUnit, CatalogueProduit, StockGlobal,
  MouvementStock, ReservationStock, Facture, Paiement, Livraison,
  LigneFacture,
} from "./coreTypes";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function token(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY;
}

async function sbGet(table: string, params: string): Promise<any[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SB_KEY, Authorization: "Bearer " + await token() },
  });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

async function sbPost(table: string, body: object): Promise<any> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: "Bearer " + await token(),
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return Array.isArray(d) ? d[0] : d;
}

async function sbPatch(table: string, id: string, body: object): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SB_KEY, Authorization: "Bearer " + await token(),
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

// ── Génération de référence ────────────────────────────────
function genRef(prefix: string): string {
  const year  = new Date().getFullYear();
  const suite = Date.now().toString().slice(-6);
  return `${prefix}-${year}-${suite}`;
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE CENTRAL
// ═══════════════════════════════════════════════════════════

export async function getCatalogueProduits(
  bu?: BusinessUnit, visibleClient?: boolean
): Promise<CatalogueProduit[]> {
  let params = "order=ordre.asc,nom.asc";
  if (bu)            params += `&business_unit=eq.${bu}`;
  if (visibleClient) params += "&visible_client=eq.true&disponible=eq.true&statut=eq.actif";
  const rows = await sbGet("catalogue_produits", params);
  return rows.map(mapProduit);
}

export async function creerProduitCatalogue(p: Omit<CatalogueProduit, "id">): Promise<CatalogueProduit | null> {
  const payload = {
    business_unit:       p.businessUnit,
    categorie_slug:      p.categorieSlug,
    sous_categorie:      p.sousCategorie,
    nom:                 p.nom,
    description_courte:  p.descriptionCourte,
    description_longue:  p.descriptionLongue,
    galerie_photos:      p.galeriePhotos,
    prix:                p.prix,
    prix_promotion:      p.prixPromotion,
    cout_revient:        p.coutRevient,
    tva:                 p.tva ?? 0,
    unite:               p.unite,
    duree_min:           p.dureeMin,
    temps_preparation:   p.tempsPreparation,
    temps_production:    p.tempsProduction,
    marge:               p.marge,
    taux_marge:          p.tauxMarge,
    visible_client:      p.visibleClient,
    disponible:          p.disponible,
    statut:              p.statut,
    tags:                p.tags,
    allergenes:          p.allergenes,
    metadata:            p.metadata,
  };
  const row = await sbPost("catalogue_produits", payload);
  return row ? mapProduit(row) : null;
}

export async function majProduitCatalogue(id: string, updates: Partial<CatalogueProduit>): Promise<void> {
  await sbPatch("catalogue_produits", id, updates);
}

function mapProduit(r: any): CatalogueProduit {
  return {
    id:                r.id,
    reference:         r.reference,
    businessUnit:      r.business_unit,
    categorieId:       r.categorie_id,
    categorieSlug:     r.categorie_slug,
    sousCategorie:     r.sous_categorie,
    nom:               r.nom,
    descriptionCourte: r.description_courte,
    descriptionLongue: r.description_longue,
    galeriePhotos:     r.galerie_photos || [],
    videos:            r.videos || [],
    prix:              r.prix,
    prixPromotion:     r.prix_promotion,
    coutRevient:       r.cout_revient,
    tva:               r.tva,
    unite:             r.unite || "prestation",
    dureeMin:          r.duree_min,
    tempsPreparation:  r.temps_preparation,
    tempsProduction:   r.temps_production,
    marge:             r.marge,
    tauxMarge:         r.taux_marge,
    visibleClient:     r.visible_client,
    disponible:        r.disponible,
    statut:            r.statut,
    tags:              r.tags || [],
    allergenes:        r.allergenes || [],
    metadata:          r.metadata || {},
    options:           [],
    variantes:         [],
    ordre:             r.ordre || 0,
  };
}

// ═══════════════════════════════════════════════════════════
// STOCK GLOBAL
// ═══════════════════════════════════════════════════════════

export async function getStockGlobal(bu?: BusinessUnit): Promise<StockGlobal[]> {
  const params = bu ? `business_unit=eq.${bu}&actif=eq.true` : "actif=eq.true";
  const rows   = await sbGet("stock_global", params + "&order=business_unit.asc,nom.asc");
  return rows.map(mapStock);
}

export async function majStockGlobal(id: string, delta: number, motif?: string, sourceTable?: string, sourceId?: string): Promise<void> {
  // 1. Récupérer stock actuel
  const rows = await sbGet("stock_global", `id=eq.${id}&select=stock_actuel`);
  if (!rows.length) return;
  const nouveau = Math.max(0, (rows[0].stock_actuel || 0) + delta);
  // 2. Patcher le stock
  await sbPatch("stock_global", id, { stock_actuel: nouveau, updated_at: new Date().toISOString() });
  // 3. Enregistrer le mouvement
  await sbPost("stock_mouvements", {
    stock_item_id: id,
    type:  delta > 0 ? "entree" : "sortie",
    quantite: Math.abs(delta),
    motif, source_table: sourceTable, source_id: sourceId,
    date: new Date().toISOString(),
  });
}

export async function reserverStock(
  stockItemId: string, quantite: number, sourceTable: string, sourceId: string
): Promise<boolean> {
  const rows = await sbGet("stock_global", `id=eq.${stockItemId}&select=stock_actuel,stock_reserve`);
  if (!rows.length) return false;
  const { stock_actuel, stock_reserve } = rows[0];
  if ((stock_actuel - stock_reserve) < quantite) return false; // pas assez dispo
  // Créer la réservation
  await sbPost("stock_reservations", {
    stock_item_id: stockItemId, quantite,
    source_table: sourceTable, source_id: sourceId, statut: "active",
    date_reserve: new Date().toISOString(),
  });
  // Mettre à jour stock_reserve
  await sbPatch("stock_global", stockItemId, { stock_reserve: stock_reserve + quantite });
  return true;
}

export async function libererReservations(sourceId: string): Promise<void> {
  // Récupérer toutes les réservations actives pour cette source
  const rows = await sbGet("stock_reservations",
    `source_id=eq.${sourceId}&statut=eq.active`);
  for (const r of rows) {
    // Libérer le stock
    const stocks = await sbGet("stock_global", `id=eq.${r.stock_item_id}&select=stock_reserve`);
    if (stocks.length) {
      await sbPatch("stock_global", r.stock_item_id, {
        stock_reserve: Math.max(0, (stocks[0].stock_reserve || 0) - r.quantite),
      });
    }
    await sbPatch("stock_reservations", r.id, { statut: "liberee" });
  }
}

function mapStock(r: any): StockGlobal {
  return {
    id:              r.id,
    businessUnit:    r.business_unit,
    reference:       r.reference,
    nom:             r.nom,
    categorie:       r.categorie,
    sousCategorie:   r.sous_categorie,
    unite:           r.unite,
    fournisseurNom:  r.fournisseur_nom,
    prixAchat:       r.prix_achat,
    prixMoyen:       r.prix_moyen,
    stockActuel:     r.stock_actuel || 0,
    stockReserve:    r.stock_reserve || 0,
    stockDisponible: r.stock_disponible ?? ((r.stock_actuel||0) - (r.stock_reserve||0)),
    stockMin:        r.stock_min || 0,
    seuilCritique:   r.seuil_critique,
    emplacement:     r.emplacement,
    dlc:             r.dlc,
    ddm:             r.ddm,
    notes:           r.notes,
    actif:           r.actif,
    niveauAlerte:    r.niveau_alerte || calcNiveau(r),
  };
}

function calcNiveau(r: any): StockGlobal["niveauAlerte"] {
  const dispo = (r.stock_actuel||0) - (r.stock_reserve||0);
  if (dispo <= 0)                       return "rupture";
  if (r.seuil_critique && dispo <= r.seuil_critique) return "critique";
  if (dispo <= (r.stock_min||0))        return "alerte";
  return "ok";
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW COMMERCIAL — FACTURE / PAIEMENT / LIVRAISON
// ═══════════════════════════════════════════════════════════

export async function creerFacture(params: {
  bu: BusinessUnit;
  commandeId?: string;
  sourceTable?: string;
  clientNom: string;
  clientTel?: string;
  clientEmail?: string;
  lignes: LigneFacture[];
  acomptePct?: number;
  notes?: string;
}): Promise<Facture | null> {
  const sousTotal = params.lignes.reduce((s, l) => s + l.total, 0);
  const acompte   = Math.round(sousTotal * ((params.acomptePct ?? 30) / 100) * 100) / 100;
  const payload = {
    reference:     genRef("FAC"),
    business_unit: params.bu,
    commande_id:   params.commandeId,
    source_table:  params.sourceTable,
    client_nom:    params.clientNom,
    client_tel:    params.clientTel,
    client_email:  params.clientEmail,
    lignes:        params.lignes,
    sous_total:    Math.round(sousTotal * 100) / 100,
    total_ttc:     Math.round(sousTotal * 100) / 100,
    acompte,
    solde:         Math.round((sousTotal - acompte) * 100) / 100,
    statut:        "emise",
    date_emission: new Date().toISOString().split("T")[0],
    notes:         params.notes,
  };
  const row = await sbPost("bellaïa_factures", payload);
  if (!row) return null;
  return mapFacture(row);
}

export async function getFactures(bu?: BusinessUnit): Promise<Facture[]> {
  const params = (bu ? `business_unit=eq.${bu}&` : "") + "order=created_at.desc&limit=100";
  const rows   = await sbGet("bellaïa_factures", params);
  return rows.map(mapFacture);
}

export async function enregistrerPaiement(params: {
  factureId: string;
  bu: BusinessUnit;
  montant: number;
  mode: string;
  notes?: string;
}): Promise<Paiement | null> {
  const payload = {
    reference:     genRef("PAY"),
    facture_id:    params.factureId,
    business_unit: params.bu,
    montant:       params.montant,
    mode:          params.mode,
    statut:        "confirme",
    date_paiement: new Date().toISOString(),
    notes:         params.notes,
  };
  const row = await sbPost("bellaïa_paiements", payload);
  if (!row) return null;
  // Mettre à jour le statut de la facture
  await sbPatch("bellaïa_factures", params.factureId, {
    acompte_paye: true,
    statut:       "partiellement_payee",
  });
  return {
    id:           row.id,
    reference:    row.reference,
    factureId:    row.facture_id,
    businessUnit: row.business_unit,
    montant:      row.montant,
    mode:         row.mode,
    statut:       row.statut,
    datePaiement: row.date_paiement,
  };
}

function mapFacture(r: any): Facture {
  const sousTotal = r.sous_total || 0;
  const acompte   = r.acompte || 0;
  return {
    id:           r.id,
    reference:    r.reference,
    businessUnit: r.business_unit,
    commandeId:   r.commande_id,
    sourceTable:  r.source_table,
    clientNom:    r.client_nom,
    clientTel:    r.client_tel,
    clientEmail:  r.client_email,
    lignes:       r.lignes || [],
    sousTotal,
    tvaTotal:     r.tva_total || 0,
    totalTTC:     r.total_ttc || sousTotal,
    acompte,
    acomptePaye:  r.acompte_paye || false,
    solde:        r.solde ?? (sousTotal - acompte),
    statut:       r.statut,
    dateEmission: r.date_emission,
    dateEcheance: r.date_echeance,
    notes:        r.notes,
  };
}
