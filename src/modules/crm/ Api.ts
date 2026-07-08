// ═══════════════════════════════════════════════════════════
// crmApi.ts — API CRM Central Bellaïa LOT VII
// Supabase avec fallback local transparent
// src/modules/crm/crmApi.ts
// ═══════════════════════════════════════════════════════════
import type {
  Client, Adresse, ContactLie, DocumentClient,
  ConsentementClient, EntreeHistorique, StatutClient,
} from "./crmTypes";
import { genRefClient } from "./crmUtils";

// ── Config Supabase ────────────────────────────────────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getToken(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY();
}

// ── Requêtes de base ───────────────────────────────────────
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

async function sbPost(table: string, body: object): Promise<any | null> {
  if (!SB_URL()) return null;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY(), Authorization: "Bearer " + await getToken(),
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  } catch { return null; }
}

async function sbPatch(table: string, id: string, body: object): Promise<boolean> {
  if (!SB_URL()) return false;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SB_KEY(), Authorization: "Bearer " + await getToken(),
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch { return false; }
}

// ── Mappers Supabase → TypeScript ──────────────────────────
function mapClient(r: any): Client {
  return {
    id:            r.id,
    reference:     r.reference || "",
    nom:           r.nom || "",
    prenom:        r.prenom,
    societe:       r.societe,
    telephone:     r.telephone,
    whatsapp:      r.whatsapp,
    email:         r.email,
    dateNaissance: r.date_naissance,
    tags:          r.tags || [],
    notes:         r.notes,
    preferences:   r.preferences || {},
    allergies:     r.allergies || [],
    rgpdOk:        r.rgpd_ok || false,
    rgpdDate:      r.rgpd_date,
    modulesActifs: r.business_units || [],
    statut:        r.statut || "actif",
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  };
}

function mapAdresse(r: any): Adresse {
  return {
    id: r.id, clientId: r.client_id, type: r.type,
    ligne1: r.ligne1, ligne2: r.ligne2, commune: r.commune,
    codePostal: r.code_postal, pays: r.pays || "France",
    principale: r.principale || false,
  };
}

function mapContact(r: any): ContactLie {
  return {
    id: r.id, clientId: r.client_id, nom: r.nom, prenom: r.prenom,
    role: r.role, telephone: r.telephone, email: r.email, notes: r.notes,
  };
}

function mapHistorique(r: any): EntreeHistorique {
  return {
    id: r.id, clientId: r.client_id, typeEntite: r.type_entite,
    reference: r.reference, libelle: r.libelle, montant: r.montant,
    statut: r.statut, sourceTable: r.source_table, sourceId: r.source_id,
    dateAction: r.date_action,
  };
}

// ═══════════════════════════════════════════════════════════
// API CLIENTS
// ═══════════════════════════════════════════════════════════

export async function getClients(opts?: {
  statut?: StatutClient;
  module?: string;
  limit?: number;
}): Promise<{ clients: Client[]; source: "supabase" | "local" }> {
  let params = `order=nom.asc&limit=${opts?.limit || 200}`;
  if (opts?.statut) params += `&statut=eq.${opts.statut}`;

  const rows = await sbGet("bellaia_clients", params);
  if (rows.length > 0) {
    return { clients: rows.map(mapClient), source: "supabase" };
  }
  // Fallback local vide (pas de données locales pour les clients)
  return { clients: [], source: "local" };
}

export async function getClient(id: string): Promise<Client | null> {
  const rows = await sbGet("bellaia_clients", `id=eq.${id}&limit=1`);
  if (!rows.length) return null;
  const client = mapClient(rows[0]);

  // Charger les données liées en parallèle
  const [adresses, contacts, historique] = await Promise.all([
    sbGet("bellaia_adresses",          `client_id=eq.${id}&order=principale.desc`),
    sbGet("bellaia_contacts",          `client_id=eq.${id}`),
    sbGet("bellaia_client_historique", `client_id=eq.${id}&order=date_action.desc&limit=50`),
  ]);

  client.adresses   = adresses.map(mapAdresse);
  client.contacts   = contacts.map(mapContact);
  client.historique = historique.map(mapHistorique);
  return client;
}

export async function creerClient(
  data: Omit<Client, "id" | "reference" | "createdAt" | "updatedAt">
): Promise<Client | null> {
  const payload = {
    reference:      genRefClient(),
    nom:            data.nom,
    prenom:         data.prenom,
    societe:        data.societe,
    telephone:      data.telephone,
    whatsapp:       data.whatsapp || data.telephone,
    email:          data.email,
    date_naissance: data.dateNaissance,
    tags:           data.tags || [],
    notes:          data.notes,
    preferences:    data.preferences || {},
    allergies:      data.allergies || [],
    rgpd_ok:        data.rgpdOk || false,
    business_units: data.modulesActifs || [],
    statut:         data.statut || "actif",
  };
  const row = await sbPost("bellaia_clients", payload);
  if (!row) {
    // Fallback local : créer un objet avec ID local
    return {
      ...data,
      id:        "cli_local_" + Date.now().toString().slice(-8),
      reference: genRefClient(),
      statut:    data.statut || "actif",
    };
  }
  return mapClient(row);
}

export async function majClient(id: string, updates: Partial<Client>): Promise<boolean> {
  const payload: Record<string, any> = {};
  if (updates.nom           != null) payload.nom            = updates.nom;
  if (updates.prenom        != null) payload.prenom         = updates.prenom;
  if (updates.societe       != null) payload.societe        = updates.societe;
  if (updates.telephone     != null) payload.telephone      = updates.telephone;
  if (updates.whatsapp      != null) payload.whatsapp       = updates.whatsapp;
  if (updates.email         != null) payload.email          = updates.email;
  if (updates.dateNaissance != null) payload.date_naissance = updates.dateNaissance;
  if (updates.tags          != null) payload.tags           = updates.tags;
  if (updates.notes         != null) payload.notes          = updates.notes;
  if (updates.preferences   != null) payload.preferences    = updates.preferences;
  if (updates.allergies     != null) payload.allergies      = updates.allergies;
  if (updates.statut        != null) payload.statut         = updates.statut;
  if (updates.rgpdOk        != null) payload.rgpd_ok        = updates.rgpdOk;
  if (updates.modulesActifs != null) payload.business_units = updates.modulesActifs;
  return sbPatch("bellaia_clients", id, payload);
}

export async function rechercherOuCreerClient(
  nom: string, prenom: string, tel: string
): Promise<Client | null> {
  if (!nom.trim()) return null;
  // Recherche par téléphone d'abord
  if (tel) {
    const rows = await sbGet("bellaia_clients", `telephone=eq.${encodeURIComponent(tel)}&limit=1`);
    if (rows.length) return mapClient(rows[0]);
  }
  // Recherche par nom+prénom
  const rows = await sbGet("bellaia_clients",
    `nom=ilike.${encodeURIComponent(nom)}&prenom=ilike.${encodeURIComponent(prenom || "")}&limit=1`
  );
  if (rows.length) return mapClient(rows[0]);
  // Créer si inexistant
  return creerClient({ nom, prenom, telephone: tel, statut: "actif", rgpdOk: false });
}

// ═══════════════════════════════════════════════════════════
// API ADRESSES
// ═══════════════════════════════════════════════════════════

export async function ajouterAdresse(a: Omit<Adresse, "id">): Promise<boolean> {
  const row = await sbPost("bellaia_adresses", {
    client_id:   a.clientId,
    type:        a.type,
    ligne1:      a.ligne1,
    ligne2:      a.ligne2,
    commune:     a.commune,
    code_postal: a.codePostal,
    pays:        a.pays || "France",
    principale:  a.principale || false,
  });
  return !!row;
}

// ═══════════════════════════════════════════════════════════
// API CONTACTS
// ═══════════════════════════════════════════════════════════

export async function ajouterContact(c: Omit<ContactLie, "id">): Promise<boolean> {
  const row = await sbPost("bellaia_contacts", {
    client_id: c.clientId,
    nom:       c.nom,
    prenom:    c.prenom,
    role:      c.role,
    telephone: c.telephone,
    email:     c.email,
    notes:     c.notes,
  });
  return !!row;
}

// ═══════════════════════════════════════════════════════════
// API HISTORIQUE
// ═══════════════════════════════════════════════════════════

export async function ajouterHistorique(
  clientId: string,
  entree: Omit<EntreeHistorique, "id" | "clientId" | "dateAction">
): Promise<void> {
  await sbPost("bellaia_client_historique", {
    client_id:    clientId,
    type_entite:  entree.typeEntite,
    reference:    entree.reference,
    libelle:      entree.libelle,
    montant:      entree.montant,
    statut:       entree.statut,
    source_table: entree.sourceTable,
    source_id:    entree.sourceId,
    date_action:  new Date().toISOString(),
  });
}

export async function getHistoriqueClient(clientId: string): Promise<EntreeHistorique[]> {
  const rows = await sbGet("bellaia_client_historique",
    `client_id=eq.${clientId}&order=date_action.desc&limit=100`);
  return rows.map(mapHistorique);
}
