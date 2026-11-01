// ═══════════════════════════════════════════════════════════
// API — BSH Secret Circle & Experiences
// Tables réelles : bsh_evenements (étendue, migration 0071),
// bsh_lieux / bsh_budget_lignes / bsh_checklist_items (migration 0068),
// bsh_preinscriptions / bsh_invitations / bsh_billets /
// bsh_messages_modeles / bsh_playlists (migration 0071).
// src/modules/bshExperiences/bshExperiencesApi.ts
// ═══════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getToken(): Promise<string> {
  if (typeof window === "undefined") return SB_KEY;
  return localStorage.getItem("bellaia_token") || SB_KEY;
}

async function sbGet<T = any>(table: string, params = ""): Promise<T[]> {
  if (!SB_URL) return [];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${await getToken()}` },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

async function sbPost(table: string, data: object): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: d?.message || d?.hint || `Échec HTTP ${r.status}` };
    return { ok: true, data: Array.isArray(d) ? d[0] : d };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

async function sbPatch(table: string, id: string, data: object): Promise<{ ok: boolean; error?: string }> {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(data),
    });
    if (!r.ok) { const d = await r.json().catch(() => null); return { ok: false, error: d?.message || `Échec HTTP ${r.status}` }; }
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

async function sbDelete(table: string, id: string): Promise<{ ok: boolean }> {
  if (!SB_URL) return { ok: false };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${await getToken()}` },
    });
    return { ok: r.ok };
  } catch { return { ok: false }; }
}

// ── Types ───────────────────────────────────────────────────
export type CategorieEvenement = "boudoir_session" | "wolf_night" | "secret_wolf_ball" | "private_experience";

export interface EvenementBSH {
  id: string;
  nom: string;
  ico?: string;
  dateEvenement?: string;
  lieu?: string;
  capacite: number;
  placesRestantes: number;
  prix: number;
  statut: string;
  categorie?: CategorieEvenement;
  description?: string;
  dureeMinutes?: number;
  publie: boolean;
  budgetCible?: number;
  ville?: string;
}

export interface LieuBSH {
  id: string; nom: string; adresse?: string; ville?: string; telephone?: string; email?: string;
  typeLieu?: string; capacite?: number; tarifEstime?: number; tarifReel?: number;
  contactReferent?: string; datePremierContact?: string; dateRelance?: string;
  disponibilites?: string; conditionsCommerciales?: string; statut: string; notes?: string;
}

export interface BudgetLigneBSH {
  id: string; evenementId?: string; scenario: string; poste: string;
  montantPrevu: number; montantEngage: number; montantPaye: number; notes?: string;
}

export interface ChecklistItemBSH {
  id: string; cibleType: "evenement" | "mission" | "hote"; cibleId: string;
  titre: string; fait: boolean; responsable?: string; echeance?: string;
  priorite?: string; commentaire?: string;
}

export interface PreinscriptionBSH {
  id: string; evenementId?: string; pseudonyme: string; contact?: string;
  majoriteDeclaree: boolean; villePreferee?: string; typeEvenementSouhaite?: string;
  disponibilites?: string; consentementCommunications: boolean; statut: string; createdAt?: string;
}

export interface InvitationBSH {
  id: string; evenementId: string; nomDestinataire: string; categorie: string;
  code: string; utilisee: boolean; dateUtilisation?: string; annulee: boolean;
}

export interface MessageModeleBSH {
  id: string; type: string; titre: string; contenu: string;
}

export interface PlaylistBSH {
  id: string; evenementId?: string; titre: string; sequenceProgramme?: string; lienExterne?: string; notes?: string;
}

// ── Événements ──────────────────────────────────────────────
const mapEvt = (r: any): EvenementBSH => ({
  id: r.id, nom: r.nom, ico: r.ico, dateEvenement: r.date_evenement ?? undefined,
  lieu: r.lieu ?? undefined, capacite: r.capacite, placesRestantes: r.places_restantes,
  prix: parseFloat(r.prix) || 0, statut: r.statut, categorie: r.categorie ?? undefined,
  description: r.description ?? undefined, dureeMinutes: r.duree_minutes ?? undefined,
  publie: !!r.publie, budgetCible: r.budget_cible != null ? parseFloat(r.budget_cible) : undefined,
  ville: r.ville ?? undefined,
});

export async function getEvenementsBSH(): Promise<EvenementBSH[]> {
  const rows = await sbGet("bsh_evenements", "order=created_at.desc&limit=200");
  return rows.map(mapEvt);
}

export async function creerEvenementBSH(e: Partial<EvenementBSH>) {
  return sbPost("bsh_evenements", {
    nom: e.nom, ico: e.ico || "✨", date_evenement: e.dateEvenement || null, lieu: e.lieu || null,
    capacite: e.capacite ?? 6, places_restantes: e.capacite ?? 6, prix: e.prix ?? 0,
    categorie: e.categorie || null, description: e.description || null, duree_minutes: e.dureeMinutes || null,
    publie: e.publie ?? false, budget_cible: e.budgetCible ?? null, ville: e.ville || null,
  });
}

export async function majEvenementBSH(id: string, e: Partial<EvenementBSH>) {
  const d: Record<string, any> = {};
  if (e.nom !== undefined) d.nom = e.nom;
  if (e.dateEvenement !== undefined) d.date_evenement = e.dateEvenement || null;
  if (e.lieu !== undefined) d.lieu = e.lieu;
  if (e.capacite !== undefined) d.capacite = e.capacite;
  if (e.placesRestantes !== undefined) d.places_restantes = e.placesRestantes;
  if (e.prix !== undefined) d.prix = e.prix;
  if (e.statut !== undefined) d.statut = e.statut;
  if (e.categorie !== undefined) d.categorie = e.categorie;
  if (e.description !== undefined) d.description = e.description;
  if (e.dureeMinutes !== undefined) d.duree_minutes = e.dureeMinutes;
  if (e.publie !== undefined) d.publie = e.publie;
  if (e.budgetCible !== undefined) d.budget_cible = e.budgetCible;
  if (e.ville !== undefined) d.ville = e.ville;
  return sbPatch("bsh_evenements", id, d);
}

// ── Lieux ───────────────────────────────────────────────────
const mapLieu = (r: any): LieuBSH => ({
  id: r.id, nom: r.nom, adresse: r.adresse ?? undefined, ville: r.ville ?? undefined,
  telephone: r.telephone ?? undefined, email: r.email ?? undefined, typeLieu: r.type_lieu ?? undefined,
  capacite: r.capacite ?? undefined, tarifEstime: r.tarif_estime != null ? parseFloat(r.tarif_estime) : undefined,
  tarifReel: r.tarif_reel != null ? parseFloat(r.tarif_reel) : undefined,
  contactReferent: r.contact_referent ?? undefined, datePremierContact: r.date_premier_contact ?? undefined,
  dateRelance: r.date_relance ?? undefined, disponibilites: r.disponibilites ?? undefined,
  conditionsCommerciales: r.conditions_commerciales ?? undefined, statut: r.statut, notes: r.notes ?? undefined,
});

export async function getLieuxBSH(): Promise<LieuBSH[]> {
  return (await sbGet("bsh_lieux", "order=created_at.desc&limit=200")).map(mapLieu);
}
export async function creerLieuBSH(l: Partial<LieuBSH>) {
  return sbPost("bsh_lieux", {
    nom: l.nom, adresse: l.adresse || null, ville: l.ville || null, telephone: l.telephone || null,
    email: l.email || null, type_lieu: l.typeLieu || null, capacite: l.capacite || null,
    tarif_estime: l.tarifEstime ?? null, tarif_reel: l.tarifReel ?? null,
    contact_referent: l.contactReferent || null, date_premier_contact: l.datePremierContact || null,
    date_relance: l.dateRelance || null, disponibilites: l.disponibilites || null,
    conditions_commerciales: l.conditionsCommerciales || null, statut: l.statut || "a_contacter", notes: l.notes || null,
  });
}
export async function majLieuBSH(id: string, l: Partial<LieuBSH>) {
  const d: Record<string, any> = {};
  if (l.nom !== undefined) d.nom = l.nom;
  if (l.adresse !== undefined) d.adresse = l.adresse;
  if (l.ville !== undefined) d.ville = l.ville;
  if (l.telephone !== undefined) d.telephone = l.telephone;
  if (l.email !== undefined) d.email = l.email;
  if (l.typeLieu !== undefined) d.type_lieu = l.typeLieu;
  if (l.capacite !== undefined) d.capacite = l.capacite;
  if (l.tarifEstime !== undefined) d.tarif_estime = l.tarifEstime;
  if (l.tarifReel !== undefined) d.tarif_reel = l.tarifReel;
  if (l.contactReferent !== undefined) d.contact_referent = l.contactReferent;
  if (l.datePremierContact !== undefined) d.date_premier_contact = l.datePremierContact;
  if (l.dateRelance !== undefined) d.date_relance = l.dateRelance;
  if (l.disponibilites !== undefined) d.disponibilites = l.disponibilites;
  if (l.conditionsCommerciales !== undefined) d.conditions_commerciales = l.conditionsCommerciales;
  if (l.statut !== undefined) d.statut = l.statut;
  if (l.notes !== undefined) d.notes = l.notes;
  return sbPatch("bsh_lieux", id, d);
}
export const supprimerLieuBSH = (id: string) => sbDelete("bsh_lieux", id);

// ── Budget ──────────────────────────────────────────────────
const mapBudget = (r: any): BudgetLigneBSH => ({
  id: r.id, evenementId: r.evenement_id ?? undefined, scenario: r.scenario, poste: r.poste,
  montantPrevu: parseFloat(r.montant_prevu) || 0, montantEngage: parseFloat(r.montant_engage) || 0,
  montantPaye: parseFloat(r.montant_paye) || 0, notes: r.notes ?? undefined,
});
export async function getBudgetLignesBSH(evenementId?: string): Promise<BudgetLigneBSH[]> {
  const filtre = evenementId ? `evenement_id=eq.${evenementId}&` : "";
  return (await sbGet("bsh_budget_lignes", `${filtre}order=created_at.asc&limit=300`)).map(mapBudget);
}
export async function creerBudgetLigneBSH(b: Partial<BudgetLigneBSH>) {
  return sbPost("bsh_budget_lignes", {
    evenement_id: b.evenementId || null, scenario: b.scenario || "confortable", poste: b.poste,
    montant_prevu: b.montantPrevu ?? 0, montant_engage: b.montantEngage ?? 0, montant_paye: b.montantPaye ?? 0,
    notes: b.notes || null,
  });
}
export async function majBudgetLigneBSH(id: string, b: Partial<BudgetLigneBSH>) {
  const d: Record<string, any> = {};
  if (b.poste !== undefined) d.poste = b.poste;
  if (b.scenario !== undefined) d.scenario = b.scenario;
  if (b.montantPrevu !== undefined) d.montant_prevu = b.montantPrevu;
  if (b.montantEngage !== undefined) d.montant_engage = b.montantEngage;
  if (b.montantPaye !== undefined) d.montant_paye = b.montantPaye;
  if (b.notes !== undefined) d.notes = b.notes;
  return sbPatch("bsh_budget_lignes", id, d);
}
export const supprimerBudgetLigneBSH = (id: string) => sbDelete("bsh_budget_lignes", id);

// ── Check-list ──────────────────────────────────────────────
const mapChecklist = (r: any): ChecklistItemBSH => ({
  id: r.id, cibleType: r.cible_type, cibleId: r.cible_id, titre: r.titre, fait: !!r.fait,
  responsable: r.responsable ?? undefined, echeance: r.echeance ?? undefined,
  priorite: r.priorite ?? undefined, commentaire: r.commentaire ?? undefined,
});
export async function getChecklistBSH(cibleType?: string, cibleId?: string): Promise<ChecklistItemBSH[]> {
  let filtre = "";
  if (cibleType) filtre += `cible_type=eq.${cibleType}&`;
  if (cibleId) filtre += `cible_id=eq.${cibleId}&`;
  return (await sbGet("bsh_checklist_items", `${filtre}order=echeance.asc.nullslast&limit=300`)).map(mapChecklist);
}
export async function creerChecklistItemBSH(c: Partial<ChecklistItemBSH>) {
  return sbPost("bsh_checklist_items", {
    cible_type: c.cibleType, cible_id: c.cibleId, titre: c.titre, fait: c.fait ?? false,
    responsable: c.responsable || null, echeance: c.echeance || null,
    priorite: c.priorite || "normale", commentaire: c.commentaire || null,
  });
}
export async function majChecklistItemBSH(id: string, c: Partial<ChecklistItemBSH>) {
  const d: Record<string, any> = {};
  if (c.titre !== undefined) d.titre = c.titre;
  if (c.fait !== undefined) d.fait = c.fait;
  if (c.responsable !== undefined) d.responsable = c.responsable;
  if (c.echeance !== undefined) d.echeance = c.echeance;
  if (c.priorite !== undefined) d.priorite = c.priorite;
  if (c.commentaire !== undefined) d.commentaire = c.commentaire;
  return sbPatch("bsh_checklist_items", id, d);
}
export const supprimerChecklistItemBSH = (id: string) => sbDelete("bsh_checklist_items", id);

// ── Préinscriptions (lecture/gestion fondatrice) ──────────────
const mapPreinscription = (r: any): PreinscriptionBSH => ({
  id: r.id, evenementId: r.evenement_id ?? undefined, pseudonyme: r.pseudonyme, contact: r.contact ?? undefined,
  majoriteDeclaree: !!r.majorite_declaree, villePreferee: r.ville_preferee ?? undefined,
  typeEvenementSouhaite: r.type_evenement_souhaite ?? undefined, disponibilites: r.disponibilites ?? undefined,
  consentementCommunications: !!r.consentement_communications, statut: r.statut, createdAt: r.created_at ?? undefined,
});
export async function getPreinscriptionsBSH(): Promise<PreinscriptionBSH[]> {
  return (await sbGet("bsh_preinscriptions", "order=created_at.desc&limit=300")).map(mapPreinscription);
}
export async function majStatutPreinscriptionBSH(id: string, statut: string) {
  return sbPatch("bsh_preinscriptions", id, { statut });
}

// Formulaire public — insert uniquement, pas d'auth requise (policy
// bsh_preinscriptions_creer autorise anon + authenticated).
export async function creerPreinscriptionPublicBSH(p: {
  pseudonyme: string; contact?: string; majoriteDeclaree: boolean; villePreferee?: string;
  typeEvenementSouhaite?: string; disponibilites?: string; consentementCommunications: boolean; evenementId?: string;
}) {
  if (!SB_URL) return { ok: false, error: "Configuration manquante." };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/bsh_preinscriptions`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        pseudonyme: p.pseudonyme, contact: p.contact || null, majorite_declaree: p.majoriteDeclaree,
        ville_preferee: p.villePreferee || null, type_evenement_souhaite: p.typeEvenementSouhaite || null,
        disponibilites: p.disponibilites || null, consentement_communications: p.consentementCommunications,
        evenement_id: p.evenementId || null,
      }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: d?.message || `Échec HTTP ${r.status}` };
    return { ok: true, data: Array.isArray(d) ? d[0] : d };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ── Invitations ─────────────────────────────────────────────
const mapInvitation = (r: any): InvitationBSH => ({
  id: r.id, evenementId: r.evenement_id, nomDestinataire: r.nom_destinataire, categorie: r.categorie,
  code: r.code, utilisee: !!r.utilisee, dateUtilisation: r.date_utilisation ?? undefined, annulee: !!r.annulee,
});
export async function getInvitationsBSH(evenementId?: string): Promise<InvitationBSH[]> {
  const filtre = evenementId ? `evenement_id=eq.${evenementId}&` : "";
  return (await sbGet("bsh_invitations", `${filtre}order=created_at.desc&limit=300`)).map(mapInvitation);
}
export async function creerInvitationBSH(i: { evenementId: string; nomDestinataire: string; categorie: string }) {
  return sbPost("bsh_invitations", { evenement_id: i.evenementId, nom_destinataire: i.nomDestinataire, categorie: i.categorie });
}
export async function pointerInvitationBSH(id: string) {
  return sbPatch("bsh_invitations", id, { utilisee: true, date_utilisation: new Date().toISOString() });
}
export async function annulerInvitationBSH(id: string) {
  return sbPatch("bsh_invitations", id, { annulee: true });
}

// ── Messages modèles ────────────────────────────────────────
const mapMessage = (r: any): MessageModeleBSH => ({ id: r.id, type: r.type, titre: r.titre, contenu: r.contenu });
export async function getMessagesModelesBSH(): Promise<MessageModeleBSH[]> {
  return (await sbGet("bsh_messages_modeles", "order=type.asc&limit=100")).map(mapMessage);
}
export async function creerMessageModeleBSH(m: Partial<MessageModeleBSH>) {
  return sbPost("bsh_messages_modeles", { type: m.type, titre: m.titre, contenu: m.contenu });
}
export async function majMessageModeleBSH(id: string, m: Partial<MessageModeleBSH>) {
  const d: Record<string, any> = {};
  if (m.titre !== undefined) d.titre = m.titre;
  if (m.contenu !== undefined) d.contenu = m.contenu;
  if (m.type !== undefined) d.type = m.type;
  return sbPatch("bsh_messages_modeles", id, d);
}
export const supprimerMessageModeleBSH = (id: string) => sbDelete("bsh_messages_modeles", id);

// ── Playlists / Diamond B ───────────────────────────────────
const mapPlaylist = (r: any): PlaylistBSH => ({
  id: r.id, evenementId: r.evenement_id ?? undefined, titre: r.titre,
  sequenceProgramme: r.sequence_programme ?? undefined, lienExterne: r.lien_externe ?? undefined, notes: r.notes ?? undefined,
});
export async function getPlaylistsBSH(): Promise<PlaylistBSH[]> {
  return (await sbGet("bsh_playlists", "order=created_at.desc&limit=200")).map(mapPlaylist);
}
export async function creerPlaylistBSH(p: Partial<PlaylistBSH>) {
  return sbPost("bsh_playlists", {
    evenement_id: p.evenementId || null, titre: p.titre, sequence_programme: p.sequenceProgramme || null,
    lien_externe: p.lienExterne || null, notes: p.notes || null,
  });
}
export const supprimerPlaylistBSH = (id: string) => sbDelete("bsh_playlists", id);

// ── Hôtesses (liste pour menus déroulants — jamais d'UUID à saisir) ──
export async function getHotesBSH(): Promise<{ id: string; nom: string }[]> {
  const rows = await sbGet("bsh_hotes", "order=nom.asc&select=id,nom,prenom,statut&statut=eq.active");
  return rows.map((r: any) => ({ id: r.id, nom: [r.prenom, r.nom].filter(Boolean).join(" ") || r.id }));
}
