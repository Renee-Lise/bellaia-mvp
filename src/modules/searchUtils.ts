// ═══════════════════════════════════════════════════════════
// searchUtils.ts — Moteur de recherche global Bellaïa
// Recherche locale + Supabase avec fallback transparent
// src/modules/search/searchUtils.ts
// ═══════════════════════════════════════════════════════════
import type {
  CriteresRecherche, ResultatRecherche, ReponseRecherche,
  ProfilRecherche,
} from "./searchTypes";

// ── Config Supabase ────────────────────────────────────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getToken(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY();
}

async function sbGet(table: string, params: string): Promise<any[]> {
  if (!SB_URL()) return [];
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?${params}`, {
      headers: { apikey: SB_KEY(), Authorization: "Bearer " + await getToken() },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

// ── Score de pertinence ────────────────────────────────────
function scorer(texte: string, query: string): number {
  if (!query.trim()) return 50;
  const q = query.toLowerCase();
  const t = texte.toLowerCase();
  if (t === q)              return 100;
  if (t.startsWith(q))     return 90;
  if (t.includes(q))       return 75;
  const mots = q.split(/\s+/);
  const matches = mots.filter(m => t.includes(m)).length;
  return Math.round((matches / mots.length) * 60);
}

// ── Vérification droits d'accès ────────────────────────────
function filtrerParProfil(
  resultats: ResultatRecherche[],
  profil: ProfilRecherche,
  clientId?: string
): ResultatRecherche[] {
  if (profil === "fondatrice") return resultats;
  if (profil === "client" && clientId) {
    return resultats.filter(r =>
      (r.payload?.clientId === clientId) ||
      (r.payload?.client_id === clientId)
    );
  }
  if (profil === "hote") {
    return resultats.filter(r =>
      ["message","document","prestation"].includes(r.type)
    );
  }
  return [];
}

// ══════════════════════════════════════════════════════════
// RECHERCHE SUPABASE — par table
// ══════════════════════════════════════════════════════════

async function rechercherClients(q: string): Promise<ResultatRecherche[]> {
  const params = q
    ? `or=(nom.ilike.*${q}*,prenom.ilike.*${q}*,email.ilike.*${q}*,telephone.ilike.*${q}*)&limit=8`
    : "order=created_at.desc&limit=8";
  const rows = await sbGet("bellaia_clients", params);
  return rows.map(r => ({
    id:        r.id,
    type:      "client" as const,
    titre:     [r.prenom, r.nom].filter(Boolean).join(" "),
    sousTitre: r.email || r.telephone || "",
    reference: r.reference,
    module:    "CRM",
    score:     scorer([r.nom, r.prenom, r.email].filter(Boolean).join(" "), q),
    payload:   r,
  }));
}

async function rechercherDevis(q: string): Promise<ResultatRecherche[]> {
  const params = q
    ? `or=(numero_devis.ilike.*${q}*,client_nom.ilike.*${q}*,client_prenom.ilike.*${q}*)&limit=8`
    : "order=created_at.desc&limit=8";
  const rows = await sbGet("events_demandes", params + "&select=id,numero_devis,client_nom,client_prenom,statut,montant_estime,created_at,client_id");
  return rows.map(r => ({
    id:        r.id,
    type:      "devis" as const,
    titre:     [r.client_prenom, r.client_nom].filter(Boolean).join(" "),
    sousTitre: r.statut,
    reference: r.numero_devis,
    statut:    r.statut,
    montant:   r.montant_estime,
    date:      r.created_at,
    module:    "Events",
    score:     scorer([r.client_nom, r.client_prenom, r.numero_devis].filter(Boolean).join(" "), q),
    payload:   { ...r, clientId: r.client_id },
  }));
}

async function rechercherFactures(q: string): Promise<ResultatRecherche[]> {
  const params = q
    ? `or=(reference.ilike.*${q}*,client_nom.ilike.*${q}*)&limit=8`
    : "order=created_at.desc&limit=8";
  const rows = await sbGet("bellaia_factures", params + "&select=id,reference,client_nom,statut,total_ttc,created_at,client_id");
  return rows.map(r => ({
    id:        r.id,
    type:      "facture" as const,
    titre:     r.client_nom,
    sousTitre: r.statut,
    reference: r.reference,
    statut:    r.statut,
    montant:   r.total_ttc,
    date:      r.created_at,
    module:    "ERP",
    score:     scorer([r.client_nom, r.reference].filter(Boolean).join(" "), q),
    payload:   { ...r, clientId: r.client_id },
  }));
}

async function rechercherCommandes(q: string): Promise<ResultatRecherche[]> {
  const params = q
    ? `or=(reference.ilike.*${q}*,client_nom.ilike.*${q}*)&limit=8`
    : "order=created_at.desc&limit=8";
  const rows = await sbGet("bellaia_commandes", params + "&select=id,reference,client_nom,statut,total,created_at,client_id");
  return rows.map(r => ({
    id:        r.id,
    type:      "commande" as const,
    titre:     r.client_nom,
    sousTitre: r.statut,
    reference: r.reference,
    statut:    r.statut,
    montant:   r.total,
    date:      r.created_at,
    module:    "ERP",
    score:     scorer([r.client_nom, r.reference].filter(Boolean).join(" "), q),
    payload:   { ...r, clientId: r.client_id },
  }));
}

async function rechercherRecettes(q: string): Promise<ResultatRecherche[]> {
  const params = q
    ? `nom=ilike.*${q}*&limit=8`
    : "order=created_at.desc&limit=8";
  const rows = await sbGet("food_recettes", params + "&select=id,nom,categorie,statut,prix_conseille,created_at");
  return rows.map(r => ({
    id:        r.id,
    type:      "recette" as const,
    titre:     r.nom,
    sousTitre: r.categorie,
    statut:    r.statut,
    montant:   r.prix_conseille,
    date:      r.created_at,
    module:    "Food",
    score:     scorer(r.nom, q),
    payload:   r,
  }));
}

async function rechercherProduits(q: string): Promise<ResultatRecherche[]> {
  const params = q
    ? `nom=ilike.*${q}*&limit=8`
    : "order=created_at.desc&statut=eq.actif&limit=8";
  const rows = await sbGet("catalogue_produits", params + "&select=id,nom,categorie_slug,statut,prix,business_unit");
  return rows.map(r => ({
    id:        r.id,
    type:      "produit" as const,
    titre:     r.nom,
    sousTitre: r.business_unit + " · " + (r.categorie_slug || ""),
    statut:    r.statut,
    montant:   r.prix,
    module:    r.business_unit || "Catalogue",
    score:     scorer(r.nom, q),
    payload:   r,
  }));
}

async function rechercherStocks(q: string): Promise<ResultatRecherche[]> {
  if (!q.trim()) return [];
  const params = `nom=ilike.*${q}*&actif=eq.true&limit=8&select=id,nom,business_unit,stock_actuel,stock_min,unite`;
  const rows = await sbGet("stock_global", params);
  return rows.map(r => ({
    id:        r.id,
    type:      "stock" as const,
    titre:     r.nom,
    sousTitre: `${r.stock_actuel} ${r.unite} · ${r.business_unit}`,
    module:    r.business_unit || "Stock",
    score:     scorer(r.nom, q),
    payload:   r,
  }));
}

// ══════════════════════════════════════════════════════════
// MOTEUR PRINCIPAL
// ══════════════════════════════════════════════════════════
export async function rechercherGlobal(
  criteres: CriteresRecherche
): Promise<ReponseRecherche> {
  const debut = Date.now();
  const q     = (criteres.texte || "").trim();
  const mod   = criteres.module || "tous";

  // Lancer les recherches en parallèle selon le module
  const promises: Promise<ResultatRecherche[]>[] = [];

  if (mod === "tous" || mod === "clients")   promises.push(rechercherClients(q));
  if (mod === "tous" || mod === "devis")     promises.push(rechercherDevis(q));
  if (mod === "tous" || mod === "factures")  promises.push(rechercherFactures(q));
  if (mod === "tous" || mod === "commandes") promises.push(rechercherCommandes(q));
  if (mod === "tous" || mod === "recettes")  promises.push(rechercherRecettes(q));
  if (mod === "tous" || mod === "produits")  promises.push(rechercherProduits(q));
  if (mod === "tous" || mod === "stocks")    promises.push(rechercherStocks(q));

  const groupes = await Promise.allSettled(promises);

  let tous: ResultatRecherche[] = [];
  let sourceSupabase = false;

  for (const g of groupes) {
    if (g.status === "fulfilled" && g.value.length) {
      tous = tous.concat(g.value);
      sourceSupabase = true;
    }
  }

  // Filtrer par date si spécifié
  if (criteres.dateDebut) {
    tous = tous.filter(r => !r.date || r.date >= criteres.dateDebut!);
  }
  if (criteres.dateFin) {
    tous = tous.filter(r => !r.date || r.date <= criteres.dateFin!);
  }
  if (criteres.statut) {
    tous = tous.filter(r => !r.statut || r.statut === criteres.statut);
  }

  // Appliquer les droits d'accès
  tous = filtrerParProfil(tous, criteres.profil, criteres.clientId);

  // Trier par score décroissant
  tous.sort((a, b) => b.score - a.score);

  return {
    resultats: tous.slice(0, 30),
    total:     tous.length,
    dureeMs:   Date.now() - debut,
    source:    sourceSupabase ? "supabase" : "local",
    query:     q,
  };
}

// ── Formatage ──────────────────────────────────────────────
export const TYPE_LABELS: Record<string, string> = {
  client:"👤 Client", devis:"📄 Devis", commande:"📦 Commande",
  facture:"🧾 Facture", paiement:"💳 Paiement", recette:"📖 Recette",
  produit:"🛍 Produit", stock:"📦 Stock", evenement:"🎉 Événement",
  message:"💬 Message", document:"📁 Document", prestation:"✨ Prestation",
};

export const TYPE_COLORS: Record<string, string> = {
  client:"#60a5fa", devis:"#c9a96e", commande:"#a855f7",
  facture:"#c9a96e", paiement:"#22c55e", recette:"#22c55e",
  produit:"#60a5fa", stock:"#fb923c", evenement:"#f472b6",
  message:"#34d399", document:"#94a3b8", prestation:"#f59e0b",
};

export function fmtPrix(n?: number | null): string {
  if (n == null) return "";
  return n.toFixed(2).replace(".", ",") + "€";
}
