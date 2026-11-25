// ═══════════════════════════════════════════════════════════
// Accès aux données du répertoire central (un seul répertoire pour toute Bellaïa).
// • Après la migration 0145 : fonction serveur `repertoire_contacts()` (fondatrice : comptes ET contacts
//   externes, e-mails compris ; autres personnes : rien — les modules filtrent ensuite selon leurs besoins).
// • Avant 0145 (production actuelle) : repli sur les données déjà accessibles à la fondatrice
//   (profils, rôles, organisations, e-mails de l'équipe). Les e-mails des comptes clientes ne sont alors
//   pas disponibles : la recherche par e-mail ne porte que sur l'équipe, et l'écran le dit.
// La sélection renvoie TOUJOURS l'identifiant unique du compte, jamais un e-mail saisi.
// ═══════════════════════════════════════════════════════════
import { sbRpc, sbSelect, sbInsert, sbUpdate, SB_URL, SB_KEY, jeton } from "../events/eventsAtelierLib";
import type { Contact, Affectation } from "./repertoire";

export type Membre = {
  id: string; nom: string; email: string | null; role_profil: string | null;
  roles: { id: string; role: string; statut: string; organisation_id: string | null }[];
  permissions: { id: string; permission: string; univers: string; expire_le: string | null }[];
};
export type Organisation = { id: string; nom_commercial: string };
export type SourceRepertoire = "serveur" | "repli";

const CAT_ROLE: Record<string, string> = { assistante: "assistants", collaborateur: "collaborateurs", hote: "hotes", prestataire: "prestataires", fournisseur: "fournisseurs", qualite: "collaborateurs", partenaire: "partenaires", client: "clients", cliente: "clients" };
export function poleOrganisation(nom?: string | null): string { return /vil.?dor/i.test(nom || "") ? "VILDOR" : "PARTENAIRE"; }

export async function chargerRepertoire(): Promise<{ contacts: Contact[]; membres: Membre[]; organisations: Organisation[]; source: SourceRepertoire }> {
  const [membres, organisations] = await Promise.all([
    sbRpc<Membre[]>("fondatrice_equipe", {}).then(x => x || []),
    sbSelect<Organisation>("bellaia_organisations", "select=id,nom_commercial&order=nom_commercial.asc").catch(() => [] as Organisation[]),
  ]);
  try {
    const c = await sbRpc<Contact[]>("repertoire_contacts", {});
    if (Array.isArray(c)) return { contacts: c, membres, organisations, source: "serveur" };
  } catch { /* fonction absente avant 0145 : repli */ }
  const profils = await sbSelect<any>("profiles", "select=id,prenom,nom,role,statut,membership_status,created_at&order=nom.asc.nullslast&limit=2000");
  const parId = new Map(membres.map(m => [m.id, m]));
  const contacts: Contact[] = profils.filter((p: any) => p.role !== "fondatrice").map((p: any) => {
    const m = parId.get(p.id);
    const roles = (m?.roles || []).filter(r => r.statut !== "revoque");
    const cats = new Set<string>([CAT_ROLE[p.role] || "contacts_pro", ...roles.map(r => CAT_ROLE[r.role]).filter(Boolean)]);
    if (["member", "member_active", "membre"].includes(String(p.membership_status || ""))) cats.add("membres_bsh");
    const poles = new Set<string>();
    for (const r of roles) if (r.organisation_id) poles.add(poleOrganisation(organisations.find(o => o.id === r.organisation_id)?.nom_commercial));
    for (const x of m?.permissions || []) if (x.univers && x.univers !== "*") poles.add(x.univers);
    return { id: p.id, compte: true, prenom: p.prenom, nom: p.nom, email: m?.email || null, categories: [...cats], poles: [...poles], statut: p.statut || "actif", role_profil: p.role };
  });
  return { contacts, membres, organisations, source: "repli" };
}

/** Enregistre les affectations d'un compte (ajout, statut, retrait) puis relit l'état réel en base. */
export async function enregistrerAffectations(userId: string, plan: { ajouter: Affectation[]; modifier: { id: string; statut: string }[]; retirer: string[] }, roleProfil: string | null) {
  for (const a of plan.ajouter) await sbInsert("bellaia_roles", { user_id: userId, role: a.role, organisation_id: a.organisation_id, statut: a.statut }, "return=minimal");
  for (const m of plan.modifier) await sbUpdate("bellaia_roles", m.id, { statut: m.statut, updated_at: new Date().toISOString() });
  for (const id of plan.retirer) await sbUpdate("bellaia_roles", id, { statut: "revoque", updated_at: new Date().toISOString() });
  // Une cliente rattachée devient « partenaire » (même règle que fondatrice_lier_compte) : son espace professionnel s'ouvre.
  if (plan.ajouter.length && (roleProfil === "client" || roleProfil === "cliente")) await sbUpdate("profiles", userId, { role: "partenaire" });
}

export async function enregistrerPermissions(userId: string, plan: { accorder: { permission: string; univers: string }[]; retirer: string[] }) {
  for (const id of plan.retirer) await supprimer("bellaia_permissions", id);
  for (const a of plan.accorder) await sbInsert("bellaia_permissions", { user_id: userId, permission: a.permission, univers: a.univers }, "return=minimal");
}

async function supprimer(table: string, id: string) {
  const t = await jeton();
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, Prefer: "return=representation" } });
  if (!r.ok) throw new Error(await r.text());
  const lignes = await r.json().catch(() => []);
  if (!Array.isArray(lignes) || !lignes.length) throw new Error("Suppression refusée par la base (aucune ligne retirée).");
}

/** État réel d'un compte relu en base (après enregistrement) : base de la confirmation affichée. */
export async function relireMembre(userId: string): Promise<Membre | null> {
  const l = await sbRpc<Membre[]>("fondatrice_equipe", {});
  return (l || []).find(m => m.id === userId) || null;
}
